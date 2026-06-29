"""
LLM-Wiki Plugin API — Self-contained wiki + GitHub sync backend.

Mounted at /api/plugins/llm-wiki/ by the Hermes plugin system.
Provides all wiki endpoints so this plugin works on Hermes instances
that do not have the built-in wiki router.

hermes_cli 相依模組（最後驗證：2026-06-29）
  - wiki_parser.py           WikiParser 主解析器
  - wiki_parser_extensions.py WikiParserAutoAnalysis mixin
  - content_extractor.py     ContentExtractor 多格式內容萃取
  - content_tag_analyzer.py  ContentTagAnalyzer LLM 標籤分析
  - language_detector.py     LanguageDetector 語言偵測
  - tag_registry_updater.py  TagRegistryUpdater tags.yaml 更新（含 fcntl lock）
  - analysis_tracker.py      AnalysisTracker 背景任務進度追蹤

Hermes 升級後若 wiki 功能異常，優先確認以上模組的 import 和函數簽名是否改變。
"""
from __future__ import annotations

import json
import logging
import os
import re
import subprocess
import threading
import urllib.parse
import urllib.request
from datetime import datetime
from pathlib import Path
from typing import Any

from fastapi import APIRouter, HTTPException, Query, UploadFile, File
from pydantic import BaseModel

_log = logging.getLogger(__name__)

# ── Router (no prefix — plugin system handles /api/plugins/llm-wiki/) ──
router = APIRouter()

# ── Parser singleton ────────────────────────────────────────────────────
_parser = None

def _get_parser():
    global _parser
    if _parser is None:
        # 嘗試從 config.yaml 讀取 WIKI_PATH
        if not os.getenv("WIKI_PATH"):
            try:
                import yaml
                cfg_path = Path.home() / ".hermes" / "config.yaml"
                if cfg_path.exists():
                    cfg = yaml.safe_load(cfg_path.read_text(encoding="utf-8")) or {}
                    wiki_path = (cfg.get("plugins") or {}).get("wiki", {}).get("path", "")
                    if wiki_path:
                        os.environ["WIKI_PATH"] = str(wiki_path)
            except Exception:
                pass
        try:
            from hermes_cli.wiki_parser import WikiParser
            _parser = WikiParser()
        except ImportError:
            raise HTTPException(503, "WikiParser not found — ensure hermes_cli is installed.")
    return _parser

def _invalidate_parser():
    global _parser
    if _parser is not None:
        try:
            _parser.invalidate()
        except Exception:
            pass

def _get_tracker():
    try:
        from hermes_cli.analysis_tracker import get_tracker
        return get_tracker()
    except ImportError:
        raise HTTPException(503, "analysis_tracker not found.")

# ── Large-file threshold (50 KB) ────────────────────────────────────────
_LARGE_FILE_THRESHOLD = 51_200

# ── Background tracker cleanup ──────────────────────────────────────────
def _start_tracker_cleanup() -> None:
    def _loop():
        while True:
            threading.Event().wait(300)
            try:
                _get_tracker().cleanup()
            except Exception:
                pass
    threading.Thread(target=_loop, daemon=True).start()

_start_tracker_cleanup()

# ══════════════════════════════════════════════════════════════════════
# Helper functions
# ══════════════════════════════════════════════════════════════════════

_TRACKING_PARAMS = frozenset(["fbclid", "fbm_", "_ga", "mc_eid", "twclid", "igshid"])
_TRACKING_PREFIXES = ("utm_", "fbm_", "aem_", "ref_",)

def _strip_tracking_params(url: str) -> str:
    parsed = urllib.parse.urlparse(url)
    if not parsed.query:
        return url
    kept = [(k, v) for k, v in urllib.parse.parse_qsl(parsed.query, keep_blank_values=True)
            if k not in _TRACKING_PARAMS and not any(k.startswith(p) for p in _TRACKING_PREFIXES)]
    return urllib.parse.urlunparse(parsed._replace(query=urllib.parse.urlencode(kept)))

_GITHUB_REPO_RE = re.compile(r'^https?://github\.com/([^/]+)/([^/]+?)(?:/.*)?$')
_GITHUB_BLOB_RE = re.compile(r'^https?://github\.com/([^/]+)/([^/]+)/blob/([^/]+)/(.+)$')
_GITHUB_GIST_RE = re.compile(r'^https?://gist\.github\.com/([^/]+)/([a-f0-9]+)')
_RAW_GITHUB_RE = re.compile(r'^https?://raw\.githubusercontent\.com/')
_YOUTUBE_RE = re.compile(r'^https?://(?:www\.)?(?:youtube\.com/watch\?v=|youtu\.be/|youtube\.com/embed/)([a-zA-Z0-9_-]{11})')

def _detect_youtube_url(url: str) -> dict | None:
    m = _YOUTUBE_RE.match(url)
    return {"type": "youtube", "video_id": m.group(1)} if m else None

def _detect_github_url(url: str) -> dict | None:
    if _RAW_GITHUB_RE.match(url):
        return None
    m = _GITHUB_GIST_RE.match(url)
    if m:
        return {"type": "gist", "owner": m.group(1), "gist_id": m.group(2),
                "api_url": f"https://api.github.com/gists/{m.group(2)}"}
    m = _GITHUB_BLOB_RE.match(url)
    if m:
        owner, repo, branch, path = m.group(1), m.group(2).rstrip("/"), m.group(3), m.group(4)
        return {"type": "blob", "owner": owner, "repo": repo, "branch": branch, "path": path,
                "raw_url": f"https://raw.githubusercontent.com/{owner}/{repo}/{branch}/{path}"}
    m = _GITHUB_REPO_RE.match(url)
    if m:
        owner, repo = m.group(1), m.group(2).rstrip("/")
        return {"type": "repo", "owner": owner, "repo": repo,
                "raw_url": f"https://raw.githubusercontent.com/{owner}/{repo}/HEAD/README.md"}
    return None

