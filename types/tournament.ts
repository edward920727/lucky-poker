import { TournamentType, Player } from '../constants/pokerConfig';

/**
 * 自定义赛事配置
 */
export interface CustomTournamentConfig {
  name: string; // 比赛名称
  entryFee: number; // 买入金额（報名費）
  administrativeFee: number; // 行政费用（每組行政費）
  startChip: number; // 起始筹码
  prizePerGroup?: number; // 獎金池單價（每組）
  totalDeduction?: number; // 單次總提撥（整場固定一次，不是每組）
  topThreeSplit?: [number, number, number]; // 前三名提撥獎金獲得比例 [第一名%, 第二名%, 第三名%]（可選）
}

/**
 * 比赛状态
 */
export type TournamentStatus = 'in_progress' | 'completed' | 'cancelled';

/**
 * 赛事记录
 */
export interface TournamentRecord {
  id: string; // 唯一标识
  date: string; // 赛事日期 (ISO 格式)
  tournamentType: TournamentType | 'custom'; // 赛事类型
  tournamentName: string; // 赛事名称
  status?: TournamentStatus; // 比赛状态：进行中、已完赛、取消（默认为进行中）
  totalPlayers: number; // 总人数
  totalBuyIn: number; // 总买入金额（總收入）
  administrativeFee?: number; // 行政費（每人）
  totalAdministrativeFee?: number; // 總行政費
  deductionPerGroup?: number; // 單組提撥金（可選）
  totalDeduction?: number; // 總提撥金（單組提撥金 × 組數）
  totalPrizePool?: number; // 總獎池（總收入 - 總行政費 - 總提撥金，或使用自定義單組獎金 × 組數）
  players: Player[]; // 玩家列表（包含会编、买入次数、起始码等）
  expectedTotalChips: number; // 理论总码量
  actualTotalChips: number; // 实际总码量
  startChip: number; // 起始码量
  // 自定义赛事字段
  customConfig?: CustomTournamentConfig; // 自定义赛事配置（仅当 tournamentType 为 'custom' 时使用）
}
