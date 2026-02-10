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

// 从环境变量读取配置（Vite 会自动处理 VITE_ 前缀的环境变量）
const getEnvVar = (key: keyof ImportMetaEnv, defaultValue?: string): string => {
  // Vite 的环境变量通过 import.meta.env 访问
  const value = import.meta.env[key];
  if (!value && !defaultValue) {
    console.warn(`警告: 环境变量 ${key} 未设置，Firebase 可能无法正常工作`);
  }
  return value || defaultValue || '';
};

export const firebaseConfig = {
  apiKey: getEnvVar('VITE_FIREBASE_API_KEY'),
  authDomain: getEnvVar('VITE_FIREBASE_AUTH_DOMAIN'),
  projectId: getEnvVar('VITE_FIREBASE_PROJECT_ID'),
  storageBucket: getEnvVar('VITE_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: getEnvVar('VITE_FIREBASE_MESSAGING_SENDER_ID'),
  appId: getEnvVar('VITE_FIREBASE_APP_ID'),
  measurementId: getEnvVar('VITE_FIREBASE_MEASUREMENT_ID', '')
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

  if (!allFieldsSet) {
    console.warn('Firebase 配置不完整，某些功能可能无法使用。请检查 .env 文件或环境变量设置。');
    return false;
  }

  return true;
};
