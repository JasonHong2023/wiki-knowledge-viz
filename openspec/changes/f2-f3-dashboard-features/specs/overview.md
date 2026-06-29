# Change: F2/F3 Dashboard Features

> 狀態：✅ 完成  
> 完成日期：2026-06-29  
> 影響範圍：前端（dashboard/src/）、後端（plugin_api.py）

---

## 目標

實作 TODO.md 中 F2 #12、#13 及 F3 #14、#15 四項功能，並修復多個 UX 問題，完成 LLM-Wiki Plugin 的完整功能集。

---

## 實作清單

### F2 #12 — Hypercard 卡片視圖（WikiCards.tsx）

**新增檔案：** `dashboard/src/pages/WikiCards.tsx`

功能：
- 卡片格狀排列，每張顯示標題 + 摘要 + 主要標籤
- 類型篩選 pill（全部 / Entity / Concept / Comparison / Query）
- 點擊展開卡片，顯示完整摘要 + 所有標籤 + 「開啟頁面」按鈕
- 「開啟頁面」跳轉至 Pages tab 並開啟側邊欄

設計決策：
- 使用 `/pages` API（現有），frontend 自行轉換格式，不需要新後端 endpoint
- TYPE_COLORS 採用低飽和度 RGBA，符合 plugin dark mode

---

### F2 #13 — Luhmann 編號索引（WikiIndex.tsx）

**新增檔案：** `dashboard/src/pages/WikiIndex.tsx`  
**移除：** WikiPageList.tsx（功能合併入 WikiIndex）

功能：
- `classifyTag()` TypeScript 實作，鏡像 Python `classify_tag()`
- `buildTree()` 按 9 個主題分類分組，分配 Luhmann ID
- 側邊欄（WikiPageDetail）與樹狀列表並排 flex 佈局
- 搜尋、類型篩選、信心值篩選
- 展開/收合、全部展開/全部收合
- HTML / JSON 匯出
- 刪除功能（hover 顯示垃圾桶）
- **預設開啟最新文章** — 進入時自動選取最後更新的文章
- **點擊不再切換** — 改為永遠開啟側邊欄（只有 ✕ 可以關閉）

技術細節：
- 外層 flex container：`width: 100%; overflow: hidden` — 防止側邊欄溢出視窗
- 側邊欄：`flex: 0 0 360px; maxWidth: 38%; minWidth: 280px` — 響應式縮放

---

### F3 #14 — iMandalart 九宮格（WikiMandalart.tsx）

**新增檔案：** `dashboard/src/pages/WikiMandalart.tsx`  
**新增 API（plugin_api.py）：**
- `GET /mandalart` — 列出所有看板
- `POST /mandalart` — 建立新看板
- `GET /mandalart/{id}` — 取得看板
- `PUT /mandalart/{id}` — 更新看板（標題 + 格子內容）
- `DELETE /mandalart/{id}` — 刪除看板

資料儲存：`$WIKI_PATH/.mandalart/boards.json`（或 `~/.hermes/llm-wiki-mandalart/boards.json`）

格子對應：`GRID_POS = [1, 2, 3, 4, 0, 5, 6, 7, 8]`（index 4 = 中心格）

---

### F3 #15 — Tars AI 對話助手（WikiTars.tsx）

**新增檔案：** `dashboard/src/pages/WikiTars.tsx`  
**新增 API（plugin_api.py）：**
- `POST /tars/chat` — 接收 {message, history, lang}，回傳 {answer, sources}

RAG 實作：
- 關鍵字萃取（去除停用詞）
- 對所有文章計分：標題命中 ×3，標籤命中 ×2，內文命中 ×1
- 取前 5 篇作為上下文
- 使用 `get_async_text_auxiliary_client("wiki_tars")` 呼叫 LLM

語言設定：
- 5 個選項：自動偵測 / 繁體中文 / 简体中文 / English / 日本語
- `auto` 模式：指示 LLM 偵測問題語言並以相同語言回答

---

## UX 修復

### Upload 按鈕文字不可見

**根因：** Tailwind CSS class（`bg-midground text-black`）在 plugin bundle 中不生效  
**修復：** 所有 WikiUpload.tsx 和 BatchImport 元件的樣式改為 inline style

```typescript
// Before（無效）
className="bg-indigo-600 text-white px-4 py-2"

// After（有效）
style={{ background: "rgba(99,102,241,0.8)", color: "#fff", padding: "8px 16px" }}
```

### 側邊欄溢出視窗右側

**根因：** flex container 無 `width: 100%`，長文章標題撐開超過 `.wiki-page` 的 `max-width: 64rem`  
**修復：** 外層加 `width: 100%; overflow: hidden`，側邊欄改用百分比 + min/max 限制

---

## 受影響的檔案

| 檔案 | 變更類型 |
|------|----------|
| `dashboard/src/App.tsx` | 新增 4 個分頁、移除 WikiPageList |
| `dashboard/src/api.ts` | 新增 tars, mandalart, cards endpoints |
| `dashboard/src/wiki.css` | 新增 `.wiki-btn-ghost` class |
| `dashboard/src/pages/WikiCards.tsx` | 新建 |
| `dashboard/src/pages/WikiIndex.tsx` | 新建（取代 WikiPageList）|
| `dashboard/src/pages/WikiMandalart.tsx` | 新建 |
| `dashboard/src/pages/WikiTars.tsx` | 新建 |
| `dashboard/src/pages/WikiUpload.tsx` | 修復 inline styles |
| `dashboard/plugin_api.py` | 新增 mandalart CRUD + tars/chat |
| `dashboard/package.json` | 新增 pptxgenjs + xlsx 依賴 |

---

## 測試驗證

所有功能使用 Playwright headless 截圖驗證：
- 無 JS console error
- scrollWidth === innerWidth（無橫向溢出）
- 所有分頁可正常渲染
