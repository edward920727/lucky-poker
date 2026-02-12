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
import { getCurrentUsername } from './auth';
import { hashPassword, verifyPassword, isLegacyUserFormat } from './passwordHash';

const STORAGE_KEY = 'lucky_poker_users';
const DEFAULT_ADMIN_USERNAME = 'gi';
const DEFAULT_ADMIN_PASSWORD = 'poker888';
const PROTECTED_USERNAMES = ['gi', 'edward']; // 受保護的帳號（不可刪除）

/**
 * 用戶接口（新格式：使用密碼哈希）
 */
export interface User {
  username: string;
  passwordHash: string; // 密碼哈希值
  passwordSalt: string; // 鹽值
  isAdmin?: boolean; // 是否為管理員（只有管理員可以進入管理頁面）
}

/**
 * 舊格式用戶接口（用於向後兼容和遷移）
 */
interface LegacyUser {
  username: string;
  password: string; // 明文密碼（舊格式）
  isAdmin?: boolean;
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

/**
 * 檢查是否為可忽略的網路錯誤（QUIC 協議錯誤等）
 * 這些錯誤通常是非關鍵的，Firebase SDK 會自動重試
 */
function isIgnorableNetworkError(error: any): boolean {
  if (!error) return false;
  
  // 檢查錯誤訊息中是否包含 QUIC 相關錯誤
  const errorMessage = error.message || '';
  const errorCode = error.code || '';
  
  // QUIC 協議錯誤（通常是網路層面的暫時性問題）
  if (errorMessage.includes('QUIC') || 
      errorMessage.includes('QUIC_PROTOCOL_ERROR') ||
      errorMessage.includes('QUIC_PACKET_WRITE_ERROR')) {
    return true;
  }
  
  // 網路連接錯誤（Firebase SDK 會自動重試）
  if (errorCode === 'unavailable' || 
      errorCode === 'deadline-exceeded' ||
      errorMessage.includes('network') ||
      errorMessage.includes('NetworkError')) {
    return true;
  }
  
  return false;
}

const USERS_COLLECTION = 'users';

/**
 * 將舊格式用戶遷移到新格式（明文密碼 -> 哈希密碼）
 */
async function migrateLegacyUser(legacyUser: LegacyUser): Promise<User> {
  const { hash, salt } = await hashPassword(legacyUser.password);
  return {
    username: legacyUser.username,
    passwordHash: hash,
    passwordSalt: salt,
    isAdmin: legacyUser.isAdmin || false,
  };
}

/**
 * 檢查並遷移用戶數據（如果為舊格式）
 */
async function migrateUserIfNeeded(user: any): Promise<User> {
  if (isLegacyUserFormat(user)) {
    // 遷移用戶密碼格式
    return await migrateLegacyUser(user as LegacyUser);
  }
  // 如果已經是 new format，直接返回
  if ('passwordHash' in user && 'passwordSalt' in user) {
    return user as User;
  }
  // 如果格式不正確，嘗試遷移（假設有 password 字段）
  if ('password' in user) {
    return await migrateLegacyUser(user as LegacyUser);
  }
  throw new Error(`無法識別的用戶格式: ${JSON.stringify(user)}`);
}

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
      const migrationPromises: Promise<void>[] = [];
      
      querySnapshot.forEach((doc) => {
        const userData = doc.data();
        // 檢查並遷移舊格式
        const migrationPromise = migrateUserIfNeeded(userData).then(migratedUser => {
          users.push(migratedUser);
          // 如果進行了遷移，保存新格式
          if (isLegacyUserFormat(userData)) {
            saveUsers([migratedUser]).catch(err => console.error('遷移後保存失敗:', err));
          }
        });
        migrationPromises.push(migrationPromise);
      });
      
      await Promise.all(migrationPromises);

      // 確保默認管理員存在
      const adminExists = users.some(u => u.username === DEFAULT_ADMIN_USERNAME);
      if (!adminExists) {
        const { hash, salt } = await hashPassword(DEFAULT_ADMIN_PASSWORD);
        const defaultAdmin: User = {
          username: DEFAULT_ADMIN_USERNAME,
          passwordHash: hash,
          passwordSalt: salt,
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
      // 異步獲取本地用戶並遷移
      return await getAllUsersAsyncFromLocal();
    }
  }

  // 如果 Firebase 未配置，使用本地存儲並遷移
  return await getAllUsersAsyncFromLocal();
}

