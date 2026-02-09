import { TournamentRecord } from '../types/tournament';
import { initializeApp, FirebaseApp } from 'firebase/app';
import { 
  getFirestore, 
  Firestore, 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  deleteDoc, 
  query, 
  orderBy,
  onSnapshot,
  Timestamp
} from 'firebase/firestore';
import { firebaseConfig, isFirebaseConfigured } from './firebaseConfig';

/**
 * 生成台灣時區格式的日期時間字符串（統一格式：YYYY-MM-DDTHH:mm:ss）
 * 確保所有地方使用相同的格式
 */
function getTaiwanDateTimeString(date?: Date): string {
  const targetDate = date || new Date();
  
  // 驗證日期是否有效
  if (isNaN(targetDate.getTime())) {
    console.warn('無效的日期，使用當前時間');
    return getTaiwanDateTimeString(new Date());
  }
  
  // 使用 Intl API 獲取台灣時區的日期時間
  const formatter = new Intl.DateTimeFormat('zh-TW', {
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  
  const parts = formatter.formatToParts(targetDate);
  const year = parts.find(p => p.type === 'year')?.value || '';
  const month = parts.find(p => p.type === 'month')?.value || '';
  const day = parts.find(p => p.type === 'day')?.value || '';
  const hour = parts.find(p => p.type === 'hour')?.value || '';
  const minute = parts.find(p => p.type === 'minute')?.value || '';
  const second = parts.find(p => p.type === 'second')?.value || '';
  
  // 驗證所有部分都存在
  if (!year || !month || !day || !hour || !minute || !second) {
    console.warn('日期格式化部分缺失，使用備用方法');
    // 使用備用方法
    const yearNum = targetDate.getFullYear();
    const monthNum = targetDate.getMonth() + 1;
    const dayNum = targetDate.getDate();
    const hourNum = targetDate.getHours();
    const minuteNum = targetDate.getMinutes();
    const secondNum = targetDate.getSeconds();
    return `${yearNum}-${String(monthNum).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}T${String(hourNum).padStart(2, '0')}:${String(minuteNum).padStart(2, '0')}:${String(secondNum).padStart(2, '0')}`;
  }
  
  const result = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${hour.padStart(2, '0')}:${minute.padStart(2, '0')}:${second.padStart(2, '0')}`;
  
  // 驗證結果格式
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(result)) {
    console.error('生成的日期字符串格式無效:', result);
    // 使用 ISO 格式作為最後備用（移除時區信息）
    return targetDate.toISOString().replace('Z', '').split('.')[0];
  }
  
  return result;
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

// 轉換 TournamentRecord 為 Firestore 格式
function tournamentToFirestore(tournament: TournamentRecord): any {
  // 確保日期是有效的
  let dateToStore: Date;
  try {
    const dateValue: any = tournament.date;
    if (dateValue instanceof Date) {
      dateToStore = dateValue;
    } else if (typeof dateValue === 'string') {
      dateToStore = new Date(dateValue);
      // 檢查日期是否有效
      if (isNaN(dateToStore.getTime())) {
        console.warn('無效的日期字符串，使用當前日期:', dateValue);
        dateToStore = new Date();
      }
    } else if (dateValue && typeof dateValue === 'object' && 'toDate' in dateValue && typeof dateValue.toDate === 'function') {
      // 如果是 Firestore Timestamp，轉換為 Date
      dateToStore = dateValue.toDate();
    } else {
      console.warn('無法識別的日期格式，使用當前日期:', dateValue);
      dateToStore = new Date();
    }
  } catch (e) {
    console.error('日期轉換失敗，使用當前日期:', e, tournament.date);
    dateToStore = new Date();
  }
  
  // 過濾掉 undefined 值，因為 Firestore 不支持 undefined
  const cleaned: any = {
    ...tournament,
    date: Timestamp.fromDate(dateToStore),
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };
  
  // 移除所有 undefined 值
  Object.keys(cleaned).forEach(key => {
    if (cleaned[key] === undefined) {
      delete cleaned[key];
    }
  });
  
  // 特別處理 nested 對象（如 customConfig）
  if (cleaned.customConfig) {
    const cleanedConfig: any = {};
    Object.keys(cleaned.customConfig).forEach(key => {
      const value = cleaned.customConfig[key];
      // 過濾掉 undefined 和 null 值（Firestore 不支持）
      if (value !== undefined && value !== null) {
        cleanedConfig[key] = value;
      }
    });
    // 如果清理後的 config 為空，則不包含該字段
    if (Object.keys(cleanedConfig).length > 0) {
      cleaned.customConfig = cleanedConfig;
    } else {
      delete cleaned.customConfig;
    }
  }
  
  // 再次確保所有 undefined 和 null 值都被移除（遞歸處理）
  const removeUndefinedAndNull = (obj: any): any => {
    if (obj === null || obj === undefined) {
      return undefined;
    }
    if (Array.isArray(obj)) {
      return obj.map(removeUndefinedAndNull).filter(item => item !== undefined && item !== null);
    }
    if (typeof obj === 'object') {
      const cleaned: any = {};
      Object.keys(obj).forEach(key => {
        const value = removeUndefinedAndNull(obj[key]);
        if (value !== undefined && value !== null) {
          cleaned[key] = value;
        }
      });
      return Object.keys(cleaned).length > 0 ? cleaned : undefined;
    }
    return obj;
  };
  
  const finalCleaned = removeUndefinedAndNull(cleaned);
  
  // 最後一次遍歷，確保沒有遺漏的 undefined 或 null
  const result: any = {};
  Object.keys(finalCleaned || {}).forEach(key => {
    const value = finalCleaned[key];
    if (value !== undefined && value !== null) {
      result[key] = value;
    }
  });
  
  return result;
}

// 從 Firestore 轉換為 TournamentRecord
function firestoreToTournament(data: any): TournamentRecord {
  let dateString: string;
  
  try {
    if (data.date && typeof data.date === 'object') {
      // 如果是 Firestore Timestamp
      if (data.date.toDate) {
        const date = data.date.toDate();
        if (isNaN(date.getTime())) {
          console.warn('無效的 Firestore Timestamp，使用當前日期');
          dateString = new Date().toISOString();
        } else {
          // 使用 getTaiwanDateTime 的邏輯來確保格式一致
          // 導入 getTaiwanDateTime 函數（但這裡不能直接導入，所以使用相同的邏輯）
          const formatter = new Intl.DateTimeFormat('zh-TW', {
            timeZone: 'Asia/Taipei',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false,
          });
          const parts = formatter.formatToParts(date);
          const year = parts.find(p => p.type === 'year')?.value || '';
          const month = parts.find(p => p.type === 'month')?.value || '';
          const day = parts.find(p => p.type === 'day')?.value || '';
          const hour = parts.find(p => p.type === 'hour')?.value || '';
          const minute = parts.find(p => p.type === 'minute')?.value || '';
          const second = parts.find(p => p.type === 'second')?.value || '';
          
          // 驗證所有部分都存在
          if (!year || !month || !day || !hour || !minute || !second) {
            console.warn('日期格式化部分缺失，使用備用方法');
            // 使用備用方法：直接從 Date 對象獲取台灣時區時間
            const yearNum = date.getFullYear();
            const monthNum = date.getMonth() + 1;
            const dayNum = date.getDate();
            const hourNum = date.getHours();
            const minuteNum = date.getMinutes();
            const secondNum = date.getSeconds();
            dateString = `${yearNum}-${String(monthNum).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}T${String(hourNum).padStart(2, '0')}:${String(minuteNum).padStart(2, '0')}:${String(secondNum).padStart(2, '0')}`;
          } else {
            dateString = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${hour.padStart(2, '0')}:${minute.padStart(2, '0')}:${second.padStart(2, '0')}`;
          }
          
          // 驗證結果是否有效
          const testDate = new Date(dateString);
          if (isNaN(testDate.getTime())) {
            console.warn('生成的日期字符串無效，使用 ISO 格式:', dateString);
            // 如果無效，使用 ISO 格式（移除時區信息）
            dateString = date.toISOString().replace('Z', '').split('.')[0];
          }
        }
      } else {
        // 其他對象類型，嘗試轉換
        console.warn('未知的日期對象類型，使用當前日期:', data.date);
        dateString = getTaiwanDateTimeString();
      }
    } else if (typeof data.date === 'string') {
      // 如果已經是字符串，驗證格式
      const testDate = new Date(data.date);
      if (isNaN(testDate.getTime())) {
        console.warn('無效的日期字符串，使用當前日期:', data.date);
        dateString = getTaiwanDateTimeString();
      } else {
        // 驗證字符串格式是否為台灣時區格式（YYYY-MM-DDTHH:mm:ss）
        if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(data.date)) {
          // 已經是正確格式，直接使用
          dateString = data.date;
        } else {
          // 如果不是標準格式，轉換為台灣時區格式
          dateString = getTaiwanDateTimeString(testDate);
        }
      }
    } else {
      // 其他情況，使用當前日期
      console.warn('無法識別的日期格式，使用當前日期:', data.date);
      dateString = getTaiwanDateTimeString();
    }
  } catch (e) {
    console.error('日期轉換失敗，使用當前日期:', e, data.date);
    dateString = getTaiwanDateTimeString();
  }
  
  return {
    ...data,
    date: dateString,
  } as TournamentRecord;
}

