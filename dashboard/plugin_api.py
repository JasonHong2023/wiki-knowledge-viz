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

def _make_excerpt(content: str, max_len: int = 240) -> str:
    """Strip markdown syntax and return a short excerpt."""
    import re as _re
    text = _re.sub(r'\[\[([^\]|]+)(?:\|[^\]]+)?\]\]', r'\1', content)
    text = _re.sub(r'!\[.*?\]\(.*?\)', '', text)
    text = _re.sub(r'\[([^\]]+)\]\([^)]+\)', r'\1', text)
    text = _re.sub(r'^#{1,6}\s+', '', text, flags=_re.MULTILINE)
    text = _re.sub(r'[*_`~]{1,3}', '', text)
    text = _re.sub(r'^\s*[-*+>|]\s*', '', text, flags=_re.MULTILINE)
    text = _re.sub(r'\s+', ' ', text).strip()
    if len(text) > max_len:
        return text[:max_len].rsplit(' ', 1)[0] + '…'
    return text

@router.get("/index")
async def get_luhmann_index() -> dict[str, Any]:
    """Luhmann 編號索引：按標籤分類自動生成樹狀階層編號。"""
    from hermes_cli.tag_registry_updater import classify_tag

    CATEGORY_ORDER = ["AI", "技術", "程式語言", "API", "概念", "來源", "語言", "格式", "主題"]

    parser = _get_parser()
    if not parser.is_available():
        raise HTTPException(503, "Wiki is not configured.")
    pages = parser.get_pages(sort="title", order="asc")

    # 每頁取最高優先分類
    def primary_category(page: dict) -> str:
        tags = page.get("tags", [])
        for cat in CATEGORY_ORDER:
            for t in tags:
                if classify_tag(t) == cat:
                    return cat
        return "主題"

    # 按分類分組
    buckets: dict[str, list[dict]] = {c: [] for c in CATEGORY_ORDER}
    for p in pages:
        cat = primary_category(p)
        buckets[cat].append(p)

    # 建立 Luhmann 編號樹
    tree = []
    cat_num = 0
    for cat in CATEGORY_ORDER:
        items = buckets[cat]
        if not items:
            continue
        cat_num += 1
        children = []
        for i, p in enumerate(items, 1):
            children.append({
                "id": f"{cat_num}.{i}",
                "path": p["path"],
                "title": p.get("title", p["path"]),
                "type": p.get("type", ""),
                "tags": p.get("tags", [])[:4],
                "confidence": p.get("confidence", ""),
                "updated": p.get("updated", ""),
            })
        tree.append({
            "id": str(cat_num),
            "label": cat,
            "count": len(items),
            "children": children,
        })

    return {"tree": tree, "total": len(pages)}

@router.get("/cards")
async def get_cards(
    type: str | None = Query(None, alias="type"),
    tag: list[str] | None = Query(None, alias="tag"),
    q: str | None = Query(None),
    sort: str = Query("updated", alias="sort"),
    order: str = Query("desc", alias="order"),
) -> list[dict[str, Any]]:
    """Hypercard 摘要：每頁 title + excerpt + tags，適合卡片格瀏覽。"""
    parser = _get_parser()
    if not parser.is_available():
        raise HTTPException(503, "Wiki is not configured.")
    pages = parser.get_pages(page_type=type, tag=tag, sort=sort, order=order)
    if q:
        ql = q.lower()
        pages = [p for p in pages if ql in p.get("title", "").lower() or any(ql in t.lower() for t in p.get("tags", []))]
    return [
        {
            "path": p["path"],
            "title": p.get("title", p["path"]),
            "type": p.get("type", ""),
            "tags": p.get("tags", [])[:6],
            "confidence": p.get("confidence", ""),
            "updated": p.get("updated", ""),
            "excerpt": _make_excerpt(p.get("content", "")),
            "inbound_count": p.get("inbound_link_count", 0),
            "outbound_count": len(p.get("outboundLinks", [])),
        }
        for p in pages
    ]

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
    pages = parser.get_pages(page_type=type, tag=tag, confidence=confidence, sort=sort, order=order)
    try:
        extras = _read_page_extras(Path(parser.wiki_path))
        for page in pages:
            ex = extras.get(page.get("path", ""), {})
            page["mastery"] = ex.get("mastery", 0)
            page["bloom"]   = ex.get("bloom", "")
    except Exception:
        pass
    return pages

@router.get("/pages/{path:path}")
async def get_page(path: str) -> dict[str, Any]:
    parser = _get_parser()
    if not parser.is_available():
        raise HTTPException(503, "Wiki is not configured.")
    page = parser.get_page(path)
    if page is None:
        raise HTTPException(404, f"Page not found: {path}")
    return page

@router.get("/pages/{path:path}/fire")
async def get_page_fire(path: str) -> dict[str, Any]:
    """產生頁面的 FIRE 四向表格（Fact / Index / Relation / Encyclopedia）。
    使用 LLM 從頁面內容萃取結構化知識。
    """
    parser = _get_parser()
    if not parser.is_available():
        raise HTTPException(503, "Wiki is not configured.")
    page = parser.get_page(path)
    if page is None:
        raise HTTPException(404, f"Page not found: {path}")

    content = page.get("content", "")[:4000]
    title = page.get("title", path)
    tags = page.get("tags", [])
    all_pages = parser.get_pages()
    related = [p["title"] for p in all_pages if path in p.get("inboundLinks", []) + p.get("outboundLinks", [])]

    prompt = f"""你是知識管理助手。請根據以下 Markdown 文章，輸出 FIRE 四向分析，以 JSON 格式回傳。

文章標題：{title}
標籤：{', '.join(tags)}
內容：
{content}

請輸出：
{{
  "fact": ["事實1", "事實2", ...],        // 3~6 條客觀事實陳述
  "index": ["索引關鍵字1", ...],           // 5~10 個索引關鍵字
  "relation": ["相關概念1", ...],          // 3~6 個相關概念或連結
  "encyclopedia": "100~150字的百科摘要"    // 簡短的百科式說明
}}

只回傳 JSON，不要其他說明。"""

    try:
        import httpx
        cfg_path = Path.home() / ".hermes" / "config.yaml"
        api_key, model, base_url = "", "claude-haiku-4-5-20251001", "https://api.anthropic.com"
        if cfg_path.exists():
            import yaml
            cfg = yaml.safe_load(cfg_path.read_text("utf-8")) or {}
            prov = (cfg.get("providers") or {})
            for p in prov.values() if isinstance(prov, dict) else []:
                if isinstance(p, dict) and p.get("api_key"):
                    api_key = p["api_key"]
                    model = p.get("model", model)
                    base_url = p.get("base_url", base_url).rstrip("/")
                    break

        if not api_key:
            api_key = os.getenv("ANTHROPIC_API_KEY", "")

        if not api_key:
            raise HTTPException(503, "No LLM API key configured.")

        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                f"{base_url}/v1/messages",
                headers={"x-api-key": api_key, "anthropic-version": "2023-06-01", "content-type": "application/json"},
                json={"model": model, "max_tokens": 800, "messages": [{"role": "user", "content": prompt}]},
            )
            resp.raise_for_status()
            text = resp.json()["content"][0]["text"].strip()
            start, end = text.find("{"), text.rfind("}") + 1
            fire = json.loads(text[start:end]) if start >= 0 else {}
    except HTTPException:
        raise
    except Exception as e:
        _log.warning("FIRE LLM error: %s", e)
        fire = {
            "fact": [f"此頁面包含 {len(content)} 字的內容"],
            "index": tags[:8],
            "relation": related[:6],
            "encyclopedia": f"{title}：{content[:120].strip()}…",
        }

    return {
        "path": path,
        "title": title,
        "tags": tags,
        "related_pages": related[:10],
        "fire": fire,
    }

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

