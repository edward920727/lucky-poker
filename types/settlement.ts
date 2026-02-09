/**
 * 賽事結算記錄
 */
export interface TournamentSettlement {
  id: string; // 唯一標識
  tournamentId?: string; // 關聯的賽事ID（可選）
  date: string; // 結算日期 (ISO 格式)
  entryFee: number; // 報名費
  deduction: number; // 提撥金額
  totalPlayers: number; // 總參賽人數
  totalPrizePool: number; // 總獎池
  distributionType: 'topTwo' | 'topThree'; // 分配類型
  prizes: {
    first: number;
    second: number;
    third?: number; // 僅前三名時有
  };
  createdAt: string; // 創建時間
  updatedAt: string; // 更新時間
}
