import { useState, useEffect } from 'react';
import { calculatePrize, validateTopThreePercentages, PrizeCalculationResult } from '../../utils/prizeCalculator';
import { Player, TournamentType } from '../../constants/pokerConfig';

interface PrizePoolCalculatorProps {
  players: Player[];
  tournamentType?: TournamentType; // 賽事類型
  onCalculationChange?: (result: PrizeCalculationResult | null) => void;
}

export default function PrizePoolCalculator({ players, tournamentType, onCalculationChange }: PrizePoolCalculatorProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  // 根據賽事類型自動設置報名費
  const defaultEntryFee = tournamentType ? parseInt(tournamentType) : 600;
  const [entryFee, setEntryFee] = useState<number>(defaultEntryFee);
  const [totalGroups, setTotalGroups] = useState<number>(0);
  const [isManualGroups, setIsManualGroups] = useState(false); // 是否手動設定總組數
  const [isManualEntryFee, setIsManualEntryFee] = useState(false); // 是否手動設定報名費
  const [deduction, setDeduction] = useState<number>(0);
  const [topThreePercentages, setTopThreePercentages] = useState<[number, number, number]>([50, 30, 20]);

  // 計算總買入次數（所有玩家的 buyInCount 總和）
  const totalBuyInCount = players.reduce((sum, p) => sum + p.buyInCount, 0);

  // 當玩家買入次數變化時，如果不是手動模式，自動更新總組數
  useEffect(() => {
    if (!isManualGroups) {
      setTotalGroups(totalBuyInCount);
    }
  }, [totalBuyInCount, isManualGroups]);

  // 當賽事類型變化時，如果不是手動模式，自動更新報名費
  useEffect(() => {
    if (!isManualEntryFee && tournamentType) {
      const newEntryFee = parseInt(tournamentType);
      setEntryFee(newEntryFee);
    }
  }, [tournamentType, isManualEntryFee]);

  const totalPrizePool = (entryFee * totalGroups) - deduction;
  
  // 验证前三名百分比
  const validation = validateTopThreePercentages(topThreePercentages);
  const isValid = validation.isValid;

  // 使用新的 calculatePrize 函数计算奖金分配
  const calculationResult = calculatePrize(totalPrizePool, topThreePercentages, players);
  const { topThreePrizes, playerPrizes, totalDistributed, adjustmentAmount, remainingPrizePool } = calculationResult;

  // 计算显示用的差额（应该接近0，因为已经调整）
  const remainder = totalPrizePool - totalDistributed;

  // 当计算结果变化时，通知父组件
  useEffect(() => {
    if (!onCalculationChange) return;
    
    // 只要有总奖池和玩家，就传递计算结果（即使百分比无效也传递，让导出可以显示）
    if (totalPrizePool > 0 && players.length > 0) {
      onCalculationChange(calculationResult);
    } else {
      onCalculationChange(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalPrizePool, players.length, players.map(p => `${p.memberId}-${p.currentChips}`).join(','), topThreePercentages.join(','), totalDistributed, adjustmentAmount]);

  const handlePercentageChange = (rank: 1 | 2 | 3, value: string) => {
    // 允許空字符串，這樣用戶可以刪除所有內容
    if (value === '' || value === null || value === undefined) {
      const newPercentages: [number, number, number] = [...topThreePercentages];
      newPercentages[rank - 1] = 0;
      setTopThreePercentages(newPercentages);
      return;
    }
    
    const numValue = parseFloat(value);
    // 如果是 NaN，不更新
    if (isNaN(numValue)) {
      return;
    }
    
    const newPercentages: [number, number, number] = [...topThreePercentages];
    newPercentages[rank - 1] = Math.max(0, Math.min(100, numValue));
    setTopThreePercentages(newPercentages);
  };

  return (
    <div className="bg-gradient-to-br from-gray-900 via-black to-gray-900 rounded-2xl p-4 md:p-6 mb-6 border-2 border-poker-gold-600 border-opacity-40 shadow-xl shadow-poker-gold-500/20">
      {/* 標題區域 - 可點擊展開/收合 */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between gap-3 mb-4 hover:opacity-80 transition-opacity"
      >
        <div className="flex items-center gap-3">
          <div className="text-2xl md:text-3xl">🏆</div>
          <h2 className="text-xl md:text-2xl font-display font-bold text-poker-gold-400">獎金分配計算器</h2>
        </div>
        <svg
          className={`w-6 h-6 text-poker-gold-400 transition-transform duration-300 ${isExpanded ? 'transform rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* 內容區域 - 可展開/收合 */}
      {isExpanded && (
        <div className="animate-fadeIn">
          {/* 輸入區域 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 mb-6">
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium">報名費 (NT$)</label>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="manualEntryFee"
                checked={isManualEntryFee}
                onChange={(e) => {
                  setIsManualEntryFee(e.target.checked);
                  if (!e.target.checked && tournamentType) {
                    setEntryFee(parseInt(tournamentType));
                  }
                }}
                className="w-4 h-4 rounded border-poker-gold-600 bg-gray-800 text-poker-gold-600 focus:ring-poker-gold-500"
              />
              <label htmlFor="manualEntryFee" className="text-xs text-gray-400 cursor-pointer">
                手動設定
              </label>
            </div>
          </div>
          <div className="relative">
            <input
              type="number"
              value={entryFee}
              onChange={(e) => {
                setEntryFee(parseInt(e.target.value) || 0);
                setIsManualEntryFee(true);
              }}
              className={`w-full px-4 py-2 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                !isManualEntryFee ? 'bg-gray-800 text-gray-500 cursor-not-allowed' : ''
              }`}
              disabled={!isManualEntryFee}
            />
            {!isManualEntryFee && tournamentType && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-poker-gold-400">
                自動：{tournamentType}
              </div>
            )}
          </div>
          {!isManualEntryFee && tournamentType && (
            <p className="text-xs text-gray-500 mt-1">
              💡 自動設定：根據賽事類型 = NT$ {tournamentType}
            </p>
          )}
        </div>
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium">總組數</label>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="manualGroups"
                checked={isManualGroups}
                onChange={(e) => {
                  setIsManualGroups(e.target.checked);
                  if (!e.target.checked) {
                    setTotalGroups(totalBuyInCount);
                  }
                }}
                className="w-4 h-4 rounded border-poker-gold-600 bg-gray-800 text-poker-gold-600 focus:ring-poker-gold-500"
              />
              <label htmlFor="manualGroups" className="text-xs text-gray-400 cursor-pointer">
                手動設定
              </label>
            </div>
          </div>
          <div className="relative">
            <input
              type="number"
              value={totalGroups}
              onChange={(e) => {
                setTotalGroups(parseInt(e.target.value) || 0);
                setIsManualGroups(true);
              }}
              className={`w-full px-4 py-2 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                !isManualGroups ? 'bg-gray-800 text-gray-500 cursor-not-allowed' : ''
              }`}
              disabled={!isManualGroups}
            />
            {!isManualGroups && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-poker-gold-400">
                自動：{totalBuyInCount}
              </div>
            )}
          </div>
          {!isManualGroups && (
            <p className="text-xs text-gray-500 mt-1">
              💡 自動計算：總買入次數 = {totalBuyInCount} 組
            </p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">提撥金額 (NT$)</label>
          <input
            type="number"
            value={deduction}
            onChange={(e) => setDeduction(parseInt(e.target.value) || 0)}
            className="w-full px-4 py-2 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* 總獎池顯示 */}
      <div className={`p-4 rounded-lg mb-6 ${totalPrizePool >= 0 ? 'bg-green-600' : 'bg-red-600'}`}>
        <div className="flex justify-between items-center">
          <span className="text-lg font-semibold">總獎池</span>
          <span className="text-2xl font-bold">
            NT$ {totalPrizePool.toLocaleString()}
          </span>
        </div>
        <div className="text-sm mt-2 opacity-90">
          (報名費 {entryFee.toLocaleString()} × {totalGroups} 組{!isManualGroups && ` (自動計算：${totalBuyInCount} 次買入)`}) - 提撥 {deduction.toLocaleString()}
        </div>
      </div>

      {/* 前三名設定 */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold mb-3">前三名獎金設定（按百分比分配）</h3>
        <div className="space-y-3 mb-4">
          {[1, 2, 3].map((rank) => {
            const prize = topThreePrizes.find(p => p.rank === rank);
            return (
              <div key={rank} className="flex flex-col sm:flex-row items-start sm:items-center gap-3 md:gap-4 bg-gray-700 p-4 rounded-lg">
                <div className="w-full sm:w-20 text-center sm:text-left">
                  <span className="text-base md:text-lg font-bold text-yellow-400">第 {rank} 名</span>
                </div>
                <div className="flex-1 w-full">
                  <label className="block text-sm text-gray-400 mb-1">獎池百分比 (%)</label>
                  <input
                    type="number"
                    value={topThreePercentages[rank - 1] || ''}
                    onChange={(e) => handlePercentageChange(rank as 1 | 2 | 3, e.target.value)}
                    min="0"
                    max="100"
                    step="0.1"
                    className="w-full px-3 py-2 bg-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="w-full sm:w-40">
                  <label className="block text-sm text-gray-400 mb-1">獎金金額</label>
                  <div className="px-3 py-2 bg-gray-600 rounded-lg text-right font-semibold">
                    NT$ {prize ? prize.amount.toLocaleString() : 0}
                  </div>
                  <div className="text-xs text-gray-500 mt-1 text-right">
                    (四捨五入至百位)
                  </div>
                  {rank === 1 && Math.abs(adjustmentAmount) >= 0.01 && (
                    <div className="text-xs text-yellow-400 mt-1 text-right break-words">
                      (含調整差額 {adjustmentAmount > 0 ? '+' : ''}{adjustmentAmount.toLocaleString()})
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* 分配規則說明 */}
        <div className="bg-blue-600 bg-opacity-20 p-4 rounded-lg">
          <h4 className="font-semibold mb-2">分配規則</h4>
          <p className="text-sm text-gray-300 mb-2">
            <strong>第一步：</strong>從總獎池中提撥前三名獎金（按設定百分比）
          </p>
          <p className="text-sm text-gray-300 mb-2">
            <strong>第二步：</strong>剩餘獎池 NT$ {remainingPrizePool.toLocaleString()} 按<strong>籌碼占比</strong>分配給<strong>所有玩家</strong>（包括前三名）
          </p>
          <p className="text-sm text-gray-300">
            <strong>第三步：</strong>前三名最終獎金 = 按籌碼占比分配的部分 + 提撥獎金
          </p>
          <p className="text-xs text-gray-400 mt-2">
            • 所有獎金均四捨五入至百位數
          </p>
        </div>
      </div>

      {/* 驗證與統計 */}
      <div className="bg-gray-700 p-4 rounded-lg">
        <div className="flex justify-between items-center mb-2">
          <span className="font-semibold">前三名占比總和</span>
          <span className={`text-xl font-bold ${isValid ? 'text-green-400' : 'text-red-400'}`}>
            {validation.total.toFixed(2)}%
          </span>
        </div>
        <div className="text-sm text-gray-300 mt-1">
          {validation.message}
        </div>
        {!isValid && (
          <div className="text-red-400 text-sm mt-2">
            ⚠️ 請調整前三名百分比
          </div>
        )}
        <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-600">
          <span className="font-semibold">已分配總額</span>
          <span className="text-xl font-bold">NT$ {totalDistributed.toLocaleString()}</span>
        </div>
        <div className="flex justify-between items-center mt-2">
          <span className="font-semibold">總獎池</span>
          <span className="text-xl font-bold">NT$ {totalPrizePool.toLocaleString()}</span>
        </div>
        {Math.abs(remainder) < 0.01 ? (
          <div className="text-green-400 text-sm mt-2">
            ✓ 分配金額與總獎池完全一致
          </div>
        ) : (
          <div className="text-yellow-400 text-sm mt-2">
            ⚠️ 計算誤差: NT$ {remainder.toFixed(2)} (因浮點數精度)
          </div>
        )}
        {Math.abs(adjustmentAmount) >= 0.01 && (
          <div className="text-blue-400 text-sm mt-1">
            💡 四捨五入差額已自動調整到第一名: NT$ {adjustmentAmount > 0 ? '+' : ''}{adjustmentAmount.toLocaleString()}
          </div>
        )}
        <div className="text-purple-400 text-sm mt-2">
          📊 共 {playerPrizes.length} 位玩家，剩餘獎池按籌碼占比分配給所有玩家
        </div>
        {topThreePrizes.length > 0 && (
          <div className="text-yellow-400 text-sm mt-1">
            🏆 前三名額外獲得提撥獎金
          </div>
        )}
          </div>
        </div>
      )}
    </div>
  );
}