class _SaveRelationsRequest(BaseModel):
    relations: list[dict]


@router.post("/pages/{page_path:path}/classify-relations")
async def classify_page_relations(page_path: str) -> dict:
    """使用 LLM 將頁面的 wikilink 分類為語義邊類型。"""
    parser = _get_parser()
    if not parser.is_available():
        raise HTTPException(503, "Wiki is not configured.")
    wiki_path = Path(parser.wiki_path)
    # 支援 concepts/ 前綴或直接 stem
    stem = Path(page_path).stem
    md_file = wiki_path / "concepts" / f"{stem}.md"
    if not md_file.exists():
        raise HTTPException(404, f"Page not found: {page_path}")

    text = md_file.read_text(encoding="utf-8")
    wikilinks = list(dict.fromkeys(re.findall(r'\[\[([^\]|]+?)(?:\|[^\]]+)?\]\]', text)))
    if not wikilinks:
        return {"suggestions": []}

    fm: dict = {}
    content_start = 0
    import yaml as _yaml
    if text.startswith("---\n"):
        end = text.find("\n---", 4)
        if end != -1:
            fm = _yaml.safe_load(text[4:end]) or {}
            content_start = end + 4
    title = fm.get("title", stem)
    excerpt = text[content_start:content_start + 500].strip()

    links_list = "\n".join(f"- {l.strip()}" for l in wikilinks)
    prompt = f"""你是知識管理助手，正在分析一篇個人知識庫文章。

文章標題：{title}
內容摘要：{excerpt[:400]}

請將以下每個 wikilink 與本文的關係分類為其中一種：
- prerequisite：理解本文「之前」必須先看的概念（本文依賴對方）
- contains：本文包含或覆蓋此連結作為子主題或組成部分
- applies_to：本文的概念「應用於」此連結所代表的場景
- related：一般關係，重要性相近，無明顯依賴方向

要分類的 wikilinks：
{links_list}

只回傳 JSON 陣列，不要有任何說明或 markdown 格式：
[{{"target": "link名稱", "type": "related|prerequisite|contains|applies_to", "reason": "簡短理由"}}]"""

    try:
        from agent.auxiliary_client import get_async_text_auxiliary_client
        client, model = get_async_text_auxiliary_client("wiki_tars")
        if not client:
            raise RuntimeError("No LLM configured")
        resp = await client.chat.completions.create(
            model=model or "claude-haiku-4-5-20251001",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=800,
        )
        raw = resp.choices[0].message.content or "[]"
        start = raw.find("[")
        end_idx = raw.rfind("]") + 1
        suggestions = json.loads(raw[start:end_idx]) if start >= 0 and end_idx > start else []
    except Exception as exc:
        logger.warning("classify_page_relations LLM error: %s", exc)
        suggestions = []

    return {"suggestions": suggestions}


@router.put("/pages/{page_path:path}/relations")
async def save_page_relations(page_path: str, req: _SaveRelationsRequest) -> dict:
    """將 relations 寫入頁面 frontmatter。"""
    parser = _get_parser()
    if not parser.is_available():
        raise HTTPException(503, "Wiki is not configured.")
    wiki_path = Path(parser.wiki_path)
    stem = Path(page_path).stem
    md_file = wiki_path / "concepts" / f"{stem}.md"
    if not md_file.exists():
        raise HTTPException(404, f"Page not found: {page_path}")

    import yaml as _yaml
    text = md_file.read_text(encoding="utf-8")
    VALID_TYPES = {"prerequisite", "contains", "related", "applies_to"}
    clean = [{"target": r["target"], "type": r["type"]} for r in req.relations if r.get("target") and r.get("type") in VALID_TYPES]

    if text.startswith("---\n"):
        end = text.find("\n---", 4)
        if end != -1:
            fm = _yaml.safe_load(text[4:end]) or {}
            rest = text[end + 4:]
            if clean:
                fm["relations"] = clean
            else:
                fm.pop("relations", None)
            new_fm = _yaml.dump(fm, allow_unicode=True, default_flow_style=False).rstrip()
            md_file.write_text(f"---\n{new_fm}\n---{rest}", encoding="utf-8")
            _invalidate_parser()
            return {"ok": True, "relations": clean}

    raise HTTPException(400, "Page has no frontmatter")


class _SetMasteryRequest(BaseModel):
    mastery: int

class _SetBloomRequest(BaseModel):
    bloom: str

_VALID_BLOOM = {"remember", "understand", "apply", "analyze", "evaluate", "create", ""}


@router.put("/pages/{page_path:path}/bloom")
async def set_page_bloom(page_path: str, req: _SetBloomRequest) -> dict:
    """將 bloom 層次寫入 frontmatter。"""
    if req.bloom not in _VALID_BLOOM:
        raise HTTPException(400, f"Invalid bloom level: {req.bloom}")
    parser = _get_parser()
    if not parser.is_available():
        raise HTTPException(503, "Wiki is not configured.")
    wiki_path = Path(parser.wiki_path)
    stem = Path(page_path).stem
    md_file = wiki_path / "concepts" / f"{stem}.md"
    if not md_file.exists():
        raise HTTPException(404, f"Page not found: {page_path}")
    import yaml as _yaml
    text = md_file.read_text(encoding="utf-8")
    if text.startswith("---\n"):
        end = text.find("\n---", 4)
        if end != -1:
            fm = _yaml.safe_load(text[4:end]) or {}
            rest = text[end + 4:]
            if req.bloom:
                fm["bloom"] = req.bloom
            else:
                fm.pop("bloom", None)
            new_fm = _yaml.dump(fm, allow_unicode=True, default_flow_style=False).rstrip()
            md_file.write_text(f"---\n{new_fm}\n---{rest}", encoding="utf-8")
            _invalidate_parser()
            return {"ok": True, "bloom": req.bloom}
    raise HTTPException(400, "Page has no frontmatter")


