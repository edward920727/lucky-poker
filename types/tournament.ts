import { TournamentType, Player } from '../constants/pokerConfig';

/**
 * 赛事记录
 */
export interface TournamentRecord {
  id: string; // 唯一标识
  date: string; // 赛事日期 (ISO 格式)
  tournamentType: TournamentType; // 赛事类型
  tournamentName: string; // 赛事名称
  totalPlayers: number; // 总人数
  totalBuyIn: number; // 总买入金额
  players: Player[]; // 玩家列表（包含会编、买入次数、起始码等）
  expectedTotalChips: number; // 理论总码量
  actualTotalChips: number; // 实际总码量
  startChip: number; // 起始码量
}
