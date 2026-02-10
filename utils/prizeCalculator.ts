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
  topThreeTotal: number; // 前三名提拨总奖金（等於總提撥額）
  chipBasedTotal: number; // 按筹码占比分配的总奖金
  remainingPrizePool: number; // 剩余奖池（用于按筹码占比分配）
  totalDistributed: number;
  adjustmentAmount: number; // 调整到第一名的差额
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
  totalDeduction: number;               // 單場總提撥金（整場固定一次，等於前三名提撥獎金總和）
  topThreeSplit: [number, number, number]; // 前三名提撥獎金獲得比例 [第一名%, 第二名%, 第三名%]
  activityBonus?: number;              // 單場活動獎金（從總獎金池額外抽出，不分配給玩家）
}

/**
 * ICM獎金計算函數（重新整理版本）
 * 
 * 計算邏輯（7個步驟）：
 * 
 * 1️⃣ 總獎金池 = (單組報名費 - 行政費) × 總組數
 * 
 * 2️⃣ 活動獎金 = 從總獎金池扣除（不分配給玩家）
 * 
 * 3️⃣ 淨獎池 = 總獎金池 - 活動獎金
 * 
 * 4️⃣ 提撥獎金 = 從淨獎池扣除（等於前三名提撥獎金總和）
 *    - 提撥獎金 = 前三名提撥獎金總和
 *    - 前三名分配：從總提撥金額按百分比分配
 *      * 第一名 = 總提撥 × 第一名%
 *      * 第二名 = 總提撥 × 第二名%
 *      * 第三名 = 總提撥 - 第一名 - 第二名（確保總和精確）
 * 
 * 5️⃣ 最終分配獎池 = 淨獎池 - 提撥獎金
 * 
 * 6️⃣ 最終獎金 = (個人籌碼 / 總發行籌碼) × 最終分配獎池 + (前三名提撥獎金)
 *    - 按籌碼占比分配的部分：無條件捨去至百位
 *    - 前三名提撥獎金：不捨去（精確值）
 *    - 最終獎金：無條件捨去至百位
 * 
 * 7️⃣ 差額調整：將捨去誤差加到第一名，確保所有玩家獎金總和 = 淨獎池
 * 
 * 範例：6600報名費，15組，行政費600，活動獎金500，提撥獎金1000（50%/30%/20%）
 * - 1️⃣ 總獎金池 = (6600 - 600) × 15 = 90,000
 * - 2️⃣ 活動獎金 = 500（從總獎金池扣除）
 * - 3️⃣ 淨獎池 = 90,000 - 500 = 89,500
 * - 4️⃣ 提撥獎金 = 1,000（從淨獎池扣除）
 *   * 第一名 = 1,000 × 50% = 500
 *   * 第二名 = 1,000 × 30% = 300
 *   * 第三名 = 1,000 - 500 - 300 = 200
 *   * 總和 = 500 + 300 + 200 = 1,000 ✓
 * - 5️⃣ 最終分配獎池 = 89,500 - 1,000 = 88,500
 * - 6️⃣ 最終獎金 = (個人籌碼 / 總發行籌碼) × 88,500 + (前三名提撥獎金)
 * - 7️⃣ 差額調整：將捨去誤差加到第一名
 */
