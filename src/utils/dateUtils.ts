/**
 * 台灣時區日期工具函數
 * 台灣時區：Asia/Taipei (UTC+8)
 */

/**
 * 獲取台灣時區的當前日期時間字符串
 * 格式：YYYY-MM-DDTHH:mm:ss
 */
export function getTaiwanDateTime(): string {
  const now = new Date();
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
  
  const parts = formatter.formatToParts(now);
  const year = parts.find(p => p.type === 'year')?.value || '';
  const month = parts.find(p => p.type === 'month')?.value || '';
  const day = parts.find(p => p.type === 'day')?.value || '';
  const hour = parts.find(p => p.type === 'hour')?.value || '';
  const minute = parts.find(p => p.type === 'minute')?.value || '';
  const second = parts.find(p => p.type === 'second')?.value || '';
  
  // 確保月份和日期是兩位數（雖然 formatToParts 應該已經處理了，但為了安全起見）
  const monthPadded = month.padStart(2, '0');
  const dayPadded = day.padStart(2, '0');
  const hourPadded = hour.padStart(2, '0');
  const minutePadded = minute.padStart(2, '0');
  const secondPadded = second.padStart(2, '0');
  
  return `${year}-${monthPadded}-${dayPadded}T${hourPadded}:${minutePadded}:${secondPadded}`;
}

/**
 * 獲取台灣時區的今天日期字符串
 * 格式：YYYY-MM-DD
 */
export function getTaiwanTodayDateKey(): string {
  // 使用 getTaiwanDateTime 並提取日期部分，確保一致性
  const dateTime = getTaiwanDateTime();
  return getDateKey(dateTime);
}

/**
 * 將日期字符串轉換為日期對象（假設為台灣時區）
 * 支持字符串、Date 對象或 Firestore Timestamp
 */
export function parseTaiwanDate(dateInput: string | Date | any): Date {
  // 處理不同類型的輸入
  let dateString: string;
  
  if (!dateInput) {
    // 如果輸入為 null 或 undefined，返回當前日期
    return new Date();
  }
  
  if (dateInput instanceof Date) {
    // 如果是 Date 對象，轉換為 ISO 字符串
    dateString = dateInput.toISOString();
  } else if (typeof dateInput === 'object' && dateInput.toDate) {
    // 如果是 Firestore Timestamp，轉換為 Date 然後轉為字符串
    dateString = dateInput.toDate().toISOString();
  } else if (typeof dateInput === 'string') {
    // 如果已經是字符串，直接使用
    dateString = dateInput;
  } else {
    // 其他情況，嘗試轉換為字符串
    dateString = String(dateInput);
  }
  
  // 如果日期字符串不包含時區信息，假設它是台灣時區
  if (!dateString.includes('+') && !dateString.includes('Z')) {
    // 格式：YYYY-MM-DD 或 YYYY-MM-DDTHH:mm:ss
    const [datePart, timePart] = dateString.split('T');
    if (datePart) {
      const [year, month, day] = datePart.split('-').map(Number);
      let hours = 0, minutes = 0, seconds = 0;
      if (timePart) {
        const [h, m, s] = timePart.split(':').map(Number);
        hours = h || 0;
        minutes = m || 0;
        seconds = s || 0;
      }
      // 創建台灣時區的日期（使用 Date 構造函數，它會使用本地時區）
      // 但我們需要確保日期是正確的台灣時區時間
      // 使用 Intl API 來正確處理
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
      // 創建一個臨時日期來獲取台灣時區的 UTC 偏移
      const tempDate = new Date();
      const taiwanOffset = 8 * 60; // 台灣 UTC+8，以分鐘為單位
      const localOffset = tempDate.getTimezoneOffset(); // 本地時區偏移（分鐘）
      const offsetDiff = taiwanOffset + localOffset; // 需要調整的分鐘數
      
      // 創建本地日期對象
      const localDate = new Date(`${dateStr}Z`); // 先當作 UTC
      // 調整到台灣時區
      return new Date(localDate.getTime() - (offsetDiff * 60 * 1000));
    }
  }
  // 如果已經有時區信息，直接解析
  return new Date(dateString);
}

/**
 * 從日期字符串中提取日期部分（YYYY-MM-DD）
 * 如果日期字符串包含時區信息（Z 或 +），會轉換為台灣時區後再提取
 * 支持字符串、Date 對象或 Firestore Timestamp
 */
export function getDateKey(dateInput: string | Date | any): string {
  // 處理不同類型的輸入
  let dateString: string;
  
  if (!dateInput) {
    // 如果輸入為 null 或 undefined，返回今天的日期
    return getTaiwanTodayDateKey();
  }
  
  if (dateInput instanceof Date) {
    // 如果是 Date 對象，轉換為 ISO 字符串
    dateString = dateInput.toISOString();
  } else if (typeof dateInput === 'object' && dateInput.toDate) {
    // 如果是 Firestore Timestamp，轉換為 Date 然後轉為字符串
    dateString = dateInput.toDate().toISOString();
  } else if (typeof dateInput === 'string') {
    // 如果已經是字符串，直接使用
    dateString = dateInput;
  } else {
    // 其他情況，嘗試轉換為字符串
    dateString = String(dateInput);
  }
  
  // 如果包含時區信息（UTC 或帶時區偏移），需要轉換為台灣時區
  const hasZ = dateString.includes('Z');
  const hasPlus = dateString.includes('+');
  const hasMinusAndColon = dateString.includes('-') && dateString.includes(':') && dateString.length > 19;
  const hasTimezone = hasZ || hasPlus || hasMinusAndColon;
  
  if (hasTimezone) {
    try {
      const date = new Date(dateString);
      // 使用 Intl API 獲取台灣時區的日期部分
      const formatter = new Intl.DateTimeFormat('zh-TW', {
        timeZone: 'Asia/Taipei',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
      
      const parts = formatter.formatToParts(date);
      const year = parts.find(p => p.type === 'year')?.value || '';
      const month = parts.find(p => p.type === 'month')?.value || '';
      const day = parts.find(p => p.type === 'day')?.value || '';
      
      // 確保月份和日期是兩位數
      const monthPadded = month.padStart(2, '0');
      const dayPadded = day.padStart(2, '0');
      
      return `${year}-${monthPadded}-${dayPadded}`;
    } catch (e) {
      // 如果解析失敗，回退到原始方法
      console.warn('日期解析失敗，使用原始方法:', e);
      return dateString.split('T')[0];
    }
  }
  
  // 如果沒有時區信息，直接提取日期部分
  return dateString.split('T')[0];
}

/**
 * 格式化日期為台灣時區顯示
 * 支持字符串、Date 對象或 Firestore Timestamp
 */
export function formatTaiwanDate(dateInput: string | Date | any, options?: Intl.DateTimeFormatOptions): string {
  const date = parseTaiwanDate(dateInput);
  return date.toLocaleDateString('zh-TW', {
    timeZone: 'Asia/Taipei',
    ...options,
  });
}

/**
 * 格式化時間為台灣時區顯示
 * 支持字符串、Date 對象或 Firestore Timestamp
 */
export function formatTaiwanTime(dateInput: string | Date | any, options?: Intl.DateTimeFormatOptions): string {
  const date = parseTaiwanDate(dateInput);
  return date.toLocaleTimeString('zh-TW', {
    timeZone: 'Asia/Taipei',
    ...options,
  });
}
