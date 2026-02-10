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
import { firebaseConfig, isFirebaseConfigured } from './firebaseConfig';

let app: FirebaseApp | null = null;
let db: Firestore | null = null;

// 初始化 Firebase
function initFirebase(): boolean {
  if (!isFirebaseConfigured()) {
    console.warn('Firebase 未配置，將使用本地存儲');
    return false;
  }

  try {
    if (!app) {
      app = initializeApp(firebaseConfig);
      db = getFirestore(app);
    }
    return true;
  } catch (error: any) {
    const errorMessage = error?.message || '';
    if (errorMessage.includes('already exists') || errorMessage.includes('duplicate')) {
      if (!db && app) {
        db = getFirestore(app);
      }
      return true;
    }
    console.warn('Firebase 初始化遇到問題:', error?.code || error?.message || error);
    return false;
  }
}

const SYSTEM_SETTINGS_COLLECTION = 'system_settings';
const IP_SETTING_DOC_ID = 'authorized_ip';

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
export async function saveAuthorizedIP(ip: string): Promise<{ success: boolean; message: string }> {
  if (!ip || !ip.trim()) {
    return { success: false, message: 'IP 地址不能为空' };
  }

  // 验证 IP 格式
  const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (!ipRegex.test(ip.trim())) {
    return { success: false, message: 'IP 地址格式不正确' };
  }

  if (!initFirebase() || !db) {
    return { success: false, message: 'Firebase 未配置或初始化失败' };
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
    return { success: false, message: `保存失败: ${error?.message || '未知错误'}` };
  }
}

/**
 * 从 Firebase 获取授权 IP
 */
export async function getAuthorizedIP(): Promise<string | null> {
  if (!initFirebase() || !db) {
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
 * 检查当前 IP 是否匹配授权 IP
 */
export async function isIPAuthorized(): Promise<boolean> {
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
 */
let cachedAuthorizedIP: string | null = null;
let cachedCheckTime: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 分钟缓存

export async function checkIPAuthorization(): Promise<{ authorized: boolean; message: string }> {
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