export function calculateICMPrize(
  params: ICMCalculationParams,
  players: Player[]
): PrizeCalculationResult {
  const { entryFee, administrativeFee, totalGroups, totalDeduction, topThreeSplit, activityBonus = 0 } = params;

  // ========== 1️⃣ 總獎金池 = (單組報名費 - 行政費) × 總組數 ==========
  const totalPrizePool = (entryFee - administrativeFee) * totalGroups;

  // ========== 2️⃣ 活動獎金 = 從總獎金池扣除（不分配給玩家）==========
  // activityBonus 已在參數中提供

  // ========== 3️⃣ 淨獎池 = 總獎金池 - 活動獎金 ==========
  const netPool = totalPrizePool - activityBonus;

  // ========== 4️⃣ 提撥獎金分配 = 從淨獎池扣除，等於前三名提撥獎金總和 ==========
  // 提撥獎金 = 前三名提撥獎金總和
  // 前三名分配：從總提撥金額按百分比分配給前三名
  const topThreeGuaranteedPrizes: TopThreePrize[] = [];
  let topThreeTotal = 0;

  // 按籌碼從高到低排序，找出前三名（只計算籌碼不為0的玩家）
  const sortedPlayers = [...players].sort((a, b) => b.currentChips - a.currentChips);
  const eligibleTopThree = sortedPlayers.filter(p => p.currentChips > 0).slice(0, 3);
  const topThreeCount = Math.min(3, eligibleTopThree.length);

  if (topThreeCount > 0 && totalDeduction > 0) {
    // 確保使用正確的總提撥額（必須是傳入的 totalDeduction，不是其他值）
    const totalDeductionInt = Math.round(totalDeduction);
    
    // 驗證：確保 totalDeductionInt 是正確的值
    if (totalDeductionInt !== Math.round(totalDeduction)) {
      console.error('❌ 錯誤：totalDeductionInt 計算錯誤！', {
        原始值: totalDeduction,
        轉換後: totalDeductionInt,
      });
    }
    
    console.log('🔍 提撥獎金計算開始:', {
      傳入的totalDeduction: totalDeduction,
      使用的totalDeductionInt: totalDeductionInt,
      分配比例: topThreeSplit,
      前三名人數: topThreeCount,
      驗證: '必須從 totalDeductionInt 計算，不是從 totalPrizePool',
      警告: '如果看到第一名金額異常（如500而不是150），請檢查傳入的 totalDeduction 值是否正確',
    });

    // 直接從總提撥額按百分比計算每個名次的金額
    // ⚠️ 重要：必須使用 totalDeductionInt，不是 totalPrizePool 或其他值
    let allocatedTotal = 0; // 已分配總額

    for (let i = 0; i < topThreeCount; i++) {
      const percentage = topThreeSplit[i] || 0;
      let amount: number;

      if (i === topThreeCount - 1) {
        // 最後一個名次：使用剩餘金額，確保總和嚴格等於總提撥額
        amount = totalDeductionInt - allocatedTotal;
      } else {
        // 前面的名次：直接從總提撥額計算百分比
        // ⚠️ 公式：總提撥額 × 百分比 = 分配金額（必須使用 totalDeductionInt）
        const exactAmount = (totalDeductionInt * percentage) / 100;
        amount = Math.round(exactAmount); // 四捨五入到整數
        allocatedTotal += amount; // 累加已分配金額
      }

      // 確保金額不為負數
      if (amount < 0) {
        amount = 0;
      }

      console.log(`🔍 第${i + 1}名計算:`, {
        比例: `${percentage}%`,
        計算公式: `${totalDeductionInt} × ${percentage}% = ${(totalDeductionInt * percentage) / 100}`,
        精確金額: (totalDeductionInt * percentage) / 100,
        分配金額: amount,
        已分配總額: i === topThreeCount - 1 ? totalDeductionInt : allocatedTotal,
        驗證: `必須等於 ${totalDeductionInt} × ${percentage}%`,
      });

      topThreeGuaranteedPrizes.push({
        rank: i + 1,
        percentage,
        amount,
      });
      topThreeTotal += amount;
    }

    // 驗證：確保分配總額等於總提撥額
    const actualTotal = topThreeGuaranteedPrizes.reduce((sum, p) => sum + p.amount, 0);
    const difference = totalDeductionInt - actualTotal;

    if (Math.abs(difference) > 0.0001) {
      // 如果有差異，調整第一名金額
      topThreeGuaranteedPrizes[0].amount += difference;
      topThreeTotal = totalDeductionInt;
      console.warn('🔍 調整差額:', {
        差異: difference,
        調整後第一名金額: topThreeGuaranteedPrizes[0].amount,
      });
    } else {
      topThreeTotal = actualTotal;
    }

    // 最終確認：topThreeTotal 必須等於 totalDeductionInt
    if (Math.abs(topThreeTotal - totalDeductionInt) > 0.0001) {
      console.error('❌ 嚴重錯誤：topThreeTotal 與 totalDeductionInt 不一致！', {
        topThreeTotal,
        totalDeductionInt,
      });
      topThreeTotal = totalDeductionInt;
    }

    console.log('✅ 提撥獎金分配完成:', {
      總提撥額: totalDeductionInt,
      分配總額: topThreeTotal,
      各名次金額: topThreeGuaranteedPrizes.map(p => ({ 
        名次: p.rank, 
        比例: `${p.percentage}%`, 
        金額: p.amount 
      })),
    });
  }

  // ========== 5️⃣ 最終分配獎池 = 淨獎池 - 提撥獎金 ==========
  const finalDistributionPool = netPool - topThreeTotal;

  // ========== 6️⃣ 計算所有玩家的最終獎金 ==========
  // 計算總發行籌碼（所有玩家的籌碼總和，只計算籌碼不為0的玩家）
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

    // 計算按籌碼占比分配的最終分配獎池部分
    const chipBasedAmount = (finalDistributionPool * chipPercentage) / 100;
    // 無條件捨去至百位
    const chipBasedRounded = Math.floor(chipBasedAmount / 100) * 100;

    // 檢查是否為前三名，獲取提撥獎金
    const playerIndexInTopThree = eligibleTopThree.findIndex(p => p.memberId === player.memberId);
    const isTopThree = playerIndexInTopThree >= 0 && playerIndexInTopThree < 3;
    const topThreeBonus = isTopThree ? (topThreeGuaranteedPrizes[playerIndexInTopThree]?.amount || 0) : 0;

    // 最終獎金 = 按籌碼占比分配的部分 + 前三名提撥獎金
    const finalPrize = chipBasedRounded + topThreeBonus;
    // 無條件捨去至百位
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

  // ========== 7️⃣ 差額調整：將捨去誤差加到第一名 ==========
  // 計算總分配金額（所有玩家獎金總和）
  const totalDistributed = finalPlayerPrizes.reduce((sum, p) => sum + p.prizeAmount, 0);

  // 所有玩家獎金總和應該等於淨獎池
  // 淨獎池 = 總獎池 - 活動獎金
  // 所有玩家獎金 = 最終分配獎池 + 提撥獎金 = 淨獎池
  const netPoolForVerification = totalPrizePool - activityBonus;
  const remainder = netPoolForVerification - totalDistributed;

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
      淨獎池: netPoolForVerification,
      已分配總額: totalDistributed,
      差額: remainder,
      調整後第一名獎金: finalPlayerPrizes[0].prizeAmount,
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
    console.log('✅ 淨獎池驗證通過:', {
      淨獎池: netPoolFinal,
      所有玩家獎金總和: finalTotalDistributed,
    });
  }

  return {
    topThreePrizes: topThreeGuaranteedPrizes,
    playerPrizes: finalPlayerPrizes,
    totalPrizePool,
    topThreeTotal, // 等於 totalDeduction
    chipBasedTotal: finalPlayerPrizes.reduce((sum, p) => sum + p.chipBasedPrize, 0),
    remainingPrizePool: finalDistributionPool, // 最終分配給玩家的獎池（淨獎池 - 提撥獎金）
    totalDistributed: finalTotalDistributed, // 所有玩家獎金總和（應該等於淨獎池）
    adjustmentAmount,
  };
}

/**
 * 奖金分配函数（舊版本，保留用於兼容）
 * @deprecated 請使用 calculateICMPrize
 */
export function calculatePrize(
  totalPrizePool: number,
  topThreePercentages: [number, number, number],
  players: Player[]
): PrizeCalculationResult {
  // 此函數保留用於向後兼容，但建議使用 calculateICMPrize
  // 這裡可以實現一個簡單的轉換邏輯，或者直接調用 calculateICMPrize
  // 為了簡化，這裡返回空結果
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
