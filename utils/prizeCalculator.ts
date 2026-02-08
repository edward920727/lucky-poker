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
  const totalChips = sortedPlayers.reduce((sum, p) => sum + p.currentChips, 0);

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
  const chipBasedRemainder = totalPrizePool - chipBasedTotal;

  // 第二步：从总奖池中提拨前三名的奖金（按百分比）
  const topThreePrizes: TopThreePrize[] = [];
  let topThreeTotal = 0;

  for (let i = 0; i < Math.min(3, sortedPlayers.length); i++) {
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
    
    // 计算剩余奖池中该玩家应得的份额
    const remainingChipPercentage = totalChips > 0 ? (player.currentChips / totalChips) * 100 : 0;
    const remainingAmount = (remainingPrizePool * remainingChipPercentage) / 100;
    const remainingRounded = Math.round(remainingAmount / 100) * 100;
    
    // 前三名有提拨奖金
    const topThreeBonus = i < 3 ? topThreePrizes[i].amount : 0;
    
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
