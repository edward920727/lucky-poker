import { useState, useEffect } from 'react';
import { calculateICMPrize, PrizeCalculationResult } from '../../utils/prizeCalculator';
import { Player, TournamentType } from '../../constants/pokerConfig';
import { CustomTournamentConfig } from '../../types/tournament';
import { getAdministrativeFee } from '../../utils/administrativeFeeConfig';
import { getICMRewardStructure } from '../../constants/icmRewardConfig';

interface PrizePoolCalculatorProps {
  players: Player[];
  tournamentType?: TournamentType; // 賽事類型
  customConfig?: CustomTournamentConfig | null;
  onCalculationChange?: (result: PrizeCalculationResult | null) => void;
}

export default function PrizePoolCalculator({ players, tournamentType, customConfig, onCalculationChange }: PrizePoolCalculatorProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  // 判斷是否為自定義賽事
  const isCustom = tournamentType === 'custom' && customConfig;
  // 根據賽事類型自動設置報名費
  const defaultEntryFee = isCustom 
    ? customConfig.entryFee 
    : (tournamentType ? parseInt(tournamentType) : 600);
  const defaultDeduction = isCustom ? customConfig.administrativeFee : 0;
  const [entryFee, setEntryFee] = useState<number>(defaultEntryFee);
  const [totalGroups, setTotalGroups] = useState<number>(0);
  const [isManualGroups, setIsManualGroups] = useState(false); // 是否手動設定總組數
  const [isManualEntryFee, setIsManualEntryFee] = useState(false); // 是否手動設定報名費
  const [deduction, setDeduction] = useState<number>(defaultDeduction);
  const [totalDeduction, setTotalDeduction] = useState<number>(0); // 單場總提撥金
  const [topThreeSplit, setTopThreeSplit] = useState<[number, number, number]>([50, 30, 20]); // 前三名提撥獎金獲得比例

  // 計算總買入次數（所有玩家的 buyInCount 總和）
  const totalBuyInCount = players.reduce((sum, p) => sum + p.buyInCount, 0);

  // 當玩家買入次數變化時，如果不是手動模式，自動更新總組數
  useEffect(() => {
    if (!isManualGroups) {
      setTotalGroups(totalBuyInCount);
    }
  }, [totalBuyInCount, isManualGroups]);

  // 當賽事類型變化時，如果不是手動模式，自動更新報名費、行政費、提撥金和獲得比例
  useEffect(() => {
    if (!isManualEntryFee && tournamentType) {
      if (isCustom && customConfig) {
        setEntryFee(customConfig.entryFee);
        setDeduction(customConfig.administrativeFee);
        setTotalDeduction(customConfig.totalDeduction || 0);
        setTopThreeSplit(customConfig.topThreeSplit || [50, 30, 20]);
      } else if (tournamentType) {
        const newEntryFee = parseInt(tournamentType);
        setEntryFee(newEntryFee);
        // 使用 ICM 獎勵結構自動獲取配置
        const autoDeduction = getAdministrativeFee(newEntryFee);
        setDeduction(autoDeduction);
        const icmStructure = getICMRewardStructure(newEntryFee);
        if (icmStructure) {
          setTotalDeduction(icmStructure.totalDeduction);
          setTopThreeSplit(icmStructure.topThreeSplit);
        } else {
          setTotalDeduction(0);
          setTopThreeSplit([50, 30, 20]);
        }
      }
    }
  }, [tournamentType, customConfig, isManualEntryFee, isCustom]);

  // 所有賽事都使用新的ICM計算邏輯
  // 第一步：總獎金池 = (單組報名費 - 行政費) × 總組數
  const totalPrizePool = (entryFee - deduction) * totalGroups;
  
  // 使用新的ICM計算函數（所有賽事統一使用）
  const calculationResult = calculateICMPrize(
    {
      entryFee,
      administrativeFee: deduction,
      totalGroups,
      totalDeduction,
      topThreeSplit,
    },
    players
  );
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
  }, [totalPrizePool, players.length, players.map(p => `${p.memberId}-${p.currentChips}`).join(','), totalDeduction, topThreeSplit.join(','), totalDistributed, adjustmentAmount]);

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
          <label className="block text-sm font-medium mb-2">行政費 (NT$)</label>
          <div className="relative">
            <input
              type="number"
              value={deduction || ''}
              onChange={(e) => {
                const value = e.target.value;
                if (value === '' || value === null || value === undefined) {
                  setDeduction(0);
                  return;
                }
                const numValue = parseFloat(value);
                if (!isNaN(numValue)) {
                  setDeduction(Math.max(0, numValue));
                }
              }}
              className="w-full px-4 py-2 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {!isCustom && tournamentType && getAdministrativeFee(parseInt(tournamentType)) > 0 && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-poker-gold-400">
                自動：{getAdministrativeFee(parseInt(tournamentType))}
              </div>
            )}
          </div>
          {!isCustom && tournamentType && getAdministrativeFee(parseInt(tournamentType)) > 0 && (
            <p className="text-xs text-gray-500 mt-1">
              💡 根據 ICM 獎勵結構自動計算：報名費 {tournamentType} → 行政費 {getAdministrativeFee(parseInt(tournamentType))}
            </p>
          )}
        </div>
      </div>

      {/* 總獎池顯示 */}
      <div className={`p-4 rounded-lg mb-6 ${totalPrizePool >= 0 ? 'bg-green-600' : 'bg-red-600'}`}>
        <div className="flex justify-between items-center">
          <span className="text-lg font-semibold">第一步：總獎金池</span>
          <span className="text-2xl font-bold">
            NT$ {totalPrizePool.toLocaleString()}
          </span>
        </div>
        <div className="text-sm mt-2 opacity-90">
          (報名費 {entryFee.toLocaleString()} - 行政費 {deduction.toLocaleString()}) × {totalGroups} 組{!isManualGroups && ` (自動計算：${totalBuyInCount} 次買入)`} = {totalPrizePool.toLocaleString()}
        </div>
      </div>

      {/* 淨獎池顯示 */}
      <div className="p-4 rounded-lg mb-6 bg-blue-600">
        <div className="flex justify-between items-center">
          <span className="text-lg font-semibold">第二步：淨獎池</span>
          <span className="text-2xl font-bold">
            NT$ {remainingPrizePool.toLocaleString()}
          </span>
        </div>
        <div className="text-sm mt-2 opacity-90">
          總獎金池 {totalPrizePool.toLocaleString()} - 單場總提撥 {totalDeduction.toLocaleString()} = {remainingPrizePool.toLocaleString()}
        </div>
      </div>

      {/* 前三名提撥獎金顯示 */}
      {topThreePrizes.length > 0 && (
        <div className="mb-4">
          <h3 className="text-lg font-semibold mb-3">第三步：前三名提撥獎金分配</h3>
          <div className="space-y-3 mb-4">
            {topThreePrizes.map((prize) => (
              <div key={prize.rank} className="flex flex-col sm:flex-row items-start sm:items-center gap-3 md:gap-4 bg-gray-700 p-4 rounded-lg">
                <div className="w-full sm:w-20 text-center sm:text-left">
                  <span className="text-base md:text-lg font-bold text-yellow-400">第 {prize.rank} 名</span>
                </div>
                <div className="flex-1 w-full">
                  <label className="block text-sm text-gray-400 mb-1">獲得比例</label>
                  <div className="px-3 py-2 bg-gray-600 rounded-lg text-center font-semibold">
                    {prize.percentage}%
                  </div>
                </div>
                <div className="w-full sm:w-40">
                  <label className="block text-sm text-gray-400 mb-1">提撥獎金金額</label>
                  <div className="px-3 py-2 bg-gray-600 rounded-lg text-right font-semibold">
                    NT$ {prize.amount.toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-500 mt-1 text-right">
                    (無條件捨去至百位)
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 計算規則說明 */}
      <div className="bg-blue-600 bg-opacity-20 p-4 rounded-lg mb-4">
        <h4 className="font-semibold mb-2">ICM 計算規則</h4>
        <p className="text-sm text-gray-300 mb-2">
          <strong>第一步：</strong>總獎金池 = (單組報名費 {entryFee.toLocaleString()} - 行政費 {deduction.toLocaleString()}) × 總組數 {totalGroups} = NT$ {totalPrizePool.toLocaleString()}
        </p>
        <p className="text-sm text-gray-300 mb-2">
          <strong>第二步：</strong>淨獎池 = 總獎金池 {totalPrizePool.toLocaleString()} - 單場總提撥 {totalDeduction.toLocaleString()} = NT$ {remainingPrizePool.toLocaleString()}
        </p>
        <p className="text-sm text-gray-300 mb-2">
          <strong>第三步：</strong>提撥分配 = 將提撥金 {totalDeduction.toLocaleString()} 按 {topThreeSplit[0]}% / {topThreeSplit[1]}% / {topThreeSplit[2]}% 分配給前三名
        </p>
        <p className="text-sm text-gray-300 mb-2">
          <strong>第四步：</strong>最終獎金 = (個人籌碼 / 總發行籌碼) × 淨獎池 + (前三名提撥獎金)
        </p>
        <p className="text-sm text-gray-300">
          <strong>第五步：</strong>所有獎金無條件捨去至百位數
        </p>
      </div>

      {/* 統計 */}
      <div className="bg-gray-700 p-4 rounded-lg">
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
          📊 共 {playerPrizes.length} 位玩家，淨獎池按籌碼占比分配給所有玩家
        </div>
        {topThreePrizes.length > 0 && (
          <div className="text-yellow-400 text-sm mt-1">
            🏆 前三名額外獲得提撥獎金（按獲得比例：{topThreeSplit[0]}% / {topThreeSplit[1]}% / {topThreeSplit[2]}%）
          </div>
        )}
          </div>
        </div>
      )}
    </div>
  );
}