@router.post("/pages/{page_path:path}/classify-bloom")
async def classify_page_bloom(page_path: str) -> dict:
    """使用 LLM 推斷頁面的布魯姆認知層次。"""
    parser = _get_parser()
    if not parser.is_available():
        raise HTTPException(503, "Wiki is not configured.")
    wiki_path = Path(parser.wiki_path)
    stem = Path(page_path).stem
    md_file = wiki_path / "concepts" / f"{stem}.md"
    if not md_file.exists():
        raise HTTPException(404, f"Page not found: {page_path}")

    import yaml as _yaml
    text = md_file.read_text(encoding="utf-8")
    fm: dict = {}
    content_start = 0
    if text.startswith("---\n"):
        end = text.find("\n---", 4)
        if end != -1:
            fm = _yaml.safe_load(text[4:end]) or {}
            content_start = end + 4
    title = fm.get("title", stem)
    excerpt = text[content_start:content_start + 600].strip()

    prompt = f"""你是知識管理助手，請根據文章內容判斷它對讀者的認知層次需求（布魯姆分類法）。

文章標題：{title}
內容摘要：{excerpt[:500]}

六個層次定義：
- remember（記憶）：識別、列舉事實或定義
- understand（理解）：解釋、總結、分類概念
- apply（應用）：在新情境使用已知概念或程序
- analyze（分析）：拆解、比較、區分組件或關係
- evaluate（評估）：評判、論證、做出有根據的決策
- create（創作）：設計、組合、生成新想法或作品

只回傳 JSON，不要有說明或 markdown：
{{"bloom": "remember|understand|apply|analyze|evaluate|create", "reason": "簡短理由"}}"""

    try:
        from agent.auxiliary_client import get_async_text_auxiliary_client
        client, model = get_async_text_auxiliary_client("wiki_tars")
        if not client:
            raise RuntimeError("No LLM configured")
        resp = await client.chat.completions.create(
            model=model or "claude-haiku-4-5-20251001",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=200,
        )
        raw = resp.choices[0].message.content or "{}"
        start = raw.find("{"); end_idx = raw.rfind("}") + 1
        result = json.loads(raw[start:end_idx]) if start >= 0 and end_idx > start else {}
        bloom = result.get("bloom", "")
        if bloom not in _VALID_BLOOM:
            bloom = ""
        return {"bloom": bloom, "reason": result.get("reason", "")}
    except Exception as exc:
        logger.warning("classify_page_bloom error: %s", exc)
        return {"bloom": "", "reason": ""}


@router.get("/next-to-learn")
async def get_next_to_learn(
    min_prereq: int = Query(3, alias="min_prereq"),
    max_self: int = Query(1, alias="max_self"),
    limit: int = Query(6),
) -> list[dict]:
    """推薦：前置依賴皆達最低熟練度，但自身尚未學習的頁面。"""
    parser = _get_parser()
    if not parser.is_available():
        raise HTTPException(503, "Wiki is not configured.")
    wiki_path = Path(parser.wiki_path)
    relation_map = _read_page_relations(wiki_path)
    extras = _read_page_extras(wiki_path)
    pages = parser.get_pages()
    page_map = {p["path"]: p for p in pages}

    prereq_map: dict[str, list[str]] = {}
    for src, rels in relation_map.items():
        for rel in rels:
            if rel.get("type") == "prerequisite":
                prereq_map.setdefault(src, []).append(rel["target"])

    results = []
    for path in page_map:
        self_mastery = extras.get(path, {}).get("mastery", 0)
        if self_mastery > max_self:
            continue
        prereqs = prereq_map.get(path, [])
        if not prereqs:
            continue
        if all(extras.get(p, {}).get("mastery", 0) >= min_prereq for p in prereqs):
            pd = page_map[path]
            results.append({
                "path":         path,
                "title":        pd.get("title", path),
                "type":         pd.get("type", "concept"),
                "mastery":      self_mastery,
                "bloom":        extras.get(path, {}).get("bloom", ""),
                "prereq_count": len(prereqs),
            })

    results.sort(key=lambda x: (-x["prereq_count"], x["title"]))
    return results[:limit]


@router.put("/pages/{page_path:path}/mastery")
async def set_page_mastery(page_path: str, req: _SetMasteryRequest) -> dict:
    """將 mastery 等級（0-5）寫入 frontmatter。"""
    if not 0 <= req.mastery <= 5:
        raise HTTPException(400, "mastery must be 0-5")
    parser = _get_parser()
    if not parser.is_available():
        raise HTTPException(503, "Wiki is not configured.")
    wiki_path = Path(parser.wiki_path)
    stem = Path(page_path).stem
    md_file = wiki_path / "concepts" / f"{stem}.md"
    if not md_file.exists():
        raise HTTPException(404, f"Page not found: {page_path}")
    import yaml as _yaml
    text = md_file.read_text(encoding="utf-8")
    if text.startswith("---\n"):
        end = text.find("\n---", 4)
        if end != -1:
            fm = _yaml.safe_load(text[4:end]) or {}
            rest = text[end + 4:]
            fm["mastery"] = req.mastery
            new_fm = _yaml.dump(fm, allow_unicode=True, default_flow_style=False).rstrip()
            md_file.write_text(f"---\n{new_fm}\n---{rest}", encoding="utf-8")
            _invalidate_parser()
            return {"ok": True, "mastery": req.mastery}
    raise HTTPException(400, "Page has no frontmatter")


@router.get("/pages/{page_path:path}/learning-path")
async def get_learning_path(page_path: str) -> dict:
    """沿 prerequisite 邊反向 DFS，回傳從前置依賴到目標頁的學習順序。"""
    parser = _get_parser()
    if not parser.is_available():
        raise HTTPException(503, "Wiki is not configured.")
    wiki_path = Path(parser.wiki_path)
    relation_map = _read_page_relations(wiki_path)
    pages = parser.get_pages()
    page_map = {p["path"]: p for p in pages}
    extras = _read_page_extras(wiki_path)

    # prereq_map[A] = [B, C] 表示 A 需要先學 B, C
    prereq_map: dict[str, list[str]] = {}
    for src, rels in relation_map.items():
        for rel in rels:
            if rel.get("type") == "prerequisite":
                prereq_map.setdefault(src, []).append(rel["target"])

    # DFS post-order → 深層前置節點先出，目標頁最後
    visited: set[str] = set()
    result: list[str] = []

    def dfs(node: str) -> None:
        if node in visited:
            return
        visited.add(node)
        for prereq in prereq_map.get(node, []):
            dfs(prereq)
        result.append(node)

    dfs(page_path)

    chain = []
    for p in result:
        pd = page_map.get(p, {})
        ex = extras.get(p, {})
        chain.append({
            "path":    p,
            "title":   pd.get("title", p.split("/")[-1]),
            "type":    pd.get("type", "concept"),
            "mastery": ex.get("mastery", 0),
        })

    return {"path": page_path, "chain": chain, "depth": len(chain) - 1}


def _read_page_extras(wiki_path: "Path") -> dict[str, dict]:
    """一次讀取所有 concept 頁面的 mastery + bloom frontmatter 欄位。"""
    import yaml as _yaml
    result: dict[str, dict] = {}
    concepts_dir = wiki_path / "concepts"
    if not concepts_dir.exists():
        return result
    for md_file in concepts_dir.glob("*.md"):
        try:
            text = md_file.read_text(encoding="utf-8")
            if not text.startswith("---\n"):
                continue
            end = text.find("\n---", 4)
            if end == -1:
                continue
            fm = _yaml.safe_load(text[4:end]) or {}
            path = f"concepts/{md_file.stem}"
            result[path] = {
                "mastery": max(0, min(5, int(fm.get("mastery", 0)))),
                "bloom":   str(fm.get("bloom", "")),
            }
        except Exception:
            pass
    return result


def _read_page_relations(wiki_path: "Path") -> dict[str, list[dict]]:
    """讀取所有頁面 frontmatter 中的 relations: 欄位，回傳 {path: [{target, type}]}。"""
    import yaml as _yaml
    result: dict[str, list[dict]] = {}
    concepts_dir = wiki_path / "concepts"
    if not concepts_dir.exists():
        return result
    for md_file in concepts_dir.glob("*.md"):
        try:
            text = md_file.read_text(encoding="utf-8")
            if not text.startswith("---\n"):
                continue
            end = text.find("\n---", 4)
            if end == -1:
                continue
            fm = _yaml.safe_load(text[4:end]) or {}
            rels = fm.get("relations", [])
            if isinstance(rels, list) and rels:
                path = f"concepts/{md_file.stem}"
                result[path] = [
                    r for r in rels
                    if isinstance(r, dict) and r.get("target") and r.get("type")
                ]
        except Exception:
            pass
    return result


