# 專案改動紀錄

## 2026-10-31

- 從使用者提供的 ZIP 整理出最新 mirrored-slopes candidate 作為網站根目錄程式；只加入運行需要的網站檔案，排除候選版本、測試截圖、QA 腳本、回滾補丁和參考照片。
- 新增頁首「分享」按鈕：優先使用裝置原生 Web Share API；不支援時複製目前頁面網址，遇到分享取消不顯示錯誤。
- 加入自訂「金球時光」圖示，輸出 192×192、512×512、180×180 Apple Touch 及 maskable 512×512 尺寸；保留生成原圖作為 `app-icon-source.png`。
- 保留原有 Web App manifest（standalone 顯示模式），README 說明本機預覽、HTTPS 部署、分享和安裝方式；目前未加入離線快取。
- 建立並推送公開 GitHub 儲存庫：`https://github.com/cw91020251212/golden-draw-webapp`。Pages 尚未建立；嘗試 GitHub Pages API 時收到 403 `Resource not accessible by integration`，目前連線缺少 Pages 寫入權限。
- 停止臨時預覽伺服器；此專案目前沒有正式公開網站網址。

## 檢查紀錄

- `node --check --input-type=module < app.js` 通過。
- 驗證 manifest 的 icon 檔案存在、尺寸正確，且分享按鈕引用原生分享與剪貼簿 fallback。
