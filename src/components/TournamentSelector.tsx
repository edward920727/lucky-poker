import { TOURNAMENT_TYPES, TournamentType } from '../../constants/pokerConfig';

interface TournamentSelectorProps {
  onSelect: (type: TournamentType) => void;
  onBack?: () => void;
}

export default function TournamentSelector({ onSelect, onBack }: TournamentSelectorProps) {
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

      {onBack && (
        <button
          onClick={onBack}
          className="absolute top-6 left-6 px-6 py-3 bg-white hover:bg-gray-100 rounded-xl text-lg font-semibold text-black transition-all duration-200 z-10 border-2 border-white shadow-xl flex items-center gap-2"
        >
          <span>←</span>
          <span>返回首頁</span>
        </button>
      )}

      <div className="relative z-10 text-center mb-12">
        <div className="flex items-center justify-center gap-4 mb-4">
          <div className="text-7xl filter drop-shadow-[0_0_15px_rgba(255,215,0,0.8)]">🃏</div>
          <h1 className="text-5xl md:text-7xl font-display font-black text-poker-gold-400 gold-glow">
            LUCKY POKER
          </h1>
          <div className="text-7xl filter drop-shadow-[0_0_15px_rgba(255,215,0,0.8)]">🂮</div>
        </div>
        <p className="text-2xl md:text-3xl text-poker-gold-300 font-body font-light tracking-wider mb-4 drop-shadow-[0_0_10px_rgba(255,215,0,0.6)]">
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
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-poker-gold-400 to-poker-gold-600 flex items-center justify-center border-2 border-poker-gold-300 shadow-lg">
                  <span className="text-2xl font-bold text-white">{type}</span>
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
      </div>
    </div>
  );
}