def _fetch_youtube_page_details(video_id: str) -> dict:
    headers = {"User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36", "Accept-Language": "en-US,en;q=0.9"}
    try:
        req = urllib.request.Request(f"https://www.youtube.com/watch?v={video_id}", headers=headers)
        with urllib.request.urlopen(req, timeout=15) as resp:
            html = resp.read().decode("utf-8", errors="replace")
        m = re.search(r"ytInitialPlayerResponse\s*=\s*({.*?});", html, re.DOTALL)
        if m:
            data = json.loads(m.group(1))
            vd = data.get("videoDetails", {})
            mf = data.get("microformat", {}).get("playerMicroformatRenderer", {})
            secs = int(vd.get("lengthSeconds", 0))
            h, m_ = divmod(secs, 3600); m_, s = divmod(m_, 60)
            return {"title": vd.get("title", "YouTube Video"), "description": vd.get("shortDescription", ""),
                    "duration_seconds": secs, "duration": f"{h}h {m_}m {s}s" if h else f"{m_}m {s}s",
                    "keywords": vd.get("keywords", []), "view_count": vd.get("viewCount", "0"),
                    "author_name": vd.get("author", ""), "channel_id": vd.get("channelId", ""),
                    "publish_date": mf.get("publishDate", ""), "upload_date": mf.get("uploadDate", ""),
                    "thumbnail_url": vd.get("thumbnail", {}).get("thumbnails", [{}])[0].get("url", "")}
    except Exception:
        pass
    try:
        oembed_url = f"https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v={video_id}&format=json"
        with urllib.request.urlopen(oembed_url, timeout=10) as resp:
            data = json.loads(resp.read().decode("utf-8"))
        return {"title": data.get("title", "YouTube Video"), "description": "", "duration_seconds": 0,
                "duration": "", "keywords": [], "view_count": "0", "author_name": data.get("author_name", ""),
                "channel_id": "", "publish_date": "", "upload_date": "", "thumbnail_url": data.get("thumbnail_url", "")}
    except Exception:
        return {"title": "YouTube Video", "description": "", "duration_seconds": 0, "duration": "",
                "keywords": [], "view_count": "0", "author_name": "", "channel_id": "",
                "publish_date": "", "upload_date": "", "thumbnail_url": ""}

def _fetch_youtube_transcript(video_id: str) -> dict[str, str] | None:
    try:
        from youtube_transcript_api import YouTubeTranscriptApi, NoTranscriptFound
        api = YouTubeTranscriptApi()
        transcript_list = api.list(video_id)
        chinese_transcript = None
        for code in ("zh", "zh-Hans", "zh-Hant", "zh-CN", "zh-TW"):
            try:
                chinese_transcript = transcript_list.find_transcript([code]); break
            except NoTranscriptFound:
                continue
        english_transcript = None
        try:
            english_transcript = transcript_list.find_transcript(["en"])
        except NoTranscriptFound:
            pass
        result: dict[str, str] = {}
        if english_transcript:
            segs = list(english_transcript.fetch())
            if segs: result["en"] = " ".join(s.text for s in segs)
        if chinese_transcript and chinese_transcript != english_transcript:
            segs = list(chinese_transcript.fetch())
            if segs: result[chinese_transcript.language_code] = " ".join(s.text for s in segs)
        if not result:
            for t in transcript_list:
                if t.is_translatable:
                    try:
                        segs = list(t.translate("zh-TW").fetch())
                        if segs: result["zh-TW"] = " ".join(s.text for s in segs)
                    except Exception:
                        pass
                    break
        return result if result else None
    except Exception:
        return None

def _build_youtube_page(metadata: dict, url: str, transcripts: dict[str, str] | None = None) -> str:
    title = metadata.get("title", "YouTube Video")
    now = datetime.now().strftime("%Y-%m-%dT%H:%M")
    lines = ["---", f"title: {title}", "type: concept", f"created: {now}", f"updated: {now}",
             "tags: [source:youtube, video, youtube]", "confidence: high", "---", "", f"# {title}", "",
             f"> **Source:** [{url}]({url})", "", "## Video Info", "", "| Field | Value |", "|-------|-------|",
             f"| Title | {title} |", f"| Channel | {metadata.get('author_name', '')} |"]
    if metadata.get("duration"): lines.append(f"| Duration | {metadata['duration']} |")
    vc = metadata.get("view_count", "0")
    if vc and vc != "0":
        try:
            v = int(vc)
            vc = f"{v/1e9:.1f}B" if v >= 1e9 else f"{v/1e6:.1f}M" if v >= 1e6 else f"{v/1e3:.1f}K" if v >= 1e3 else str(v)
        except Exception:
            pass
        lines.append(f"| Views | {vc} |")
    if metadata.get("upload_date"): lines.append(f"| Published | {metadata['upload_date'][:10]} |")
    lines.append("")
    if metadata.get("description"):
        desc = metadata["description"][:3000] + ("…" if len(metadata["description"]) > 3000 else "")
        lines += ["## Description", "", desc, ""]
    ts = transcripts or {}
    if ts.get("en"): lines += ["## Transcript (English)", "", ts["en"][:15000], ""]
    for zk in [k for k in ts if k.startswith("zh")]:
        label = {"zh": "中文", "zh-Hans": "中文（简体）", "zh-Hant": "中文（繁體）", "zh-CN": "中文（简体）", "zh-TW": "中文（繁體）"}.get(zk, "中文")
        lines += [f"## Transcript ({label})", "", ts[zk][:15000], ""]
    if metadata.get("keywords"): lines += ["## Tags", "", ", ".join(metadata["keywords"][:30]), ""]
    if metadata.get("thumbnail_url"): lines += [f"![Video Thumbnail]({metadata['thumbnail_url']})", ""]
    return "\n".join(lines)

