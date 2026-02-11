/**
 * 系统安全设定工具（IP 管理）
 */

import { initializeApp, FirebaseApp } from 'firebase/app';
import { 
  getFirestore, 
  Firestore, 
  doc, 
  getDoc, 
  setDoc
} from 'firebase/firestore';
import { firebaseConfig, isFirebaseConfigured, getMissingFirebaseConfig } from './firebaseConfig';
import { getCurrentUsername } from '../src/utils/auth';

let app: FirebaseApp | null = null;
let db: Firestore | null = null;

// 初始化 Firebase
function initFirebase(): { success: boolean; error?: string; details?: string } {
  if (!isFirebaseConfigured()) {
    const missingFields = getMissingFirebaseConfig();
    const errorMsg = missingFields.length > 0
      ? `Firebase 配置不完整，缺少以下環境變量：${missingFields.join(', ')}`
      : 'Firebase 未配置';
    console.warn(errorMsg);
    return { 
      success: false, 
      error: errorMsg,
      details: '請在項目根目錄創建 .env 文件並配置 Firebase 環境變量。詳細說明請參考 FIREBASE_SETUP.md'
    };
  }

  try {
    if (!app) {
      app = initializeApp(firebaseConfig);
      db = getFirestore(app);
    }
    return { success: true };
  } catch (error: any) {
    const errorMessage = error?.message || '';
    if (errorMessage.includes('already exists') || errorMessage.includes('duplicate')) {
      if (!db && app) {
        db = getFirestore(app);
      }
      return { success: true };
    }
    const errorDetails = `Firebase 初始化失敗: ${error?.code || error?.message || '未知錯誤'}`;
    console.warn(errorDetails, error);
    return { 
      success: false, 
      error: 'Firebase 初始化失敗',
      details: errorDetails
    };
  }
}

const SYSTEM_SETTINGS_COLLECTION = 'system_settings';
const IP_SETTING_DOC_ID = 'authorized_ip';

// 超級管理員列表：這些用戶可以跳過 IP 檢查
const SUPER_ADMIN_USERNAMES = ['gi', 'edward'];

/**
 * 获取当前用户的公网 IP
 */
export async function getCurrentIP(): Promise<string | null> {
  try {
    // 使用多个 IP 检测服务，提高成功率
    const services = [
      'https://api.ipify.org?format=json',
      'https://api64.ipify.org?format=json',
      'https://ipapi.co/json/',
    ];

    for (const service of services) {
      try {
        const response = await fetch(service, { 
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
        });
        
        if (response.ok) {
          const data = await response.json();
          // 不同服务返回格式不同
          const ip = data.ip || data.query || data.origin;
          if (ip && typeof ip === 'string') {
            return ip.trim();
          }
        }
      } catch (error) {
        console.warn(`IP 检测服务 ${service} 失败:`, error);
        continue;
      }
    }

    return null;
  } catch (error) {
    console.error('获取 IP 失败:', error);
    return null;
  }
}

/**
 * 保存授权 IP 到 Firebase
 */
export async function saveAuthorizedIP(ip: string): Promise<{ success: boolean; message: string; details?: string }> {
  if (!ip || !ip.trim()) {
    return { success: false, message: 'IP 地址不能为空' };
  }

  // 验证 IP 格式
  const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (!ipRegex.test(ip.trim())) {
    return { success: false, message: 'IP 地址格式不正确' };
  }

  const initResult = initFirebase();
  if (!initResult.success || !db) {
    return { 
      success: false, 
      message: initResult.error || 'Firebase 未配置或初始化失败',
      details: initResult.details
    };
  }

  try {
    const settingsRef = doc(db, SYSTEM_SETTINGS_COLLECTION, IP_SETTING_DOC_ID);
    await setDoc(settingsRef, {
      authorizedIP: ip.trim(),
      updatedAt: new Date().toISOString(),
    }, { merge: true });

    return { success: true, message: 'IP 地址已成功保存' };
  } catch (error: any) {
    console.error('保存 IP 失败:', error);
    const errorCode = error?.code || '';
    let errorMessage = `保存失败: ${error?.message || '未知错误'}`;
    let errorDetails = '';
    
    // 提供更详细的错误信息
    if (errorCode === 'permission-denied') {
      errorMessage = 'Firebase 權限不足';
      errorDetails = '請在 Firebase Console 中設置 Firestore 安全規則，允許寫入 system_settings 集合。';
    } else if (errorCode === 'unavailable') {
      errorMessage = 'Firebase 服務暫時不可用';
      errorDetails = '請檢查網路連接或稍後再試。';
    } else if (errorCode === 'unauthenticated') {
      errorMessage = 'Firebase 認證失敗';
      errorDetails = '請檢查 Firebase 配置是否正確。';
    }
    
    return { success: false, message: errorMessage, details: errorDetails || error?.message };
  }
}

