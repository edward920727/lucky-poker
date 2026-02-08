/**
 * 操作日志类型
 */
export type LogAction = 'create' | 'update' | 'delete' | 'buyin' | 'chip_change';

export interface AuditLog {
  id: string;
  timestamp: string; // ISO 格式时间
  action: LogAction; // 操作类型
  operator: string; // 操作者（默认 '系统'）
  memberId: string; // 受影响的玩家会编
  field?: string; // 被修改的字段（如 'currentChips', 'buyInCount'）
  oldValue?: any; // 旧值
  newValue?: any; // 新值
  description: string; // 操作描述
}
