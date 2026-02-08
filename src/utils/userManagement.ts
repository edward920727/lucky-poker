/**
 * 用戶管理工具
 */

const STORAGE_KEY = 'lucky_poker_users';
const DEFAULT_ADMIN_USERNAME = 'gi';
const DEFAULT_ADMIN_PASSWORD = 'poker888';
const PROTECTED_USERNAMES = ['gi', 'edward']; // 受保護的帳號（不可刪除）

export interface User {
  username: string;
  password: string;
  isAdmin?: boolean; // 是否為管理員（只有管理員可以進入管理頁面）
}

/**
 * 初始化默認管理員帳號
 */
function initializeDefaultAdmin(): void {
  const defaultAdmin: User = {
    username: DEFAULT_ADMIN_USERNAME,
    password: DEFAULT_ADMIN_PASSWORD,
    isAdmin: true,
  };
  saveUsers([defaultAdmin]);
}

/**
 * 獲取所有用戶
 */
export function getAllUsers(): User[] {
  const stored = localStorage.getItem(STORAGE_KEY);
  
  if (!stored) {
    // 如果沒有存儲，初始化默認管理員
    initializeDefaultAdmin();
    // 直接返回默認管理員，避免遞迴調用
    return [{
      username: DEFAULT_ADMIN_USERNAME,
      password: DEFAULT_ADMIN_PASSWORD,
      isAdmin: true,
    }];
  }

  try {
    const users: User[] = JSON.parse(stored);
    // 確保默認管理員存在且是管理員
    const adminExists = users.some(u => u.username === DEFAULT_ADMIN_USERNAME);
    if (!adminExists) {
      users.push({
        username: DEFAULT_ADMIN_USERNAME,
        password: DEFAULT_ADMIN_PASSWORD,
        isAdmin: true,
      });
      saveUsers(users);
    } else {
      // 確保默認管理員的 isAdmin 為 true
      const adminIndex = users.findIndex(u => u.username === DEFAULT_ADMIN_USERNAME);
      if (adminIndex !== -1 && !users[adminIndex].isAdmin) {
        users[adminIndex].isAdmin = true;
        saveUsers(users);
      }
    }
    return users;
  } catch (error) {
    console.error('Error parsing users:', error);
    // 如果解析失敗，重新初始化
    initializeDefaultAdmin();
    return [{
      username: DEFAULT_ADMIN_USERNAME,
      password: DEFAULT_ADMIN_PASSWORD,
      isAdmin: true,
    }];
  }
}

/**
 * 保存用戶列表
 */
function saveUsers(users: User[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
}

/**
 * 添加新用戶
 */
export function addUser(username: string, password: string, isAdmin: boolean = false): { success: boolean; message: string } {
  const users = getAllUsers();
  
  // 檢查用戶名是否已存在
  if (users.some(u => u.username === username)) {
    return { success: false, message: '該帳號已存在' };
  }

  // 檢查用戶名是否為空
  if (!username.trim()) {
    return { success: false, message: '帳號不能為空' };
  }

  // 檢查密碼是否為空
  if (!password.trim()) {
    return { success: false, message: '密碼不能為空' };
  }

  const newUser: User = {
    username: username.trim(),
    password: password.trim(),
    isAdmin,
  };

  users.push(newUser);
  saveUsers(users);
  return { success: true, message: '用戶添加成功' };
}

/**
 * 刪除用戶
 */
export function deleteUser(username: string): { success: boolean; message: string } {
  // 不允許刪除受保護的帳號
  if (PROTECTED_USERNAMES.includes(username)) {
    return { success: false, message: '不能刪除此帳號（受保護帳號）' };
  }

  const users = getAllUsers();
  const filteredUsers = users.filter(u => u.username !== username);
  
  if (filteredUsers.length === users.length) {
    return { success: false, message: '用戶不存在' };
  }

  saveUsers(filteredUsers);
  return { success: true, message: '用戶刪除成功' };
}

/**
 * 檢查帳號是否為受保護帳號
 */
export function isProtectedUser(username: string): boolean {
  return PROTECTED_USERNAMES.includes(username);
}

/**
 * 更新用戶密碼
 */
export function updateUserPassword(username: string, newPassword: string): { success: boolean; message: string } {
  if (!newPassword.trim()) {
    return { success: false, message: '密碼不能為空' };
  }

  const users = getAllUsers();
  const userIndex = users.findIndex(u => u.username === username);
  
  if (userIndex === -1) {
    return { success: false, message: '用戶不存在' };
  }

  users[userIndex].password = newPassword.trim();
  saveUsers(users);
  return { success: true, message: '密碼更新成功' };
}

/**
 * 驗證用戶憑證
 */
export function validateUserCredentials(username: string, password: string): boolean {
  const users = getAllUsers();
  const user = users.find(u => u.username === username && u.password === password);
  return !!user;
}

/**
 * 檢查用戶是否為管理員
 */
export function isAdmin(username: string): boolean {
  const users = getAllUsers();
  const user = users.find(u => u.username === username);
  return user?.isAdmin === true;
}

/**
 * 獲取用戶信息
 */
export function getUserInfo(username: string): User | null {
  const users = getAllUsers();
  return users.find(u => u.username === username) || null;
}