const COLLECTION_NAME = 'tournaments';

/**
 * 異步獲取所有賽事記錄（推薦使用，支持雲端同步）
 */
export async function getAllTournamentsAsync(): Promise<TournamentRecord[]> {
  if (!initFirebase() || !db) {
    return getAllTournamentsLocal();
  }

  try {
    const tournamentsRef = collection(db, COLLECTION_NAME);
    const q = query(tournamentsRef, orderBy('date', 'desc'));
    const querySnapshot = await getDocs(q);
    
    const tournaments: TournamentRecord[] = [];
    querySnapshot.forEach((doc) => {
      tournaments.push(firestoreToTournament({ id: doc.id, ...doc.data() }));
    });

    // 同時更新本地存儲作為備份
    if (tournaments.length > 0) {
      localStorage.setItem('lucky_poker_tournaments', JSON.stringify(tournaments));
    }

    return tournaments;
  } catch (error) {
    console.error('從雲端獲取失敗，使用本地存儲:', error);
    return getAllTournamentsLocal();
  }
}

/**
 * 保存賽事記錄（同步到雲端和本地）
 */
export async function saveTournament(tournament: TournamentRecord): Promise<void> {
  // 先保存到本地
  saveTournamentLocal(tournament);

  // 如果 Firebase 已配置，同步到雲端
  if (initFirebase() && db) {
    try {
      const docRef = doc(db, COLLECTION_NAME, tournament.id);
      await setDoc(docRef, tournamentToFirestore(tournament), { merge: true });
      console.log('賽事已同步到雲端');
    } catch (error) {
      console.error('同步到雲端失敗:', error);
      // 不拋出錯誤，因為本地已保存
    }
  }
}

