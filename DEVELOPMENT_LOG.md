## Goal
- Complete auto-language-tag-analysis for Wiki Knowledge Viz: integrate background analysis pipeline with progress tracking, GitHub URL import, image storage, and Hermes skill

## Constraints & Preferences
- OpenSpec spec-driven workflow; bilingual comments per R1
- No breaking changes to existing tags.yaml schema
- Large files (>50KB) → background thread + task_id polling; small files (≤50KB) → synchronous
- All imported data must be fully analyzed; large files need progress display
- Orchestrator protocol: Atlas does not implement; real work delegated via `task()`

## Progress
### Done
- **All 8 task sections (48 subtasks) completed** — tasks.md fully checked off
- **Content Extractor** — ContentExtractor class supporting md/pdf/pptx/xlsx/png/jpg/jpeg/gif/webp with progress_callback and unsupported format rejection
- **Language Detection** — LanguageDetector with regex fast path + LLM-based detection + short-content handling (<100 chars → unknown)
- **Content Tag Analyzer** — ContentTagAnalyzer with tags.yaml context injection, proposed tag logic, semantic relation suggestions, token control
- **Tag Registry Updater** — TagRegistryUpdater with incremental merge, count increment, bidirectional relation merge, fcntl flock lock, YAML validation + rollback
- **WikiParser Integration** — `auto_analyze()` method, pipeline encapsulation, relation index, query methods
- **API Integration** — upload (sync/async), import-url, analysis-progress, GitHub URL detection (repo/blob/gist), GitHub API metadata, source tags (youtube/github/web), image storage under $WIKI_PATH/images/
- **Analysis Tracker** — AnalysisTracker with 6-step pipeline, create_task/get/update/cleanup API, 300s TTL, singleton via get_tracker()
- **Hermes Skill** — skills/wiki-analyze/SKILL.md with `--update-registry` flag
- **Tags.yaml Schema** — all 1263 tags across 18 categories have `first_seen` and `last_updated`
- **E2E Tests** — 5 tests cover content extraction, language detection, tag analysis, registry update, wiki parser integration
- **API Integration Tests** — 33 tests cover small sync, large polling, GitHub URL detection (8 patterns), multi-format upload (8 supported + 6 unsupported), endpoint availability
- **Frontend build passes** — `npm run build` exits 0

### In Progress
- Nothing — all tasks complete

### Blocked
- N/A

## Key Decisions
- **Background thread over asyncio**: Analysis code is synchronous, so `threading.Thread(daemon=True)` used
- **Module-level cleanup loop**: `_start_tracker_cleanup()` starts as daemon thread at module import time
- **Same result shape**: Background completion dict matches sync response exactly (`path`, `message`, `data`)
- **Inline progress bar**: Custom `ProgressBar` + mini step list instead of third-party library
- **Direct implementation when delegation times out**: GitHub URL detection, image storage, and syntax fixes applied directly after repeated subagent timeouts

## Relevant Files
- `hermes_cli/analysis_tracker.py` — (131 lines): progress tracker
- `hermes_cli/wiki_router.py` — (654 lines): upload, import-url, analysis-progress, GitHub URL detection, image storage
- `web/src/pages/WikiUpload.tsx` — (~413 lines): progress polling UI
- `hermes_cli/wiki_parser.py` — (+4 lines): added `wiki_path` property
- `hermes_cli/content_extractor.py` — (339 lines): multi-format content extraction
- `hermes_cli/language_detector.py` — (177 lines): language detection engine
- `hermes_cli/content_tag_analyzer.py` — (326 lines): tag analysis with LLM
- `hermes_cli/tag_registry_updater.py` — (335 lines): tag registry update with lock
- `hermes_cli/wiki_parser_extensions.py` — WikiParserAutoAnalysis integration
- `skills/wiki-analyze/SKILL.md` — (108 lines): Hermes Skill
- `projects/wiki-knowledge-viz/tests/test_api_integration.py` — (33 tests, all pass)
- `projects/wiki-knowledge-viz/tests/test_e2e.py` — (5 tests, all pass)
- `projects/wiki-knowledge-viz/openspec/changes/auto-language-tag-analysis/tasks.md` — ALL 48 tasks completed
- `/home/jason_hong/wiki/tags.yaml` — production tag registry (18 categories, 1263 tags) with first_seen/last_updated
