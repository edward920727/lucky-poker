interface StatsPanelProps {
  totalBuyInGroups: number;
  expectedTotalChips: number;
  actualTotalChips: number;
  isBalanced: boolean;
}

export default function StatsPanel({
  totalBuyInGroups,
  expectedTotalChips,
  actualTotalChips,
  isBalanced,
}: StatsPanelProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <div className="relative bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 p-6 rounded-2xl shadow-2xl shadow-blue-500/30 border-2 border-blue-500 border-opacity-60 overflow-hidden group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-5 transform rotate-45 translate-x-16 -translate-y-16 group-hover:opacity-10 transition-opacity"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">👥</span>
            <p className="text-sm md:text-base font-semibold text-blue-200">買入組數</p>
          </div>
          <p className="text-4xl md:text-5xl font-black text-white">{totalBuyInGroups}</p>
        </div>
      </div>
      
      <div className="relative bg-gradient-to-br from-purple-900 via-purple-800 to-purple-900 p-6 rounded-2xl shadow-2xl shadow-purple-500/30 border-2 border-purple-500 border-opacity-60 overflow-hidden group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-5 transform rotate-45 translate-x-16 -translate-y-16 group-hover:opacity-10 transition-opacity"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">📊</span>
            <p className="text-sm md:text-base font-semibold text-purple-200">理論總碼量</p>
          </div>
          <p className="text-4xl md:text-5xl font-black text-white">
            {expectedTotalChips.toLocaleString()}
          </p>
        </div>
      </div>

      <div
        className={`relative p-6 rounded-2xl shadow-2xl border-2 border-opacity-60 overflow-hidden group ${
          isBalanced
            ? 'bg-gradient-to-br from-green-900 via-green-800 to-green-900 border-green-500 shadow-green-500/30'
            : 'bg-gradient-to-br from-red-900 via-red-800 to-red-900 border-red-500 shadow-red-500/30 animate-pulse'
        }`}
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-5 transform rotate-45 translate-x-16 -translate-y-16 group-hover:opacity-10 transition-opacity"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">🪙</span>
            <p className="text-sm md:text-base font-semibold text-white opacity-90">實際登記總碼量</p>
          </div>
          <p className="text-4xl md:text-5xl font-black text-white">
            {actualTotalChips.toLocaleString()}
          </p>
          {!isBalanced && (
            <div className="mt-3 text-sm md:text-base font-bold flex items-center gap-2 bg-red-700 bg-opacity-50 px-3 py-1.5 rounded-lg border border-red-400">
              <span className="text-xl">⚠️</span>
              <span>碼量不符，請檢查是否有漏記</span>
            </div>
          )}
          {isBalanced && totalBuyInGroups > 0 && (
            <div className="mt-3 text-sm md:text-base font-bold flex items-center gap-2 bg-green-700 bg-opacity-50 px-3 py-1.5 rounded-lg border border-green-400">
              <span className="text-xl">✓</span>
              <span>碼量平衡</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
