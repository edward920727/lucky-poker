// Firebase 配置
// 請在 Firebase Console 創建項目後，將配置信息填入這裡
// https://console.firebase.google.com/

export const firebaseConfig = {
  apiKey: (import.meta as any).env?.VITE_FIREBASE_API_KEY || "your-api-key",
  authDomain: (import.meta as any).env?.VITE_FIREBASE_AUTH_DOMAIN || "your-project.firebaseapp.com",
  projectId: (import.meta as any).env?.VITE_FIREBASE_PROJECT_ID || "your-project-id",
  storageBucket: (import.meta as any).env?.VITE_FIREBASE_STORAGE_BUCKET || "your-project.appspot.com",
  messagingSenderId: (import.meta as any).env?.VITE_FIREBASE_MESSAGING_SENDER_ID || "123456789",
  appId: (import.meta as any).env?.VITE_FIREBASE_APP_ID || "your-app-id"
};

// 檢查是否已配置 Firebase
export const isFirebaseConfigured = () => {
  return firebaseConfig.apiKey !== "your-api-key" && 
         firebaseConfig.projectId !== "your-project-id";
};
