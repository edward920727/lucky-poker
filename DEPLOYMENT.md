# 部署指南

## 環境變量配置

### 本地開發環境

1. 複製環境變量模板：
   ```bash
   cp .env.example .env
   ```

2. 編輯 `.env` 文件，填入您的 Firebase 配置

### Vercel 部署

在 Vercel 項目設置中配置環境變量：

1. 登入 [Vercel Dashboard](https://vercel.com/dashboard)
2. 選擇您的項目
3. 進入 **Settings** → **Environment Variables**
4. 添加以下環境變量：

```
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=your-app-id
VITE_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX
```

5. 選擇環境（Production、Preview、Development）
6. 點擊 **Save**
7. 重新部署項目使環境變量生效

### 其他部署平台

#### Netlify

1. 進入 Netlify Dashboard
2. 選擇項目 → **Site settings** → **Environment variables**
3. 添加環境變量（同上）

#### GitHub Pages / 其他靜態託管

對於靜態託管平台，您需要：

1. 在構建時設置環境變量
2. 或在構建腳本中讀取環境變量並注入到代碼中

**注意：** 由於是前端應用，環境變量會在構建時被打包進代碼。這是正常的，但請確保：
- 在 Firebase Console 中設置 API Key 限制
- 只允許特定域名使用 API Key

## Firebase API Key 安全設置

雖然 Web API Key 會在客戶端可見，但您可以通過以下方式提高安全性：

1. **設置 API Key 限制**：
   - 進入 [Google Cloud Console](https://console.cloud.google.com/)
   - 選擇您的項目
   - 進入 **APIs & Services** → **Credentials**
   - 找到您的 API Key
   - 點擊編輯，設置 **Application restrictions**
   - 選擇 **HTTP referrers (web sites)**
   - 添加允許的域名（例如：`https://yourdomain.com/*`）

2. **設置 Firestore 安全規則**：
   - 在 Firebase Console 中設置適當的安全規則
   - 限制讀寫權限

3. **使用 Firebase App Check**（可選）：
   - 啟用 App Check 以驗證請求來源
   - 防止未授權的應用訪問您的 Firebase 資源

## 檢查配置

部署後，檢查瀏覽器控制台：
- 如果看到 "Firebase 配置不完整" 警告，說明環境變量未正確設置
- 確認所有環境變量都已正確配置

## 故障排除

### 問題：環境變量未生效

1. **Vercel**：
   - 確認環境變量已保存
   - 重新部署項目
   - 檢查構建日誌

2. **本地開發**：
   - 確認 `.env` 文件在項目根目錄
   - 確認變量名稱以 `VITE_` 開頭
   - 重啟開發服務器

### 問題：Firebase 連接失敗

1. 檢查環境變量是否正確
2. 檢查 Firebase 項目是否已啟用 Firestore
3. 檢查 Firestore 安全規則是否允許訪問
