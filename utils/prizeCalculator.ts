import { Player } from '../constants/pokerConfig';

/**
 * 玩家奖金分配结果
 */
export interface PlayerPrize {
  memberId: string;
  rank: number;
  chips: number;
  chipPercentage: number; // 筹码占比
  chipBasedPrize: number; // 按筹码占比计算的奖金
  topThreeBonus: number; // 前三名提拨奖金（仅前三名有）
  prizeAmount: number; // 最终奖金 = chipBasedPrize + topThreeBonus
}

/**
 * 前三名奖金分配结果
 */
export interface TopThreePrize {
  rank: number;
  percentage: number;
  amount: number;
}

/**
 * 奖金分配结果（包含统计信息）
 */
export interface PrizeCalculationResult {
  topThreePrizes: TopThreePrize[]; // 前三名提拨奖金
  playerPrizes: PlayerPrize[]; // 所有玩家的奖金（按筹码排序）
  totalPrizePool: number;
  topThreeTotal: number; // 前三名提拨总奖金
  chipBasedTotal: number; // 按筹码占比分配的总奖金
  remainingPrizePool: number; // 剩余奖池（用于按筹码占比分配）
  totalDistributed: number;
  adjustmentAmount: number; // 调整到第一名的差额
}

/**
 * 奖金分配函数（新版本：先按筹码占比分配，再提拨前三名）
 * @param totalPrizePool 总奖池
 * @param topThreePercentages 前三名的提拨百分比数组 [第1名%, 第2名%, 第3名%]
 * @param players 玩家列表
 * @returns 分配结果
 */
export function calculatePrize(
  totalPrizePool: number,
  topThreePercentages: [number, number, number], // [第1名%, 第2名%, 第3名%]
  players: Player[]
): PrizeCalculationResult {
  if (totalPrizePool <= 0 || players.length === 0) {
    return {
      topThreePrizes: [],
      playerPrizes: [],
      totalPrizePool,
      topThreeTotal: 0,
      chipBasedTotal: 0,
      remainingPrizePool: 0,
      totalDistributed: 0,
      adjustmentAmount: 0,
    };
  }

  // 按筹码从高到低排序
  const sortedPlayers = [...players].sort((a, b) => b.currentChips - a.currentChips);
  // 只計算籌碼不為0的玩家的總籌碼
  const totalChips = sortedPlayers.filter(p => p.currentChips > 0).reduce((sum, p) => sum + p.currentChips, 0);

  // 第一步：先按筹码占比计算所有玩家应该得到的奖金
  const chipBasedPrizes: Array<{ memberId: string; rank: number; chips: number; chipPercentage: number; amount: number }> = [];
  
  for (let i = 0; i < sortedPlayers.length; i++) {
    const player = sortedPlayers[i];
    const chipPercentage = totalChips > 0 ? (player.currentChips / totalChips) * 100 : 0;
    const originalAmount = (totalPrizePool * chipPercentage) / 100;
    // 四舍五入到百位
    const amount = Math.round(originalAmount / 100) * 100;
    
    chipBasedPrizes.push({
      memberId: player.memberId,
      rank: i + 1,
      chips: player.currentChips,
      chipPercentage,
      amount,
    });
  }

  // 计算按筹码占比分配的总金额
  const chipBasedTotal = chipBasedPrizes.reduce((sum, p) => sum + p.amount, 0);

  // 第二步：从总奖池中提拨前三名的奖金（按百分比）
  // 只計算籌碼不為0的前三名玩家
  const topThreePrizes: TopThreePrize[] = [];
  let topThreeTotal = 0;
  
  // 找出籌碼不為0的前三名玩家
  const eligibleTopThree = sortedPlayers.filter(p => p.currentChips > 0).slice(0, 3);

  for (let i = 0; i < Math.min(3, eligibleTopThree.length); i++) {
    const percentage = topThreePercentages[i] || 0;
    const originalAmount = (totalPrizePool * percentage) / 100;
    // 四舍五入到百位
    const amount = Math.round(originalAmount / 100) * 100;
    
    topThreePrizes.push({
      rank: i + 1,
      percentage,
      amount,
    });
    topThreeTotal += amount;
  }

  // 第三步：计算剩余奖池（用于按筹码占比分配）
  const remainingPrizePool = totalPrizePool - topThreeTotal;

  // 第四步：剩余奖池按筹码占比分配给所有玩家
  const finalPlayerPrizes: PlayerPrize[] = [];
  
  for (let i = 0; i < sortedPlayers.length; i++) {
    const player = sortedPlayers[i];
    const chipBasedPrize = chipBasedPrizes[i];
    
    // 如果籌碼為0，獎金一定是0
    if (player.currentChips === 0) {
      finalPlayerPrizes.push({
        memberId: player.memberId,
        rank: i + 1,
        chips: 0,
        chipPercentage: 0,
        chipBasedPrize: 0,
        topThreeBonus: 0,
        prizeAmount: 0,
      });
      continue;
    }
    
    // 计算剩余奖池中该玩家应得的份额
    const remainingChipPercentage = totalChips > 0 ? (player.currentChips / totalChips) * 100 : 0;
    const remainingAmount = (remainingPrizePool * remainingChipPercentage) / 100;
    const remainingRounded = Math.round(remainingAmount / 100) * 100;
    
    // 前三名有提拨奖金（但只有籌碼不為0且是有效前三名的玩家才能獲得）
    // 需要檢查這個玩家是否在 eligibleTopThree 中
    const playerIndexInEligible = eligibleTopThree.findIndex(p => p.memberId === player.memberId);
    const topThreeBonus = (playerIndexInEligible >= 0 && playerIndexInEligible < 3 && player.currentChips > 0) 
      ? (topThreePrizes[playerIndexInEligible]?.amount || 0)
      : 0;
    
    // 最终奖金 = 剩余奖池按筹码占比分配的部分 + 前三名提拨奖金
    const finalPrize = remainingRounded + topThreeBonus;
    
    finalPlayerPrizes.push({
      memberId: player.memberId,
      rank: i + 1,
      chips: player.currentChips,
      chipPercentage: chipBasedPrize.chipPercentage,
      chipBasedPrize: chipBasedPrize.amount,
      topThreeBonus,
      prizeAmount: finalPrize,
    });
  }

  // 计算总分配金额
  const totalDistributed = finalPlayerPrizes.reduce((sum, p) => sum + p.prizeAmount, 0);
  const remainder = totalPrizePool - totalDistributed;

  // 将差额加到第一名
  let adjustmentAmount = 0;
  if (finalPlayerPrizes.length > 0 && remainder !== 0) {
    adjustmentAmount = remainder;
    finalPlayerPrizes[0].prizeAmount += remainder;
    // 确保第一名金额不为负数
    if (finalPlayerPrizes[0].prizeAmount < 0) {
      finalPlayerPrizes[0].prizeAmount = 0;
      adjustmentAmount = -finalPlayerPrizes[0].prizeAmount;
    }
    // 同时更新前三名提拨奖金（如果第一名是前三名）
    if (topThreePrizes.length > 0) {
      topThreePrizes[0].amount += remainder;
      topThreeTotal += remainder;
    }
  }

  return {
    topThreePrizes,
    playerPrizes: finalPlayerPrizes,
    totalPrizePool,
    topThreeTotal,
    chipBasedTotal,
    remainingPrizePool,
    totalDistributed: finalPlayerPrizes.reduce((sum, p) => sum + p.prizeAmount, 0),
    adjustmentAmount,
  };
}