@router.get("/graph")
async def get_graph() -> dict[str, list[dict[str, Any]]]:
    parser = _get_parser()
    if not parser.is_available():
        raise HTTPException(503, "Wiki is not configured.")
    raw = parser.get_graph()
    pages = parser.get_pages()

    # 建立 path → tags 對照表，計算節點權重與邊的標籤共享數
    tag_map: dict[str, set[str]] = {p["path"]: set(p.get("tags", [])) for p in pages}
    inbound_map: dict[str, int] = {p["path"]: p.get("inbound_link_count", 0) for p in pages}

    try:
        extras = _read_page_extras(Path(parser.wiki_path))
    except Exception:
        extras = {}

    for node in raw["nodes"]:
        node["inbound_count"] = inbound_map.get(node["id"], 0)
        ex = extras.get(node["id"], {})
        node["mastery"] = ex.get("mastery", 0)
        node["bloom"]   = ex.get("bloom", "")

    # 預設所有 wikilink 邊為 related
    for edge in raw["edges"]:
        src_tags = tag_map.get(edge["source"], set())
        tgt_tags = tag_map.get(edge["target"], set())
        edge["shared_tags"] = len(src_tags & tgt_tags)
        edge["rel_type"] = "related"

    # 讀取 frontmatter relations: 覆蓋或新增語義邊
    try:
        relation_map = _read_page_relations(Path(parser.wiki_path))
    except Exception:
        relation_map = {}

    existing = {(e["source"], e["target"]): e for e in raw["edges"]}
    all_paths = {n["id"] for n in raw["nodes"]}
    VALID_TYPES = {"prerequisite", "contains", "related", "applies_to"}

    for src_path, rels in relation_map.items():
        if src_path not in all_paths:
            continue
        for rel in rels:
            tgt = rel.get("target", "").strip()
            if not tgt.startswith("concepts/"):
                tgt = f"concepts/{tgt}"
            rel_type = rel.get("type", "related")
            if rel_type not in VALID_TYPES:
                rel_type = "related"
            if tgt not in all_paths:
                continue
            key = (src_path, tgt)
            rev = (tgt, src_path)
            if key in existing:
                existing[key]["rel_type"] = rel_type
            elif rev in existing and rel_type == "related":
                pass  # 雙向 related 不重複
            else:
                new_edge = {
                    "source": src_path,
                    "target": tgt,
                    "type": "",
                    "shared_tags": len(tag_map.get(src_path, set()) & tag_map.get(tgt, set())),
                    "rel_type": rel_type,
                }
                raw["edges"].append(new_edge)
                existing[key] = new_edge

    return raw

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
    import tempfile as _tempfile

    parser = _get_parser()
    if not parser.is_available():
        raise HTTPException(503, "Wiki is not configured.")
    if not file.filename:
        raise HTTPException(400, "No filename provided.")
    supported_extensions = ['.md', '.markdown', '.txt', '.epub', '.pdf', '.pptx', '.xlsx', '.png', '.jpg', '.jpeg', '.gif', '.webp']
    file_ext = '.' + file.filename.split('.')[-1].lower()
    if file_ext not in supported_extensions:
        raise HTTPException(400, f"Unsupported file format: {file_ext}")
    content = await file.read()

    image_extensions = {'.png', '.jpg', '.jpeg', '.gif', '.webp'}
    md_extensions = {'.md', '.markdown', '.txt'}
    # Non-MD non-image formats need conversion to .md first
    convert_extensions = {'.epub', '.pdf', '.pptx', '.xlsx'}

    if file_ext in image_extensions:
        # Images saved directly to images/
        dest_dir = parser.wiki_path / "images"
        dest_dir.mkdir(parents=True, exist_ok=True)
        dest = dest_dir / file.filename
        if dest.exists() and force.lower() not in ("1", "true", "yes"):
            rel = str(dest.relative_to(parser.wiki_path))
            raise HTTPException(409, {"conflict": True, "existing_path": rel, "message": f"檔案 {rel} 已存在"})
        dest.write_bytes(content)
        _invalidate_parser()
        display_name = file.filename
    elif file_ext in convert_extensions:
        # Convert to Markdown first, save as .md using extracted title
        tmp_fd, tmp_path_str = _tempfile.mkstemp(suffix=file_ext)
        try:
            import os as _os
            _os.write(tmp_fd, content)
            _os.close(tmp_fd)
            extracted_text = ContentExtractor().extract(Path(tmp_path_str))
        except Exception as e:
            raise HTTPException(400, f"Failed to extract content: {e}")
        finally:
            try: Path(tmp_path_str).unlink()
            except: pass

        # Get title from first H1 heading in extracted text
        book_title = ""
        for line in extracted_text.split('\n'):
            stripped = line.strip()
            if stripped.startswith('# '):
                book_title = stripped[2:].strip()
                break
        if not book_title:
            book_title = Path(file.filename).stem

        safe = re.sub(r'[-\s]+', '_', re.sub(r'[^\w\s一-鿿㐀-䶿-]', '', book_title).strip())[:80]
        md_filename = f"{safe}.md" if safe else "imported.md"

        dest_dir = parser.wiki_path / "concepts"
        dest_dir.mkdir(parents=True, exist_ok=True)
        dest = dest_dir / md_filename
        if dest.exists() and force.lower() not in ("1", "true", "yes"):
            rel = str(dest.relative_to(parser.wiki_path))
            raise HTTPException(409, {"conflict": True, "existing_path": rel, "message": f"檔案 {rel} 已存在"})
        counter = 1
        while dest.exists():
            dest = dest_dir / f"{md_filename[:-3]}_{counter}.md"; counter += 1
        dest.write_text(extracted_text, encoding='utf-8')
        content = extracted_text.encode('utf-8')  # use MD size for threshold
        display_name = md_filename
    else:
        # .md / .markdown / .txt — save as-is
        dest_dir = parser.wiki_path / "concepts"
        dest_dir.mkdir(parents=True, exist_ok=True)
        dest = dest_dir / file.filename
        if dest.exists() and force.lower() not in ("1", "true", "yes"):
            rel = str(dest.relative_to(parser.wiki_path))
            raise HTTPException(409, {"conflict": True, "existing_path": rel, "message": f"檔案 {rel} 已存在"})
        dest.write_bytes(content)
        display_name = file.filename

    _invalidate_parser()
    if len(content) > _LARGE_FILE_THRESHOLD:
        tracker = _get_tracker()
        task_id = tracker.create_task(display_name)
        threading.Thread(target=_run_analysis_background, args=(tracker, task_id, parser, dest, type, display_name), daemon=True).start()
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
        _append_to_log(parser, "create", display_name, f"Uploaded from {file.filename}; tags={','.join(tags_result['suggested_tags'][:5])}")
        return {"path": str(dest.relative_to(parser.wiki_path)), "message": "File uploaded and analyzed successfully",
                "data": {"languages": lang_info.get('languages', []), "programming_languages": lang_info.get('programming_languages', []),
                         "domain": lang_info.get('domain', 'general'), "tags": tags_result['suggested_tags'],
                         "category": tags_result['suggested_category'], "confidence": tags_result['confidence']}}
    except Exception as e:
        _log.error("Analysis failed for %s: %s", display_name, e)
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
            _sess = _requests.Session()
            _sess.headers.update({
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
                "Accept-Language": "zh-TW,zh;q=0.9,en-US;q=0.8,en;q=0.7",
                "Accept-Encoding": "gzip, deflate, br",
                "Sec-Fetch-Dest": "document",
                "Sec-Fetch-Mode": "navigate",
                "Sec-Fetch-Site": "none",
                "Sec-Fetch-User": "?1",
                "Sec-Ch-Ua": '"Google Chrome";v="125", "Chromium";v="125", "Not.A/Brand";v="24"',
                "Sec-Ch-Ua-Mobile": "?0",
                "Sec-Ch-Ua-Platform": '"Windows"',
                "Cache-Control": "max-age=0",
                "Upgrade-Insecure-Requests": "1",
                "DNT": "1",
                "Connection": "keep-alive",
            })

            # --- 第一步：直連 ---
            _resp = None
            _need_jina = False
            try:
                _resp = _sess.get(fetch_url, timeout=20, allow_redirects=True)
                if _resp.status_code in (400, 403, 429, 503):
                    _sess.headers.update({
                        "Referer": "https://www.google.com/",
                        "Sec-Fetch-Site": "cross-site",
                        "Origin": "https://www.google.com",
                    })
                    _resp = _sess.get(fetch_url, timeout=20, allow_redirects=True)
                # JS challenge / bot wall / 任何非 2xx
                _need_jina = not _resp.ok or (
                    b"window.onload" in _resp.content[:2000] and
                    _resp.content[:200].lower().lstrip().startswith(b"<html")
                )
            except Exception:
                _need_jina = True  # timeout / SSL error → 直接交給 Jina

            # --- 第二步：Jina Reader fallback ---
            _jina_title = ""
            if _need_jina and not github_info:
                _jina_r = _requests.get(
                    f"https://r.jina.ai/{fetch_url}",
                    headers={"Accept": "text/plain", "X-Return-Format": "markdown"},
                    timeout=50,
                )
                _jina_r.raise_for_status()
                _jt = _jina_r.text
                _tm = re.search(r'^Title:\s*(.+)$', _jt, re.MULTILINE)
                _jina_title = _tm.group(1).strip() if _tm else ""
                _cm = _jt.find("Markdown Content:")
                _jina_md = _jt[_cm + len("Markdown Content:"):].strip() if _cm >= 0 else _jt
                raw_bytes, content_type = _jina_md.encode("utf-8"), "text/plain"
            else:
                if _resp is None:
                    raise HTTPException(400, "Failed to fetch URL: no response")
                _resp.raise_for_status()
                raw_bytes, content_type = _resp.content, _resp.headers.get("Content-Type", "")
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(400, f"Failed to fetch URL: {e}")
        page_title = _jina_title
        is_html = "text/html" in content_type or raw_bytes.lstrip()[:15].lower().startswith((b"<!doctype", b"<html"))
        if not _jina_title and is_html and not github_info:
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
# Export endpoints
# ══════════════════════════════════════════════════════════════════════

