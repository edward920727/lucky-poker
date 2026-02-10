# Firebase 雲端同步設置指南

## 為什麼需要 Firebase？

目前系統使用 localStorage 存儲數據，這意味著數據只存在本地瀏覽器中，無法在不同設備（電腦、手機）之間同步。通過設置 Firebase，可以實現：

- ✅ 跨設備數據同步
- ✅ 實時更新（當一個設備更新數據時，其他設備自動刷新）
- ✅ 數據備份（數據存儲在雲端，不會丟失）

## 設置步驟

### 1. 創建 Firebase 項目

1. 訪問 [Firebase Console](https://console.firebase.google.com/)
2. 點擊「添加項目」或「Create a project」
3. 輸入項目名稱（例如：lucky-poker）
4. 按照提示完成項目創建

### 2. 啟用 Firestore 數據庫

1. 在 Firebase Console 中，點擊左側的「Firestore Database」
2. 點擊「創建數據庫」或「Create database」
3. 選擇「以測試模式啟動」（Start in test mode）
4. 選擇數據庫位置（建議選擇離您最近的區域，如 asia-east1）
5. 點擊「啟用」

### 3. 獲取 Firebase 配置

1. 在 Firebase Console 中，點擊左側的「項目設置」（⚙️ 圖標）
2. 滾動到「您的應用程式」部分
3. 點擊「</>」圖標（Web 應用）
4. 輸入應用程式暱稱（例如：Lucky Poker Web）
5. 複製配置信息

### 4. 配置環境變量

1. 在項目根目錄創建 `.env` 文件（如果不存在）
2. 將以下內容填入，替換為您的 Firebase 配置：

```env
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=your-app-id
```

### 5. 設置 Firestore 安全規則（重要！）

**重要提示**：本應用使用自定義身份驗證系統（非 Firebase Authentication），因此安全規則必須允許未認證的訪問。

1. 在 Firebase Console 中，點擊「Firestore Database」
2. 點擊「規則」標籤
3. 將以下規則複製進去（**必須使用此規則，否則會出現 400 錯誤**）：

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // 允許讀寫 tournaments 集合（本應用使用自定義身份驗證）
    match /tournaments/{tournamentId} {
      allow read, write: if true;
    }
    // 允許讀寫 users 集合（帳號管理同步）
    match /users/{userId} {
      allow read, write: if true;
    }
  }
}
```

**為什麼需要 `if true`？**
- 本應用使用 localStorage 進行身份驗證，不使用 Firebase Authentication
- 如果規則要求 `request.auth != null`，會導致所有請求被拒絕（出現 400 Bad Request 錯誤）
- 應用層面的安全由自定義登入系統保護

**安全建議**：
- 如果您的應用需要更嚴格的安全控制，可以考慮：
  1. 實施 Firebase Authentication 並更新安全規則
  2. 使用 Cloud Functions 作為中間層進行驗證
  3. 限制 API 密鑰的使用範圍

### 6. 重新構建項目

```bash
npm run build
```

## 使用說明

### 自動同步

設置完成後，系統會自動：
- 保存新賽事時同步到雲端
- 更新賽事時同步到雲端
- 刪除賽事時從雲端刪除
- **創建新帳號時同步到雲端，所有裝置自動更新**
- **刪除帳號時從雲端刪除，所有裝置自動更新**
- 當其他設備更新數據時，自動刷新本地數據（包括帳號管理）

### 離線支持

如果 Firebase 未配置或網絡連接失敗，系統會：
- 自動降級到本地存儲（localStorage）
- 所有功能仍然正常工作
- 當網絡恢復時，會自動同步到雲端

**注意**：即使看到控制台中的 404 或 400 錯誤，應用仍然會正常工作。這些錯誤會被自動處理，系統會使用本地存儲作為備份。

### 數據遷移

現有的本地數據會自動保留，當您首次連接到 Firebase 時：
- 本地數據會作為備份保留
- 雲端數據會優先使用
- 如果雲端沒有數據，會使用本地數據

## 故障排除

### 問題：出現 404 或 400 錯誤（Firestore Listen 錯誤）

**重要**：這些錯誤通常**不會影響應用功能**。系統會自動降級到本地存儲模式，所有功能仍然正常工作。

**錯誤訊息範例**：
```
Failed to load resource: the server responded with a status of 404 (Not Found)
firestore.googleapis.com/google.firestore.v1.Firestore/Listen/channel
```

**可能原因和解決方法**：

1. **Firestore 安全規則配置不正確**（最常見）
   - 打開 Firebase Console → Firestore Database → 規則
   - 確認 tournaments 和 users 集合都使用 `allow read, write: if true;`
   - 點擊「發布」保存規則
   - 等待幾秒鐘讓規則生效

2. **Firestore 數據庫未啟用**
   - 打開 Firebase Console → Firestore Database
   - 如果看到「創建數據庫」按鈕，點擊創建
   - 選擇「以測試模式啟動」
   - 選擇數據庫位置（建議選擇 asia-east1）

3. **網路連接問題**
   - 這些錯誤可能是暫時性的網路問題
   - Firebase SDK 會自動重試連接
   - 如果持續出現，檢查網路連接或防火牆設置

4. **Firebase 配置錯誤**
   - 確認 `utils/firebaseConfig.ts` 中的配置正確
   - 確認 projectId 與 Firebase Console 中的項目 ID 一致
   - 確認 apiKey 正確

**如果錯誤持續出現**：
- 應用會自動使用本地存儲（localStorage），所有功能正常
- 數據會保存在瀏覽器中，不會丟失
- 當 Firestore 連接恢復時，會自動同步到雲端

### 問題：出現 400 Bad Request 錯誤

這通常是 Firestore 安全規則配置不正確導致的。解決方法：

1. **檢查安全規則**：確保規則允許未認證訪問
   - 打開 Firebase Console → Firestore Database → 規則
   - 確認 tournaments 和 users 集合都使用 `allow read, write: if true;`
   - 點擊「發布」保存規則

2. **檢查控制台錯誤**：
   - 打開瀏覽器開發者工具（F12）
   - 查看 Console 標籤中的錯誤信息
   - 如果看到「權限被拒絕」或「permission-denied」，說明安全規則需要更新

3. **驗證配置**：
   - 確認 Firebase 配置正確（projectId、apiKey 等）
   - 確認 Firestore 數據庫已啟用

### 問題：數據沒有同步

1. 檢查 `.env` 文件是否正確配置
2. 檢查 Firestore 安全規則是否允許讀寫（必須使用 `if true`）
3. 檢查瀏覽器控制台是否有錯誤信息
4. 確認網絡連接正常

### 問題：構建失敗

1. 確認已安裝 Firebase：`npm install firebase`
2. 檢查 `.env` 文件中的變量名稱是否正確（必須以 `VITE_` 開頭）
3. 重新構建：`npm run build`

### 問題：Firebase 配額超限

Firebase 免費額度通常足夠使用，但如果超限：
- 檢查 Firestore 使用量
- 考慮升級到付費計劃
- 或繼續使用本地存儲模式

## 安全建議

1. **不要將 `.env` 文件提交到 Git**
   - 確保 `.env` 在 `.gitignore` 中
   - 使用 `.env.example` 作為模板

2. **設置適當的 Firestore 安全規則**
   - 生產環境應該要求身份驗證
   - 限制讀寫權限

3. **定期備份數據**
   - Firebase Console 可以導出數據
   - 建議定期備份重要數據

## 免費額度

Firebase 免費額度包括：
- Firestore：50,000 次讀取/天，20,000 次寫入/天
- 存儲：1 GB
- 帶寬：10 GB/月

對於一般使用，免費額度通常足夠。