def _fetch_github_metadata(owner: str, repo: str) -> dict:
    try:
        req = urllib.request.Request(f"https://api.github.com/repos/{owner}/{repo}",
                                     headers={"Accept": "application/vnd.github.v3+json", "User-Agent": "Hermes-Agent/1.0"})
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode("utf-8"))
        return {"language": data.get("language"), "topics": data.get("topics", []), "description": data.get("description")}
    except Exception:
        return {}

def _html_to_markdown(html_bytes: bytes, source_url: str) -> tuple[str, str]:
    try:
        import trafilatura
        meta = trafilatura.extract_metadata(html_bytes, default_url=source_url)
        title = (meta.title or "").strip() if meta else ""
        md = trafilatura.extract(html_bytes, output_format="markdown", include_comments=False,
                                  include_tables=True, with_metadata=False, url=source_url)
        if md:
            return (f"# {title}\n\n{md}" if title else md), title
    except Exception:
        pass
    try:
        import html2text as _h2t
        h = _h2t.HTML2Text(); h.ignore_links = False; h.bypass_tables = False
        html_str = html_bytes.decode("utf-8", errors="replace")
        t_match = re.search(r"<title[^>]*>(.*?)</title>", html_str, re.IGNORECASE | re.DOTALL)
        return h.handle(html_str), (t_match.group(1).strip() if t_match else "")
    except Exception:
        pass
    return html_bytes.decode("utf-8", errors="replace"), ""

def _find_duplicate_url(wiki_path: Path, url: str) -> str | None:
    log_path = wiki_path / "log.md"
    if log_path.exists():
        for line in log_path.read_text(encoding="utf-8", errors="replace").splitlines():
            if url in line:
                parts = [p.strip() for p in line.split("|")]
                if len(parts) >= 4:
                    return f"concepts/{parts[3]}"
    concepts = wiki_path / "concepts"
    if concepts.is_dir():
        for md in concepts.glob("*.md"):
            try:
                if url in md.read_text(encoding="utf-8", errors="replace"):
                    return f"concepts/{md.name}"
            except OSError:
                continue
    return None

def _update_frontmatter_tags(dest: Path, tags: list[str], *, page_type: str = "concept", confidence: str = "medium") -> None:
    try:
        text = dest.read_text(encoding="utf-8")
        tag_str = ", ".join(tags)
        now = datetime.now().strftime("%Y-%m-%dT%H:%M")
        if text.startswith("---"):
            updated = re.sub(r"^tags:.*$", f"tags: [{tag_str}]", text, count=1, flags=re.MULTILINE)
            updated = re.sub(r"^updated:.*$", f"updated: {now}", updated, count=1, flags=re.MULTILINE)
        else:
            title_match = re.search(r"^#\s+(.+)", text, re.MULTILINE)
            title = title_match.group(1).strip() if title_match else dest.stem
            updated = f"---\ntitle: {title}\ntype: {page_type}\ncreated: {now}\nupdated: {now}\ntags: [{tag_str}]\nconfidence: {confidence}\n---\n\n" + text
        if updated != text:
            dest.write_text(updated, encoding="utf-8")
    except Exception as exc:
        _log.warning("Failed to update frontmatter: %s", exc)

def _auto_link_related_pages(dest: Path, parser, tags: list[str]) -> None:
    if not tags: return
    try:
        pages = parser.get_pages()
    except Exception:
        return
    new_title = dest.stem
    tag_set = {t.lower() for t in tags}
    related = []
    for page in pages:
        page_abs = parser.wiki_path / f"{page.get('path', '')}.md"
        if page_abs.resolve() == dest.resolve(): continue
        if len(tag_set & {t.lower() for t in page.get("tags", [])}) >= 2:
            related.append((page.get("path", ""), page.get("title", "") or page.get("path", ""), page_abs))
    if not related: return
    try:
        text = dest.read_text(encoding="utf-8")
        if "## Related Pages" not in text:
            links = "\n".join(f"- [[{title}]]" for _, title, _ in related)
            dest.write_text(text + f"\n\n## Related Pages\n\n{links}\n", encoding="utf-8")
    except Exception:
        pass
    for _, title, abs_path in related:
        try:
            if not abs_path.exists(): continue
            rel_text = abs_path.read_text(encoding="utf-8")
            backlink = f"- [[{new_title}]]"
            if backlink in rel_text: continue
            if "## Related Pages" in rel_text:
                rel_text = rel_text.rstrip() + f"\n{backlink}\n"
            else:
                rel_text += f"\n\n## Related Pages\n\n{backlink}\n"
            abs_path.write_text(rel_text, encoding="utf-8")
        except Exception:
            pass

