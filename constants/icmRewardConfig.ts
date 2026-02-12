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
  activityBonus?: number;         // 預設活動獎金（選填，從總獎金池額外抽出，不分配給玩家）
}

export const ICM_REWARD_STRUCTURE: Record<number, ICMRewardStructure> = {
  600: {
    administrativeFee: 100,
    prizePerGroup: 500,
    totalDeduction: 100,
    topThreeSplit: [50, 30, 20],
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