/**
 * 刪除賽事記錄
 */
export async function deleteTournament(id: string): Promise<void> {
  // 先從本地刪除
  deleteTournamentLocal(id);

  // 如果 Firebase 已配置，從雲端刪除
  if (initFirebase() && db) {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      await deleteDoc(docRef);
      console.log('賽事已從雲端刪除');
    } catch (error) {
      console.error('從雲端刪除失敗:', error);
    }
  }
}

/**
 * 根據 ID 獲取賽事記錄
 */
export async function getTournamentById(id: string): Promise<TournamentRecord | null> {
  // 先從本地獲取
  const localTournament = getTournamentByIdLocal(id);
  if (localTournament) {
    return localTournament;
  }

  // 如果 Firebase 已配置，從雲端獲取
  if (initFirebase() && db) {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const tournament = firestoreToTournament({ id: docSnap.id, ...docSnap.data() });
        // 保存到本地
        saveTournamentLocal(tournament);
        return tournament;
      }
    } catch (error) {
      console.error('從雲端獲取失敗:', error);
    }
  }

  return null;
}

/**
 * 更新賽事記錄
 */
export async function updateTournament(tournament: TournamentRecord): Promise<void> {
  // 先更新本地
  updateTournamentLocal(tournament);

  // 如果 Firebase 已配置，同步到雲端
  if (initFirebase() && db) {
    try {
      const docRef = doc(db, COLLECTION_NAME, tournament.id);
      await setDoc(docRef, tournamentToFirestore(tournament), { merge: true });
      console.log('賽事已同步到雲端');
    } catch (error) {
      console.error('同步到雲端失敗:', error);
    }
  }
}