def _extract_tags_llm(content: str, tags_yaml_path: Path | None = None) -> list[str]:
    try:
        from agent.auxiliary_client import get_text_auxiliary_client
        client, model = get_text_auxiliary_client("wiki_tag_extractor")
    except Exception:
        return []
    if not client or not model: return []
    existing_tags: list[str] = []
    if tags_yaml_path and tags_yaml_path.exists():
        try:
            import yaml
            data = yaml.safe_load(tags_yaml_path.read_text(encoding="utf-8"))
            for cat in (data or {}).get("categories", []):
                for t in cat.get("tags", []):
                    existing_tags.append(t["name"] if isinstance(t, dict) else t)
        except Exception:
            pass
    existing_hint = f"\n現有標籤（優先復用）：{', '.join(existing_tags[:60])}" if existing_tags else ""
    body = content[:6000] + ("…（已截斷）" if len(content) > 6000 else "")
    prompt = f"""你是 Wiki 知識庫的標籤提取助手。請閱讀以下完整頁面內容，提取 5～10 個最能描述此頁面主題的標籤。
規則：中文概念用中文，英文專有名詞保留英文；避免過於泛用的標籤（如「文章」、「影片」）{existing_hint}
頁面內容：\n{body}\n請只回傳 JSON 陣列，不要加任何說明文字：["標籤1", "標籤2", ...]"""
    try:
        resp = client.chat.completions.create(model=model, messages=[{"role": "user", "content": prompt}], temperature=0.2, max_tokens=300)
        raw = resp.choices[0].message.content or ""
        match = re.search(r"\[.*?\]", raw, re.DOTALL)
        if match: return [str(t).strip() for t in json.loads(match.group()) if t]
    except Exception:
        pass
    return []

def _append_to_log(parser, action: str, subject: str, details: str) -> None:
    if not parser.is_available(): return
    log_path = parser._wiki_path / "log.md"
    entry = f"| {datetime.now().strftime('%Y-%m-%dT%H:%M')} | {action} | {subject} | {details} |\n"
    if not log_path.exists():
        log_path.write_text("# Wiki Log\n\nChronological record of all wiki actions. Append-only.\n\n| Date | Action | Subject | Details |\n|------|--------|---------|---------|\n", encoding="utf-8")
    with open(log_path, "a", encoding="utf-8") as f:
        f.write(entry)

def _run_analysis_background(tracker, task_id: str, parser, dest: Path, file_type: str, filename: str, source_url: str | None = None, *, extra_tags: list[str] | None = None) -> None:
    try:
        from hermes_cli.content_extractor import ContentExtractor
        from hermes_cli.language_detector import LanguageDetector
        from hermes_cli.content_tag_analyzer import ContentTagAnalyzer
        from hermes_cli.tag_registry_updater import TagRegistryUpdater

        tracker.update(task_id, status="content_extraction", progress=10, step="content_extraction", step_status="in_progress", step_progress=10, step_message="Extracting content...")
        extracted_text = ContentExtractor().extract(dest)

        tracker.update(task_id, step="content_extraction", step_status="complete", step_progress=100)
        tracker.update(task_id, status="language_detection", progress=30, step="language_detection", step_status="in_progress", step_progress=10, step_message="Detecting languages...")
        lang_info = LanguageDetector().detect(extracted_text)

        tracker.update(task_id, step="language_detection", step_status="complete", step_progress=100)
        tracker.update(task_id, status="tag_analysis", progress=50, step="tag_analysis", step_status="in_progress", step_progress=10, step_message="Analysing tags...")
        tags_yaml_path = parser.wiki_path / "tags.yaml"
        tags_result = ContentTagAnalyzer().analyze(content=extracted_text, lang_info=lang_info, tags_yaml_path=tags_yaml_path)
        llm_tags = _extract_tags_llm(extracted_text, tags_yaml_path)
        if llm_tags:
            seen = {t.lower() for t in tags_result['suggested_tags']}
            for t in llm_tags:
                if t.lower() not in seen: tags_result['suggested_tags'].append(t); seen.add(t.lower())

        tracker.update(task_id, step="tag_analysis", step_status="complete", step_progress=100)
        tracker.update(task_id, status="relation_analysis", progress=70, step="relation_analysis", step_status="in_progress", step_progress=10, step_message="Analysing relations...")
        tracker.update(task_id, step="relation_analysis", step_status="complete", step_progress=100)
        tracker.update(task_id, status="registry_update", progress=85, step="registry_update", step_status="in_progress", step_progress=10, step_message="Updating tag registry...")

        TagRegistryUpdater(parser.wiki_path / "tags.yaml").update(suggested_tags=tags_result['suggested_tags'], suggested_category=tags_result['suggested_category'], related_suggestions=tags_result.get('related_suggestions', []))
        all_tags = list(tags_result['suggested_tags'])
        if extra_tags:
            for t in extra_tags:
                if t not in all_tags: all_tags.append(t)
        _update_frontmatter_tags(dest, all_tags, page_type=tags_result.get("suggested_category", file_type) or "concept", confidence=tags_result.get("confidence", "medium"))
        _auto_link_related_pages(dest, parser, all_tags)
        parser.invalidate()
        _append_to_log(parser, "ingest" if source_url else "create", filename, f"type={file_type}; tags={','.join(all_tags[:5])}" + (f"; source={source_url}" if source_url else ""))

        result = {"path": str(dest.relative_to(parser.wiki_path)), "message": "Analysis complete",
                  "data": {"languages": lang_info.get('languages', []), "programming_languages": lang_info.get('programming_languages', []),
                           "domain": lang_info.get('domain', 'general'), "tags": all_tags,
                           "category": tags_result['suggested_category'], "confidence": tags_result['confidence']}}
        tracker.update(task_id, step="registry_update", step_status="complete", step_progress=100)
        tracker.update(task_id, status="complete", progress=100, step="complete", step_status="complete", step_progress=100, step_message="Analysis complete", result=result)
    except Exception as e:
        _log.error("Background analysis failed for %s: %s", filename, e)
        tracker.update(task_id, status="failed", error=str(e), step="complete", step_status="failed", step_message=str(e))

