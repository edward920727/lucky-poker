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
  totalPrizePool: number; // 总奖池 = (报名费 - 行政费) × 总组数
  netPool: number; // 净奖池 = 总奖池 - 活动奖金
  activityBonus: number; // 活动奖金（从总奖池额外抽出，不分配给玩家）
  topThreeTotal: number; // 前三名提拨总奖金
  chipBasedTotal: number; // 按筹码占比分配的总奖金
  remainingPrizePool: number; // 剩余奖池（用于按筹码占比分配）= 净奖池 - 提拨奖金
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
      netPool: totalPrizePool, // 如果沒有活動獎金，淨獎池等於總獎池
      activityBonus: 0,
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
    netPool: totalPrizePool, // calculatePrize 函數沒有活動獎金概念，淨獎池等於總獎池
    activityBonus: 0, // calculatePrize 函數沒有活動獎金
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
  activityBonus?: number;              // 單場活動獎金（從總獎金池額外抽出，不分配給玩家）
}

/**
 * 新的ICM獎金計算函數（根據用戶需求）
 * 
 * 計算邏輯：
 * 第一步：總獎金池 = (單組報名費 - 行政費) × 總組數
 * 第二步：淨獎池 = 總獎金池 - 活動獎金
 * 第三步：提撥獎金從淨獎池扣除，按 50% / 30% / 20% 分配給前三名
 * 第四步：最終分配給玩家的獎池 = 淨獎池 - 提撥獎金
 * 第五步：最終獎金 = (個人籌碼 / 總發行籌碼) × 最終分配獎池 + (前三名提撥獎金)
 * 第六步：所有獎金無條件捨去至百位數
 * 
 * 範例：6600報名費，15組，行政費600
 * - 總獎金池 = (6600 - 600) × 15 = 90000
 * - 活動獎金 = 500
 * - 淨獎池 = 90000 - 500 = 89500
 * - 提撥獎金 = 500（從淨獎池扣除）
 * - 最終分配獎池 = 89500 - 500 = 89000
 */