from fastapi.responses import HTMLResponse, JSONResponse

_HTML_EXPORT_TEMPLATE = """<!DOCTYPE html>
<html lang="zh-TW">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
<style>
  body {{ font-family: system-ui, sans-serif; max-width: 860px; margin: 2rem auto; padding: 0 1rem; line-height: 1.7; color: #1a1a1a; }}
  h1 {{ font-size: 1.6rem; border-bottom: 2px solid #eee; padding-bottom: .5rem; }}
  h2,h3 {{ margin-top: 1.5rem; }}
  .meta {{ color: #666; font-size: .85rem; margin-bottom: 1.5rem; }}
  .tag {{ display: inline-block; background: #f0f0f0; border-radius: 3px; padding: 1px 6px; margin: 0 2px; font-size: .8rem; }}
  pre {{ background: #f6f8fa; border-radius: 6px; padding: 1rem; overflow-x: auto; }}
  code {{ background: #f6f8fa; padding: 1px 4px; border-radius: 3px; }}
  hr {{ border: none; border-top: 1px solid #eee; margin: 2rem 0; }}
  .toc {{ background: #f9f9f9; border-left: 3px solid #0078d4; padding: .75rem 1rem; margin-bottom: 2rem; }}
  .toc a {{ color: #0078d4; text-decoration: none; display: block; padding: 1px 0; }}
</style>
</head>
<body>
{body}
<hr><p style="color:#999;font-size:.8rem">Exported from LLM-Wiki · {date}</p>
</body>
</html>"""

@router.get("/export")
async def export_pages(
    paths: str = Query("", description="逗號分隔的頁面路徑，空白=全部"),
    fmt: str = Query("html", description="html 或 json"),
) -> Any:
    """匯出 wiki 頁面為 HTML 或 JSON bundle。"""
    parser = _get_parser()
    if not parser.is_available():
        raise HTTPException(503, "Wiki is not configured.")

    all_pages = parser.get_pages()
    if paths.strip():
        want = {p.strip() for p in paths.split(",")}
        selected = [p for p in all_pages if p["path"] in want]
    else:
        selected = all_pages

    if not selected:
        raise HTTPException(404, "No pages found.")

    if fmt == "json":
        return JSONResponse({"pages": selected, "count": len(selected)},
                            headers={"Content-Disposition": "attachment; filename=wiki-export.json"})

    # HTML: 單頁多文章
    try:
        import markdown as _md
        def render_md(text: str) -> str:
            return _md.markdown(text, extensions=["fenced_code", "tables"])
    except ImportError:
        import html as _html
        def render_md(text: str) -> str:  # type: ignore[misc]
            return "<pre>" + _html.escape(text) + "</pre>"

    parts = []
    toc = ['<div class="toc"><strong>目錄</strong>']
    for p in selected:
        pid = p["path"].replace("/", "-")
        toc.append(f'<a href="#{pid}">{p.get("title", p["path"])}</a>')
    toc.append("</div>")

    for p in selected:
        pid = p["path"].replace("/", "-")
        tags_html = " ".join(f'<span class="tag">{t}</span>' for t in p.get("tags", []))
        meta = f'<p class="meta">類型：{p.get("type","—")} · 標籤：{tags_html or "—"} · 信心度：{p.get("confidence","—")}</p>'
        body_html = render_md(p.get("content", ""))
        parts.append(f'<article id="{pid}"><h1>{p.get("title", p["path"])}</h1>{meta}{body_html}</article><hr>')

    full_body = "\n".join(toc) + "\n" + "\n".join(parts)
    title = f"Wiki Export ({len(selected)} pages)"
    html = _HTML_EXPORT_TEMPLATE.format(
        title=title, body=full_body,
        date=datetime.now().strftime("%Y-%m-%d %H:%M")
    )
    return HTMLResponse(html, headers={"Content-Disposition": f'attachment; filename="wiki-export.html"'})

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

# ── Mandalart ──────────────────────────────────────────────────────────────

import uuid as _uuid