# ══════════════════════════════════════════════════════════════════════
# Wiki API endpoints
# ══════════════════════════════════════════════════════════════════════

@router.get("/stats")
async def get_stats() -> dict[str, Any]:
    parser = _get_parser()
    if not parser.is_available():
        raise HTTPException(503, "Wiki is not configured. Set the WIKI_PATH environment variable.")
    return parser.get_stats()

@router.get("/pages")
async def get_pages(
    type: str | None = Query(None, alias="type"),
    tag: list[str] | None = Query(None, alias="tag"),
    confidence: str | None = Query(None, alias="confidence"),
    sort: str = Query("updated", alias="sort"),
    order: str = Query("desc", alias="order"),
) -> list[dict[str, Any]]:
    parser = _get_parser()
    if not parser.is_available():
        raise HTTPException(503, "Wiki is not configured.")
    return parser.get_pages(page_type=type, tag=tag, confidence=confidence, sort=sort, order=order)

@router.get("/pages/{path:path}")
async def get_page(path: str) -> dict[str, Any]:
    parser = _get_parser()
    if not parser.is_available():
        raise HTTPException(503, "Wiki is not configured.")
    page = parser.get_page(path)
    if page is None:
        raise HTTPException(404, f"Page not found: {path}")
    return page

@router.delete("/pages/{path:path}")
async def delete_page(path: str) -> dict[str, str]:
    parser = _get_parser()
    if not parser.is_available():
        raise HTTPException(503, "Wiki is not configured.")
    file_path = parser.wiki_path / f"{path}.md"
    if not file_path.is_file():
        file_path = parser.wiki_path / path
    if not file_path.is_file():
        for subdir in ("entities", "concepts", "comparisons", "queries"):
            for candidate in (parser.wiki_path / subdir / f"{path}.md", parser.wiki_path / subdir / path):
                if candidate.is_file(): file_path = candidate; break
    if not file_path.is_file():
        raise HTTPException(404, f"Page file not found: {path}")
    file_path.unlink()
    _invalidate_parser()
    return {"message": f"Deleted: {path}", "path": path}

@router.get("/graph")
async def get_graph() -> dict[str, list[dict[str, Any]]]:
    parser = _get_parser()
    if not parser.is_available():
        raise HTTPException(503, "Wiki is not configured.")
    return parser.get_graph()

@router.get("/timeline")
async def get_timeline(limit: int = Query(20, ge=1, le=500)) -> list[dict[str, Any]]:
    parser = _get_parser()
    if not parser.is_available():
        raise HTTPException(503, "Wiki is not configured.")
    return parser.get_timeline(limit=limit)

@router.get("/all-tags")
async def get_all_tags() -> list[dict]:
    try:
        from hermes_cli.tag_registry_updater import classify_tag
    except ImportError:
        def classify_tag(name: str) -> str: return "general"
    parser = _get_parser()
    if not parser.is_available():
        raise HTTPException(503, "Wiki is not configured.")
    tags = parser.get_all_tags()
    for t in tags:
        t.setdefault("category", classify_tag(t["name"]))
    return tags

@router.get("/tags")
async def get_tags() -> dict:
    parser = _get_parser()
    if not parser.is_available():
        raise HTTPException(503, "Wiki is not configured.")
    return parser.get_tag_registry()

@router.get("/validate-tags")
async def validate_tags(tags: str = Query(...)) -> dict:
    parser = _get_parser()
    if not parser.is_available():
        raise HTTPException(503, "Wiki is not configured.")
    return parser.validate_tags([t.strip() for t in tags.split(",") if t.strip()])

