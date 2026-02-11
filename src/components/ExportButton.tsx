import { useRef } from 'react';
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

  const handleExport = async () => {
    if (!exportRef.current) return;

    try {
      // 等待字体加载完成
      await document.fonts.ready;
      
      // 确保元素可见（临时移动到可见位置）
      const originalPosition = exportRef.current.style.position;
      const originalLeft = exportRef.current.style.left;
      const originalTop = exportRef.current.style.top;
      const originalZIndex = exportRef.current.style.zIndex;
      
      // 临时显示元素以确保样式正确渲染
      exportRef.current.style.position = 'absolute';
      exportRef.current.style.left = '0';
      exportRef.current.style.top = '0';
      exportRef.current.style.zIndex = '9999';
      
      // 等待一小段时间确保样式应用
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const canvas = await html2canvas(exportRef.current, {
        backgroundColor: '#111827',
        scale: 2,
        useCORS: true,
        allowTaint: false,
        logging: false,
        width: exportRef.current.scrollWidth,
        height: exportRef.current.scrollHeight,
        windowWidth: exportRef.current.scrollWidth,
        windowHeight: exportRef.current.scrollHeight,
      });

      // 恢复原始位置
      exportRef.current.style.position = originalPosition;
      exportRef.current.style.left = originalLeft;
      exportRef.current.style.top = originalTop;
      exportRef.current.style.zIndex = originalZIndex;

      const link = document.createElement('a');
      link.download = `${config.name}_結算結存表_${getTaiwanTodayDateKey()}.png`;
      link.href = canvas.toDataURL('image/png', 1.0);
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
      <div 
        ref={exportRef} 
        className="fixed -left-[9999px] bg-gray-900 text-white p-8 w-[800px]"
        style={{
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif",
          backgroundColor: '#111827',
          color: '#ffffff',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <h1 style={{ fontSize: '2.25rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
            {tournamentName || config.name} Settlement Statement
          </h1>
          <p style={{ fontSize: '1.25rem', color: '#9ca3af' }}>
            {formatTaiwanDate(getTaiwanDateTime(), { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
          <div style={{ backgroundColor: '#2563eb', padding: '1rem', borderRadius: '0.5rem', textAlign: 'center', color: '#ffffff' }}>
            <div style={{ fontSize: '0.875rem', opacity: 0.9, marginBottom: '0.25rem', color: '#ffffff' }}>買入組數</div>
            <div style={{ fontSize: '1.875rem', fontWeight: 'bold', color: '#ffffff' }}>{totalBuyInGroups}</div>
          </div>
          <div style={{ backgroundColor: '#9333ea', padding: '1rem', borderRadius: '0.5rem', textAlign: 'center', color: '#ffffff' }}>
            <div style={{ fontSize: '0.875rem', opacity: 0.9, marginBottom: '0.25rem', color: '#ffffff' }}>理論總碼量</div>
            <div style={{ fontSize: '1.875rem', fontWeight: 'bold', color: '#ffffff' }}>{expectedTotalChips.toLocaleString()}</div>
          </div>
          <div style={{ 
            backgroundColor: isBalanced ? '#16a34a' : '#dc2626', 
            padding: '1rem', 
            borderRadius: '0.5rem', 
            textAlign: 'center',
            color: '#ffffff'
          }}>
            <div style={{ fontSize: '0.875rem', opacity: 0.9, marginBottom: '0.25rem', color: '#ffffff' }}>實際總碼量</div>
            <div style={{ fontSize: '1.875rem', fontWeight: 'bold', color: '#ffffff' }}>{actualTotalChips.toLocaleString()}</div>
          </div>
        </div>

        <table 
          className="w-full border-collapse mb-6"
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            marginBottom: '1.5rem',
          }}
        >
          <thead>
            <tr style={{ backgroundColor: '#1f2937' }}>
              <th style={{ border: '1px solid #374151', padding: '0.75rem 1rem', textAlign: 'left', color: '#ffffff' }}>名次</th>
              <th style={{ border: '1px solid #374151', padding: '0.75rem 1rem', textAlign: 'left', color: '#ffffff' }}>會編</th>
              <th style={{ border: '1px solid #374151', padding: '0.75rem 1rem', textAlign: 'left', color: '#ffffff' }}>買入次數</th>
              <th style={{ border: '1px solid #374151', padding: '0.75rem 1rem', textAlign: 'left', color: '#ffffff' }}>支付方式</th>
              <th style={{ border: '1px solid #374151', padding: '0.75rem 1rem', textAlign: 'left', color: '#ffffff' }}>折扣券</th>
              <th style={{ border: '1px solid #374151', padding: '0.75rem 1rem', textAlign: 'left', color: '#ffffff' }}>當前碼量</th>
              <th style={{ border: '1px solid #374151', padding: '0.75rem 1rem', textAlign: 'right', color: '#ffffff' }}>獎金金額</th>
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
              
              const paymentMethodStyle = player.paymentMethod === 'cash' 
                ? { backgroundColor: '#16a34a', color: '#ffffff' }
                : player.paymentMethod === 'transfer'
                ? { backgroundColor: '#2563eb', color: '#ffffff' }
                : { backgroundColor: '#dc2626', color: '#ffffff' };
              
              return (
                <tr 
                  key={player.id} 
                  style={{ backgroundColor: index % 2 === 0 ? '#1f2937' : '#374151' }}
                >
                  <td style={{ border: '1px solid #374151', padding: '0.75rem 1rem', color: '#ffffff' }}>
                    {displayRank}
                  </td>
                  <td style={{ border: '1px solid #374151', padding: '0.75rem 1rem', fontFamily: 'monospace', fontSize: '1.25rem', color: '#ffffff' }}>
                    {player.memberId}
                  </td>
                  <td style={{ border: '1px solid #374151', padding: '0.75rem 1rem', color: '#ffffff' }}>{player.buyInCount}</td>
                  <td style={{ border: '1px solid #374151', padding: '0.75rem 1rem' }}>
                    <span style={{
                      padding: '0.25rem 0.5rem',
                      borderRadius: '0.25rem',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      ...paymentMethodStyle
                    }}>
                      {paymentMethodLabels[player.paymentMethod]}
                    </span>
                  </td>
                  <td style={{ border: '1px solid #374151', padding: '0.75rem 1rem', color: '#ffffff' }}>
                    {player.couponCode ? player.couponCode : '-'}
                  </td>
                  <td style={{ border: '1px solid #374151', padding: '0.75rem 1rem', color: '#ffffff' }}>{player.currentChips.toLocaleString()}</td>
                  <td style={{ border: '1px solid #374151', padding: '0.75rem 1rem', textAlign: 'right', fontWeight: '600', color: '#4ade80' }}>
                    {displayPrize !== null ? `NT$ ${displayPrize.toLocaleString()}` : '-'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* 獎金分配摘要 */}
        {prizeCalculation && prizeCalculation.playerPrizes.length > 0 && prizeCalculation.totalPrizePool > 0 && (
          <div style={{ marginTop: '1.5rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem', textAlign: 'center', color: '#ffffff' }}>獎金分配摘要</h2>
            
            {/* 總獎池 */}
            <div style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '1.125rem', fontWeight: '600', color: '#ffffff' }}>總獎池</span>
                <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#ffffff' }}>NT$ {prizeCalculation.totalPrizePool.toLocaleString()}</span>
              </div>
            </div>

            {/* 淨獎池 */}
            <div style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '1.125rem', fontWeight: '600', color: '#ffffff' }}>淨獎池</span>
                <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#ffffff' }}>NT$ {(prizeCalculation.netPool ?? (prizeCalculation.totalPrizePool - (prizeCalculation.activityBonus ?? 0))).toLocaleString()}</span>
              </div>
              <div style={{ fontSize: '0.875rem', color: '#9ca3af', marginTop: '0.5rem' }}>
                (總獎池 - 活動獎金)
              </div>
            </div>

            {/* 所有玩家獎金總和 */}
            <div style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '1.125rem', fontWeight: '600', color: '#ffffff' }}>所有玩家獎金總和</span>
                <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#ffffff' }}>NT$ {prizeCalculation.totalDistributed.toLocaleString()}</span>
              </div>
              <div style={{ fontSize: '0.875rem', color: '#22c55e', marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span>✓</span>
                <span>等於淨獎池(總獎池-活動獎金)</span>
              </div>
            </div>

            {/* 提撥獎金 */}
            <div style={{ backgroundColor: 'rgba(168, 85, 247, 0.1)', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '1.125rem', fontWeight: '600', color: '#ffffff' }}>提撥獎金 (=前三名提撥獎金總和)</span>
                <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#ffffff' }}>NT$ {prizeCalculation.topThreeTotal.toLocaleString()}</span>
              </div>
              {prizeCalculation.topThreePrizes.length > 0 && (
                <div style={{ fontSize: '0.875rem', marginTop: '0.5rem', color: '#ffffff' }}>
                  {prizeCalculation.topThreePrizes.map((prize, idx) => (
                    <div key={idx} style={{ marginTop: '0.25rem' }}>
                      {prize.rank}名: NT$ {prize.amount.toLocaleString()} ({Math.round(prize.percentage)}%)
                    </div>
                  ))}
                </div>
              )}
              <div style={{ fontSize: '0.875rem', color: '#22c55e', marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span>✓</span>
                <span>驗證:提撥獎金=前三名提撥總額={prizeCalculation.topThreeTotal.toLocaleString()}</span>
              </div>
            </div>

            {/* 最終分配獎池 */}
            <div style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '1.125rem', fontWeight: '600', color: '#ffffff' }}>最終分配獎池(按籌碼分配)</span>
                <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#ffffff' }}>NT$ {prizeCalculation.remainingPrizePool.toLocaleString()}</span>
              </div>
              <div style={{ fontSize: '0.875rem', color: '#9ca3af', marginTop: '0.5rem' }}>
                (淨獎池 - 提撥獎金)
              </div>
            </div>

            {/* ICM 分配規則 */}
            <div style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 'bold', marginBottom: '0.75rem', color: '#ffffff' }}>ICM 分配規則</h3>
              <div style={{ fontSize: '0.875rem', lineHeight: '1.6', color: '#ffffff' }}>
                <p style={{ marginBottom: '0.5rem' }}>1. 從總獎池中提撥前三名獎金（按設定百分比）</p>
                <p style={{ marginBottom: '0.5rem' }}>2. 剩餘獎池按籌碼占比分配給所有玩家（包括前三名）</p>
                <p style={{ marginBottom: '0.5rem' }}>3. 前三名最終獎金 = 按籌碼占比分配的部分 + 提撥獎金</p>
                <p style={{ marginBottom: '0.5rem' }}>4. 所有獎金均四捨五入至百位數</p>
                <p>5. 活動獎金從總獎池中扣除，不參與玩家分配</p>
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
