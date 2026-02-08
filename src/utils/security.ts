/**
 * 安全工具函數
 * 提供輸入驗證、清理和密碼驗證等功能
 */

/**
 * 清理用戶輸入，防止 XSS 攻擊
 */
export function sanitizeInput(input: string): string {
  if (!input) return '';
  
  // 移除 HTML 標籤
  let sanitized = input.replace(/<[^>]*>/g, '');
  
  // 轉義特殊字符
  sanitized = sanitized
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
  
  return sanitized.trim();
}

/**
 * 驗證用戶名格式
 * 規則：3-20 個字符，只能包含字母、數字和下劃線
 */
export function validateUsername(username: string): { valid: boolean; message: string } {
  if (!username || !username.trim()) {
    return { valid: false, message: '帳號不能為空' };
  }
  
  const trimmed = username.trim();
  
  if (trimmed.length < 3) {
    return { valid: false, message: '帳號至少需要 3 個字符' };
  }
  
  if (trimmed.length > 20) {
    return { valid: false, message: '帳號不能超過 20 個字符' };
  }
  
  // 只允許字母、數字和下劃線
  if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
    return { valid: false, message: '帳號只能包含字母、數字和下劃線' };
  }
  
  return { valid: true, message: '' };
}

/**
 * 驗證密碼強度
 * 規則：至少 8 個字符，包含字母和數字
 */
export function validatePassword(password: string): { valid: boolean; message: string; strength: 'weak' | 'medium' | 'strong' } {
  if (!password || !password.trim()) {
    return { valid: false, message: '密碼不能為空', strength: 'weak' };
  }
  
  if (password.length < 8) {
    return { valid: false, message: '密碼至少需要 8 個字符', strength: 'weak' };
  }
  
  // 檢查是否包含字母和數字
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  
  if (!hasLetter || !hasNumber) {
    return { valid: false, message: '密碼必須包含字母和數字', strength: 'weak' };
  }
  
  // 評估密碼強度
  let strength: 'weak' | 'medium' | 'strong' = 'weak';
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  
  if (password.length >= 12 && hasUpper && hasLower && hasNumber && hasSpecialChar) {
    strength = 'strong';
  } else if (password.length >= 10 && hasUpper && hasLower && hasNumber) {
    strength = 'medium';
  }
  
  return { valid: true, message: '', strength };
}

/**
 * 驗證會編格式
 * 規則：只允許數字
 */
export function validateMemberId(memberId: string): { valid: boolean; message: string } {
  if (!memberId || !memberId.trim()) {
    return { valid: false, message: '會編不能為空' };
  }
  
  if (!/^[0-9]+$/.test(memberId.trim())) {
    return { valid: false, message: '會編只能包含數字' };
  }
  
  return { valid: true, message: '' };
}

/**
 * 驗證數字輸入
 */
export function validateNumber(value: string, min?: number, max?: number): { valid: boolean; message: string; value: number | null } {
  if (value === '' || value === null || value === undefined) {
    return { valid: false, message: '請輸入數值', value: null };
  }
  
  const numValue = parseFloat(value);
  
  if (isNaN(numValue)) {
    return { valid: false, message: '請輸入有效的數字', value: null };
  }
  
  if (min !== undefined && numValue < min) {
    return { valid: false, message: `數值不能小於 ${min}`, value: null };
  }
  
  if (max !== undefined && numValue > max) {
    return { valid: false, message: `數值不能大於 ${max}`, value: null };
  }
  
  return { valid: true, message: '', value: numValue };
}

/**
 * 防止 SQL 注入（雖然這裡使用的是 localStorage，但作為最佳實踐）
 */
export function sanitizeForStorage(input: string): string {
  // 移除可能導致 JSON 解析問題的字符
  return input.replace(/[\x00-\x1F\x7F]/g, '');
}

/**
 * 驗證日期格式
 */
export function validateDate(dateString: string): { valid: boolean; message: string } {
  if (!dateString) {
    return { valid: false, message: '日期不能為空' };
  }
  
  const date = new Date(dateString);
  
  if (isNaN(date.getTime())) {
    return { valid: false, message: '無效的日期格式' };
  }
  
  return { valid: true, message: '' };
}

/**
 * 限制登入失敗次數（簡單的客戶端實現）
 * 注意：真正的保護應該在服務器端實現
 */
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 分鐘

export function checkLoginAttempts(identifier: string): { allowed: boolean; remainingAttempts: number; lockoutTime: number | null } {
  const key = `login_attempts_${identifier}`;
  const lockoutKey = `login_lockout_${identifier}`;
  
  // 檢查是否在鎖定期
  const lockoutUntil = localStorage.getItem(lockoutKey);
  if (lockoutUntil) {
    const lockoutTime = parseInt(lockoutUntil);
    if (Date.now() < lockoutTime) {
      return {
        allowed: false,
        remainingAttempts: 0,
        lockoutTime: lockoutTime - Date.now()
      };
    } else {
      // 鎖定期已過，清除記錄
      localStorage.removeItem(lockoutKey);
      localStorage.removeItem(key);
    }
  }
  
  const attempts = parseInt(localStorage.getItem(key) || '0');
  
  return {
    allowed: attempts < MAX_LOGIN_ATTEMPTS,
    remainingAttempts: Math.max(0, MAX_LOGIN_ATTEMPTS - attempts),
    lockoutTime: null
  };
}

export function recordLoginFailure(identifier: string): void {
  const key = `login_attempts_${identifier}`;
  const lockoutKey = `login_lockout_${identifier}`;
  
  const attempts = parseInt(localStorage.getItem(key) || '0') + 1;
  localStorage.setItem(key, attempts.toString());
  
  if (attempts >= MAX_LOGIN_ATTEMPTS) {
    // 鎖定帳號 15 分鐘
    const lockoutUntil = Date.now() + LOCKOUT_DURATION;
    localStorage.setItem(lockoutKey, lockoutUntil.toString());
  }
}

export function clearLoginAttempts(identifier: string): void {
  const key = `login_attempts_${identifier}`;
  const lockoutKey = `login_lockout_${identifier}`;
  localStorage.removeItem(key);
  localStorage.removeItem(lockoutKey);
}