/**
 * 從本地存儲獲取所有用戶並遷移（異步版本）
 */
async function getAllUsersAsyncFromLocal(): Promise<User[]> {
  const localUsers = getAllUsersLocal();
  if (localUsers.length === 0) {
    // 如果沒有用戶，創建默認管理員
    const { hash, salt } = await hashPassword(DEFAULT_ADMIN_PASSWORD);
    const defaultAdmin: User = {
      username: DEFAULT_ADMIN_USERNAME,
      passwordHash: hash,
      passwordSalt: salt,
      isAdmin: true,
    };
    saveUsersLocal([defaultAdmin]);
    return [defaultAdmin];
  }
  
  // 遷移所有舊格式用戶
  const migratedUsers: User[] = [];
  for (const user of localUsers) {
    if (isLegacyUserFormat(user)) {
      const migrated = await migrateLegacyUser(user as LegacyUser);
      migratedUsers.push(migrated);
    } else if ('passwordHash' in user && 'passwordSalt' in user) {
      migratedUsers.push(user as User);
    }
  }
  
  // 確保默認管理員存在
  const adminExists = migratedUsers.some(u => u.username === DEFAULT_ADMIN_USERNAME);
  if (!adminExists) {
    const { hash, salt } = await hashPassword(DEFAULT_ADMIN_PASSWORD);
    migratedUsers.push({
      username: DEFAULT_ADMIN_USERNAME,
      passwordHash: hash,
      passwordSalt: salt,
      isAdmin: true,
    });
  }
  
  // 保存遷移後的用戶
  if (migratedUsers.length > 0) {
    saveUsersLocal(migratedUsers);
  }
  
  return migratedUsers;
}

/**
 * 獲取所有用戶（同步版本，用於向後兼容）
 * 注意：此函數返回的可能是舊格式，建議使用異步版本
 */
export function getAllUsers(): (User | LegacyUser)[] {
  return getAllUsersLocal();
}

/**
 * 從本地存儲獲取所有用戶（同步版本，用於向後兼容）
 * 注意：此函數會自動遷移舊格式，但由於是同步函數，無法進行異步哈希
 * 因此會返回需要遷移的標記，實際遷移在異步函數中進行
 */
function getAllUsersLocal(): (User | LegacyUser)[] {
  const stored = localStorage.getItem(STORAGE_KEY);
  
  if (!stored) {
    // 如果沒有存儲，返回空數組（讓異步函數處理默認管理員的創建）
    return [];
  }

  try {
    const users: (User | LegacyUser)[] = JSON.parse(stored);
    return users;
  } catch (error) {
    console.error('Error parsing users:', error);
    return [];
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
          passwordHash: user.passwordHash,
          passwordSalt: user.passwordSalt,
          isAdmin: user.isAdmin || false,
          updatedAt: Timestamp.now(),
        }, { merge: true });
      });

      await Promise.all(batch);
      // 用戶已同步到雲端
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
 * 只有管理員可以新增用戶
 */
export async function addUserAsync(username: string, password: string, isAdmin: boolean = false): Promise<{ success: boolean; message: string }> {
  // 檢查當前用戶是否為管理員
  const currentUsername = getCurrentUsername();
  if (!currentUsername) {
    return { success: false, message: '請先登入' };
  }

  const isCurrentUserAdmin = await isAdminAsync(currentUsername);
  if (!isCurrentUserAdmin) {
    return { success: false, message: '只有管理員可以新增用戶' };
  }

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

  // 哈希密碼
  const { hash, salt } = await hashPassword(password.trim());
  const newUser: User = {
    username: username.trim(),
    passwordHash: hash,
    passwordSalt: salt,
    isAdmin,
  };

  users.push(newUser);
  await saveUsers(users);
  return { success: true, message: '用戶添加成功' };
}

/**
 * 添加新用戶（同步版本，用於向後兼容）
 * 注意：此函數會異步處理密碼哈希，實際保存是異步的
 * 只有管理員可以新增用戶
 */