def _mandalart_path() -> Path:
    parser = _get_parser()
    if parser and parser.is_available():
        base = parser.wiki_path / ".mandalart"
    else:
        base = Path.home() / ".hermes" / "llm-wiki-mandalart"
    base.mkdir(parents=True, exist_ok=True)
    return base / "boards.json"

def _load_boards() -> list[dict]:
    p = _mandalart_path()
    if not p.exists():
        return []
    try:
        data = json.loads(p.read_text(encoding="utf-8"))
        return data if isinstance(data, list) else []
    except Exception:
        return []

def _save_boards(boards: list[dict]) -> None:
    p = _mandalart_path()
    p.write_text(json.dumps(boards, ensure_ascii=False, indent=2), encoding="utf-8")

def _shadow_boards_dir() -> "Path | None":
    parser = _get_parser()
    if parser and parser.is_available():
        d = Path(parser.wiki_path) / "boards"
        d.mkdir(parents=True, exist_ok=True)
        return d
    return None

def _write_shadow_md(board: dict) -> None:
    boards_dir = _shadow_boards_dir()
    if not boards_dir:
        return
    cells = board.get("cells") or [""] * 9
    center = cells[0] if cells else board["title"]
    aspects = [c for c in cells[1:] if c]
    safe = re.sub(r"[^\w一-鿿]", "_", board["title"])[:40]
    fname = f"{board['id']}_{safe}.md"
    lines = ["---",
             f'title: {board["title"]}（九宮格）',
             "type: mandalart",
             f'board_source: {board.get("source", "manual")}']
    if board.get("category"):
        lines.append(f'category: {board["category"]}')
    if board.get("source_page"):
        lines.append(f'source_page: {board["source_page"]}')
    lines += [f'created: {board.get("created", "")}',
              f'updated: {board.get("updated", "")}',
              "---", "",
              f'# {board["title"]}', "",
              f"中心主題：{center}", ""]
    if aspects:
        lines += ["## 面向", ""] + [f"- {a}" for a in aspects]
    (boards_dir / fname).write_text("\n".join(lines), encoding="utf-8")

def _delete_shadow_md(board_id: str) -> None:
    boards_dir = _shadow_boards_dir()
    if not boards_dir:
        return
    for f in boards_dir.glob(f"{board_id}_*.md"):
        try:
            f.unlink()
        except OSError:
            pass

class MandalartCreateRequest(BaseModel):
    title: str = "新曼陀羅"
    cells: list[str] = [""] * 9
    source: str = "manual"
    category: str = ""
    source_page: str = ""
    generated_at: str = ""
    linked_from_ai: str = ""

class MandalartUpdateRequest(BaseModel):
    title: str | None = None
    cells: list[str] | None = None

class MandalartGenerateRequest(BaseModel):
    source_page: str

@router.get("/mandalart")
async def list_mandalart() -> list[dict]:
    boards = _load_boards()
    return [{"id": b["id"], "title": b["title"], "created": b["created"], "updated": b["updated"],
             "source": b.get("source", "manual"), "category": b.get("category", "")} for b in boards]

@router.post("/mandalart")
async def create_mandalart(req: MandalartCreateRequest) -> dict:
    boards = _load_boards()
    now = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%S")
    board: dict = {
        "id": str(_uuid.uuid4())[:8],
        "title": req.title,
        "cells": (req.cells + [""] * 9)[:9],
        "created": now,
        "updated": now,
        "source": req.source,
    }
    if req.category:
        board["category"] = req.category
    if req.source_page:
        board["source_page"] = req.source_page
    if req.generated_at:
        board["generated_at"] = req.generated_at
    if req.linked_from_ai:
        board["linked_from_ai"] = req.linked_from_ai
    boards.append(board)
    _save_boards(boards)
    _write_shadow_md(board)
    return board

@router.get("/mandalart/wiki-pages")
async def get_mandalart_wiki_pages() -> list[dict]:
    """回傳適合生成九宮格的 concept 頁面及其 AI board 狀態。
    過濾條件：type 屬於 concept/framework/entity/comparison/query，且內容長度 > 300 字。
    """
    parser = _get_parser()
    if not parser or not parser.is_available():
        return []
    import yaml as _yaml
    wiki_path = Path(parser.wiki_path)
    all_pages = parser.get_pages()
    boards = _load_boards()
    ai_board_map = {b.get("source_page", ""): b for b in boards if b.get("source") == "ai"}
    _CONCEPT_TYPES = {"concept", "framework", "entity", "comparison", "query"}
    result = []
    for p in all_pages:
        path = p.get("path", "")
        # 只看 concepts/ 目錄
        if not path.startswith("concepts/"):
            continue
        stem = path.replace("concepts/", "")
        md_file = wiki_path / "concepts" / f"{stem}.md"
        if not md_file.exists():
            continue
        try:
            raw = md_file.read_text(encoding="utf-8")
        except OSError:
            continue
        # 讀 frontmatter 判斷 type
        page_type = ""
        body_len = len(raw)
        if raw.startswith("---\n"):
            end = raw.find("\n---", 4)
            if end > 0:
                try:
                    fm = _yaml.safe_load(raw[4:end]) or {}
                    page_type = str(fm.get("type", "")).lower()
                    body_len = len(raw[end + 4:].strip())
                except Exception:
                    pass
        # 過濾：type 需是概念類型 OR body 夠長（表示有實質內容）
        if page_type and page_type not in _CONCEPT_TYPES and body_len < 500:
            continue
        if body_len < 200:  # 內容太短的直接跳過
            continue
        board = ai_board_map.get(path)
        result.append({
            "path": path,
            "title": p.get("title", stem),
            "inbound_count": p.get("inboundCount", 0) or p.get("inbound_count", 0),
            "has_board": board is not None,
            "board_id": board["id"] if board else None,
        })
    result.sort(key=lambda x: x["inbound_count"], reverse=True)
    return result

