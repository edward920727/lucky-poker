import { useRef, useState, useEffect } from 'react';
import html2canvas from 'html2canvas';
import { Player, PaymentMethod } from '../../constants/pokerConfig';
import { PrizeCalculationResult } from '../../utils/prizeCalculator';
import { getTaiwanTodayDateKey, formatTaiwanDate, getTaiwanDateTime } from '../utils/dateUtils';

const paymentMethodLabels: Record<PaymentMethod, string> = {
  cash: '現金',
  transfer: '轉帳',
  unpaid: '未付',
};

interface ExportButtonProps {
  players: Player[];
  config: { name: string; startChip: number };
  prizeCalculation?: PrizeCalculationResult | null;
  tournamentName?: string; // 完整的賽事名稱（包含場次號碼，如 "600#1"）
}

export default function ExportButton({ players, config, prizeCalculation, tournamentName }: ExportButtonProps) {
  const exportRef = useRef<HTMLDivElement>(null);
  const [isAdjustingPrizes, setIsAdjustingPrizes] = useState(false);
  const [adjustedPrizes, setAdjustedPrizes] = useState<Record<string, number>>({});
  
  // 初始化調整後的獎金（從計算結果）
  useEffect(() => {
    if (prizeCalculation && prizeCalculation.playerPrizes.length > 0) {
      const initialPrizes: Record<string, number> = {};
      prizeCalculation.playerPrizes.forEach(p => {
        initialPrizes[p.memberId] = p.prizeAmount;
      });
      setAdjustedPrizes(initialPrizes);
    }
  }, [prizeCalculation]);

  const handleExport = async () => {
    if (!exportRef.current) return;

    try {
      const canvas = await html2canvas(exportRef.current, {
        backgroundColor: '#111827',
        scale: 2,
      });

      const link = document.createElement('a');
      link.download = `${config.name}_結算結存表_${getTaiwanTodayDateKey()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      console.error('導出失敗:', error);
      alert('導出失敗，請重試');
    }
  };

  const totalBuyInGroups = players.reduce((sum, p) => sum + p.buyInCount, 0);
  const expectedTotalChips = totalBuyInGroups * config.startChip;
  const actualTotalChips = players.reduce((sum, p) => sum + p.currentChips, 0);
  const isBalanced = expectedTotalChips === actualTotalChips;

  // 按筹码从高到低排序玩家（用于显示排名）
  const sortedPlayersForDisplay = [...players].sort((a, b) => b.currentChips - a.currentChips);

  const hasPrizeCalculation =
    !!prizeCalculation &&
    prizeCalculation.totalPrizePool > 0 &&
    prizeCalculation.playerPrizes.length > 0;

  const normalizedAdjustedPrizes: Record<string, number> = adjustedPrizes;
  const adjustedPrizeTotal = hasPrizeCalculation
    ? prizeCalculation.playerPrizes.reduce((sum, p) => sum + (normalizedAdjustedPrizes[String(p.memberId)] ?? p.prizeAmount), 0)
    : 0;
  const netPool = prizeCalculation?.netPool ?? 0;
  const adjustedDiff = netPool - adjustedPrizeTotal;

  return (
    <>
      <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
        <button
          type="button"
          onClick={() => setIsAdjustingPrizes(v => !v)}
          className={`w-full sm:w-auto px-4 md:px-6 py-3 rounded-lg text-base md:text-lg font-semibold transition-all duration-200 border-2 ${
            isAdjustingPrizes
              ? 'bg-yellow-600 hover:bg-yellow-700 text-white border-yellow-500'
              : 'bg-gray-700 hover:bg-gray-600 text-white border-gray-600'
          }`}
          disabled={!hasPrizeCalculation}
          title={!hasPrizeCalculation ? '需先有獎金計算結果才可調整' : undefined}
        >
          ✏️ 調整獎金
        </button>
        <button
          onClick={handleExport}
          className="w-full sm:w-auto px-4 md:px-6 py-3 bg-white hover:bg-gray-100 rounded-lg text-base md:text-lg font-semibold text-black transition-all duration-200 border-2 border-white"
        >
          📥 導出結算結存表
        </button>
      </div>

      {isAdjustingPrizes && hasPrizeCalculation && (
        <div className="mt-4 w-full bg-gray-800 rounded-2xl p-4 md:p-6 border-2 border-yellow-600/60 shadow-xl">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h3 className="text-lg md:text-xl font-bold text-yellow-400">手動調整獎金</h3>
              <p className="text-xs text-gray-400 mt-1">
                調整後「所有玩家獎金總和」需等於「淨獎池」。差額請自行分配到玩家。
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsAdjustingPrizes(false)}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg border border-gray-600"
            >
              完成
            </button>
          </div>

          <div className="max-h-[420px] overflow-y-auto space-y-2">
            {prizeCalculation!.playerPrizes.map((pp) => {
              const key = String(pp.memberId);
              const player = players.find(p => String(p.memberId) === key);
              if (!player) return null;

              const currentValue = normalizedAdjustedPrizes[key] ?? pp.prizeAmount;

              return (
                <div key={key} className="flex items-center gap-3 bg-gray-700 rounded-xl p-3 border border-gray-600">
                  <div className="flex-1">
                    <div className="font-mono font-bold text-poker-gold-300">{player.memberId}</div>
                    <div className="text-xs text-gray-300 mt-1">
                      籌碼 {player.currentChips.toLocaleString()}｜原獎金 NT$ {pp.prizeAmount.toLocaleString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-300">NT$</span>
                    <input
                      type="number"
                      min={0}
                      value={currentValue}
                      onChange={(e) => {
                        const num = Number(e.target.value);
                        setAdjustedPrizes(prev => ({
                          ...prev,
                          [key]: Number.isFinite(num) ? Math.max(0, Math.trunc(num)) : 0,
                        }));
                      }}
                      onWheel={(e) => e.currentTarget.blur()}
                      className="w-32 px-3 py-2 bg-gray-900 rounded-lg text-white text-right border border-gray-600 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 pt-4 border-t border-gray-700">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-gray-900 rounded-xl p-3 border border-gray-700">
                <div className="text-xs text-gray-400 mb-1">淨獎池</div>
                <div className="text-lg font-black text-white">NT$ {netPool.toLocaleString()}</div>
              </div>
              <div className="bg-gray-900 rounded-xl p-3 border border-gray-700">
                <div className="text-xs text-gray-400 mb-1">調整後總和</div>
                <div className="text-lg font-black text-white">NT$ {adjustedPrizeTotal.toLocaleString()}</div>
              </div>
              <div className={`rounded-xl p-3 border ${Math.abs(adjustedDiff) < 0.01 ? 'bg-green-900/30 border-green-600/50' : 'bg-yellow-900/30 border-yellow-600/50'}`}>
                <div className="text-xs text-gray-300 mb-1">差額（淨獎池 - 總和）</div>
                <div className={`text-lg font-black ${Math.abs(adjustedDiff) < 0.01 ? 'text-green-300' : 'text-yellow-300'}`}>
                  {adjustedDiff > 0 ? '+' : ''}{adjustedDiff.toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 隱藏的導出內容 */}
      <div ref={exportRef} className="fixed -left-[9999px] bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 text-white p-8 w-[800px]">
        <div className="text-center mb-6">
          <h1 className="text-4xl font-bold mb-2 text-white">
            {tournamentName || config.name} Settlement Statement
          </h1>
          <p className="text-xl text-gray-300">
            {formatTaiwanDate(getTaiwanDateTime(), { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-blue-600 p-4 rounded-lg text-center">
            <div className="text-sm opacity-90 mb-1">買入組數</div>
            <div className="text-3xl font-bold">{totalBuyInGroups}</div>
          </div>
          <div className="bg-purple-600 p-4 rounded-lg text-center">
            <div className="text-sm opacity-90 mb-1">理論總碼量</div>
            <div className="text-3xl font-bold">{expectedTotalChips.toLocaleString()}</div>
          </div>
          <div className={`p-4 rounded-lg text-center ${isBalanced ? 'bg-green-600' : 'bg-red-600'}`}>
            <div className="text-sm opacity-90 mb-1">實際總碼量</div>
            <div className="text-3xl font-bold">{actualTotalChips.toLocaleString()}</div>
          </div>
        </div>

        <table className="w-full border-collapse mb-6 bg-white text-gray-900">
          <thead>
            <tr className="bg-gray-800 text-white">
              <th className="border border-gray-700 py-3 px-4 text-left">名次</th>
              <th className="border border-gray-700 py-3 px-4 text-left">會編</th>
              <th className="border border-gray-700 py-3 px-4 text-left">座位號</th>
              <th className="border border-gray-700 py-3 px-4 text-left">買入次數</th>
              <th className="border border-gray-700 py-3 px-4 text-left">支付方式</th>
              <th className="border border-gray-700 py-3 px-4 text-left">折扣券</th>
              <th className="border border-gray-700 py-3 px-4 text-left">當前碼量</th>
              <th className="border border-gray-700 py-3 px-4 text-right">獎金金額</th>
            </tr>
          </thead>
          <tbody>
            {sortedPlayersForDisplay.map((player, index) => {
              // 根据筹码计算排名（筹码相同则并列）
              let rank = index + 1;
              if (index > 0 && sortedPlayersForDisplay[index - 1].currentChips === player.currentChips) {
                rank = sortedPlayersForDisplay.findIndex(p => p.currentChips === player.currentChips) + 1;
              }
              
              // 查找奖金（确保 memberId 类型匹配）
              const playerPrize = prizeCalculation?.playerPrizes.find(p => 
                String(p.memberId) === String(player.memberId)
              );
              
              const displayRank = playerPrize ? playerPrize.rank : rank;
              
              // 奖金显示逻辑：如果有奖金计算结果，显示奖金（優先顯示調整後的獎金）
              let displayPrize: number | null = null;
              if (prizeCalculation && prizeCalculation.totalPrizePool > 0 && prizeCalculation.playerPrizes.length > 0) {
                // 如果找到该玩家的奖金，显示；否则显示0（表示该玩家没有奖金）
                const adjusted = adjustedPrizes[String(player.memberId)];
                if (adjusted !== undefined) {
                  displayPrize = adjusted;
                } else {
                  displayPrize = playerPrize ? playerPrize.prizeAmount : 0;
                }
              }
              
              return (
                <tr key={player.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="border border-gray-300 py-3 px-4 text-gray-900">{displayRank}</td>
                  <td className="border border-gray-300 py-3 px-4 font-mono text-lg text-gray-900">{player.memberId}</td>
                  <td className="border border-gray-300 py-3 px-4 text-gray-900">{player.seat || '-'}</td>
                  <td className="border border-gray-300 py-3 px-4 text-gray-900">{player.buyInCount}</td>
                  <td className="border border-gray-300 py-3 px-4 text-gray-900">
                    {paymentMethodLabels[player.paymentMethod]}
                  </td>
                  <td className="border border-gray-300 py-3 px-4 text-gray-900">
                    {player.couponCode ? `${player.couponCode} (-NT$ ${(player.couponDiscount || 0).toLocaleString()})` : '-'}
                  </td>
                  <td className="border border-gray-300 py-3 px-4 text-gray-900">{player.currentChips.toLocaleString()}</td>
                  <td className="border border-gray-300 py-3 px-4 text-right font-semibold text-green-600">
                    {displayPrize !== null ? `NT$ ${displayPrize.toLocaleString()}` : '-'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* 獎金分配摘要 */}
        {prizeCalculation && prizeCalculation.playerPrizes.length > 0 && prizeCalculation.totalPrizePool > 0 && (
          <div className="mt-6">
            <div className="bg-green-600 bg-opacity-30 p-5 rounded-lg mb-4 border-2 border-green-500">
              <h2 className="text-xl font-bold mb-4 text-center text-white">獎金分配摘要</h2>
              
              <div className="space-y-3 text-white">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold">總獎池</span>
                  <span className="text-2xl font-bold">NT$ {prizeCalculation.totalPrizePool.toLocaleString()}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold">淨獎池</span>
                  <span className="text-2xl font-bold">NT$ {prizeCalculation.netPool.toLocaleString()}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold">所有玩家獎金總和</span>
                  <span className="text-2xl font-bold">
                    NT$ {Object.keys(adjustedPrizes).length > 0 && isAdjustingPrizes 
                      ? adjustedPrizeTotal.toLocaleString() 
                      : prizeCalculation.totalDistributed.toLocaleString()}
                  </span>
                </div>
                
                <div className="flex items-center gap-2 text-green-200">
                  <span>✓</span>
                  <span className="text-sm">等於淨獎池 (總獎池 - 活動獎金)</span>
                </div>
                
                <div className="border-t border-green-400 pt-3 mt-3">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-lg font-semibold">提撥獎金 (=前三名提撥獎金總和)</span>
                    <span className="text-xl font-bold">NT$ {prizeCalculation.topThreeTotal.toLocaleString()}</span>
                  </div>
                  
                  {prizeCalculation.topThreePrizes.map((prize, index) => (
                    <div key={prize.rank} className="text-sm ml-4 mb-1">
                      {index + 1}名: NT$ {prize.amount.toLocaleString()} ({prize.percentage}%)
                    </div>
                  ))}
                  
                  <div className="flex items-center gap-2 text-green-200 mt-2">
                    <span>✓</span>
                    <span className="text-sm">驗證:提撥獎金=前三名提撥總額={prizeCalculation.topThreeTotal.toLocaleString()}</span>
                  </div>
                </div>
                
                <div className="border-t border-green-400 pt-3 mt-3">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-lg font-semibold">最終分配獎池(按籌碼分配)</span>
                    <span className="text-xl font-bold">NT$ {prizeCalculation.remainingPrizePool.toLocaleString()}</span>
                  </div>
                  <div className="text-sm text-green-200 ml-4">
                    (淨獎池-提撥獎金)
                  </div>
                </div>
                
                {Math.abs(prizeCalculation.adjustmentAmount) >= 0.01 && (
                  <div className="border-t border-green-400 pt-3 mt-3">
                    <div className="text-sm text-green-200">
                      <strong>差額調整:</strong> {prizeCalculation.adjustmentAmount > 0 ? '+' : ''}{prizeCalculation.adjustmentAmount.toLocaleString()}已調整至捨去尾數最多的玩家(處理捨去誤差)
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="bg-blue-900 bg-opacity-50 p-4 rounded-lg border border-blue-600">
              <h3 className="text-lg font-bold mb-3 text-blue-200">ICM 分配規則</h3>
              <div className="space-y-2 text-sm text-white">
                <p>1. 總獎金池 = (單組報名費-行政費)×總組數</p>
                <p>2. 淨獎池 = 總獎金池-活動獎金</p>
                <p>3. 提撥獎金(=前三名提撥獎金總和)從淨獎池扣除,按設定比例分配給前三名</p>
                <p>4. 最終分配獎池=淨獎池-提撥獎金</p>
                <p>5. 最終獎金= (個人籌碼/總發行籌碼)×最終分配獎池+(前三名提撥獎金)</p>
                <div className="ml-4 mt-2 space-y-1 text-xs text-blue-200">
                  <p>• 提撥獎金分配總額等於設定的總提撥額(無捨去)</p>
                  <p>• 最終獎金無條件捨去至百位數</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="mt-6 text-center text-sm text-gray-400">
          系統自動生成 | LUCKY POKER
        </div>
      </div>
    </>
  );
}
