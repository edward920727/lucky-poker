/**
 * ICM 獎勵結構配置
 * 定義不同報名費對應的行政費
 */
export const ICM_ADMINISTRATIVE_FEE_CONFIG: Record<number, number> = {
  600: 100,
  1200: 200,
  2300: 300,
  3400: 400,
  6600: 600,
  11000: 1000,
  22000: 2000,
};

/**
 * ICM 獎勵結構完整對照表
 * 包含：行政費（每組）、獎金池單價（每組）、單次總提撥（整場固定一次）
 */
export interface ICMRewardStructure {
  administrativeFee: number;      // 行政費（每組）
  prizePerGroup: number;          // 獎金池單價（每組）
  totalDeduction: number;         // 單次總提撥（整場固定一次，不是每組）
  topThreeSplit: [number, number, number]; // 前三名提撥獎金獲得比例 [第一名%, 第二名%, 第三名%]
}

export const ICM_REWARD_STRUCTURE: Record<number, ICMRewardStructure> = {
  600: {
    administrativeFee: 100,      // 每組行政費
    prizePerGroup: 500,           // 每組獎金池單價
    totalDeduction: 100,          // 整場單次總提撥（固定一次）
    topThreeSplit: [50, 30, 20],  // 50% / 30% / 20%
  },
  1200: {
    administrativeFee: 100,
    prizePerGroup: 1100,
    totalDeduction: 100,
    topThreeSplit: [50, 30, 20],
  },
  2300: {
    administrativeFee: 300,
    prizePerGroup: 2000,
    totalDeduction: 200,
    topThreeSplit: [50, 30, 20],
  },
  3400: {
    administrativeFee: 400,
    prizePerGroup: 3000,
    totalDeduction: 300,
    topThreeSplit: [50, 30, 20],
  },
  6600: {
    administrativeFee: 600,
    prizePerGroup: 6000,
    totalDeduction: 500,
    topThreeSplit: [50, 30, 20],
  },
  11000: {
    administrativeFee: 1000,
    prizePerGroup: 10000,
    totalDeduction: 1000,
    topThreeSplit: [50, 30, 20],
  },
  22000: {
    administrativeFee: 2000,
    prizePerGroup: 20000,
    totalDeduction: 2000,
    topThreeSplit: [50, 30, 20],
  },
};

/**
 * 獲取指定報名費的完整ICM獎勵結構
 */
export function getICMRewardStructure(entryFee: number): ICMRewardStructure | null {
  return ICM_REWARD_STRUCTURE[entryFee] || null;
}

/**
 * 獲取指定報名費的行政費
 * 注意：此函數已被 utils/administrativeFeeConfig.ts 中的版本取代
 * 保留此函數以向後兼容，但建議使用 utils/administrativeFeeConfig.ts 中的版本
 */
export function getAdministrativeFee(entryFee: number): number {
  // 嘗試從 localStorage 讀取用戶自定義配置
  try {
    const saved = localStorage.getItem('administrative_fee_config');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed[entryFee] !== undefined) {
        return parsed[entryFee];
      }
    }
  } catch (error) {
    // 忽略錯誤，使用默認配置
  }
  return ICM_ADMINISTRATIVE_FEE_CONFIG[entryFee] || 0;
}

/**
 * 獲取指定報名費的行政費（保留舊函數名以向後兼容）
 */
export function getDeductionAmount(entryFee: number): number {
  return ICM_ADMINISTRATIVE_FEE_CONFIG[entryFee] || 0;
}

/**
 * 計算總收入（報名費 × 人數）
 * @param entryFee 報名費
 * @param totalPlayers 總參賽人數
 * @returns 總收入金額
 */
export function calculateTotalRevenue(entryFee: number, totalPlayers: number): number {
  return entryFee * totalPlayers;
}

/**
 * 計算總行政費
 * @param administrativeFee 每人行政費
 * @param totalPlayers 總參賽人數
 * @returns 總行政費金額
 */
export function calculateTotalAdministrativeFee(administrativeFee: number, totalPlayers: number): number {
  return administrativeFee * totalPlayers;
}

/**
 * 計算總獎池（報名費扣完行政費 × 總人數）
 * @param entryFee 報名費
 * @param totalPlayers 總參賽人數
 * @param administrativeFee 行政費（可選，如果不提供則使用默認配置）
 * @returns 總獎池金額
 */
export function calculateTotalPrizePool(entryFee: number, totalPlayers: number, administrativeFee?: number): number {
  const fee = administrativeFee !== undefined ? administrativeFee : getAdministrativeFee(entryFee);
  // 總獎池 = (報名費 - 行政費) × 總人數
  return (entryFee - fee) * totalPlayers;
}

/**
 * 前二名獎金分配（60/40%）
 */
export interface TopTwoPrizeResult {
  first: number;  // 第一名獎金
  second: number; // 第二名獎金
  totalPrizePool: number;
}

/**
 * 前三名獎金分配（50/30/20%）
 */
export interface TopThreePrizeResult {
  first: number;   // 第一名獎金
  second: number;  // 第二名獎金
  third: number;  // 第三名獎金
  totalPrizePool: number;
}

/**
 * 計算前二名獎金分配（60/40%）
 * @param totalPrizePool 總獎池
 * @returns 前二名獎金分配結果
 */
export function calculateTopTwoPrizes(totalPrizePool: number): TopTwoPrizeResult {
  const first = Math.round(totalPrizePool * 0.6);
  const second = Math.round(totalPrizePool * 0.4);
  
  // 確保總和等於總獎池（處理四捨五入誤差）
  const total = first + second;
  const difference = totalPrizePool - total;
  
  return {
    first: first + difference, // 將誤差加到第一名
    second,
    totalPrizePool,
  };
}

/**
 * 計算前三名獎金分配（50/30/20%）
 * @param totalPrizePool 總獎池
 * @returns 前三名獎金分配結果
 */
export function calculateTopThreePrizes(totalPrizePool: number): TopThreePrizeResult {
  const first = Math.round(totalPrizePool * 0.5);
  const second = Math.round(totalPrizePool * 0.3);
  const third = Math.round(totalPrizePool * 0.2);
  
  // 確保總和等於總獎池（處理四捨五入誤差）
  const total = first + second + third;
  const difference = totalPrizePool - total;
  
  return {
    first: first + difference, // 將誤差加到第一名
    second,
    third,
    totalPrizePool,
  };
}
