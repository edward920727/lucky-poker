import { useState } from 'react';
import { Player, PaymentMethod } from '../../constants/pokerConfig';
import { TournamentType } from '../../constants/pokerConfig';

interface FinancialStatsProps {
  players: Player[];
  tournamentType: TournamentType;
}

export default function FinancialStats({ players, tournamentType }: FinancialStatsProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const entryFee = parseInt(tournamentType);
  
  const calculateByPaymentMethod = (method: PaymentMethod) => {
    return players
      .filter(p => p.paymentMethod === method)
      .reduce((sum, p) => sum + (p.buyInCount * entryFee), 0);
  };

  const cashTotal = calculateByPaymentMethod('cash');
  const transferTotal = calculateByPaymentMethod('transfer');
  const unpaidTotal = calculateByPaymentMethod('unpaid');
  const totalExpected = players.reduce((sum, p) => sum + (p.buyInCount * entryFee), 0);
  const totalReceived = cashTotal + transferTotal;

  const unpaidPlayers = players.filter(p => p.paymentMethod === 'unpaid');

  return (
    <div className="bg-gradient-to-br from-gray-900 via-black to-gray-900 rounded-2xl p-4 md:p-6 mb-6 border-2 border-poker-gold-600 border-opacity-40 shadow-xl shadow-poker-gold-500/20">
      {/* 標題區域 - 可點擊展開/收合 */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between gap-3 mb-4 hover:opacity-80 transition-opacity"
      >
        <div className="flex items-center gap-3">
          <div className="text-2xl md:text-3xl">💰</div>
          <h2 className="text-xl md:text-2xl font-display font-bold text-poker-gold-400">財務統計</h2>
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
          {/* 支付方式統計 */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 mb-6">
        <div className="relative bg-gradient-to-br from-green-600 to-green-800 p-4 rounded-xl shadow-xl border-2 border-green-500 border-opacity-50 overflow-hidden group">
          <div className="absolute top-0 right-0 w-20 h-20 bg-white opacity-5 transform rotate-45 translate-x-10 -translate-y-10"></div>
          <div className="relative z-10">
            <p className="text-sm font-semibold text-green-200 mb-1">💵 現金</p>
            <p className="text-2xl font-black text-white">NT$ {cashTotal.toLocaleString()}</p>
          </div>
        </div>
        <div className="relative bg-gradient-to-br from-blue-600 to-blue-800 p-4 rounded-xl shadow-xl border-2 border-blue-500 border-opacity-50 overflow-hidden group">
          <div className="absolute top-0 right-0 w-20 h-20 bg-white opacity-5 transform rotate-45 translate-x-10 -translate-y-10"></div>
          <div className="relative z-10">
            <p className="text-sm font-semibold text-blue-200 mb-1">🏦 轉帳</p>
            <p className="text-2xl font-black text-white">NT$ {transferTotal.toLocaleString()}</p>
          </div>
        </div>
        <div className={`relative p-4 rounded-xl shadow-xl border-2 border-opacity-50 overflow-hidden group ${unpaidTotal > 0 ? 'bg-gradient-to-br from-red-600 to-red-800 border-red-500 animate-pulse' : 'bg-gradient-to-br from-gray-600 to-gray-800 border-gray-500'}`}>
          <div className="absolute top-0 right-0 w-20 h-20 bg-white opacity-5 transform rotate-45 translate-x-10 -translate-y-10"></div>
          <div className="relative z-10">
            <p className="text-sm font-semibold text-white opacity-90 mb-1">⚠️ 未付</p>
            <p className="text-2xl font-black text-white">NT$ {unpaidTotal.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* 總計 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 mb-6">
        <div className="relative bg-gradient-to-br from-gray-700 to-gray-800 p-4 rounded-xl shadow-lg border-2 border-gray-600 overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-white opacity-5 transform rotate-45 translate-x-8 -translate-y-8"></div>
          <div className="relative z-10">
            <p className="text-sm text-gray-300 mb-1 font-semibold">應收總額</p>
            <p className="text-2xl font-black text-white">NT$ {totalExpected.toLocaleString()}</p>
          </div>
        </div>
        <div className={`relative p-4 rounded-xl shadow-lg border-2 border-opacity-50 overflow-hidden ${totalReceived === totalExpected ? 'bg-gradient-to-br from-green-600 to-green-800 border-green-500' : 'bg-gradient-to-br from-yellow-600 to-yellow-800 border-yellow-500'}`}>
          <div className="absolute top-0 right-0 w-16 h-16 bg-white opacity-5 transform rotate-45 translate-x-8 -translate-y-8"></div>
          <div className="relative z-10">
            <p className="text-sm text-white opacity-90 mb-1 font-semibold">實收總額</p>
            <p className="text-2xl font-black text-white">NT$ {totalReceived.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* 未付清列表 */}
      {unpaidPlayers.length > 0 && (
        <div className="bg-gradient-to-r from-red-900 via-red-800 to-red-900 bg-opacity-60 border-2 border-red-600 rounded-xl p-4 shadow-xl">
          <h3 className="text-lg font-display font-bold text-red-300 mb-3 flex items-center gap-2">
            <span className="text-2xl">⚠️</span>
            <span>未付清列表</span>
          </h3>
          <div className="space-y-2">
            {unpaidPlayers.map((player) => (
              <div key={player.id} className="flex justify-between items-center bg-red-800 bg-opacity-70 p-3 rounded-lg border border-red-600 hover:bg-opacity-90 transition-colors">
                <span className="font-mono font-bold text-red-200">會編 {player.memberId}</span>
                <span className="text-red-100 font-semibold">
                  應付: NT$ {(player.buyInCount * entryFee).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
        </div>
      )}
    </div>
  );
}
