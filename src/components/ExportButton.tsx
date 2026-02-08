import { useRef } from 'react';
import html2canvas from 'html2canvas';
import { Player } from '../../constants/pokerConfig';
import { PrizeCalculationResult } from '../../utils/prizeCalculator';

interface ExportButtonProps {
  players: Player[];
  config: { name: string; startChip: number };
  prizeCalculation?: PrizeCalculationResult | null;
  tournamentName?: string; // 完整的賽事名稱（包含場次號碼，如 "600#1"）
}

export default function ExportButton({ players, config, prizeCalculation, tournamentName }: ExportButtonProps) {
  const exportRef = useRef<HTMLDivElement>(null);

  const handleExport = async () => {
    if (!exportRef.current) return;

    try {
      const canvas = await html2canvas(exportRef.current, {
        backgroundColor: '#111827',
        scale: 2,
      });

      const link = document.createElement('a');
      link.download = `${config.name}_結算結存表_${new Date().toISOString().split('T')[0]}.png`;
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

  return (
    <>
      <button
        onClick={handleExport}
        className="w-full sm:w-auto px-4 md:px-6 py-3 bg-white hover:bg-gray-100 rounded-lg text-base md:text-lg font-semibold text-black transition-all duration-200 border-2 border-white"
      >
        📥 導出結算結存表
      </button>

      {/* 隱藏的導出內容 */}
      <div ref={exportRef} className="fixed -left-[9999px] bg-gray-900 text-white p-8 w-[800px]">
        <div className="text-center mb-6">
          <h1 className="text-4xl font-bold mb-2">
            {tournamentName || config.name}
          </h1>
          <p className="text-xl text-gray-400">
            結算結存表 | {new Date().toLocaleDateString('zh-TW')}
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

        <table className="w-full border-collapse mb-6">
          <thead>
            <tr className="bg-gray-800">
              <th className="border border-gray-700 py-3 px-4 text-left">名次</th>
              <th className="border border-gray-700 py-3 px-4 text-left">會編</th>
              <th className="border border-gray-700 py-3 px-4 text-left">買入次數</th>
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
              
              // 奖金显示逻辑：如果有奖金计算结果，显示奖金
              let displayPrize: number | null = null;
              if (prizeCalculation && prizeCalculation.totalPrizePool > 0 && prizeCalculation.playerPrizes.length > 0) {
                // 如果找到该玩家的奖金，显示；否则显示0（表示该玩家没有奖金）
                displayPrize = playerPrize ? playerPrize.prizeAmount : 0;
              }
              
              return (
                <tr key={player.id} className={index % 2 === 0 ? 'bg-gray-800' : 'bg-gray-700'}>
                  <td className="border border-gray-700 py-3 px-4">
                    <span className="font-bold text-yellow-400">第 {displayRank} 名</span>
                  </td>
                  <td className="border border-gray-700 py-3 px-4 font-mono text-xl">{player.memberId}</td>
                  <td className="border border-gray-700 py-3 px-4">{player.buyInCount}</td>
                  <td className="border border-gray-700 py-3 px-4">{player.currentChips.toLocaleString()}</td>
                  <td className="border border-gray-700 py-3 px-4 text-right font-semibold text-green-400">
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
            <h2 className="text-2xl font-bold mb-4 text-center">獎金分配摘要</h2>
            <div className="bg-yellow-600 bg-opacity-20 p-4 rounded-lg mb-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-lg font-semibold">總獎池</span>
                <span className="text-2xl font-bold">NT$ {prizeCalculation.totalPrizePool.toLocaleString()}</span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm mt-3">
                <div>
                  <span className="opacity-90">前三名提撥獎金:</span>
                  <span className="font-semibold ml-2">NT$ {prizeCalculation.topThreeTotal.toLocaleString()}</span>
                </div>
                <div>
                  <span className="opacity-90">剩餘獎池（按籌碼分配）:</span>
                  <span className="font-semibold ml-2">NT$ {prizeCalculation.remainingPrizePool.toLocaleString()}</span>
                </div>
              </div>
              <div className="text-sm opacity-90 mt-2">
                總分配金額: NT$ {prizeCalculation.totalDistributed.toLocaleString()}
                {Math.abs(prizeCalculation.adjustmentAmount) >= 0.01 && (
                  <span className="ml-2">
                    (差額 {prizeCalculation.adjustmentAmount > 0 ? '+' : ''}{prizeCalculation.adjustmentAmount.toLocaleString()} 已調整至第一名)
                  </span>
                )}
              </div>
            </div>
            <div className="bg-blue-600 bg-opacity-20 p-3 rounded-lg mb-4">
              <p className="text-sm mb-2">
                <strong>分配規則：</strong>
              </p>
              <p className="text-sm mb-1">
                1. 從總獎池中提撥前三名獎金（按設定百分比）
              </p>
              <p className="text-sm mb-1">
                2. 剩餘獎池按籌碼占比分配給所有玩家（包括前三名）
              </p>
              <p className="text-sm">
                3. 前三名最終獎金 = 按籌碼占比分配的部分 + 提撥獎金
              </p>
              <p className="text-xs text-gray-300 mt-2">
                • 所有獎金均四捨五入至百位數
              </p>
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
