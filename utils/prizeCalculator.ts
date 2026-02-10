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
  // 確保分配總額嚴格等於總提撥額（無差異）
  const topThreeGuaranteedPrizes: TopThreePrize[] = [];
  let topThreeTotal = 0;

  // 按筹码从高到低排序，找出前三名
  const sortedPlayers = [...players].sort((a, b) => b.currentChips - a.currentChips);
  const eligibleTopThree = sortedPlayers.filter(p => p.currentChips > 0).slice(0, 3);

  const topThreeCount = Math.min(3, eligibleTopThree.length);
  
  if (topThreeCount > 0 && totalDeduction > 0) {
    // 使用整數計算，避免浮點數精度問題
    // 將總提撥額轉換為整數（如果原本就是整數，保持不變）
    const totalDeductionInt = Math.round(totalDeduction);
    
    // 調試信息：確認使用的總提撥額（始終顯示，方便調試）
    console.log('🔍 提撥獎金計算開始:', {
      傳入的totalDeduction: totalDeduction,
      使用的totalDeductionInt: totalDeductionInt,
      分配比例: topThreeSplit,
      前三名人數: topThreeCount,
    });
    
    let remainingAmount = totalDeductionInt;
    
    // 分配金額，確保總和嚴格等於總提撥額
    for (let i = 0; i < topThreeCount; i++) {
      const percentage = topThreeSplit[i] || 0;
      let amount: number;
      
      if (i === topThreeCount - 1) {
        // 最後一個名次：使用剩餘金額，確保總和等於總提撥額
        amount = remainingAmount;
      } else {
        // 前面的名次：計算應得金額並四捨五入到整數
        // 確保使用 totalDeductionInt，不是其他值
        const exactAmount = (totalDeductionInt * percentage) / 100;
        amount = Math.round(exactAmount);
        // 更新剩餘金額
        remainingAmount -= amount;
      }
      
      // 確保金額不為負數
      if (amount < 0) {
        amount = 0;
      }
      
      // 調試信息（始終顯示，方便調試）
      console.log(`🔍 第${i + 1}名計算:`, {
        比例: percentage + '%',
        計算公式: `${totalDeductionInt} × ${percentage}%`,
        精確金額: (totalDeductionInt * percentage) / 100,
        分配金額: amount,
        剩餘金額: remainingAmount,
      });
      
      topThreeGuaranteedPrizes.push({
        rank: i + 1,
        percentage: topThreeSplit[i] || 0,
        amount,
      });
      topThreeTotal += amount;
    }
    
    // 最終驗證和調整：確保總和嚴格等於總提撥額
    // 重新計算實際總和（避免累積誤差）
    const actualTotal = topThreeGuaranteedPrizes.reduce((sum, p) => sum + p.amount, 0);
    const finalDifference = totalDeductionInt - actualTotal;
    
    if (Math.abs(finalDifference) > 0.0001 && topThreeGuaranteedPrizes.length > 0) {
      // 將差額加到第一名，確保總和等於總提撥額
      const originalFirstAmount = topThreeGuaranteedPrizes[0].amount;
      topThreeGuaranteedPrizes[0].amount += finalDifference;
      topThreeTotal = totalDeductionInt; // 直接設為總提撥額，確保一致
      
      // 調試信息（始終顯示，方便調試）
      console.log('🔍 調整差額:', {
        實際總和: actualTotal,
        總提撥額: totalDeductionInt,
        差額: finalDifference,
        第一名原金額: originalFirstAmount,
        調整後第一名金額: topThreeGuaranteedPrizes[0].amount,
      });
    } else {
      // 即使沒有差額，也確保 topThreeTotal 等於實際總和
      topThreeTotal = actualTotal;
    }
    
    // 最終驗證：確保總和等於總提撥額
    const finalVerification = topThreeGuaranteedPrizes.reduce((sum, p) => sum + p.amount, 0);
    const verification = Math.abs(totalDeductionInt - finalVerification);
    
    if (verification > 0.0001) {
      console.error('提撥獎金分配驗證失敗:', {
        總提撥額: totalDeductionInt,
        分配總額: finalVerification,
        差異: verification,
        各名次金額: topThreeGuaranteedPrizes.map(p => ({ rank: p.rank, amount: p.amount })),
      });
      
      // 強制修正：直接調整第一名金額，確保總和等於總提撥額
      const correction = totalDeductionInt - finalVerification;
      topThreeGuaranteedPrizes[0].amount += correction;
      topThreeTotal = totalDeductionInt;
      
      console.warn('已強制修正差額:', {
        修正金額: correction,
        修正後第一名金額: topThreeGuaranteedPrizes[0].amount,
        最終總和: topThreeGuaranteedPrizes.reduce((sum, p) => sum + p.amount, 0),
      });
    } else {
      topThreeTotal = finalVerification;
    }
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
    
    // 計算按籌碼占比分配的最終分配獎池部分（淨獎池 - 提撥獎金）
    const chipBasedAmount = (finalDistributionPool * chipPercentage) / 100;
    // 無條件捨去至百位
    const chipBasedRounded = Math.floor(chipBasedAmount / 100) * 100;

    // 檢查是否為前三名，獲取提撥獎金
    const playerIndexInTopThree = eligibleTopThree.findIndex(p => p.memberId === player.memberId);
    const isTopThree = playerIndexInTopThree >= 0 && playerIndexInTopThree < 3;
    const topThreeBonus = isTopThree ? (topThreeGuaranteedPrizes[playerIndexInTopThree]?.amount || 0) : 0;

    // 第五步：最終獎金 = (個人籌碼 / 總發行籌碼) × 最終分配獎池 + (前三名提撥獎金)
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

  // 計算總分配金額（所有玩家獎金總和）
  const totalDistributed = finalPlayerPrizes.reduce((sum, p) => sum + p.prizeAmount, 0);
  
  // ⚠️ 重要：所有玩家獎金總和應該等於淨獎池（不是總獎池）
  // 淨獎池 = 總獎池 - 活動獎金
  // 所有玩家獎金 = 最終分配獎池 + 提撥獎金 = 淨獎池
  const netPoolForVerification = totalPrizePool - activityBonus;
  const remainder = netPoolForVerification - totalDistributed;

  // 將差額加到第一名（處理捨去誤差）
  // 這個差額是淨獎池的差額，確保所有玩家獎金總和等於淨獎池
  let adjustmentAmount = 0;
  if (finalPlayerPrizes.length > 0 && Math.abs(remainder) > 0.01) {
    adjustmentAmount = remainder;
    finalPlayerPrizes[0].prizeAmount += remainder;
    // 確保第一名金額不為負數
    if (finalPlayerPrizes[0].prizeAmount < 0) {
      finalPlayerPrizes[0].prizeAmount = 0;
      adjustmentAmount = -finalPlayerPrizes[0].prizeAmount;
    }
    
    console.log('🔍 淨獎池差額調整:', {
      總獎池: totalPrizePool,
      活動獎金: activityBonus,
      淨獎池: netPoolForVerification,
      已分配總額: totalDistributed,
      差額: remainder,
      調整後第一名最終獎金: finalPlayerPrizes[0].prizeAmount,
      最終總和: finalPlayerPrizes.reduce((sum, p) => sum + p.prizeAmount, 0),
      注意: '差額只加到最終獎金，確保所有玩家獎金總和等於淨獎池',
    });
  }

  // 最終驗證：確保所有玩家獎金總和等於淨獎池
  const finalTotalDistributed = finalPlayerPrizes.reduce((sum, p) => sum + p.prizeAmount, 0);
  const netPoolFinal = totalPrizePool - activityBonus;
  const finalVerification = Math.abs(netPoolFinal - finalTotalDistributed);
  
  if (finalVerification > 0.01) {
    console.warn('⚠️ 淨獎池驗證失敗:', {
      淨獎池: netPoolFinal,
      所有玩家獎金總和: finalTotalDistributed,
      差異: finalVerification,
    });
  } else {
    console.log('✓ 淨獎池驗證通過:', {
      淨獎池: netPoolFinal,
      所有玩家獎金總和: finalTotalDistributed,
    });
  }

  return {
    topThreePrizes: topThreeGuaranteedPrizes,
    playerPrizes: finalPlayerPrizes,
    totalPrizePool,
    topThreeTotal,
    chipBasedTotal: finalPlayerPrizes.reduce((sum, p) => sum + p.chipBasedPrize, 0),
    remainingPrizePool: finalDistributionPool, // 最終分配給玩家的獎池（淨獎池 - 提撥獎金）
    totalDistributed: finalTotalDistributed, // 所有玩家獎金總和（應該等於淨獎池）
    adjustmentAmount,
  };
}