@router.post("/mandalart/generate")
async def generate_mandalart(req: MandalartGenerateRequest) -> dict:
    parser = _get_parser()
    if not parser or not parser.is_available():
        raise HTTPException(503, "Wiki parser 不可用")
    wiki_path = Path(parser.wiki_path)
    stem = req.source_page.replace("concepts/", "").replace(".md", "")
    md_file = wiki_path / "concepts" / f"{stem}.md"
    if not md_file.exists():
        raise HTTPException(404, f"找不到頁面：{req.source_page}")
    raw_text = md_file.read_text(encoding="utf-8")
    import yaml as _yaml
    title = stem
    body = raw_text
    source_tags: set[str] = set()
    if raw_text.startswith("---\n"):
        end = raw_text.find("\n---", 4)
        if end > 0:
            fm = _yaml.safe_load(raw_text[4:end]) or {}
            title = fm.get("title", stem)
            body = raw_text[end + 4:].strip()
            raw_tags = fm.get("tags") or []
            source_tags = set(raw_tags if isinstance(raw_tags, list) else [])

    all_pages = parser.get_pages()

    # 找相關頁面：tag 重疊 ≥ 2 或有 wikilink 連結
    scored: list[tuple[dict, int]] = []
    for p in all_pages:
        if p.get("path") == req.source_page or p.get("path") == f"concepts/{stem}":
            continue
        p_tags = set(p.get("tags") or [])
        tag_score = len(source_tags & p_tags)
        links = set((p.get("inboundLinks") or []) + (p.get("outboundLinks") or []))
        link_score = 3 if (req.source_page in links or f"concepts/{stem}" in links) else 0
        total = tag_score + link_score
        if total >= 2:
            scored.append((p, total))
    scored.sort(key=lambda x: x[1], reverse=True)
    related_pages = scored[:6]  # 最多 6 篇相關頁面

    def _extract_body(path_str: str) -> str:
        f = wiki_path / f"{path_str}.md"
        if not f.exists():
            return ""
        t = f.read_text(encoding="utf-8")
        if t.startswith("---\n"):
            e = t.find("\n---", 4)
            return t[e + 4:].strip()[:700] if e > 0 else t[:700]
        return t[:700]

    # 組合 related_content：主頁 + 相關頁
    sections: list[str] = [f"【{title}（主要頁面）】\n{body[:1200]}"]
    for (p, score) in related_pages:
        pbody = _extract_body(p["path"])
        if pbody:
            sections.append(f"【{p.get('title', p['path'])}（相關筆記，關聯度 {score}）】\n{pbody}")
    related_content = "\n\n---\n\n".join(sections)

    from agent.auxiliary_client import get_async_text_auxiliary_client
    client, model = get_async_text_auxiliary_client("wiki_tars")
    if not client:
        raise HTTPException(503, "LLM 未設定")
    prompt = f"""核心概念：{title}

Wiki 相關筆記（共 {len(sections)} 篇）：

{related_content}

任務：從以上筆記提煉 8 個面向，每個面向用「標題 | 重點1 | 重點2 | 重點3」格式表示（用 | 分隔，不要換行），標題 ≤12 字，每條重點 ≤18 字。
分類選：AI & 技術 / 知識管理 / 規劃執行 / 個人成長 / 其他"""

    resp = await client.chat.completions.create(
        model=model or "claude-haiku-4-5-20251001",
        messages=[
            {"role": "system", "content": (
                '只輸出一行緊湊 JSON，無縮排無換行，禁止任何說明文字：\n'
                '{"cells":["核心概念","A|重1|重2|重3","B|重1|重2|重3","C|重1|重2|重3","D|重1|重2|重3","E|重1|重2|重3","F|重1|重2|重3","G|重1|重2|重3","H|重1|重2|重3"],"category":"分類"}'
            )},
            {"role": "user", "content": prompt},
        ],
        max_tokens=5000,
    )
    raw = (resp.choices[0].message.content or "").strip()

    def _extract_result(text: str) -> dict:
        # 1. 從末尾往前找最後一個完整 {...}
        last_end = text.rfind("}")
        if last_end >= 0:
            depth = 0
            for i in range(last_end, -1, -1):
                if text[i] == "}": depth += 1
                elif text[i] == "{": depth -= 1
                if depth == 0:
                    try:
                        p = json.loads(text[i:last_end + 1])
                        if "cells" in p:
                            return p
                    except Exception:
                        pass
                    break
        # 2. 從前往後找第一個完整 {...}
        start = text.find("{")
        if start >= 0:
            depth = 0
            for i, ch in enumerate(text[start:], start):
                if ch == "{": depth += 1
                elif ch == "}": depth -= 1
                if depth == 0:
                    try:
                        p = json.loads(text[start:i + 1])
                        if "cells" in p:
                            return p
                    except Exception:
                        pass
                    break
        # 3. JSON 被截斷：從文字中抓出已完成的 cells 字串
        cells_m = re.search(r'"cells"\s*:\s*\[([^\]]*)', text, re.DOTALL)
        cat_m = re.search(r'"category"\s*:\s*"([^"]+)"', text)
        if cells_m:
            raw_arr = cells_m.group(1)
            cells_found = re.findall(r'"((?:[^"\\]|\\.)*)"', raw_arr)
            if len(cells_found) >= 2:
                return {"cells": cells_found, "category": cat_m.group(1) if cat_m else "其他"}
        return {}

    result = _extract_result(raw)
    if not result or "cells" not in result or len(result["cells"]) < 2:
        raise HTTPException(500, f"LLM 回傳格式錯誤：{raw[:300]}")
    cells = result.get("cells", [])
    cells = [(str(c).replace(" | ", "\n• ").replace("| ", "\n• ") if i > 0 else c)
             for i, c in enumerate(cells)]
    cells = (cells + [""] * 9)[:9]
    cells[0] = title  # 強制 center 為原始標題
    category = result.get("category", "其他")
    boards = _load_boards()
    center = cells[0]
    cells_set = frozenset(c for c in cells[1:] if c)
    for b in boards:
        if b.get("source") != "ai":
            continue
        bc = b.get("cells", [])
        if bc and bc[0] == center and frozenset(c for c in bc[1:] if c) == cells_set:
            return {"duplicate": True, "board": b}
    now = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%S")
    board = {"id": str(_uuid.uuid4())[:8], "title": title, "cells": cells, "created": now,
             "updated": now, "source": "ai", "category": category,
             "source_page": req.source_page, "generated_at": now}
    boards.append(board)
    _save_boards(boards)
    _write_shadow_md(board)
    return board

@router.post("/mandalart/{board_id}/copy-to-manual")
async def copy_mandalart_to_manual(board_id: str) -> dict:
    boards = _load_boards()
    original = next((b for b in boards if b["id"] == board_id), None)
    if not original:
        raise HTTPException(404, "找不到該曼陀羅")
    now = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%S")
    new_board: dict = {
        "id": str(_uuid.uuid4())[:8],
        "title": original["title"],
        "cells": list(original.get("cells", [""] * 9)),
        "created": now,
        "updated": now,
        "source": "manual",
        "linked_from_ai": board_id,
    }
    boards.append(new_board)
    _save_boards(boards)
    _write_shadow_md(new_board)
    return new_board

@router.get("/mandalart/{board_id}")
async def get_mandalart(board_id: str) -> dict:
    for b in _load_boards():
        if b["id"] == board_id:
            return b
    raise HTTPException(404, "找不到該曼陀羅")

@router.put("/mandalart/{board_id}")
async def update_mandalart(board_id: str, req: MandalartUpdateRequest) -> dict:
    boards = _load_boards()
    for b in boards:
        if b["id"] == board_id:
            if req.title is not None:
                b["title"] = req.title
            if req.cells is not None:
                b["cells"] = (req.cells + [""] * 9)[:9]
            b["updated"] = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%S")
            _save_boards(boards)
            _delete_shadow_md(board_id)
            _write_shadow_md(b)
            return b
    raise HTTPException(404, "找不到該曼陀羅")

@router.delete("/mandalart/{board_id}")
async def delete_mandalart(board_id: str) -> dict:
    boards = _load_boards()
    new_boards = [b for b in boards if b["id"] != board_id]
    if len(new_boards) == len(boards):
        raise HTTPException(404, "找不到該曼陀羅")
    _save_boards(new_boards)
    _delete_shadow_md(board_id)
    return {"ok": True}

# ── Tars AI 對話 ────────────────────────────────────────────────────────────

_LANG_INSTRUCTIONS: dict[str, str] = {
    "zh-TW": "使用繁體中文回答。",
    "zh-CN": "使用简体中文回答。",
    "en":    "Reply in English.",
    "ja":    "日本語で回答してください。",
}

class TarsChatRequest(BaseModel):
    message: str
    history: list[dict] = []
    lang: str = "auto"  # "auto" | "zh-TW" | "zh-CN" | "en" | "ja"