export function addUser(username: string, password: string, isAdminUser: boolean = false): { success: boolean; message: string } {
  // 檢查當前用戶是否為管理員
  const currentUsername = getCurrentUsername();
  if (!currentUsername) {
    return { success: false, message: '請先登入' };
  }

  const isCurrentUserAdmin = isAdmin(currentUsername);
  if (!isCurrentUserAdmin) {
    return { success: false, message: '只有管理員可以新增用戶' };
  }

  // 異步處理（哈希密碼並保存）
  hashPassword(password.trim()).then(({ hash, salt }) => {
    getAllUsersAsync().then(users => {
      // 檢查用戶名是否已存在
      if (users.some(u => u.username === username)) {
        return;
      }

      const newUser: User = {
        username: username.trim(),
        passwordHash: hash,
        passwordSalt: salt,
        isAdmin: isAdminUser,
      };

      users.push(newUser);
      saveUsers(users).catch(err => console.error('保存失敗:', err));
    });
  }).catch(err => console.error('哈希密碼失敗:', err));
  
  return { success: true, message: '用戶添加成功（處理中）' };
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
      // 用戶已從雲端刪除
    } catch (error) {
      console.error('從雲端刪除失敗:', error);
    }
  }

  return { success: true, message: '用戶刪除成功' };
}

/**
 * 刪除用戶（同步版本，用於向後兼容）
 * 注意：此函數會異步處理，實際刪除是異步的
 */
export function deleteUser(username: string): { success: boolean; message: string } {
  // 不允許刪除受保護的帳號
  if (PROTECTED_USERNAMES.includes(username)) {
    return { success: false, message: '不能刪除此帳號（受保護帳號）' };
  }

  // 異步處理刪除
  deleteUserAsync(username).catch(err => console.error('刪除失敗:', err));
  
  return { success: true, message: '用戶刪除成功（處理中）' };
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

  // 哈希新密碼
  const { hash, salt } = await hashPassword(newPassword.trim());
  users[userIndex].passwordHash = hash;
  users[userIndex].passwordSalt = salt;
  await saveUsers(users);
  return { success: true, message: '密碼更新成功' };
}

/**
 * 更新用戶密碼（同步版本，用於向後兼容）
 * 注意：此函數會異步處理密碼哈希
 */
export function updateUserPassword(username: string, newPassword: string): { success: boolean; message: string } {
  if (!newPassword.trim()) {
    return { success: false, message: '密碼不能為空' };
  }

  // 異步處理（哈希密碼並更新）
  hashPassword(newPassword.trim()).then(({ hash, salt }) => {
    getAllUsersAsync().then(users => {
      const userIndex = users.findIndex(u => u.username === username);
      if (userIndex === -1) {
        return;
      }

      users[userIndex].passwordHash = hash;
      users[userIndex].passwordSalt = salt;
      saveUsers(users).catch(err => console.error('保存失敗:', err));
    });
  }).catch(err => console.error('哈希密碼失敗:', err));
  
  return { success: true, message: '密碼更新成功（處理中）' };
}

/**
 * 驗證用戶憑證（異步，支援雲端同步）
 */
export async function validateUserCredentialsAsync(username: string, password: string): Promise<boolean> {
  const users = await getAllUsersAsync();
  const user = users.find(u => u.username === username);
  
  if (!user) {
    return false;
  }

  // 使用哈希驗證密碼
  return await verifyPassword(password, user.passwordHash, user.passwordSalt);
}

/**
 * 驗證用戶憑證（同步版本，用於向後兼容）
 * 注意：此函數實際上是異步的，但為了向後兼容保持同步接口
 * 實際驗證會異步進行，首次調用可能返回 false，但會觸發遷移
 */
export function validateUserCredentials(username: string, password: string): boolean {
  // 由於密碼驗證需要異步操作，我們需要異步處理
  // 但為了向後兼容，我們先嘗試同步查找用戶
  const localUsers = getAllUsersLocal();
  const user = localUsers.find(u => u.username === username);
  
  if (!user) {
    // 如果本地沒有，嘗試異步獲取並驗證
    validateUserCredentialsAsync(username, password).catch(() => false);
    return false;
  }

  // 如果是舊格式，需要異步遷移和驗證
  if (isLegacyUserFormat(user)) {
    // 異步處理遷移和驗證
    migrateUserIfNeeded(user).then(async (migratedUser) => {
      const isValid = await verifyPassword(password, migratedUser.passwordHash, migratedUser.passwordSalt);
      if (isValid) {
        // 保存遷移後的用戶
        getAllUsersAsync().then(users => {
          const index = users.findIndex(u => u.username === username);
          if (index === -1) {
            users.push(migratedUser);
          } else {
            users[index] = migratedUser;
          }
          saveUsers(users).catch(err => console.error('保存遷移失敗:', err));
        });
      }
    }).catch(() => false);
    
    // 臨時使用明文比較（僅用於向後兼容的過渡期）
    return (user as LegacyUser).password === password;
  }

  // 如果是新格式，需要異步驗證，但為了同步接口，先返回 false
  // 實際驗證會在異步中進行
  if ('passwordHash' in user && 'passwordSalt' in user) {
    verifyPassword(password, (user as User).passwordHash, (user as User).passwordSalt)
      .then(isValid => {
        if (!isValid) {
          console.warn('密碼驗證失敗');
        }
      })
      .catch(() => false);
    // 由於是異步操作，同步函數無法等待結果
    // 這裡返回 false，實際驗證在異步中進行
    // 建議使用 validateUserCredentialsAsync
    return false;
  }

  return false;
}