/**
 * 验证前三名百分比总和
 */
export function validateTopThreePercentages(percentages: [number, number, number]): {
  isValid: boolean;
  total: number;
  message: string;
} {
  const total = percentages.reduce((sum, p) => sum + p, 0);
  const isValid = total <= 100 && total >= 0;

  return {
    isValid,
    total,
    message: isValid
      ? `前三名提拨占比 ${total.toFixed(2)}%，剩余 ${(100 - total).toFixed(2)}% 将按筹码占比分配给所有玩家`
      : `前三名百分比总和必须 ≤ 100%，当前为 ${total.toFixed(2)}%`,
  };
}

/**
 * ICM 獎勵結構計算參數
 */
export interface ICMCalculationParams {
  entryFee: number;                   // 單組報名費
  administrativeFee: number;           // 單組行政費
  totalGroups: number;                 // 總買入組數
  totalDeduction: number;               // 單場總提撥金（整場固定一次）
  topThreeSplit: [number, number, number]; // 前三名提撥獎金獲得比例 [第一名%, 第二名%, 第三名%]
}

/**
 * 新的ICM獎金計算函數（根據用戶需求）
 * 
 * 計算邏輯：
 * 第一步：總獎金池 = (單組報名費 - 行政費) × 總組數
 * 第二步：淨獎池 = 總獎金池 - 單場總提撥金
 * 第三步：提撥分配 = 將提撥金按 50% / 30% / 20% 分配給前三名
 * 第四步：最終獎金 = (個人籌碼 / 總發行籌碼) × 淨獎池 + (前三名提撥獎金)
 * 第五步：所有獎金無條件捨去至百位數
 */
