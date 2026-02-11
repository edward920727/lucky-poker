/**
 * 额外支出类型
 */
export type ExpenseType = 'entertainment' | 'miscellaneous' | 'pt_salary';

/**
 * 额外支出记录
 */
export interface ExpenseRecord {
  id: string; // 唯一标识
  type: ExpenseType; // 支出类型
  amount: number; // 金额
  description?: string; // 备注说明
  createdAt: string; // 创建时间
}

/**
 * 活动奖金统计
 */
export interface ActivityBonusStats {
  amount: number; // 奖金金额（100/200/300/500）
  count: number; // 设置次数
  total: number; // 总金额
}

/**
 * 赛事类型统计
 */
export interface TournamentTypeStats {
  type: string; // 赛事类型（如 '600', '1200', 'custom' 等）
  name: string; // 赛事名称
  groups: number; // 组数
}

/**
 * 每日报表数据
 */
export interface DailyReport {
  id: string; // 唯一标识（使用日期 YYYY-MM-DD）
  date: string; // 日期 (YYYY-MM-DD)
  
  // 赛事统计
  tournamentStats: TournamentTypeStats[]; // 各赛事类型的组数统计
  
  // 收入统计
  totalAdministrativeFee: number; // 总行政费
  activityBonuses: ActivityBonusStats[]; // 活动奖金统计（100/200/300/500）
  totalActivityBonus: number; // 活动奖金总额
  totalIncome: number; // 总收入（行政费 + 活动奖金）
  
  // 支出统计
  expenses: ExpenseRecord[]; // 额外支出列表
  totalExpenses: number; // 总支出
  
  // 现金管理
  previousDayCash: number; // 前日柜台现金应该有多少
  expectedCash: number; // 今日应有现金（前日现金 + 今日收入 - 今日支出）
  actualCash: number; // 实际现金
  
  // 元数据
  createdAt: string; // 创建时间
  updatedAt: string; // 更新时间
}