/**
 * 从 Firebase 获取授权 IP
 */
export async function getAuthorizedIP(): Promise<string | null> {
  const initResult = initFirebase();
  if (!initResult.success || !db) {
    return null;
  }

  try {
    const settingsRef = doc(db, SYSTEM_SETTINGS_COLLECTION, IP_SETTING_DOC_ID);
    const docSnap = await getDoc(settingsRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      return data?.authorizedIP || null;
    }

    return null;
  } catch (error) {
    console.error('获取授权 IP 失败:', error);
    return null;
  }
}

/**
 * 檢查是否為超級管理員
 */
function isSuperAdmin(username: string): boolean {
  return SUPER_ADMIN_USERNAMES.includes(username.toLowerCase());
}

/**
 * 检查当前 IP 是否匹配授权 IP
 * 只有超級管理員（gi 和 edward）可以跳過 IP 檢查
 */
export async function isIPAuthorized(): Promise<boolean> {
  // 檢查當前用戶是否為超級管理員，如果是則跳過 IP 檢查
  const currentUsername = getCurrentUsername();
  if (currentUsername && isSuperAdmin(currentUsername)) {
    console.log('超級管理員用戶，跳過 IP 檢查');
    return true;
  }

  const authorizedIP = await getAuthorizedIP();
  
  // 如果没有设置授权 IP，默认允许（向后兼容）
  if (!authorizedIP) {
    return true;
  }

  const currentIP = await getCurrentIP();
  
  // 如果无法获取当前 IP，默认允许（避免误拦截）
  if (!currentIP) {
    console.warn('无法获取当前 IP，允许操作');
    return true;
  }

  return currentIP.trim() === authorizedIP.trim();
}

/**
 * 同步版本：检查当前 IP 是否匹配授权 IP（使用缓存）
 * 只有超級管理員（gi 和 edward）可以跳過 IP 檢查
 */
let cachedAuthorizedIP: string | null = null;
let cachedCheckTime: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 分钟缓存

export async function checkIPAuthorization(): Promise<{ authorized: boolean; message: string }> {
  // 檢查當前用戶是否為超級管理員，如果是則跳過 IP 檢查
  const currentUsername = getCurrentUsername();
  if (currentUsername && isSuperAdmin(currentUsername)) {
    console.log('超級管理員用戶，跳過 IP 檢查');
    return { authorized: true, message: '超級管理員權限，已跳過 IP 檢查' };
  }

  // 检查缓存
  const now = Date.now();
  if (cachedAuthorizedIP && (now - cachedCheckTime) < CACHE_DURATION) {
    const currentIP = await getCurrentIP();
    if (currentIP && currentIP.trim() === cachedAuthorizedIP.trim()) {
      return { authorized: true, message: '' };
    }
  }

  // 重新获取授权 IP
  const authorizedIP = await getAuthorizedIP();
  
  // 如果没有设置授权 IP，默认允许
  if (!authorizedIP) {
    return { authorized: true, message: '' };
  }

  // 更新缓存
  cachedAuthorizedIP = authorizedIP;
  cachedCheckTime = now;

  const currentIP = await getCurrentIP();
  
  // 如果无法获取当前 IP，默认允许
  if (!currentIP) {
    console.warn('无法获取当前 IP，允许操作');
    return { authorized: true, message: '' };
  }

  if (currentIP.trim() !== authorizedIP.trim()) {
    return { 
      authorized: false, 
      message: `非授权网络，禁止修改。当前 IP: ${currentIP}，授权 IP: ${authorizedIP}` 
    };
  }

  return { authorized: true, message: '' };
}