export function calculateICMPrize(
  params: ICMCalculationParams,
  players: Player[]
): PrizeCalculationResult {
  const { entryFee, administrativeFee, totalGroups, totalDeduction, topThreeSplit } = params;

  // 第一步：總獎金池 = (單組報名費 - 行政費) × 總組數
  const totalPrizePool = (entryFee - administrativeFee) * totalGroups;

  // 第二步：淨獎池 = 總獎金池 - 單場總提撥金
  const netPool = totalPrizePool - totalDeduction;

  // 第三步：提撥分配 = 將單場總提撥金按獲得比例分配給前三名
  const topThreeGuaranteedPrizes: TopThreePrize[] = [];
  let topThreeTotal = 0;

  // 按筹码从高到低排序，找出前三名
  const sortedPlayers = [...players].sort((a, b) => b.currentChips - a.currentChips);
  const eligibleTopThree = sortedPlayers.filter(p => p.currentChips > 0).slice(0, 3);

  for (let i = 0; i < Math.min(3, eligibleTopThree.length); i++) {
    const percentage = topThreeSplit[i] || 0;
    const originalAmount = (totalDeduction * percentage) / 100;
    // 無條件捨去至百位
    const amount = Math.floor(originalAmount / 100) * 100;
    
    topThreeGuaranteedPrizes.push({
      rank: i + 1,
      percentage,
      amount,
    });
    topThreeTotal += amount;
  }

  // 處理前三名提撥獎金的捨去誤差（加到第一名）
  const deductionRemainder = totalDeduction - topThreeTotal;
  if (topThreeGuaranteedPrizes.length > 0 && deductionRemainder > 0) {
    topThreeGuaranteedPrizes[0].amount += deductionRemainder;
    topThreeTotal += deductionRemainder;
  }

  // 第四步：計算所有玩家的最終獎金
  // 計算總發行籌碼（所有玩家的籌碼總和）
  const totalChips = sortedPlayers.filter(p => p.currentChips > 0).reduce((sum, p) => sum + p.currentChips, 0);
  const finalPlayerPrizes: PlayerPrize[] = [];

  for (let i = 0; i < sortedPlayers.length; i++) {
    const player = sortedPlayers[i];
    
    // 如果籌碼為0，獎金一定是0
    if (player.currentChips === 0) {
      finalPlayerPrizes.push({
        memberId: player.memberId,
        rank: i + 1,
        chips: 0,
        chipPercentage: 0,
        chipBasedPrize: 0,
        topThreeBonus: 0,
        prizeAmount: 0,
      });
      continue;
    }

    // 計算籌碼占比
    const chipPercentage = totalChips > 0 ? (player.currentChips / totalChips) * 100 : 0;
    
    // 計算按籌碼占比分配的淨獎池部分
    const chipBasedAmount = (netPool * chipPercentage) / 100;
    // 無條件捨去至百位
    const chipBasedRounded = Math.floor(chipBasedAmount / 100) * 100;

    // 檢查是否為前三名，獲取提撥獎金
    const playerIndexInTopThree = eligibleTopThree.findIndex(p => p.memberId === player.memberId);
    const isTopThree = playerIndexInTopThree >= 0 && playerIndexInTopThree < 3;
    const topThreeBonus = isTopThree ? (topThreeGuaranteedPrizes[playerIndexInTopThree]?.amount || 0) : 0;

    // 第四步：最終獎金 = (個人籌碼 / 總發行籌碼) × 淨獎池 + (前三名提撥獎金)
    const finalPrize = chipBasedRounded + topThreeBonus;
    // 第五步：無條件捨去至百位（雖然前面已經捨去，但確保最終結果也捨去）
    const finalPrizeRounded = Math.floor(finalPrize / 100) * 100;

    finalPlayerPrizes.push({
      memberId: player.memberId,
      rank: i + 1,
      chips: player.currentChips,
      chipPercentage,
      chipBasedPrize: chipBasedRounded,
      topThreeBonus,
      prizeAmount: finalPrizeRounded,
    });
  }

  // 計算總分配金額
  const totalDistributed = finalPlayerPrizes.reduce((sum, p) => sum + p.prizeAmount, 0);
  const remainder = totalPrizePool - totalDistributed;

  // 將差額加到第一名（處理捨去誤差）
  let adjustmentAmount = 0;
  if (finalPlayerPrizes.length > 0 && remainder !== 0) {
    adjustmentAmount = remainder;
    finalPlayerPrizes[0].prizeAmount += remainder;
    // 確保第一名金額不為負數
    if (finalPlayerPrizes[0].prizeAmount < 0) {
      finalPlayerPrizes[0].prizeAmount = 0;
      adjustmentAmount = -finalPlayerPrizes[0].prizeAmount;
    }
    // 同時更新前三名保底獎金（如果第一名是前三名）
    if (topThreeGuaranteedPrizes.length > 0) {
      topThreeGuaranteedPrizes[0].amount += remainder;
      topThreeTotal += remainder;
    }
  }

  return {
    topThreePrizes: topThreeGuaranteedPrizes,
    playerPrizes: finalPlayerPrizes,
    totalPrizePool,
    topThreeTotal,
    chipBasedTotal: finalPlayerPrizes.reduce((sum, p) => sum + p.chipBasedPrize, 0),
    remainingPrizePool: netPool,
    totalDistributed: finalPlayerPrizes.reduce((sum, p) => sum + p.prizeAmount, 0),
    adjustmentAmount,
  };
}