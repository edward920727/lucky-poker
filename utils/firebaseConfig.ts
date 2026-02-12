/**
 * Firebase 配置
 * 
 * 重要安全提示：
 * - 所有 Firebase 配置信息应通过环境变量提供
 * - 请创建 .env 文件（参考 .env.example）
 * - 不要将 .env 文件提交到版本控制系统
 * - 生产环境应在部署平台设置环境变量
 * 
 * 获取配置信息：https://console.firebase.google.com/
 */

import { initializeApp, FirebaseApp } from 'firebase/app';
import { initializeFirestore, getFirestore, Firestore } from 'firebase/firestore';

// 从环境变量读取配置（Vite 会自动处理 VITE_ 前缀的环境变量）
// 使用静默模式，避免每个变量都输出警告
const getEnvVar = (key: keyof ImportMetaEnv, defaultValue?: string, silent: boolean = true): string => {
  // Vite 的环境变量通过 import.meta.env 访问
  const value = import.meta.env[key];
  if (!value && !defaultValue && !silent) {
    console.warn(`警告: 环境变量 ${key} 未设置，Firebase 可能无法正常工作`);
  }
  return value || defaultValue || '';
};

export const firebaseConfig = {
  apiKey: getEnvVar('VITE_FIREBASE_API_KEY', undefined, true),
  authDomain: getEnvVar('VITE_FIREBASE_AUTH_DOMAIN', undefined, true),
  projectId: getEnvVar('VITE_FIREBASE_PROJECT_ID', undefined, true),
  storageBucket: getEnvVar('VITE_FIREBASE_STORAGE_BUCKET', undefined, true),
  messagingSenderId: getEnvVar('VITE_FIREBASE_MESSAGING_SENDER_ID', undefined, true),
  appId: getEnvVar('VITE_FIREBASE_APP_ID', undefined, true),
  measurementId: getEnvVar('VITE_FIREBASE_MEASUREMENT_ID', '', true)
};

// ====== 共用 Firebase 實例（全應用單一初始化）======
let sharedApp: FirebaseApp | null = null;
let sharedDb: Firestore | null = null;

/**
 * 取得共用的 Firebase App 與 Firestore 實例
 * 使用 experimentalAutoDetectLongPolling 避免 QUIC 協議錯誤
 */
export function getSharedFirebase(): { app: FirebaseApp; db: Firestore } | null {
  if (sharedApp && sharedDb) {
    return { app: sharedApp, db: sharedDb };
  }

  if (!isFirebaseConfigured()) {
    return null;
  }

  try {
    if (!sharedApp) {
      sharedApp = initializeApp(firebaseConfig);
      // 使用 initializeFirestore 設定 long-polling，避免 QUIC 協議錯誤
      sharedDb = initializeFirestore(sharedApp, {
        experimentalAutoDetectLongPolling: true,
      });
    }
    if (!sharedDb) return null;
    return { app: sharedApp, db: sharedDb };
  } catch (error: any) {
    const errorMessage = error?.message || '';
    if (errorMessage.includes('already exists') || errorMessage.includes('duplicate')) {
      if (!sharedApp) {
        // app 已經被其他模塊初始化，取得現有實例
        sharedApp = initializeApp(firebaseConfig, '[DEFAULT]');
      }
      if (!sharedDb && sharedApp) {
        try {
          sharedDb = getFirestore(sharedApp);
        } catch {
          // getFirestore 應該能取得已初始化的實例
        }
      }
      if (sharedApp && sharedDb) {
        return { app: sharedApp, db: sharedDb };
      }
    }
    // Firestore 已經被 initializeFirestore 初始化過，用 getFirestore 取得
    if (errorMessage.includes('Firestore has already been started')) {
      if (sharedApp) {
        sharedDb = getFirestore(sharedApp);
        return { app: sharedApp, db: sharedDb };
      }
    }
    console.warn('Firebase 共用實例初始化失敗:', error?.code || error?.message || error);
    return null;
  }
}

// 用于跟踪是否已经输出过配置警告，避免重复
let hasWarnedAboutConfig = false;

/**
 * 获取缺失的 Firebase 配置项
 * 用于提供更详细的错误信息
 */
export const getMissingFirebaseConfig = (): string[] => {
  // 字段名到环境变量名的映射
  const fieldToEnvVar: Record<string, string> = {
    apiKey: 'VITE_FIREBASE_API_KEY',
    authDomain: 'VITE_FIREBASE_AUTH_DOMAIN',
    projectId: 'VITE_FIREBASE_PROJECT_ID',
    storageBucket: 'VITE_FIREBASE_STORAGE_BUCKET',
    messagingSenderId: 'VITE_FIREBASE_MESSAGING_SENDER_ID',
    appId: 'VITE_FIREBASE_APP_ID',
  };
  
  const requiredFields = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'];
  const missingFields: string[] = [];
  
  requiredFields.forEach(field => {
    const value = firebaseConfig[field as keyof typeof firebaseConfig];
    if (!value || value.trim() === '' || value.includes('your-')) {
      missingFields.push(fieldToEnvVar[field]);
    }
  });

  return missingFields;
};

/**
 * 檢查是否已配置 Firebase
 * 检查所有必需的配置项是否都已设置
 */
export const isFirebaseConfigured = (): boolean => {
  const requiredFields = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'];
  
  // 检查所有必需字段是否都已设置
  const allFieldsSet = requiredFields.every(field => {
    const value = firebaseConfig[field as keyof typeof firebaseConfig];
    return value && value.trim() !== '' && !value.includes('your-');
  });

  if (!allFieldsSet && !hasWarnedAboutConfig) {
    const missingFields = getMissingFirebaseConfig();
    if (missingFields.length > 0) {
      console.warn(
        `⚠️ Firebase 配置不完整，缺少以下環境變量：${missingFields.join(', ')}\n` +
        `請在項目根目錄創建 .env 文件並配置 Firebase 環境變量。\n` +
        `詳細說明請參考 FIREBASE_SETUP.md 文件`
      );
      hasWarnedAboutConfig = true;
    }
    return false;
  }

  return allFieldsSet;
};