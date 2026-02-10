import { useState } from 'react';
import { TOURNAMENT_TYPES, TournamentType } from '../../constants/pokerConfig';
import { CustomTournamentConfig } from '../../types/tournament';
import CustomTournamentForm from './CustomTournamentForm';

interface TournamentSelectorProps {
  onSelect: (type: TournamentType) => void;
  onCreateCustom?: (config: CustomTournamentConfig) => void;
  onOpenSettlement?: () => void;
  onBack?: () => void;
}

export default function TournamentSelector({ onSelect, onCreateCustom, onOpenSettlement, onBack }: TournamentSelectorProps) {
  const [showCustomForm, setShowCustomForm] = useState(false);

  if (showCustomForm && onCreateCustom) {
    return (
      <CustomTournamentForm
        onSubmit={(config) => {
          onCreateCustom(config);
        }}
        onCancel={() => setShowCustomForm(false)}
      />
    );
  }
  return (
    <div className="min-h-screen p-6 flex flex-col items-center justify-center relative overflow-hidden bg-black">
      {/* 背景装饰 - 黑色筹码带金色发光 */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-20 left-20 w-24 h-24 chip-float chip-glow opacity-25">
          <div className="chip w-24 h-24 rounded-full"></div>
        </div>
        <div className="absolute bottom-32 right-32 w-20 h-20 chip-float chip-glow opacity-20" style={{ animationDelay: '1s' }}>
          <div className="chip w-20 h-20 rounded-full"></div>
        </div>
        <div className="absolute top-1/2 left-10 w-28 h-28 chip-float chip-glow opacity-18">
          <div className="chip w-28 h-28 rounded-full"></div>
        </div>
        <div className="absolute top-1/3 right-20 w-22 h-22 chip-float chip-glow opacity-15" style={{ animationDelay: '1.5s' }}>
          <div className="chip w-22 h-22 rounded-full"></div>
        </div>
        <div className="absolute bottom-20 left-1/3 w-26 h-26 chip-float chip-glow opacity-12" style={{ animationDelay: '2s' }}>
          <div className="chip w-26 h-26 rounded-full"></div>
        </div>
      </div>

      <div className="absolute top-4 md:top-6 left-4 md:left-6 right-4 md:right-6 flex justify-between items-start z-20">
        {onBack && (
          <button
            onClick={onBack}
            className="px-4 md:px-6 py-2 md:py-3 bg-white hover:bg-gray-100 rounded-xl text-sm md:text-lg font-semibold text-black transition-all duration-200 border-2 border-white shadow-xl flex items-center gap-1 md:gap-2"
          >
            <span>←</span>
            <span className="hidden sm:inline">返回首頁</span>
            <span className="sm:hidden">返回</span>
          </button>
        )}
        {onOpenSettlement && (
          <button
            onClick={onOpenSettlement}
            className="px-4 md:px-6 py-2 md:py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-xl text-sm md:text-base font-semibold transition-all duration-200 border-2 border-green-400 shadow-lg flex items-center gap-2"
          >
            <span>⚙️</span>
            <span className="hidden sm:inline">行政費設定</span>
            <span className="sm:hidden">設定</span>
          </button>
        )}
      </div>

      <div className="relative z-10 text-center mb-8 md:mb-12 pt-16 md:pt-0 px-4">
        <div className="flex items-center justify-center gap-2 md:gap-4 mb-4">
          <div className="text-4xl md:text-7xl filter drop-shadow-[0_0_15px_rgba(255,215,0,0.8)]">🃏</div>
          <h1 className="text-3xl md:text-7xl font-display font-black text-poker-gold-400 gold-glow">
            LUCKY POKER
          </h1>
          <div className="text-4xl md:text-7xl filter drop-shadow-[0_0_15px_rgba(255,215,0,0.8)]">🂮</div>
        </div>
        <p className="text-xl md:text-3xl text-poker-gold-300 font-body font-light tracking-wider mb-4 drop-shadow-[0_0_10px_rgba(255,215,0,0.6)]">
          選擇賽事類型
        </p>
        <div className="flex items-center justify-center gap-3">
          <div className="w-20 h-1 bg-gradient-to-r from-transparent via-poker-gold-500 to-transparent"></div>
          <div className="text-poker-gold-400 text-2xl filter drop-shadow-[0_0_10px_rgba(255,215,0,0.8)]">♠ ♥ ♦ ♣</div>
          <div className="w-20 h-1 bg-gradient-to-r from-transparent via-poker-gold-500 to-transparent"></div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 w-full max-w-5xl relative z-10 px-4">
        {Object.entries(TOURNAMENT_TYPES).map(([type, config], index) => (
          <button
            key={type}
            onClick={() => onSelect(type as TournamentType)}
            className="group relative bg-white hover:bg-gray-100 rounded-2xl p-6 md:p-8 shadow-2xl shadow-white/20 hover:shadow-white/50 transform hover:scale-105 transition-all duration-300 text-left border-2 border-white overflow-hidden min-h-[140px]"
          >
            {/* 背景光效 */}
            <div className="absolute inset-0 bg-gradient-to-br from-poker-gold-500/0 via-poker-gold-500/20 to-poker-gold-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            
            {/* 扑克牌装饰 */}
            <div className="absolute top-4 right-4 text-6xl opacity-10 group-hover:opacity-20 transition-opacity">
              {index % 4 === 0 ? '🃏' : index % 4 === 1 ? '🂮' : index % 4 === 2 ? '🂭' : '🂫'}
            </div>

            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <div className={`rounded-full bg-gradient-to-br from-poker-gold-400 to-poker-gold-600 flex items-center justify-center border-2 border-poker-gold-300 shadow-lg ${
                  type.length <= 3 ? 'w-12 h-12' : 
                  type.length === 4 ? 'w-14 h-14' : 
                  'w-16 h-16'
                }`}>
                  <span className={`font-bold text-white ${
                    type.length <= 3 ? 'text-2xl' : 
                    type.length === 4 ? 'text-xl' : 
                    'text-lg'
                  }`}>{type}</span>
                </div>
                <div className="text-3xl md:text-4xl font-display font-bold text-black group-hover:text-gray-800 transition-colors">
                  {config.name}
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl">💰</span>
                  <div>
                    <p className="text-xs text-gray-600">參賽費</p>
                    <p className="text-lg font-semibold text-black">NT$ {type}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xl">🪙</span>
                  <div>
                    <p className="text-xs text-gray-600">起始碼</p>
                    <p className="text-lg font-semibold text-black">{config.startChip.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              {/* 悬停时的光效 */}
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-poker-gold-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            </div>
          </button>
        ))}
        
        {/* 創建新賽事按鈕 */}
        {onCreateCustom && (
          <button
            onClick={() => setShowCustomForm(true)}
            className="group relative bg-gradient-to-br from-poker-gold-400 to-poker-gold-600 hover:from-poker-gold-500 hover:to-poker-gold-700 rounded-2xl p-6 md:p-8 shadow-2xl shadow-poker-gold-500/30 hover:shadow-poker-gold-500/50 transform hover:scale-105 transition-all duration-300 text-left border-2 border-poker-gold-300 overflow-hidden min-h-[140px]"
          >
            {/* 背景光效 */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/0 via-white/10 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            
            {/* 装饰图标 */}
            <div className="absolute top-4 right-4 text-6xl opacity-20 group-hover:opacity-30 transition-opacity">
              ✨
            </div>

            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center border-2 border-white/50 shadow-lg">
                  <span className="text-2xl font-bold text-white">+</span>
                </div>
                <div className="text-3xl md:text-4xl font-display font-bold text-white group-hover:text-poker-gold-100 transition-colors">
                  創建新賽事
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl">📝</span>
                  <div>
                    <p className="text-xs text-white/80">自定義</p>
                    <p className="text-lg font-semibold text-white">比賽名稱、買入金額、行政費用</p>
                  </div>
                </div>
              </div>

              {/* 悬停时的光效 */}
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-white to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            </div>
          </button>
        )}
      </div>
    </div>
  );
}