/**
 * 檢查用戶是否為管理員（異步，支援雲端同步）
 */
export async function isAdminAsync(username: string): Promise<boolean> {
  const users = await getAllUsersAsync();
  const user = users.find(u => u.username === username);
  return user?.isAdmin === true;
}

/**
 * 檢查用戶是否為管理員（同步版本，用於向後兼容）
 */
export function isAdmin(username: string): boolean {
  const users = getAllUsersLocal();
  const user = users.find(u => u.username === username);
  return user?.isAdmin === true;
}

/**
 * 獲取用戶信息（異步版本，推薦使用）
 */
export async function getUserInfoAsync(username: string): Promise<User | null> {
  const users = await getAllUsersAsync();
  return users.find(u => u.username === username) || null;
}

/**
 * 獲取用戶信息（同步版本，用於向後兼容）
 * 注意：可能返回舊格式，建議使用異步版本
 */
export function getUserInfo(username: string): (User | LegacyUser) | null {
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
    
    const unsubscribe = onSnapshot(usersRef, async (querySnapshot) => {
      const users: User[] = [];
      const migrationPromises: Promise<void>[] = [];
      
      querySnapshot.forEach((doc) => {
        const userData = doc.data();
        // 檢查並遷移舊格式
        const migrationPromise = migrateUserIfNeeded(userData).then(migratedUser => {
          users.push(migratedUser);
          // 如果進行了遷移，保存新格式
          if (isLegacyUserFormat(userData)) {
            saveUsers([migratedUser]).catch(err => console.error('遷移後保存失敗:', err));
          }
        });
        migrationPromises.push(migrationPromise);
      });
      
      await Promise.all(migrationPromises);

      // 確保默認管理員存在
      const adminExists = users.some(u => u.username === DEFAULT_ADMIN_USERNAME);
      if (!adminExists) {
        const { hash, salt } = await hashPassword(DEFAULT_ADMIN_PASSWORD);
        users.push({
          username: DEFAULT_ADMIN_USERNAME,
          passwordHash: hash,
          passwordSalt: salt,
          isAdmin: true,
        });
      }

      // 更新本地存儲
      localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
      
      // 通知組件更新
      onUpdate(users);
    }, (error: any) => {
      // 忽略非關鍵的網路錯誤（QUIC 協議錯誤等，Firebase SDK 會自動重試）
      if (isIgnorableNetworkError(error)) {
        // 靜默處理，不顯示錯誤訊息
        return;
      }
      
      // 處理權限錯誤（通常是安全規則問題）
      if (error?.code === 'permission-denied' || error?.code === 7) {
        console.warn('Firestore 權限被拒絕，請檢查安全規則。將使用本地存儲模式。');
        console.warn('提示：請在 Firebase Console 中將 users 集合的安全規則設置為 allow read, write: if true;');
        // 嘗試一次性加載數據作為備份
        getAllUsersAsync().then(users => {
          if (users.length > 0) {
            onUpdate(users);
          }
        }).catch(async () => {
          // 如果也失敗，使用本地數據並遷移
          const localUsers = await getAllUsersAsync();
          onUpdate(localUsers);
        });
      } else {
        console.error('實時同步錯誤:', error);
        // 對於其他錯誤，也嘗試使用本地數據並遷移
        getAllUsersAsync().then(localUsers => {
          onUpdate(localUsers);
        }).catch(() => {
          // 如果遷移也失敗，至少返回空數組
          onUpdate([]);
        });
      }
    });

    return unsubscribe;
  } catch (error) {
    console.error('設置實時同步失敗:', error);
    // 發生錯誤時，使用本地數據並遷移
    getAllUsersAsync().then(localUsers => {
      onUpdate(localUsers);
    }).catch(() => {
      onUpdate([]);
    });
    return () => {};
  }
}
