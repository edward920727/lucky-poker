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
  const [isManualTotalDeduction, setIsManualTotalDeduction] = useState(false); // 是否手動設定提撥獎金
  const [deduction, setDeduction] = useState<number>(defaultDeduction);
  const [totalDeduction, setTotalDeduction] = useState<number>(0); // 單場總提撥金
  const [activityBonus, setActivityBonus] = useState<number>(isCustom ? (customConfig.activityBonus || 0) : 0); // 單場活動獎金
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
        setActivityBonus(customConfig.activityBonus || 0);
        if (!isManualTotalDeduction) {
          setTotalDeduction(customConfig.totalDeduction || 0);
        }
        setTopThreeSplit(customConfig.topThreeSplit || [50, 30, 20]);
      } else if (tournamentType) {
        const newEntryFee = parseInt(tournamentType);
        setEntryFee(newEntryFee);
        // 使用 ICM 獎勵結構自動獲取配置
        const autoDeduction = getAdministrativeFee(newEntryFee);
        setDeduction(autoDeduction);
        // 標準賽事預設不額外抽活動獎金（如需可手動輸入）
        setActivityBonus(0);
        if (!isManualTotalDeduction) {
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
    }
  }, [tournamentType, customConfig, isManualEntryFee, isManualTotalDeduction, isCustom]);

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
      activityBonus,
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
        <div className="animate-fadeIn space-y-6">
          {/* 輸入區域 - 基本參數 */}
          <div className="bg-gray-800 rounded-xl p-4 md:p-5 border border-gray-700">
            <h3 className="text-lg font-semibold text-poker-gold-300 mb-4 flex items-center gap-2">
              <span>⚙️</span>
              <span>基本參數設定</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* 報名費 */}
              <div className="bg-gray-700 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-300">報名費 (NT$)</label>
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
                      手動
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
                    className={`w-full px-3 py-2 bg-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-poker-gold-500 ${
                      !isManualEntryFee ? 'bg-gray-800 text-gray-500 cursor-not-allowed' : ''
                    }`}
                    disabled={!isManualEntryFee}
                  />
                  {!isManualEntryFee && tournamentType && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-poker-gold-400 font-semibold">
                      自動：{tournamentType}
                    </div>
                  )}
                </div>
                {!isManualEntryFee && tournamentType && (
                  <p className="text-xs text-gray-500 mt-1">
                    💡 自動設定：NT$ {tournamentType}
                  </p>
                )}
              </div>

              {/* 總組數 */}
              <div className="bg-gray-700 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-300">總組數</label>
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
                      手動
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
                    className={`w-full px-3 py-2 bg-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-poker-gold-500 ${
                      !isManualGroups ? 'bg-gray-800 text-gray-500 cursor-not-allowed' : ''
                    }`}
                    disabled={!isManualGroups}
                  />
                  {!isManualGroups && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-poker-gold-400 font-semibold">
                      自動：{totalBuyInCount}
                    </div>
                  )}
                </div>
                {!isManualGroups && (
                  <p className="text-xs text-gray-500 mt-1">
                    💡 自動計算：{totalBuyInCount} 組
                  </p>
                )}
              </div>

              {/* 行政費 */}
              <div className="bg-gray-700 rounded-lg p-3">
                <label className="block text-sm font-medium text-gray-300 mb-2">行政費 (NT$)</label>
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
                    className="w-full px-3 py-2 bg-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-poker-gold-500"
                  />
                  {!isCustom && tournamentType && getAdministrativeFee(parseInt(tournamentType)) > 0 && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-poker-gold-400 font-semibold">
                      自動：{getAdministrativeFee(parseInt(tournamentType))}
                    </div>
                  )}
                </div>
                {!isCustom && tournamentType && getAdministrativeFee(parseInt(tournamentType)) > 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    💡 自動：{getAdministrativeFee(parseInt(tournamentType))}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* 輸入區域 - 獎金設定 */}
          <div className="bg-gray-800 rounded-xl p-4 md:p-5 border border-gray-700">
            <h3 className="text-lg font-semibold text-poker-gold-300 mb-4 flex items-center gap-2">
              <span>💰</span>
              <span>獎金設定</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* 活動獎金 */}
              <div className="bg-gray-700 rounded-lg p-3">
                <label className="block text-sm font-medium text-gray-300 mb-2">活動獎金 (NT$)</label>
                <input
                  type="number"
                  value={activityBonus || ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '' || value === null || value === undefined) {
                      setActivityBonus(0);
                      return;
                    }
                    const numValue = parseFloat(value);
                    if (!isNaN(numValue)) {
                      setActivityBonus(Math.max(0, numValue));
                    }
                  }}
                  className="w-full px-3 py-2 bg-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-poker-gold-500"
                  placeholder="0"
                />
                <p className="text-xs text-gray-500 mt-1">
                  ⚠️ 從總獎金池額外抽出，不參與玩家分配
                </p>
              </div>

              {/* 單場總提撥金 */}
              <div className="bg-gray-700 rounded-lg p-3">
                <label className="block text-sm font-medium text-gray-300 mb-2">單場總提撥金 (NT$)</label>
                <div className="relative">
                  <input
                    type="number"
                    value={totalDeduction || ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === '' || value === null || value === undefined) {
                        setTotalDeduction(0);
                        setIsManualTotalDeduction(true);
                        return;
                      }
                      const numValue = parseFloat(value);
                      if (!isNaN(numValue)) {
                        setTotalDeduction(Math.max(0, numValue));
                        setIsManualTotalDeduction(true);
                      }
                    }}
                    className="w-full px-3 py-2 bg-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-poker-gold-500"
                    placeholder="0"
                  />
                  {!isCustom && tournamentType && (() => {
                    const icmStructure = getICMRewardStructure(parseInt(tournamentType));
                    return icmStructure && icmStructure.totalDeduction > 0 ? (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
                        <span className="text-xs text-poker-gold-400 font-semibold">
                          自動：{icmStructure.totalDeduction}
                        </span>
                        {isManualTotalDeduction && (
                          <button
                            type="button"
                            onClick={() => {
                              setTotalDeduction(icmStructure.totalDeduction);
                              setIsManualTotalDeduction(false);
                            }}
                            className="text-xs text-blue-400 hover:text-blue-300 underline"
                            title="恢復自動值"
                          >
                            恢復
                          </button>
                        )}
                      </div>
                    ) : null;
                  })()}
                </div>
                {!isCustom && tournamentType && (() => {
                  const icmStructure = getICMRewardStructure(parseInt(tournamentType));
                  return icmStructure && icmStructure.totalDeduction > 0 ? (
                    <p className="text-xs text-gray-500 mt-1">
                      💡 自動：{icmStructure.totalDeduction}
                      {isManualTotalDeduction && (
                        <span className="ml-2 text-orange-400">（已手動修改）</span>
                      )}
                    </p>
                  ) : null;
                })()}
                {isCustom && customConfig && customConfig.totalDeduction && (
                  <p className="text-xs text-gray-500 mt-1">
                    💡 自定義：{customConfig.totalDeduction}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* 計算步驟顯示 */}
          <div className="space-y-4">
            {/* 第一步：總獎金池 */}
            <div className={`p-4 md:p-5 rounded-xl border-2 ${
              totalPrizePool >= 0 
                ? 'bg-gradient-to-r from-green-600 to-green-700 border-green-500' 
                : 'bg-gradient-to-r from-red-600 to-red-700 border-red-500'
            } shadow-lg`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">1️⃣</span>
                  <span className="text-lg md:text-xl font-bold text-white">總獎金池</span>
                </div>
                <span className="text-2xl md:text-3xl font-black text-white">
                  NT$ {totalPrizePool.toLocaleString()}
                </span>
              </div>
              <div className="text-sm md:text-base text-white/90 mt-2 bg-black/20 rounded-lg px-3 py-2">
                (報名費 {entryFee.toLocaleString()} - 行政費 {deduction.toLocaleString()}) × {totalGroups} 組
                {!isManualGroups && ` (自動：${totalBuyInCount} 次買入)`}
              </div>
            </div>

            {/* 活動獎金扣除（如果有） */}
            {activityBonus > 0 && (
              <div className="p-4 md:p-5 rounded-xl border-2 bg-gradient-to-r from-orange-600 to-orange-700 border-orange-500 shadow-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">🎁</span>
                    <span className="text-lg md:text-xl font-bold text-white">活動獎金</span>
                  </div>
                  <span className="text-2xl md:text-3xl font-black text-white">
                    - NT$ {activityBonus.toLocaleString()}
                  </span>
                </div>
                <div className="text-sm text-white/80 mt-1">
                  從總獎金池額外抽出，不參與玩家分配
                </div>
              </div>
            )}

            {/* 第二步：淨獎池 */}
            <div className="p-4 md:p-5 rounded-xl border-2 bg-gradient-to-r from-blue-600 to-blue-700 border-blue-500 shadow-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">2️⃣</span>
                  <span className="text-lg md:text-xl font-bold text-white">淨獎池</span>
                </div>
                <span className="text-2xl md:text-3xl font-black text-white">
                  NT$ {(totalPrizePool - activityBonus).toLocaleString()}
                </span>
              </div>
              <div className="text-sm md:text-base text-white/90 mt-2 bg-black/20 rounded-lg px-3 py-2">
                總獎金池 {totalPrizePool.toLocaleString()}
                {activityBonus > 0 && ` - 活動獎金 ${activityBonus.toLocaleString()}`}
                {activityBonus === 0 && ' (無活動獎金)'}
              </div>
            </div>

            {/* 提撥獎金扣除（如果有） */}
            {totalDeduction > 0 && (
              <div className="p-4 md:p-5 rounded-xl border-2 bg-gradient-to-r from-purple-600 to-purple-700 border-purple-500 shadow-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">3️⃣</span>
                    <span className="text-lg md:text-xl font-bold text-white">提撥獎金</span>
                  </div>
                  <span className="text-2xl md:text-3xl font-black text-white">
                    - NT$ {totalDeduction.toLocaleString()}
                  </span>
                </div>
                <div className="text-sm text-white/80 mt-1">
                  從淨獎池扣除，按 {topThreeSplit[0]}% / {topThreeSplit[1]}% / {topThreeSplit[2]}% 分配給前三名
                </div>
              </div>
            )}

            {/* 最終分配獎池 */}
            <div className="p-4 md:p-5 rounded-xl border-2 bg-gradient-to-r from-green-600 to-green-700 border-green-500 shadow-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">4️⃣</span>
                  <span className="text-lg md:text-xl font-bold text-white">最終分配獎池</span>
                </div>
                <span className="text-2xl md:text-3xl font-black text-white">
                  NT$ {remainingPrizePool.toLocaleString()}
                </span>
              </div>
              <div className="text-sm md:text-base text-white/90 mt-2 bg-black/20 rounded-lg px-3 py-2">
                淨獎池 {(totalPrizePool - activityBonus).toLocaleString()}
                {totalDeduction > 0 && ` - 提撥獎金 ${totalDeduction.toLocaleString()}`}
                {totalDeduction === 0 && ' (無提撥獎金)'}
              </div>
            </div>
          </div>

          {/* 前三名提撥獎金顯示 */}
          {topThreePrizes.length > 0 && (
            <div className="bg-gray-800 rounded-xl p-4 md:p-5 border border-gray-700">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">5️⃣</span>
                <h3 className="text-lg md:text-xl font-bold text-poker-gold-300">前三名提撥獎金分配</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {topThreePrizes.map((prize) => (
                  <div 
                    key={prize.rank} 
                    className="bg-gradient-to-br from-yellow-600/20 to-yellow-700/20 border-2 border-yellow-500/40 rounded-xl p-4 hover:border-yellow-500/60 transition-all"
                  >
                    <div className="text-center mb-3">
                      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 text-white font-black text-lg mb-2">
                        {prize.rank}
                      </div>
                      <div className="text-sm text-gray-400">第 {prize.rank} 名</div>
                    </div>
                    <div className="space-y-2">
                      <div className="bg-gray-700 rounded-lg p-2 text-center">
                        <div className="text-xs text-gray-400 mb-1">獲得比例</div>
                        <div className="text-lg font-bold text-yellow-400">
                          {prize.percentage}%
                        </div>
                      </div>
                      <div className="bg-gray-700 rounded-lg p-2 text-center">
                        <div className="text-xs text-gray-400 mb-1">提撥獎金</div>
                        <div className="text-xl font-black text-poker-gold-400">
                          NT$ {prize.amount.toLocaleString()}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          (無條件捨去至百位)
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 計算規則說明 */}
          <div className="bg-gradient-to-br from-blue-900/40 to-blue-800/40 rounded-xl p-4 md:p-5 border border-blue-600/40">
            <h4 className="font-bold text-lg mb-3 flex items-center gap-2 text-blue-300">
              <span>📋</span>
              <span>ICM 計算規則</span>
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex items-start gap-2">
                <span className="font-bold text-blue-400 min-w-[60px]">第一步：</span>
                <span className="text-gray-300">
                  總獎金池 = (單組報名費 {entryFee.toLocaleString()} - 行政費 {deduction.toLocaleString()}) × 總組數 {totalGroups} = <strong className="text-green-400">NT$ {totalPrizePool.toLocaleString()}</strong>
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-bold text-blue-400 min-w-[60px]">第二步：</span>
                <span className="text-gray-300">
                  淨獎池 = 總獎金池 {totalPrizePool.toLocaleString()}
                  {activityBonus > 0 && ` - 活動獎金 ${activityBonus.toLocaleString()}`}
                  {activityBonus === 0 && ' (無活動獎金)'}
                  {' = '}
                  <strong className="text-blue-400">NT$ {(totalPrizePool - activityBonus).toLocaleString()}</strong>
                </span>
              </div>
              {totalDeduction > 0 && (
                <div className="flex items-start gap-2">
                  <span className="font-bold text-blue-400 min-w-[60px]">第三步：</span>
                  <span className="text-gray-300">
                    提撥獎金 = <strong className="text-purple-400">NT$ {totalDeduction.toLocaleString()}</strong>（從淨獎池扣除）
                  </span>
                </div>
              )}
              {topThreePrizes.length > 0 && (
                <div className="flex items-start gap-2">
                  <span className="font-bold text-blue-400 min-w-[60px]">第四步：</span>
                  <span className="text-gray-300">
                    提撥分配 = 將提撥金 {totalDeduction.toLocaleString()} 按 <strong className="text-yellow-400">{topThreeSplit[0]}% / {topThreeSplit[1]}% / {topThreeSplit[2]}%</strong> 分配給前三名
                  </span>
                </div>
              )}
              <div className="flex items-start gap-2">
                <span className="font-bold text-blue-400 min-w-[60px]">第五步：</span>
                <span className="text-gray-300">
                  最終分配獎池 = 淨獎池 {(totalPrizePool - activityBonus).toLocaleString()}
                  {totalDeduction > 0 && ` - 提撥獎金 ${totalDeduction.toLocaleString()}`}
                  {' = '}
                  <strong className="text-green-400">NT$ {remainingPrizePool.toLocaleString()}</strong>
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-bold text-blue-400 min-w-[60px]">第六步：</span>
                <span className="text-gray-300">
                  最終獎金 = (個人籌碼 / 總發行籌碼) × 最終分配獎池 + (前三名提撥獎金)
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-bold text-blue-400 min-w-[60px]">第七步：</span>
                <span className="text-gray-300">
                  所有獎金無條件捨去至百位數
                </span>
              </div>
            </div>
          </div>

          {/* 統計資訊 */}
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-4 md:p-5 border-2 border-poker-gold-600/40 shadow-lg">
            <h4 className="font-bold text-lg mb-4 flex items-center gap-2 text-poker-gold-300">
              <span>📊</span>
              <span>分配統計</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div className="bg-gray-700 rounded-lg p-3 border border-gray-600">
                <div className="text-sm text-gray-400 mb-1">已分配總額</div>
                <div className="text-2xl font-black text-green-400">
                  NT$ {totalDistributed.toLocaleString()}
                </div>
              </div>
              <div className="bg-gray-700 rounded-lg p-3 border border-gray-600">
                <div className="text-sm text-gray-400 mb-1">總獎池</div>
                <div className="text-2xl font-black text-poker-gold-400">
                  NT$ {totalPrizePool.toLocaleString()}
                </div>
              </div>
            </div>
            
            <div className="space-y-2 pt-4 border-t border-gray-600">
              {Math.abs(remainder) < 0.01 ? (
                <div className="flex items-center gap-2 text-green-400 text-sm font-semibold bg-green-900/20 rounded-lg px-3 py-2">
                  <span>✓</span>
                  <span>分配金額與總獎池完全一致</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-yellow-400 text-sm font-semibold bg-yellow-900/20 rounded-lg px-3 py-2">
                  <span>⚠️</span>
                  <span>計算誤差: NT$ {remainder.toFixed(2)} (因浮點數精度)</span>
                </div>
              )}
              {Math.abs(adjustmentAmount) >= 0.01 && (
                <div className="flex items-center gap-2 text-blue-400 text-sm font-semibold bg-blue-900/20 rounded-lg px-3 py-2">
                  <span>💡</span>
                  <span>四捨五入差額已自動調整到第一名: NT$ {adjustmentAmount > 0 ? '+' : ''}{adjustmentAmount.toLocaleString()}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-purple-400 text-sm font-semibold bg-purple-900/20 rounded-lg px-3 py-2">
                <span>📊</span>
                <span>共 {playerPrizes.length} 位玩家，淨獎池按籌碼占比分配給所有玩家</span>
              </div>
              {topThreePrizes.length > 0 && (
                <div className="flex items-center gap-2 text-yellow-400 text-sm font-semibold bg-yellow-900/20 rounded-lg px-3 py-2">
                  <span>🏆</span>
                  <span>前三名額外獲得提撥獎金（按獲得比例：{topThreeSplit[0]}% / {topThreeSplit[1]}% / {topThreeSplit[2]}%）</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