@router.post("/upload")
async def upload_file(file: UploadFile = File(...), type: str = Query("auto"), force: str = Query("false")) -> dict:
    from hermes_cli.content_extractor import ContentExtractor
    from hermes_cli.language_detector import LanguageDetector
    from hermes_cli.content_tag_analyzer import ContentTagAnalyzer
    from hermes_cli.tag_registry_updater import TagRegistryUpdater

    parser = _get_parser()
    if not parser.is_available():
        raise HTTPException(503, "Wiki is not configured.")
    if not file.filename:
        raise HTTPException(400, "No filename provided.")
    supported_extensions = ['.md', '.markdown', '.pdf', '.pptx', '.xlsx', '.png', '.jpg', '.jpeg', '.gif', '.webp']
    file_ext = '.' + file.filename.split('.')[-1].lower()
    if file_ext not in supported_extensions:
        raise HTTPException(400, f"Unsupported file format: {file_ext}")
    content = await file.read()
    image_extensions = {'.png', '.jpg', '.jpeg', '.gif', '.webp'}
    dest_dir = parser.wiki_path / ("images" if file_ext in image_extensions else "concepts")
    dest_dir.mkdir(parents=True, exist_ok=True)
    dest = dest_dir / file.filename
    if dest.exists() and force.lower() not in ("1", "true", "yes"):
        rel = str(dest.relative_to(parser.wiki_path))
        raise HTTPException(409, {"conflict": True, "existing_path": rel, "message": f"檔案 {rel} 已存在"})
    dest.write_bytes(content)
    _invalidate_parser()
    if len(content) > _LARGE_FILE_THRESHOLD:
        tracker = _get_tracker()
        task_id = tracker.create_task(file.filename)
        threading.Thread(target=_run_analysis_background, args=(tracker, task_id, parser, dest, type, file.filename), daemon=True).start()
        return {"status": "processing", "task_id": task_id, "message": "Large file — analysis started in background"}
    try:
        extracted_text = ContentExtractor().extract(dest)
        lang_info = LanguageDetector().detect(extracted_text)
        tags_yaml_path = parser.wiki_path / "tags.yaml"
        tags_result = ContentTagAnalyzer().analyze(content=extracted_text, lang_info=lang_info, tags_yaml_path=tags_yaml_path)
        llm_tags = _extract_tags_llm(extracted_text, tags_yaml_path)
        if llm_tags:
            seen = {t.lower() for t in tags_result['suggested_tags']}
            for t in llm_tags:
                if t.lower() not in seen: tags_result['suggested_tags'].append(t); seen.add(t.lower())
        TagRegistryUpdater(parser.wiki_path / "tags.yaml").update(suggested_tags=tags_result['suggested_tags'], suggested_category=tags_result['suggested_category'], related_suggestions=tags_result['related_suggestions'])
        _update_frontmatter_tags(dest, tags_result['suggested_tags'], page_type=tags_result.get("suggested_category", type) or "concept", confidence=tags_result.get("confidence", "medium"))
        _auto_link_related_pages(dest, parser, tags_result['suggested_tags'])
        parser.invalidate()
        _append_to_log(parser, "create", file.filename, f"Uploaded; tags={','.join(tags_result['suggested_tags'][:5])}")
        return {"path": str(dest.relative_to(parser.wiki_path)), "message": "File uploaded and analyzed successfully",
                "data": {"languages": lang_info.get('languages', []), "programming_languages": lang_info.get('programming_languages', []),
                         "domain": lang_info.get('domain', 'general'), "tags": tags_result['suggested_tags'],
                         "category": tags_result['suggested_category'], "confidence": tags_result['confidence']}}
    except Exception as e:
        _log.error("Analysis failed for %s: %s", file.filename, e)
        return {"path": str(dest.relative_to(parser.wiki_path)), "message": "File uploaded, but auto-analysis failed",
                "data": {"languages": [], "tags": [], "error": str(e)}}

@router.get("/analysis-progress/{task_id}")
async def get_analysis_progress(task_id: str) -> dict:
    tracker = _get_tracker()
    state = tracker.get(task_id)
    if state is None:
        raise HTTPException(404, f"Task not found: {task_id}")
    return {"task_id": state["task_id"], "filename": state["filename"], "status": state["status"],
            "progress": state["progress"], "steps": state["steps"], "result": state["result"], "error": state["error"]}

class ImportUrlRequest(BaseModel):
    url: str
    type: str = "auto"
    force: bool = False

