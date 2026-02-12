import { TournamentRecord } from '../types/tournament';
import { Firestore } from 'firebase/firestore';
import { 
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
import { getSharedFirebase } from './firebaseConfig';

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

let db: Firestore | null = null;

// 初始化 Firebase（使用共用實例）
function initFirebase(): boolean {
  if (db) return true;
  const shared = getSharedFirebase();
  if (shared) {
    db = shared.db;
    return true;
  }
  return false;
}

/**
 * 檢查是否為可忽略的網路錯誤（QUIC 協議錯誤、HTTP 錯誤等）
 * 這些錯誤通常是非關鍵的，Firebase SDK 會自動重試
 */
function isIgnorableNetworkError(error: any): boolean {
  if (!error) return false;
  
  // 檢查錯誤訊息中是否包含 QUIC 相關錯誤
  const errorMessage = error.message || '';
  const errorCode = error.code || '';
  const errorString = JSON.stringify(error).toLowerCase();
  const errorName = error.name || '';
  
  // QUIC 協議錯誤（通常是網路層面的暫時性問題）
  if (errorMessage.includes('QUIC') || 
      errorMessage.includes('QUIC_PROTOCOL_ERROR') ||
      errorMessage.includes('QUIC_PACKET_WRITE_ERROR') ||
      errorString.includes('quic')) {
    return true;
  }
  
  // HTTP 錯誤（404, 400 等）- Firebase SDK 會自動重試
  if (errorMessage.includes('404') ||
      errorMessage.includes('400') ||
      errorMessage.includes('Failed to load resource') ||
      errorMessage.includes('the server responded with a status') ||
      errorString.includes('404') ||
      errorString.includes('400') ||
      errorMessage.includes('firestore.googleapis.com')) {
    return true;
  }
  
  // 網路連接錯誤（Firebase SDK 會自動重試）
  if (errorCode === 'unavailable' || 
      errorCode === 'deadline-exceeded' ||
      errorMessage.includes('network') ||
      errorMessage.includes('NetworkError') ||
      errorMessage.includes('fetch') ||
      errorName === 'NetworkError') {
    return true;
  }
  
  // Firestore 連接錯誤（通常是暫時性的）
  if (errorMessage.includes('firestore') && 
      (errorMessage.includes('Listen') || errorMessage.includes('channel'))) {
    return true;
  }
  
  // 檢查 URL 是否包含 Firestore Listen channel（這些錯誤可以忽略）
  if (errorMessage.includes('Listen/channel') || 
      errorString.includes('listen/channel') ||
      errorMessage.includes('gsessionid')) {
    return true;
  }
  
  return false;
}

/**
 * 設置全局錯誤處理器，抑制非關鍵的 Firebase 網路錯誤
 */
export function setupGlobalErrorHandler(): void {
  // 保存原始的錯誤處理器
  const originalError = console.error;
  const originalWarn = console.warn;
  
  // 攔截 console.error
  console.error = (...args: any[]) => {
    const errorString = args.map(arg => 
      typeof arg === 'string' ? arg : JSON.stringify(arg)
    ).join(' ');
    
    // 檢查是否為可忽略的 Firebase 錯誤
    if (errorString.includes('firestore.googleapis.com') &&
        (errorString.includes('404') || errorString.includes('400') || 
         errorString.includes('Failed to load resource'))) {
      // 靜默處理，不顯示錯誤
      return;
    }
    
    // 其他錯誤正常顯示
    originalError.apply(console, args);
  };
  
  // 攔截 console.warn（某些錯誤可能以警告形式顯示）
  console.warn = (...args: any[]) => {
    const warnString = args.map(arg => 
      typeof arg === 'string' ? arg : JSON.stringify(arg)
    ).join(' ');
    
    // 檢查是否為可忽略的 Firebase 錯誤
    if (warnString.includes('firestore.googleapis.com') &&
        (warnString.includes('404') || warnString.includes('400') || 
         warnString.includes('Failed to load resource'))) {
      // 靜默處理，不顯示警告
      return;
    }
    
    // 其他警告正常顯示
    originalWarn.apply(console, args);
  };
  
  // 攔截全局錯誤事件（捕獲未處理的錯誤）
  window.addEventListener('error', (event) => {
    const errorMessage = event.message || '';
    const errorSource = event.filename || '';
    
    // 檢查是否為 Firebase Firestore 的 404/400 錯誤
    if (errorSource.includes('firestore.googleapis.com') ||
        errorMessage.includes('firestore.googleapis.com') ||
        (errorMessage.includes('404') && errorSource.includes('firestore')) ||
        (errorMessage.includes('400') && errorSource.includes('firestore'))) {
      // 阻止錯誤顯示在控制台
      event.preventDefault();
      return false;
    }
  }, true); // 使用捕獲階段以更早攔截
  
  // 攔截 Promise rejection（捕獲未處理的 Promise 錯誤）
  window.addEventListener('unhandledrejection', (event) => {
    const error = event.reason;
    const errorMessage = error?.message || String(error) || '';
    const errorString = JSON.stringify(error).toLowerCase();
    
    // 檢查是否為可忽略的 Firebase 錯誤
    if (isIgnorableNetworkError(error) ||
        errorMessage.includes('firestore.googleapis.com') ||
        errorString.includes('firestore.googleapis.com')) {
      // 阻止錯誤顯示在控制台
      event.preventDefault();
      return false;
    }
  });
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
      let date: Date | null = null;
      
      // 檢查是否為 Firestore Timestamp（有多種可能的格式）
      // 優先檢查標準 Firestore Timestamp 對象
      if (data.date.toDate && typeof data.date.toDate === 'function') {
        try {
          date = data.date.toDate();
        } catch (e) {
          console.warn('無法調用 toDate() 方法:', e);
        }
      }
      // 檢查是否有 toMillis 方法
      else if (data.date.toMillis && typeof data.date.toMillis === 'function') {
        try {
          date = new Date(data.date.toMillis());
        } catch (e) {
          console.warn('無法調用 toMillis() 方法:', e);
        }
      }
      // 檢查是否為序列化的 Firestore Timestamp（包含 seconds）
      else if ('seconds' in data.date || '_seconds' in data.date || 
               data.date.seconds !== undefined || data.date._seconds !== undefined) {
        const seconds = data.date.seconds || data.date._seconds || 
                       (data.date as any).seconds || (data.date as any)._seconds || 0;
        const nanoseconds = data.date.nanoseconds || data.date._nanoseconds || 
                           (data.date as any).nanoseconds || (data.date as any)._nanoseconds || 0;
        date = new Date(seconds * 1000 + nanoseconds / 1000000);
      }
      // 檢查是否為 Date 對象
      else if (data.date instanceof Date) {
        date = data.date;
      }
      // 檢查是否有 valueOf 方法（某些日期對象）
      else if (typeof data.date.valueOf === 'function') {
        try {
          const timestamp = data.date.valueOf();
          date = new Date(timestamp);
        } catch (e) {
          console.warn('無法調用 valueOf() 方法:', e);
        }
      }
      // 檢查是否有 getTime 方法
      else if (typeof data.date.getTime === 'function') {
        try {
          const timestamp = data.date.getTime();
          date = new Date(timestamp);
        } catch (e) {
          console.warn('無法調用 getTime() 方法:', e);
        }
      }
      
      // 如果成功獲取日期，進行格式化
      if (date && !isNaN(date.getTime())) {
        // 使用 getTaiwanDateTime 的邏輯來確保格式一致
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
      } else {
        // 無法識別的日期對象類型，嘗試更多方法
        // 先嘗試直接轉換為 Date
        try {
          const possibleDate = new Date(data.date as any);
          if (!isNaN(possibleDate.getTime())) {
            date = possibleDate;
          }
        } catch (e) {
          // 忽略錯誤，繼續嘗試其他方法
        }
        
        // 如果還是無法識別，記錄詳細信息以便調試（僅在開發環境）
        if (!date || isNaN(date.getTime())) {
          const dateObjKeys = Object.keys(data.date || {});
          const dateObjStr = JSON.stringify(data.date, null, 2);
          
          // 只在控制台顯示一次詳細信息，避免重複輸出
          if (!(window as any).__dateConversionWarningShown) {
            console.warn('未知的日期對象類型，嘗試其他方法。對象結構:', {
              keys: dateObjKeys,
              type: typeof data.date,
              constructor: data.date?.constructor?.name,
              hasToDate: typeof data.date?.toDate === 'function',
              hasSeconds: 'seconds' in data.date || '_seconds' in data.date,
              hasToMillis: typeof data.date?.toMillis === 'function',
              hasGetTime: typeof data.date?.getTime === 'function',
              hasValueOf: typeof data.date?.valueOf === 'function',
              stringified: dateObjStr.substring(0, 200) // 限制長度
            });
            (window as any).__dateConversionWarningShown = true;
          }
          
          // 最後嘗試：檢查對象的所有屬性，尋找可能的時間戳
          let foundTimestamp = false;
          for (const key in data.date) {
            if (key.toLowerCase().includes('second') || key.toLowerCase().includes('time') || key.toLowerCase().includes('stamp')) {
              const value = (data.date as any)[key];
              if (typeof value === 'number' && value > 1000000000) { // 可能是時間戳
                try {
                  date = new Date(value * (value < 1000000000000 ? 1000 : 1)); // 支持秒和毫秒
                  if (!isNaN(date.getTime())) {
                    foundTimestamp = true;
                    break;
                  }
                } catch (e) {
                  // 繼續嘗試
                }
              }
            }
          }
          
          // 如果所有方法都失敗，使用當前日期
          if (!foundTimestamp && (!date || isNaN(date.getTime()))) {
            dateString = getTaiwanDateTimeString();
          } else if (date && !isNaN(date.getTime())) {
            // 如果成功獲取日期，進行格式化（使用與上面相同的格式化邏輯）
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
            
            if (!year || !month || !day || !hour || !minute || !second) {
              dateString = getTaiwanDateTimeString(date);
            } else {
              dateString = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${hour.padStart(2, '0')}:${minute.padStart(2, '0')}:${second.padStart(2, '0')}`;
            }
          } else {
            dateString = getTaiwanDateTimeString();
          }
        } else if (date && !isNaN(date.getTime())) {
          // 如果通過直接轉換成功獲取日期，進行格式化
          dateString = getTaiwanDateTimeString(date);
        } else {
          dateString = getTaiwanDateTimeString();
        }
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
    } catch (error) {
      console.error('同步到雲端失敗:', error);
    }
  }
}

/**
 * 刪除賽事記錄
 */
export async function deleteTournament(id: string): Promise<void> {
  deleteTournamentLocal(id);

  if (initFirebase() && db) {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      await deleteDoc(docRef);
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
    }, (error: any) => {
      // 忽略非關鍵的網路錯誤（QUIC 協議錯誤、404、400 等，Firebase SDK 會自動重試）
      if (isIgnorableNetworkError(error)) {
        // 靜默處理，不顯示錯誤訊息
        return;
      }
      
      // 檢查是否為 HTTP 錯誤（404, 400 等）
      const errorCode = error?.code || '';
      const errorMessage = error?.message || '';
      const isHttpError = errorCode === 'unavailable' || 
                         errorCode === 'deadline-exceeded' ||
                         errorMessage.includes('404') ||
                         errorMessage.includes('400') ||
                         errorMessage.includes('Failed to load resource');
      
      if (isHttpError) {
        // HTTP 錯誤通常是暫時性的，Firebase SDK 會自動重試
        // 使用本地數據作為備份，但不顯示錯誤
        const localTournaments = getAllTournamentsLocal();
        if (localTournaments.length > 0) {
          onUpdate(localTournaments);
        }
        return;
      }
      
      // 處理權限錯誤（通常是安全規則問題）
      if (error?.code === 'permission-denied' || error?.code === 7) {
        console.warn('Firestore 權限被拒絕，請檢查安全規則。將使用本地存儲模式。');
        console.warn('提示：請在 Firebase Console 中將 tournaments 集合的安全規則設置為 allow read, write: if true;');
        // 嘗試一次性加載數據作為備份
        getAllTournamentsAsync().then(tournaments => {
          if (tournaments.length > 0) {
            onUpdate(tournaments);
          } else {
            const localTournaments = getAllTournamentsLocal();
            onUpdate(localTournaments);
          }
        }).catch(() => {
          // 如果也失敗，使用本地數據
          const localTournaments = getAllTournamentsLocal();
          onUpdate(localTournaments);
        });
      } else if (error?.code === 'failed-precondition' || error?.code === 9) {
        console.warn('Firestore 查詢需要索引。請在 Firebase Console 中創建所需的索引。');
        console.warn('將使用本地存儲模式。');
        const localTournaments = getAllTournamentsLocal();
        onUpdate(localTournaments);
      } else {
        // 對於其他錯誤，也嘗試使用本地數據
        console.warn('實時同步遇到問題，使用本地存儲模式:', error?.code || error?.message || error);
        const localTournaments = getAllTournamentsLocal();
        onUpdate(localTournaments);
      }
    });

    return unsubscribe;
  } catch (error) {
    console.error('設置實時同步失敗:', error);
    // 發生錯誤時，使用本地數據
    const localTournaments = getAllTournamentsLocal();
    onUpdate(localTournaments);
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
