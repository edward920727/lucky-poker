import { TournamentSettlement } from '../types/settlement';
import { 
  Firestore, 
  collection, 
  doc, 
  setDoc,
  Timestamp
} from 'firebase/firestore';
import { getSharedFirebase } from './firebaseConfig';

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

// 轉換 TournamentSettlement 為 Firestore 格式
function settlementToFirestore(settlement: TournamentSettlement): any {
  return {
    ...settlement,
    date: Timestamp.fromDate(new Date(settlement.date)),
    createdAt: Timestamp.fromDate(new Date(settlement.createdAt)),
    updatedAt: Timestamp.fromDate(new Date(settlement.updatedAt)),
  };
}

/**
 * 保存賽事結算記錄到 Firebase
 */
export async function saveSettlementToFirebase(settlement: TournamentSettlement): Promise<void> {
  if (!initFirebase() || !db) {
    throw new Error('Firebase 未配置或初始化失敗');
  }

  try {
    const settlementsRef = collection(db, 'settlements');
    const settlementDoc = doc(settlementsRef, settlement.id);
    
    const firestoreData = settlementToFirestore(settlement);
    await setDoc(settlementDoc, firestoreData, { merge: true });
    
    // 結算記錄已同步到 Firebase
  } catch (error) {
    console.error('保存結算記錄到 Firebase 失敗:', error);
    throw error;
  }
}

/**
 * 從本地存儲保存結算記錄（備用方案）
 */
export function saveSettlementToLocal(settlement: TournamentSettlement): void {
  try {
    const STORAGE_KEY = 'tournament_settlements';
    const existing = localStorage.getItem(STORAGE_KEY);
    const settlements: TournamentSettlement[] = existing ? JSON.parse(existing) : [];
    
    const index = settlements.findIndex(s => s.id === settlement.id);
    if (index >= 0) {
      settlements[index] = settlement;
    } else {
      settlements.push(settlement);
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settlements));
    // 結算記錄已保存到本地存儲
  } catch (error) {
    console.error('保存結算記錄到本地存儲失敗:', error);
    throw error;
  }
}
