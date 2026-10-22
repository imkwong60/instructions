# 說明本本（PWA）

桌遊說明書管理 + 廣東麻雀／鋤大D／自訂計分 + 隨機抽選。  
純前端，可安裝到主畫面，支援離線開啟介面（資料仍經 GitHub API）。

## 用 GitHub Pages 發佈

1. 新建 GitHub repository（例如 `benben`）
2. 把本資料夾全部檔案推上去（`index.html`、`manifest.webmanifest`、`sw.js`、`icons/`）
3. Repo → **Settings** → **Pages**
   - Source: **Deploy from a branch**
   - Branch: `main`（或 `gh-pages`），Folder: `/ (root)`
4. 等待一兩分鐘，開啟：
   `https://<你的帳號>.github.io/<repo名>/`

## 安裝成 App

- **iPhone（Safari）**：分享 → 加入主畫面  
- **Android（Chrome）**：選單 → 安裝應用程式／加到主畫面  

> 必須用 **HTTPS**（GitHub Pages 已提供）才可完整使用 PWA 功能。

## 檔案說明

| 檔案 | 用途 |
|------|------|
| `index.html` | 主程式 |
| `manifest.webmanifest` | PWA 名稱、圖示、standalone |
| `sw.js` | Service Worker（離線快取殼層） |
| `icons/` | App 圖示 |

GitHub Token 只存在使用者瀏覽器 localStorage，不會上傳到 repo。
