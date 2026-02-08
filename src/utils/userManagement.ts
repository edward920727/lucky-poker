/**
 * 用戶管理工具（支援雲端同步）
 */

import { initializeApp, FirebaseApp } from 'firebase/app';
import { 
  getFirestore, 
  Firestore, 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  deleteDoc, 
  onSnapshot,
  Timestamp
} from 'firebase/firestore';
import { firebaseConfig, isFirebaseConfigured } from '../../utils/firebaseConfig';

const STORAGE_KEY = 'lucky_poker_users';
const DEFAULT_ADMIN_USERNAME = 'gi';
const DEFAULT_ADMIN_PASSWORD = 'poker888';
const PROTECTED_USERNAMES = ['gi', 'edward']; // 受保護的帳號（不可刪除）

export interface User {
  username: string;
  password: string;
  isAdmin?: boolean; // 是否為管理員（只有管理員可以進入管理頁面）
}

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
  } catch (error) {
    console.error('Firebase 初始化失敗:', error);
    return false;
  }
}

const USERS_COLLECTION = 'users';


/**
 * 獲取所有用戶（異步，支援雲端同步）
 */
export async function getAllUsersAsync(): Promise<User[]> {
  // 如果 Firebase 已配置，從雲端獲取
  if (initFirebase() && db) {
    try {
      const usersRef = collection(db, USERS_COLLECTION);
      const querySnapshot = await getDocs(usersRef);
      
      const users: User[] = [];
      querySnapshot.forEach((doc) => {
        const userData = doc.data();
        users.push({
          username: userData.username,
          password: userData.password,
          isAdmin: userData.isAdmin || false,
        });
      });

      // 確保默認管理員存在
      const adminExists = users.some(u => u.username === DEFAULT_ADMIN_USERNAME);
      if (!adminExists) {
        const defaultAdmin: User = {
          username: DEFAULT_ADMIN_USERNAME,
          password: DEFAULT_ADMIN_PASSWORD,
          isAdmin: true,
        };
        users.push(defaultAdmin);
        await saveUsers(users);
      } else {
        // 確保默認管理員的 isAdmin 為 true
        const adminIndex = users.findIndex(u => u.username === DEFAULT_ADMIN_USERNAME);
        if (adminIndex !== -1 && !users[adminIndex].isAdmin) {
          users[adminIndex].isAdmin = true;
          await saveUsers(users);
        }
      }

      // 同時更新本地存儲作為備份
      if (users.length > 0) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
      }

      return users;
    } catch (error) {
      console.error('從雲端獲取用戶失敗，使用本地存儲:', error);
      return getAllUsersLocal();
    }
  }

  // 如果 Firebase 未配置，使用本地存儲
  return getAllUsersLocal();
}

/**
 * 獲取所有用戶（同步版本，用於向後兼容）
 */
export function getAllUsers(): User[] {
  return getAllUsersLocal();
}

/**
 * 從本地存儲獲取所有用戶
 */
function getAllUsersLocal(): User[] {
  const stored = localStorage.getItem(STORAGE_KEY);
  
  if (!stored) {
    // 如果沒有存儲，初始化默認管理員
    const defaultAdmin: User = {
      username: DEFAULT_ADMIN_USERNAME,
      password: DEFAULT_ADMIN_PASSWORD,
      isAdmin: true,
    };
    saveUsersLocal([defaultAdmin]);
    return [defaultAdmin];
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
      saveUsersLocal(users);
    } else {
      // 確保默認管理員的 isAdmin 為 true
      const adminIndex = users.findIndex(u => u.username === DEFAULT_ADMIN_USERNAME);
      if (adminIndex !== -1 && !users[adminIndex].isAdmin) {
        users[adminIndex].isAdmin = true;
        saveUsersLocal(users);
      }
    }
    return users;
  } catch (error) {
    console.error('Error parsing users:', error);
    // 如果解析失敗，重新初始化
    const defaultAdmin: User = {
      username: DEFAULT_ADMIN_USERNAME,
      password: DEFAULT_ADMIN_PASSWORD,
      isAdmin: true,
    };
    saveUsersLocal([defaultAdmin]);
    return [defaultAdmin];
  }
}

/**
 * 保存用戶列表（異步，同步到雲端和本地）
 */
async function saveUsers(users: User[]): Promise<void> {
  // 先保存到本地
  saveUsersLocal(users);

  // 如果 Firebase 已配置，同步到雲端
  if (initFirebase() && db) {
    try {
      // 使用批次寫入以提高效率
      const batch = users.map(async (user) => {
        const userDocRef = doc(db!, USERS_COLLECTION, user.username);
        await setDoc(userDocRef, {
          username: user.username,
          password: user.password,
          isAdmin: user.isAdmin || false,
          updatedAt: Timestamp.now(),
        }, { merge: true });
      });

      await Promise.all(batch);
      console.log('用戶已同步到雲端');
    } catch (error) {
      console.error('同步到雲端失敗:', error);
      // 不拋出錯誤，因為本地已保存
    }
  }
}

/**
 * 保存用戶列表到本地存儲
 */