export function calculateICMPrize(
  params: ICMCalculationParams,
  players: Player[]
): PrizeCalculationResult {
  const { entryFee, administrativeFee, totalGroups, totalDeduction, topThreeSplit, activityBonus = 0 } = params;

  // 第一步：總獎金池 = (單組報名費 - 行政費) × 總組數
  const totalPrizePool = (entryFee - administrativeFee) * totalGroups;

  // 第二步：淨獎池 = 總獎金池 - 活動獎金
  const netPool = totalPrizePool - activityBonus;

  // 第三步：提撥獎金從淨獎池扣除（不是從總獎金池扣除）
  // 最終分配給玩家的獎池 = 淨獎池 - 提撥獎金
  const finalDistributionPool = netPool - totalDeduction;

  // 第三步：提撥分配 = 將單場總提撥金按獲得比例分配給前三名
  // 邏輯：直接按比例計算，不捨去（例如：100的50% = 50，30% = 30，20% = 20）
  const topThreeGuaranteedPrizes: TopThreePrize[] = [];
  let topThreeTotal = 0;

  // 按筹码从高到低排序，找出前三名
  const sortedPlayers = [...players].sort((a, b) => b.currentChips - a.currentChips);
  const eligibleTopThree = sortedPlayers.filter(p => p.currentChips > 0).slice(0, 3);

  for (let i = 0; i < Math.min(3, eligibleTopThree.length); i++) {
    const percentage = topThreeSplit[i] || 0;
    // 直接按比例計算，四捨五入到整數（處理小數點）
    const amount = Math.round((totalDeduction * percentage) / 100);
    
    topThreeGuaranteedPrizes.push({
      rank: i + 1,
      percentage,
      amount,
    });
    topThreeTotal += amount;
  }

  // 處理四捨五入誤差（確保總和等於 totalDeduction）
  const deductionRemainder = totalDeduction - topThreeTotal;
  if (topThreeGuaranteedPrizes.length > 0 && deductionRemainder !== 0) {
    // 將誤差加到第一名
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
    
    // 檢查是否為前三名，獲取提撥獎金
    const playerIndexInTopThree = eligibleTopThree.findIndex(p => p.memberId === player.memberId);
    const isTopThree = playerIndexInTopThree >= 0 && playerIndexInTopThree < 3;
    const topThreeBonus = isTopThree ? (topThreeGuaranteedPrizes[playerIndexInTopThree]?.amount || 0) : 0;
    
    // 依需求：活動獎金先從總獎池扣除得到「淨獎池」
    // 然後從「淨獎池」拿出「提撥獎金」給前三名，所以按籌碼分配應該用：
    // (淨獎池 - 提撥獎金) = finalDistributionPool
    // 並且按籌碼分配的部分要「四捨五入到百位」
    const chipBasedAmount = (finalDistributionPool * chipPercentage) / 100;
    const chipBasedRounded = Math.round(chipBasedAmount / 100) * 100;

    // 最終獎金 = 按籌碼分配(淨獎池 - 提撥獎金)的部分 + 前三名提撥獎金
    // 注意：提撥獎金不做百位四捨五入（避免 50/30/20 變 0）
    const finalPrize = chipBasedRounded + topThreeBonus;

    finalPlayerPrizes.push({
      memberId: player.memberId,
      rank: i + 1,
      chips: player.currentChips,
      chipPercentage,
      chipBasedPrize: chipBasedRounded,
      topThreeBonus,
      prizeAmount: finalPrize,
    });
  }

  // 計算總分配金額
  const totalDistributed = finalPlayerPrizes.reduce((sum, p) => sum + p.prizeAmount, 0);
  // 差額計算：所有玩家獎金總和應該等於淨獎池（總獎池 - 活動獎金），而不是總獎池
  const remainder = netPool - totalDistributed;

  // 將差額按籌碼占比分配給所有玩家，四捨五入到百位，捨去最多的玩家獲得剩餘誤差
  let adjustmentAmount = 0;
  if (finalPlayerPrizes.length > 0 && remainder !== 0) {
    // 只分配給有籌碼的玩家
    const eligiblePlayers = finalPlayerPrizes.filter(p => p.chips > 0);
    if (eligiblePlayers.length > 0) {
      // 計算總籌碼（用於按比例分配）
      const eligibleTotalChips = eligiblePlayers.reduce((sum, p) => sum + p.chips, 0);
      
      // 計算每個玩家應得的差額分配（按籌碼占比）
      const remainderAllocations: Array<{ index: number; originalAmount: number; roundedAmount: number; remainder: number }> = [];
      let totalRoundedAllocation = 0;
      
      for (let i = 0; i < finalPlayerPrizes.length; i++) {
        const player = finalPlayerPrizes[i];
        if (player.chips === 0) {
          continue; // 跳過籌碼為0的玩家
        }
        
        // 按籌碼占比計算應得的差額
        const chipPercentage = eligibleTotalChips > 0 ? (player.chips / eligibleTotalChips) * 100 : 0;
        const originalAmount = (remainder * chipPercentage) / 100;
        // 四捨五入到百位
        const roundedAmount = Math.round(originalAmount / 100) * 100;
        const remainderDiff = originalAmount - roundedAmount;
        
        remainderAllocations.push({
          index: i,
          originalAmount,
          roundedAmount,
          remainder: remainderDiff,
        });
        totalRoundedAllocation += roundedAmount;
      }
      
      // 將四捨五入後的差額分配給玩家
      for (const allocation of remainderAllocations) {
        finalPlayerPrizes[allocation.index].prizeAmount += allocation.roundedAmount;
      }
      
      // 計算剩餘誤差（因為四捨五入產生的）
      const allocationRemainder = remainder - totalRoundedAllocation;
      
      // 找出捨去最多的玩家（remainder 最大的，即捨去最多的）
      if (allocationRemainder !== 0 && remainderAllocations.length > 0) {
        // 按捨去金額排序（remainder 越小表示捨去越多）
        remainderAllocations.sort((a, b) => a.remainder - b.remainder);
        // 捨去最多的玩家（remainder 最小的）獲得剩餘誤差
        const mostDiscardedIndex = remainderAllocations[0].index;
        finalPlayerPrizes[mostDiscardedIndex].prizeAmount += allocationRemainder;
        adjustmentAmount = allocationRemainder;
      }
    }
  }

  return {
    topThreePrizes: topThreeGuaranteedPrizes,
    playerPrizes: finalPlayerPrizes,
    totalPrizePool,
    netPool, // 淨獎池 = 總獎池 - 活動獎金
    activityBonus, // 活動獎金
    topThreeTotal,
    chipBasedTotal: finalPlayerPrizes.reduce((sum, p) => sum + p.chipBasedPrize, 0),
    remainingPrizePool: finalDistributionPool, // 最終分配給玩家的獎池（淨獎池 - 提撥獎金）
    totalDistributed: finalPlayerPrizes.reduce((sum, p) => sum + p.prizeAmount, 0),
    adjustmentAmount,
  };
}