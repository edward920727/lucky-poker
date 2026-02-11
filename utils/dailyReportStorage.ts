import { DailyReport } from '../types/dailyReport';
import { 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  getDocs, 
  query, 
  orderBy,
  deleteDoc,
  Timestamp
} from 'firebase/firestore';
import { initializeApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
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
    // 檢查是否為配置錯誤
    const errorMessage = error?.message || '';
    if (errorMessage.includes('already exists') || errorMessage.includes('duplicate')) {
      // Firebase 已經初始化，這是正常的
      if (!db && app) {
        db = getFirestore(app);
      }
      return true;
    }
    
    console.warn('Firebase 初始化遇到問題，將使用本地存儲:', error?.code || error?.message || error);
    return false;
  }
}

const STORAGE_KEY = 'lucky_poker_daily_reports';
const COLLECTION_NAME = 'daily_reports';

/**
 * 获取所有日报表（本地版本）
 */
function getAllReportsLocal(): DailyReport[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    return JSON.parse(data);
  } catch (error) {
    console.error('读取日报表失败:', error);
    return [];
  }
}

/**
 * 保存日报表（本地版本）
 */
function saveReportLocal(report: DailyReport): void {
  try {
    const reports = getAllReportsLocal();
    const index = reports.findIndex(r => r.id === report.id);
    if (index === -1) {
      reports.push(report);
    } else {
      reports[index] = report;
    }
    // 按日期倒序排列
    reports.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
  } catch (error) {
    console.error('保存日报表失败:', error);
  }
}

/**
 * Firestore 数据转换
 */
function firestoreToReport(data: any): DailyReport {
  // 处理日期字段
  let dateString = data.date;
  if (data.date && data.date.toDate) {
    // Firestore Timestamp
    dateString = data.date.toDate().toISOString().split('T')[0];
  } else if (data.date && typeof data.date === 'string') {
    // 已经是字符串
    dateString = data.date;
  }

  // 处理时间戳字段
  const createdAt = data.createdAt?.toDate?.()?.toISOString() || data.createdAt || new Date().toISOString();
  const updatedAt = data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt || new Date().toISOString();

  return {
    ...data,
    date: dateString,
    createdAt,
    updatedAt,
  } as DailyReport;
}

function reportToFirestore(report: DailyReport): any {
  return {
    ...report,
    date: report.date, // 保持字符串格式 YYYY-MM-DD
    createdAt: Timestamp.fromDate(new Date(report.createdAt)),
    updatedAt: Timestamp.fromDate(new Date(report.updatedAt)),
    expenses: report.expenses.map(exp => ({
      ...exp,
      createdAt: Timestamp.fromDate(new Date(exp.createdAt)),
    })),
  };
}

/**
 * 获取指定日期的日报表
 */
export async function getDailyReport(date: string): Promise<DailyReport | null> {
  // 确保日期格式为 YYYY-MM-DD
  const dateKey = date.split('T')[0];
  
  // 尝试从云端获取
  if (initFirebase() && db) {
    try {
      const reportRef = doc(db, COLLECTION_NAME, dateKey);
      const reportSnap = await getDoc(reportRef);
      
      if (reportSnap.exists()) {
        const report = firestoreToReport({ id: reportSnap.id, ...reportSnap.data() });
        // 同时更新本地存储
        saveReportLocal(report);
        return report;
      }
    } catch (error) {
      console.error('从云端获取日报表失败:', error);
    }
  }
  
  // 从本地获取
  const reports = getAllReportsLocal();
  return reports.find(r => r.id === dateKey) || null;
}

/**
 * 保存或更新日报表
 */
export async function saveDailyReport(report: DailyReport): Promise<void> {
  const updatedReport: DailyReport = {
    ...report,
    updatedAt: new Date().toISOString(),
  };

  // 保存到本地
  saveReportLocal(updatedReport);

  // 同步到云端
  if (initFirebase() && db) {
    try {
      const reportRef = doc(db, COLLECTION_NAME, updatedReport.id);
      await setDoc(reportRef, reportToFirestore(updatedReport));
    } catch (error) {
      console.error('同步到云端失败（不影响本地保存）:', error);
    }
  }
}

/**
 * 获取所有日报表
 */
export async function getAllDailyReports(): Promise<DailyReport[]> {
  // 尝试从云端获取
  if (initFirebase() && db) {
    try {
      const reportsRef = collection(db, COLLECTION_NAME);
      const q = query(reportsRef, orderBy('date', 'desc'));
      const querySnapshot = await getDocs(q);
      
      const reports: DailyReport[] = [];
      querySnapshot.forEach((doc) => {
        reports.push(firestoreToReport({ id: doc.id, ...doc.data() }));
      });

      // 同时更新本地存储
      if (reports.length > 0) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
      }

      return reports;
    } catch (error) {
      console.error('从云端获取失败，使用本地存储:', error);
    }
  }
  
  // 从本地获取
  return getAllReportsLocal();
}

/**
 * 删除日报表
 */
export async function deleteDailyReport(date: string): Promise<void> {
  const dateKey = date.split('T')[0];
  
  // 从本地删除
  try {
    const reports = getAllReportsLocal();
    const filtered = reports.filter(r => r.id !== dateKey);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('删除本地日报表失败:', error);
  }

  // 从云端删除
  if (initFirebase() && db) {
    try {
      const reportRef = doc(db, COLLECTION_NAME, dateKey);
      await deleteDoc(reportRef);
    } catch (error) {
      console.error('从云端删除失败（不影响本地删除）:', error);
    }
  }
}
