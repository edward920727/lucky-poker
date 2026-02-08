import { AuditLog, LogAction } from '../types/auditLog';

const STORAGE_KEY = 'lucky_poker_audit_logs';
const MAX_LOGS = 1000; // 最多保存1000条日志

/**
 * 获取所有操作日志
 */
export function getAllLogs(): AuditLog[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    return JSON.parse(data);
  } catch (error) {
    console.error('读取操作日志失败:', error);
    return [];
  }
}

/**
 * 记录操作日志
 */
export function logAction(
  action: LogAction,
  memberId: string,
  operator: string = '系统',
  field?: string,
  oldValue?: any,
  newValue?: any
): void {
  try {
    const logs = getAllLogs();
    const description = generateDescription(action, memberId, field, oldValue, newValue);
    
    const log: AuditLog = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toISOString(),
      action,
      operator,
      memberId,
      field,
      oldValue,
      newValue,
      description,
    };

    logs.unshift(log); // 最新的在前面
    
    // 限制日志数量
    if (logs.length > MAX_LOGS) {
      logs.splice(MAX_LOGS);
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
  } catch (error) {
    console.error('记录操作日志失败:', error);
  }
}

/**
 * 生成操作描述
 */
function generateDescription(
  action: LogAction,
  memberId: string,
  field?: string,
  oldValue?: any,
  newValue?: any
): string {
  switch (action) {
    case 'create':
      return `新增玩家 會編${memberId}`;
    case 'update':
      if (field === 'currentChips') {
        return `修改 會編${memberId} 的碼量: ${oldValue?.toLocaleString()} -> ${newValue?.toLocaleString()}`;
      } else if (field === 'buyInCount') {
        return `修改 會編${memberId} 的買入次數: ${oldValue} -> ${newValue}`;
      } else if (field === 'paymentMethod') {
        return `修改 會編${memberId} 的支付方式: ${oldValue} -> ${newValue}`;
      }
      return `修改 會編${memberId} 的 ${field}`;
    case 'delete':
      return `刪除玩家 會編${memberId}`;
    case 'buyin':
      return `會編${memberId} 增加買入`;
    case 'chip_change':
      return `會編${memberId} 碼量變更: ${oldValue?.toLocaleString()} -> ${newValue?.toLocaleString()}`;
    default:
      return `操作 會編${memberId}`;
  }
}

/**
 * 根据会编获取相关日志
 */
export function getLogsByMemberId(memberId: string): AuditLog[] {
  const logs = getAllLogs();
  return logs.filter(log => log.memberId === memberId);
}

/**
 * 清空所有日志（仅用于测试，生产环境应禁用）
 */
export function clearAllLogs(): void {
  if (confirm('確定要清空所有操作日志嗎？此操作不可恢復！')) {
    localStorage.removeItem(STORAGE_KEY);
  }
}