function saveUsersLocal(users: User[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
}

/**
 * 添加新用戶（異步，支援雲端同步）
 */
export async function addUserAsync(username: string, password: string, isAdmin: boolean = false): Promise<{ success: boolean; message: string }> {
  const users = await getAllUsersAsync();
  
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
  await saveUsers(users);
  return { success: true, message: '用戶添加成功' };
}

/**
 * 添加新用戶（同步版本，用於向後兼容）
 */
export function addUser(username: string, password: string, isAdmin: boolean = false): { success: boolean; message: string } {
  const users = getAllUsersLocal();
  
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
  saveUsersLocal(users);
  
  // 異步同步到雲端（不等待結果）
  saveUsers(users).catch(err => console.error('雲端同步失敗:', err));
  
  return { success: true, message: '用戶添加成功' };
}

/**
 * 刪除用戶（異步，支援雲端同步）
 */
export async function deleteUserAsync(username: string): Promise<{ success: boolean; message: string }> {
  // 不允許刪除受保護的帳號
  if (PROTECTED_USERNAMES.includes(username)) {
    return { success: false, message: '不能刪除此帳號（受保護帳號）' };
  }

  const users = await getAllUsersAsync();
  const filteredUsers = users.filter(u => u.username !== username);
  
  if (filteredUsers.length === users.length) {
    return { success: false, message: '用戶不存在' };
  }

  // 從本地刪除
  saveUsersLocal(filteredUsers);

  // 如果 Firebase 已配置，從雲端刪除
  if (initFirebase() && db) {
    try {
      const userDocRef = doc(db, USERS_COLLECTION, username);
      await deleteDoc(userDocRef);
      console.log('用戶已從雲端刪除');
    } catch (error) {
      console.error('從雲端刪除失敗:', error);
    }
  }

  return { success: true, message: '用戶刪除成功' };
}

/**
 * 刪除用戶（同步版本，用於向後兼容）
 */
export function deleteUser(username: string): { success: boolean; message: string } {
  // 不允許刪除受保護的帳號
  if (PROTECTED_USERNAMES.includes(username)) {
    return { success: false, message: '不能刪除此帳號（受保護帳號）' };
  }

  const users = getAllUsersLocal();
  const filteredUsers = users.filter(u => u.username !== username);
  
  if (filteredUsers.length === users.length) {
    return { success: false, message: '用戶不存在' };
  }

  saveUsersLocal(filteredUsers);
  
  // 異步同步到雲端（不等待結果）
  deleteUserAsync(username).catch(err => console.error('雲端同步失敗:', err));
  
  return { success: true, message: '用戶刪除成功' };
}

/**
 * 檢查帳號是否為受保護帳號
 */
export function isProtectedUser(username: string): boolean {
  return PROTECTED_USERNAMES.includes(username);
}

/**
 * 更新用戶密碼（異步，支援雲端同步）
 */
export async function updateUserPasswordAsync(username: string, newPassword: string): Promise<{ success: boolean; message: string }> {
  if (!newPassword.trim()) {
    return { success: false, message: '密碼不能為空' };
  }

  const users = await getAllUsersAsync();
  const userIndex = users.findIndex(u => u.username === username);
  
  if (userIndex === -1) {
    return { success: false, message: '用戶不存在' };
  }

  users[userIndex].password = newPassword.trim();
  await saveUsers(users);
  return { success: true, message: '密碼更新成功' };
}

/**
 * 更新用戶密碼（同步版本，用於向後兼容）
 */
export function updateUserPassword(username: string, newPassword: string): { success: boolean; message: string } {
  if (!newPassword.trim()) {
    return { success: false, message: '密碼不能為空' };
  }

  const users = getAllUsersLocal();
  const userIndex = users.findIndex(u => u.username === username);
  
  if (userIndex === -1) {
    return { success: false, message: '用戶不存在' };
  }

  users[userIndex].password = newPassword.trim();
  saveUsersLocal(users);
  
  // 異步同步到雲端（不等待結果）
  saveUsers(users).catch(err => console.error('雲端同步失敗:', err));
  
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
  const users = getAllUsersLocal();
  return users.find(u => u.username === username) || null;
}

/**
 * 設置實時同步（當雲端數據變化時自動更新）
 */
export function setupUsersRealtimeSync(
  onUpdate: (users: User[]) => void
): () => void {
  if (!initFirebase() || !db) {
    return () => {}; // 返回空函數
  }

  try {
    const usersRef = collection(db, USERS_COLLECTION);
    
    const unsubscribe = onSnapshot(usersRef, (querySnapshot) => {
      const users: User[] = [];
      querySnapshot.forEach((doc) => {
        const userData = doc.data();
        users.push({
          username: userData.username,
          password: userData.password,
          isAdmin: userData.isAdmin || false,
        });
      });

      // 確保默認管理員存在
      const adminExists = users.some(u => u.username === DEFAULT_ADMIN_USERNAME);
      if (!adminExists) {
        users.push({
          username: DEFAULT_ADMIN_USERNAME,
          password: DEFAULT_ADMIN_PASSWORD,
          isAdmin: true,
        });
      }

      // 更新本地存儲
      localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
      
      // 通知組件更新
      onUpdate(users);
    }, (error) => {
      console.error('實時同步錯誤:', error);
    });

    return unsubscribe;
  } catch (error) {
    console.error('設置實時同步失敗:', error);
    return () => {};
  }
}