@router.post("/import-url")
async def import_url(body: ImportUrlRequest) -> dict:
    from hermes_cli.content_extractor import ContentExtractor
    from hermes_cli.language_detector import LanguageDetector
    from hermes_cli.content_tag_analyzer import ContentTagAnalyzer
    from hermes_cli.tag_registry_updater import TagRegistryUpdater

    parser = _get_parser()
    if not parser.is_available():
        raise HTTPException(503, "Wiki is not configured.")
    clean_url = _strip_tracking_params(body.url)
    if not body.force:
        existing = _find_duplicate_url(parser.wiki_path, clean_url)
        if existing:
            raise HTTPException(409, {"conflict": True, "existing_path": existing, "message": f"此 URL 已匯入為 {existing}"})

    youtube_info = _detect_youtube_url(clean_url)
    github_info = _detect_github_url(clean_url) if not youtube_info else None

    if youtube_info:
        video_id = youtube_info["video_id"]
        metadata = _fetch_youtube_page_details(video_id)
        transcripts = _fetch_youtube_transcript(video_id)
        content = _build_youtube_page(metadata, clean_url, transcripts=transcripts).encode("utf-8")
        safe_title = re.sub(r'[-\s]+', '_', re.sub(r'[^\w\s-]', '', metadata.get("title", f"youtube-{video_id}")).strip()[:60])
        filename = f"{safe_title}.md"
        extra_tags = ["source:youtube"]
        github_metadata: dict = {}
    else:
        fetch_url = github_info["raw_url"] if github_info else clean_url
        try:
            import requests as _requests
            _resp = _requests.get(fetch_url, headers={"User-Agent": "Mozilla/5.0", "Accept": "text/html,*/*"}, timeout=30, allow_redirects=True)
            _resp.raise_for_status()
            raw_bytes, content_type = _resp.content, _resp.headers.get("Content-Type", "")
        except Exception as e:
            raise HTTPException(400, f"Failed to fetch URL: {e}")
        page_title = ""
        is_html = "text/html" in content_type or raw_bytes.lstrip()[:15].lower().startswith((b"<!doctype", b"<html"))
        if is_html and not github_info:
            md_text, page_title = _html_to_markdown(raw_bytes, clean_url)
            content = md_text.encode("utf-8") if isinstance(md_text, str) else md_text
        else:
            content = raw_bytes
        if github_info and github_info["type"] == "blob":
            filename = Path(github_info["path"]).name or "imported.md"
        elif page_title:
            safe = re.sub(r'[-\s]+', '_', re.sub(r'[^\w\s-]', '', page_title).strip()[:60])
            filename = f"{safe}.md" if safe else "imported.md"
        else:
            filename = Path(urllib.parse.urlparse(clean_url).path).name or "imported.md"
        if not filename.endswith(".md"): filename += ".md"
        extra_tags = ["source:github"] if github_info else []
        github_metadata = _fetch_github_metadata(github_info["owner"], github_info["repo"]) if github_info and github_info["type"] == "repo" else {}

    concepts_dir = parser.wiki_path / "concepts"
    concepts_dir.mkdir(parents=True, exist_ok=True)
    dest = concepts_dir / filename
    counter = 1
    while dest.exists():
        dest = concepts_dir / f"{filename.replace('.md', '')}_{counter}.md"; counter += 1
    dest.write_bytes(content)
    _invalidate_parser()

    if youtube_info or len(content) > _LARGE_FILE_THRESHOLD:
        tracker = _get_tracker()
        task_id = tracker.create_task(filename)
        threading.Thread(target=_run_analysis_background, args=(tracker, task_id, parser, dest, body.type, filename, clean_url),
                         kwargs={"extra_tags": extra_tags} if extra_tags else {}, daemon=True).start()
        return {"status": "processing", "task_id": task_id, "message": "Analysis started in background"}

    try:
        extracted_text = ContentExtractor().extract(dest)
        lang_info = LanguageDetector().detect(extracted_text)
        tags_yaml_path = parser.wiki_path / "tags.yaml"
        tags_result = ContentTagAnalyzer().analyze(content=extracted_text, lang_info=lang_info, tags_yaml_path=tags_yaml_path)
        llm_tags = _extract_tags_llm(extracted_text, tags_yaml_path)
        if llm_tags:
            seen = {t.lower() for t in tags_result['suggested_tags']}
            for t in llm_tags:
                if t.lower() not in seen: tags_result['suggested_tags'].append(t); seen.add(t.lower())
        all_tags = list(tags_result['suggested_tags'])
        for t in extra_tags:
            if t not in all_tags: all_tags.append(t)
        TagRegistryUpdater(parser.wiki_path / "tags.yaml").update(suggested_tags=tags_result['suggested_tags'], suggested_category=tags_result['suggested_category'], related_suggestions=tags_result['related_suggestions'])
        _update_frontmatter_tags(dest, all_tags, page_type=tags_result.get("suggested_category", body.type) or "concept", confidence=tags_result.get("confidence", "medium"))
        _auto_link_related_pages(dest, parser, all_tags)
        parser.invalidate()
        _append_to_log(parser, "ingest", filename, f"Imported from {body.url}; tags={','.join(all_tags[:5])}")
        response: dict[str, Any] = {"path": str(dest.relative_to(parser.wiki_path)), "message": "URL imported and analyzed successfully",
                                     "data": {"languages": lang_info.get('languages', []), "programming_languages": lang_info.get('programming_languages', []),
                                              "domain": lang_info.get('domain', 'general'), "tags": all_tags,
                                              "category": tags_result['suggested_category'], "confidence": tags_result['confidence']}}
        if github_metadata: response["data"]["github_metadata"] = github_metadata
        return response
    except Exception as e:
        _log.error("Analysis failed for %s: %s", filename, e)
        return {"path": str(dest.relative_to(parser.wiki_path)), "message": "URL imported, but auto-analysis failed",
                "data": {"languages": [], "tags": [], "error": str(e)}}

# ══════════════════════════════════════════════════════════════════════
# GitHub Sync endpoints
# ══════════════════════════════════════════════════════════════════════

try:
    from hermes_constants import get_hermes_home as _get_hermes_home
    _GITHUB_CONFIG_FILE = _get_hermes_home() / "github_sync_config.json"
except ImportError:
    _GITHUB_CONFIG_FILE = Path.home() / ".hermes" / "github_sync_config.json"

_auto_sync_timer: threading.Timer | None = None
_auto_sync_lock = threading.Lock()

def _load_github_config() -> dict:
    if _GITHUB_CONFIG_FILE.exists():
        try:
            return json.loads(_GITHUB_CONFIG_FILE.read_text())
        except Exception:
            pass
    return {"repo_url": "", "pat": "", "branch": "main", "auto_sync": "off"}

def _save_github_config(cfg: dict) -> None:
    _GITHUB_CONFIG_FILE.parent.mkdir(parents=True, exist_ok=True)
    _GITHUB_CONFIG_FILE.write_text(json.dumps(cfg, indent=2))

def _git(wiki_path: Path, *args: str) -> tuple[int, str, str]:
    result = subprocess.run(["git", "-C", str(wiki_path), *args], capture_output=True, text=True, env={**os.environ})
    return result.returncode, result.stdout.strip(), result.stderr.strip()

def _build_remote_url(repo_url: str, pat: str) -> str:
    if pat and "github.com" in repo_url and "@" not in repo_url:
        repo_url = repo_url.replace("https://", f"https://{pat}@")
    return repo_url

def _ensure_git_repo(wiki_path: Path, remote_url: str) -> None:
    if not (wiki_path / ".git").exists():
        _git(wiki_path, "init")
        _git(wiki_path, "config", "user.email", "hermes@localhost")
        _git(wiki_path, "config", "user.name", "Hermes")
    rc, _, _ = _git(wiki_path, "remote", "get-url", "origin")
    if rc != 0:
        _git(wiki_path, "remote", "add", "origin", remote_url)
    else:
        _git(wiki_path, "remote", "set-url", "origin", remote_url)

