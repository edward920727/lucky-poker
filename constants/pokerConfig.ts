export const TOURNAMENT_TYPES = {
  '600': { name: '600限時錦標', startChip: 25000 },
  '1200': { name: '1200限時錦標', startChip: 25000 },
  '2300': { name: '2300限時錦標', startChip: 35000 },
  '3400': { name: '3400限時錦標', startChip: 50000 },
  '6600': { name: '6600限時錦標', startChip: 100000 },
  '11000': { name: '11000限時錦標', startChip: 150000 },
} as const;

export type TournamentType = keyof typeof TOURNAMENT_TYPES | 'custom';

export type PaymentMethod = 'cash' | 'transfer' | 'unpaid';

export interface Player {
  id: string;
  memberId: string; // 會編
  buyInCount: number; // 買入次數
  currentChips: number; // 當前碼量
  paymentMethod: PaymentMethod; // 支付方式
  couponCode?: string; // 折扣券代碼（選填）
  couponDiscount?: number; // 折扣金額（選填，NT$）
  history?: PlayerHistory[]; // 歷史紀錄
}

export interface PlayerHistory {
  tournamentType: TournamentType;
  tournamentName: string;
  date: string;
  finalChips: number;
  rank?: number;
}

// 模擬玩家歷史資料（實際應用中應該從資料庫或 API 獲取）
export const PLAYER_HISTORY_DB: Record<string, PlayerHistory[]> = {
  '105': [
    { tournamentType: '6600', tournamentName: '6600限時錦標', date: '2024-01-15', finalChips: 125000, rank: 5 },
    { tournamentType: '3400', tournamentName: '3400限時錦標', date: '2024-01-08', finalChips: 75000, rank: 8 },
  ],
  '203': [
    { tournamentType: '1200', tournamentName: '1200限時錦標', date: '2024-01-20', finalChips: 42000, rank: 3 },
  ],
};
