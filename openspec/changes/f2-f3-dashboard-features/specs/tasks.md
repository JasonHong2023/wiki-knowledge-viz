# Tasks — F2/F3 Dashboard Features

> 全部完成於 2026-06-29

## F2 #12 — Hypercard 卡片視圖

- [x] 新增 `WikiCards.tsx`（卡片格狀排列、摘要截斷、類型色標）
- [x] 類型篩選 pill 按鈕（全部/Entity/Concept/Comparison/Query）
- [x] 展開卡片顯示完整摘要 + 所有標籤
- [x] 「開啟頁面」按鈕跳轉至 Pages tab
- [x] 串接 App.tsx（新增 Cards tab）
- [x] 串接 api.ts（wiki.cards endpoint）

## F2 #13 — Luhmann 編號索引

- [x] `classifyTag()` TypeScript 函數（鏡像 Python 實作）
- [x] `buildTree()` 分組邏輯（9 類別 → Luhmann ID）
- [x] 樹狀展開/收合 UI
- [x] 搜尋框（即時過濾）
- [x] 類型篩選下拉
- [x] 信心值篩選下拉
- [x] 全部展開/全部收合按鈕
- [x] HTML 匯出
- [x] JSON 匯出
- [x] 側邊欄（WikiPageDetail）右側 flex 並排
- [x] 刪除功能（hover 顯示垃圾桶）
- [x] 移除獨立 WikiPageList tab（合併入此）
- [x] 修復側邊欄溢出（width: 100%; overflow: hidden）
- [x] 預設開啟最新文章
- [x] 點擊改為永遠開啟（不再切換關閉）

## F3 #14 — iMandalart 九宮格

- [x] 後端：`/mandalart` CRUD（GET list / POST create / GET id / PUT update / DELETE id）
- [x] 資料儲存路徑邏輯（wiki path 優先，fallback to ~/.hermes）
- [x] `WikiMandalart.tsx`（左側看板列表 + 右側九宮格）
- [x] 看板建立 / 重命名 / 刪除
- [x] 格子 inline 編輯（click → textarea → Ctrl+Enter 儲存）
- [x] 中央格高亮（紫色邊框）
- [x] GRID_POS 映射（視覺位置 → 資料索引）
- [x] 串接 App.tsx（新增 Mandalart tab）
- [x] 串接 api.ts（wiki.mandalart endpoints）
- [x] 匯出 Markdown（總覽表格 + 各格詳細章節）
- [x] 匯出 PNG（Canvas 手繪，暗色主題）
- [x] 匯出 PPTX（pptxgenjs，單頁可編輯投影片）
- [x] 匯出 XLSX（SheetJS，3×3 可編輯試算表）
- [x] 匯出 ▼ 下拉選單（含外點關閉）

## F3 #15 — Tars AI 對話助手

- [x] 後端：`TarsChatRequest` model（message, history, lang）
- [x] `_retrieve_wiki_context()` 關鍵字評分 RAG
- [x] `POST /tars/chat` endpoint
- [x] `_LANG_INSTRUCTIONS` dict（4 語言 + auto 模式）
- [x] `WikiTars.tsx`（聊天 UI、氣泡樣式、來源 pill）
- [x] 語言選擇器下拉（5 選項，含自動偵測）
- [x] 送出建議問題（空對話時顯示 4 個）
- [x] 清除對話歷史按鈕
- [x] Enter 送出 / Shift+Enter 換行
- [x] 串接 App.tsx（新增 Tars tab）
- [x] 串接 api.ts（wiki.tars.chat）

## UX 修復

- [x] Upload tab 按鈕文字不可見（Tailwind → inline style）
- [x] BatchImport「開始批量匯入」按鈕不可見（同上）
- [x] Pages 側邊欄溢出視窗右側（flex container overflow: hidden）
- [x] Pages 預設開啟側邊欄（最新文章）
- [x] Pages 點擊不再切換關閉

## 文件

- [x] `USER_MANUAL.md`（詳細使用手冊）
- [x] `TODO.md` 更新（標記 F2/F3 完成）
- [x] `openspec/changes/f2-f3-dashboard-features/specs/overview.md`
- [x] `openspec/changes/f2-f3-dashboard-features/specs/tasks.md`（本檔）
