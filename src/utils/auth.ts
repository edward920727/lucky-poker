/**
 * 登入驗證工具
 */

import { validateUserCredentials, validateUserCredentialsAsync } from './userManagement';

const STORAGE_KEY = 'lucky_poker_auth';

export interface AuthState {
  isAuthenticated: boolean;
  username: string | null;
  loginTime: number | null;
}

/**
 * 驗證登入憑證（異步，支援雲端同步）
 */
export async function validateCredentialsAsync(username: string, password: string): Promise<boolean> {
  return await validateUserCredentialsAsync(username, password);
}

/**
 * 驗證登入憑證（同步版本，用於向後兼容）
 */
export function validateCredentials(username: string, password: string): boolean {
  return validateUserCredentials(username, password);
}

/**
 * 登入（異步，支援雲端同步）
 */
export async function loginAsync(username: string, password: string): Promise<boolean> {
  const isValid = await validateCredentialsAsync(username, password);
  if (isValid) {
    const authState: AuthState = {
      isAuthenticated: true,
      username,
      loginTime: Date.now(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(authState));
    return true;
  }
  return false;
}

/**
 * 登入（同步版本，用於向後兼容）
 */
export function login(username: string, password: string): boolean {
  if (validateCredentials(username, password)) {
    const authState: AuthState = {
      isAuthenticated: true,
      username,
      loginTime: Date.now(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(authState));
    return true;
  }
  return false;
}

/**
 * 登出
 */
export function logout(): void {
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * 檢查是否已登入
 */
export function isAuthenticated(): boolean {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return false;

  try {
    const authState: AuthState = JSON.parse(stored);
    
    // 檢查登入狀態是否有效（24小時內有效）
    if (authState.isAuthenticated && authState.loginTime) {
      const now = Date.now();
      const hoursSinceLogin = (now - authState.loginTime) / (1000 * 60 * 60);
      
      // 如果超過24小時，自動登出
      if (hoursSinceLogin > 24) {
        logout();
        return false;
      }
      
      return true;
    }
  } catch (error) {
    console.error('Error parsing auth state:', error);
    logout();
  }

  return false;
}

/**
 * 獲取當前登入用戶名
 */
export function getCurrentUsername(): string | null {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return null;

  try {
    const authState: AuthState = JSON.parse(stored);
    return authState.username;
  } catch (error) {
    return null;
  }
}