def _resolve_wikilinks(content: str, all_pages: list[dict]) -> list[dict]:
    """將內文中的 [[wikilink]] 解析成實際頁面，用於 GraphRAG 1-hop 擴展。"""
    refs = re.findall(r'\[\[([^\]|]+)(?:\|[^\]]+)?\]\]', content)
    path_map = {p["path"]: p for p in all_pages}
    slug_map = {p["path"].split("/")[-1].lower(): p for p in all_pages}
    seen: set[str] = set()
    result: list[dict] = []
    for ref in refs:
        ref = ref.strip()
        page = path_map.get(ref) \
            or path_map.get(f"concepts/{ref}") \
            or slug_map.get(ref.lower().replace(" ", "_"))
        if page and page["path"] not in seen:
            seen.add(page["path"])
            result.append(page)
    return result


def _tokenize_query(text: str) -> set[str]:
    """英文用空白切詞；中文補 2-gram / 3-gram，確保中文關鍵字能命中頁面。"""
    tokens: set[str] = set()
    # 空白切詞（英文 / 夾雜英文）
    for w in re.sub(r'[^\w\s]', ' ', text.lower()).split():
        if len(w) > 1:
            tokens.add(w)
    # CJK n-gram
    for chunk in re.findall(r'[一-鿿㐀-䶿豈-﫿]+', text):
        for i in range(len(chunk) - 1):
            tokens.add(chunk[i:i+2])   # bigram
        for i in range(len(chunk) - 2):
            tokens.add(chunk[i:i+3])   # trigram
    return tokens

def _retrieve_wiki_context(question: str, max_pages: int = 5) -> list[dict]:
    """GraphRAG：關鍵字評分取 Top-3 直接命中，再沿 wikilink 擴展 1-hop 補充脈絡。"""
    parser = _get_parser()
    if not parser or not parser.is_available():
        return []

    words = _tokenize_query(question)
    all_pages = parser.get_pages()

    # ── Phase 1：關鍵字評分 ────────────────────────────────────────────────
    scored: list[tuple[float, dict]] = []
    for p in all_pages:
        title   = p.get("title", "").lower()
        content = p.get("content", "")[:800].lower()
        tags    = " ".join(p.get("tags", [])).lower()
        score   = sum(1 for w in words if w in title)   * 3 \
                + sum(1 for w in words if w in content)     \
                + sum(1 for w in words if w in tags)    * 2
        if score > 0:
            scored.append((score, p))
    scored.sort(key=lambda x: x[0], reverse=True)

    direct       = [p for _, p in scored[:3]]
    direct_paths = {p["path"] for p in direct}

    # ── Phase 2：GraphRAG 1-hop 擴展 ──────────────────────────────────────
    neighbor_pool: dict[str, tuple[float, dict]] = {}

    def _neighbor_score(p: dict) -> float:
        t = p.get("title", "").lower()
        c = p.get("content", "")[:800].lower()
        g = " ".join(p.get("tags", [])).lower()
        return sum(1 for w in words if w in t) * 1.5 \
             + sum(1 for w in words if w in c) * 0.5 \
             + sum(1 for w in words if w in g)

    # 出向連結（直接命中頁面 → 它連到的頁面）
    for dp in direct:
        for nb in _resolve_wikilinks(dp.get("content", ""), all_pages):
            if nb["path"] not in direct_paths and nb["path"] not in neighbor_pool:
                neighbor_pool[nb["path"]] = (_neighbor_score(nb), nb)

    # 入向連結（哪些頁面連到直接命中頁面）
    direct_slugs = {p["path"].split("/")[-1] for p in direct}
    for page in all_pages:
        if page["path"] in direct_paths or page["path"] in neighbor_pool:
            continue
        content = page.get("content", "")
        if any(slug in content for slug in direct_slugs):
            neighbor_pool[page["path"]] = (_neighbor_score(page), page)

    neighbors = [p for _, p in sorted(neighbor_pool.values(), key=lambda x: -x[0])[:2]]

    # ── 標記來源類型供 context 格式化使用 ─────────────────────────────────
    for p in direct:
        p["_rag_type"] = "direct"
    for p in neighbors:
        p["_rag_type"] = "graph"

    return (direct + [nb for nb in neighbors if nb["path"] not in direct_paths])[:max_pages]

@router.post("/tars/chat")
async def tars_chat(req: TarsChatRequest) -> dict:
    if not req.message.strip():
        raise HTTPException(400, "訊息不能為空")

    sources = _retrieve_wiki_context(req.message)
    context_text = ""
    if sources:
        parts = []
        for p in sources:
            rag_type = p.get("_rag_type", "direct")
            label    = "【直接相關】" if rag_type == "direct" else "【圖譜延伸】"
            limit    = 600 if rag_type == "direct" else 300
            content  = p.get("content", "")[:limit]
            parts.append(f"## {label} {p.get('title', p['path'])}\n{content}")
        context_text = "\n\n---\n\n".join(parts)

    lang = req.lang if req.lang in _LANG_INSTRUCTIONS else "auto"
    if lang == "auto":
        # 含 CJK 字元 → 繁體中文；否則跟問題語言走
        if re.search(r'[一-鿿㐀-䶿]', req.message):
            lang_instruction = _LANG_INSTRUCTIONS["zh-TW"]
        else:
            lang_instruction = "以使用者問題的語言回答。"
    else:
        lang_instruction = _LANG_INSTRUCTIONS[lang]

    system_prompt = f"""你是 Tars，一位熟悉使用者個人知識庫的 AI 助手。
以下脈絡分為兩種來源：
- 【直接相關】：關鍵字直接命中的頁面，作為主要參考
- 【圖譜延伸】：透過 wikilink 連結的頁面，補充背景脈絡

回答原則：
1. 優先使用【直接相關】內容；以【圖譜延伸】補充廣度與關聯
2. 若知識庫無相關內容，直接說明並以一般知識補充
3. 回答簡潔精確，切中要點
4. 引用來源時，在末尾列出 [來源：頁面名稱]
5. {lang_instruction}"""

    user_content = req.message
    if context_text:
        user_content = f"【相關知識庫內容】\n{context_text}\n\n【問題】{req.message}"

    messages = [{"role": "system", "content": system_prompt}]
    for h in req.history[-6:]:
        if h.get("role") in ("user", "assistant") and h.get("content"):
            messages.append({"role": h["role"], "content": h["content"]})
    messages.append({"role": "user", "content": user_content})

    try:
        from agent.auxiliary_client import get_async_text_auxiliary_client
        client, model = get_async_text_auxiliary_client("wiki_tars")
        if not client:
            raise RuntimeError("No LLM configured")
        resp = await client.chat.completions.create(
            model=model or "claude-haiku-4-5-20251001",
            messages=messages,
            max_tokens=800,
        )
        answer = resp.choices[0].message.content or ""
    except Exception as e:
        answer = f"（LLM 不可用：{e}）\n\n根據知識庫內容，找到以下相關頁面：\n" + \
                 "\n".join(f"- {p.get('title', p['path'])}" for p in sources) if sources else \
                 f"（LLM 不可用：{e}）"

    return {
        "answer": answer,
        "sources": [
            {"path": p["path"], "title": p.get("title", p["path"]), "rag_type": p.get("_rag_type", "direct")}
            for p in sources
        ],
    }

# ── GitHub ─────────────────────────────────────────────────────────────────

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
