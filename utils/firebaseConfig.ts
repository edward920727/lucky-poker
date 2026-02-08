// Firebase 配置
// 請在 Firebase Console 創建項目後，將配置信息填入這裡
// https://console.firebase.google.com/

export const firebaseConfig = {
  apiKey: (import.meta as any).env?.VITE_FIREBASE_API_KEY || "AIzaSyAO6j0YRGDqjB9SGM5aSiRR-8HkRm6jZ28",
  authDomain: (import.meta as any).env?.VITE_FIREBASE_AUTH_DOMAIN || "lucky-poker-11549.firebaseapp.com",
  projectId: (import.meta as any).env?.VITE_FIREBASE_PROJECT_ID || "lucky-poker-11549",
  storageBucket: (import.meta as any).env?.VITE_FIREBASE_STORAGE_BUCKET || "lucky-poker-11549.firebasestorage.app",
  messagingSenderId: (import.meta as any).env?.VITE_FIREBASE_MESSAGING_SENDER_ID || "110649819417",
  appId: (import.meta as any).env?.VITE_FIREBASE_APP_ID || "1:110649819417:web:82dbed1b0cf299a9a78588",
  measurementId: (import.meta as any).env?.VITE_FIREBASE_MEASUREMENT_ID || "G-VYSEN97Z24"
};

// 檢查是否已配置 Firebase
export const isFirebaseConfigured = () => {
  return firebaseConfig.apiKey !== "your-api-key" && 
         firebaseConfig.projectId !== "your-project-id" &&
         firebaseConfig.apiKey === "AIzaSyAO6j0YRGDqjB9SGM5aSiRR-8HkRm6jZ28";
};