/**
 * 設置實時監聽（當雲端數據變化時自動更新）
 */
export function setupRealtimeSync(
  onUpdate: (tournaments: TournamentRecord[]) => void
): () => void {
  if (!initFirebase() || !db) {
    return () => {}; // 返回空函數
  }

  try {
    const tournamentsRef = collection(db, COLLECTION_NAME);
    const q = query(tournamentsRef, orderBy('date', 'desc'));
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const tournaments: TournamentRecord[] = [];
      querySnapshot.forEach((doc) => {
        tournaments.push(firestoreToTournament({ id: doc.id, ...doc.data() }));
      });
      
      // 更新本地存儲
      localStorage.setItem('lucky_poker_tournaments', JSON.stringify(tournaments));
      
      // 通知組件更新
      onUpdate(tournaments);
    }, (error) => {
      console.error('實時同步錯誤:', error);
    });

    return unsubscribe;
  } catch (error) {
    console.error('設置實時同步失敗:', error);
    return () => {};
  }
}

// ========== 本地存儲備份函數 ==========

const STORAGE_KEY = 'lucky_poker_tournaments';

function getAllTournamentsLocal(): TournamentRecord[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    return JSON.parse(data);
  } catch (error) {
    console.error('讀取本地賽事記錄失敗:', error);
    return [];
  }
}

function saveTournamentLocal(tournament: TournamentRecord): void {
  try {
    const tournaments = getAllTournamentsLocal();
    const index = tournaments.findIndex(t => t.id === tournament.id);
    
    if (index === -1) {
      tournaments.push(tournament);
    } else {
      tournaments[index] = tournament;
    }
    
    tournaments.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tournaments));
  } catch (error) {
    console.error('保存本地賽事記錄失敗:', error);
  }
}

function deleteTournamentLocal(id: string): void {
  try {
    const tournaments = getAllTournamentsLocal();
    const filtered = tournaments.filter(t => t.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('刪除本地賽事記錄失敗:', error);
  }
}

function getTournamentByIdLocal(id: string): TournamentRecord | null {
  const tournaments = getAllTournamentsLocal();
  return tournaments.find(t => t.id === id) || null;
}

function updateTournamentLocal(tournament: TournamentRecord): void {
  try {
    const tournaments = getAllTournamentsLocal();
    const index = tournaments.findIndex(t => t.id === tournament.id);
    if (index === -1) {
      throw new Error('找不到要更新的賽事記錄');
    }
    
    // 重新計算統計數據
    const totalBuyInGroups = tournament.players.reduce((sum, p) => sum + p.buyInCount, 0);
    const expectedTotalChips = totalBuyInGroups * tournament.startChip;
    const actualTotalChips = tournament.players.reduce((sum, p) => sum + p.currentChips, 0);
    const totalBuyIn = tournament.players.reduce((sum, p) => {
      const entryFee = tournament.tournamentType === 'custom' && tournament.customConfig
        ? tournament.customConfig.entryFee
        : parseInt(tournament.tournamentType);
      return sum + (p.buyInCount * entryFee);
    }, 0);
    
    tournaments[index] = {
      ...tournament,
      totalPlayers: totalBuyInGroups,
      totalBuyIn,
      expectedTotalChips,
      actualTotalChips,
    };
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tournaments));
  } catch (error) {
    console.error('更新本地賽事記錄失敗:', error);
  }
}