def _get_local_changes(wiki_path: Path) -> list[dict]:
    rc, out, _ = _git(wiki_path, "status", "--porcelain")
    if rc != 0 or not out: return []
    status_map = {"A": "added", "M": "modified", "D": "deleted", "?": "untracked", "R": "renamed"}
    changes = []
    for line in out.splitlines():
        if len(line) < 3: continue
        code = line[0].strip() or line[1].strip()
        changes.append({"status": status_map.get(code, code), "path": line[3:]})
    return changes

def _schedule_auto_sync() -> None:
    global _auto_sync_timer
    with _auto_sync_lock:
        if _auto_sync_timer is not None: _auto_sync_timer.cancel()
        cfg = _load_github_config()
        if cfg.get("auto_sync") != "hourly" or not cfg.get("repo_url") or not cfg.get("pat"): return
        _auto_sync_timer = threading.Timer(3600, _do_auto_sync)
        _auto_sync_timer.daemon = True
        _auto_sync_timer.start()

def _do_auto_sync() -> None:
    try:
        cfg = _load_github_config()
        if not cfg.get("repo_url") or not cfg.get("pat"): return
        wiki_path = _get_parser().wiki_path
        _ensure_git_repo(wiki_path, _build_remote_url(cfg["repo_url"], cfg["pat"]))
        changes = _get_local_changes(wiki_path)
        if not changes: return
        _git(wiki_path, "add", "-A")
        _git(wiki_path, "commit", "-m", f"Hermes auto-sync {datetime.now().strftime('%Y-%m-%d %H:%M')}")
        rc, _, err = _git(wiki_path, "push", "origin", cfg.get("branch", "main"))
        if rc != 0: _log.error("GitHub auto-sync push failed: %s", err)
    except Exception as e:
        _log.error("GitHub auto-sync error: %s", e)
    finally:
        _schedule_auto_sync()

class GitHubConfigRequest(BaseModel):
    repo_url: str; pat: str; branch: str = "main"; auto_sync: str = "off"

class GitHubPushRequest(BaseModel):
    message: str = ""

@router.get("/github/status")
async def github_status() -> dict:
    cfg = _load_github_config()
    wiki_path = _get_parser().wiki_path
    is_git_repo = (wiki_path / ".git").exists()
    changes: list[dict] = []
    last_commit: str | None = None
    if is_git_repo:
        changes = _get_local_changes(wiki_path)
        rc, out, _ = _git(wiki_path, "log", "-1", "--format=%ai %s")
        if rc == 0 and out: last_commit = out
    return {"configured": bool(cfg.get("repo_url") and cfg.get("pat")), "repo_url": cfg.get("repo_url", ""),
            "branch": cfg.get("branch", "main"), "auto_sync": cfg.get("auto_sync", "off"),
            "is_git_repo": is_git_repo, "changes": changes, "last_commit": last_commit}

@router.post("/github/config")
async def github_save_config(body: GitHubConfigRequest) -> dict:
    cfg = {"repo_url": body.repo_url.strip().rstrip("/"), "pat": body.pat.strip(),
           "branch": body.branch.strip() or "main",
           "auto_sync": body.auto_sync if body.auto_sync in ("off", "hourly") else "off"}
    _save_github_config(cfg)
    _schedule_auto_sync()
    return {"ok": True, "message": "設定已儲存"}

@router.post("/github/push")
async def github_push(body: GitHubPushRequest) -> dict:
    cfg = _load_github_config()
    if not cfg.get("repo_url") or not cfg.get("pat"):
        raise HTTPException(400, "請先設定 GitHub Repository URL 和 Personal Access Token")
    wiki_path = _get_parser().wiki_path
    branch = cfg.get("branch", "main")
    _ensure_git_repo(wiki_path, _build_remote_url(cfg["repo_url"], cfg["pat"]))
    changes = _get_local_changes(wiki_path)
    if not changes: return {"ok": True, "message": "沒有變更，已是最新版本", "changes": []}
    commit_msg = body.message.strip() or f"Hermes sync {datetime.now().strftime('%Y-%m-%d %H:%M')}"
    _git(wiki_path, "add", "-A")
    rc, _, err = _git(wiki_path, "commit", "-m", commit_msg)
    if rc != 0 and "nothing to commit" not in err:
        raise HTTPException(500, f"Commit 失敗: {err}")
    rc, _, err = _git(wiki_path, "push", "origin", branch)
    if rc != 0:
        rc, _, err = _git(wiki_path, "push", "origin", branch, "--force")
        if rc != 0: raise HTTPException(500, f"Push 失敗: {err}")
    return {"ok": True, "message": f"已上傳 {len(changes)} 個變更", "changes": changes}

@router.post("/github/pull")
async def github_pull() -> dict:
    cfg = _load_github_config()
    if not cfg.get("repo_url") or not cfg.get("pat"):
        raise HTTPException(400, "請先設定 GitHub Repository URL 和 Personal Access Token")
    wiki_path = _get_parser().wiki_path
    branch = cfg.get("branch", "main")
    _ensure_git_repo(wiki_path, _build_remote_url(cfg["repo_url"], cfg["pat"]))
    rc, _, err = _git(wiki_path, "fetch", "origin")
    if rc != 0: raise HTTPException(500, f"Fetch 失敗: {err}")
    rc, _, err = _git(wiki_path, "reset", "--hard", f"origin/{branch}")
    if rc != 0: raise HTTPException(500, f"還原失敗: {err}")
    _invalidate_parser()
    rc, count_out, _ = _git(wiki_path, "diff", "--name-only", "HEAD@{1}", "HEAD")
    changed_count = len(count_out.splitlines()) if count_out else 0
    return {"ok": True, "message": f"已從 GitHub 還原，更新了 {changed_count} 個檔案"}
