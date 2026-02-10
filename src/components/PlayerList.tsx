import { Player, PaymentMethod } from '../../constants/pokerConfig';

interface PlayerListProps {
  players: Player[];
  startChip: number;
  onUpdatePlayer: (id: string, updates: Partial<Player>) => void;
  onRemovePlayer: (id: string) => void;
}

const paymentMethodLabels: Record<PaymentMethod, string> = {
  cash: '現金',
  transfer: '轉帳',
  unpaid: '未付',
};

const paymentMethodColors: Record<PaymentMethod, string> = {
  cash: 'bg-green-600',
  transfer: 'bg-blue-600',
  unpaid: 'bg-red-600',
};

export default function PlayerList({
  players,
  startChip,
  onUpdatePlayer,
  onRemovePlayer,
}: PlayerListProps) {
  const handleBuyIn = (id: string) => {
    const player = players.find(p => p.id === id);
    if (player) {
      onUpdatePlayer(id, {
        buyInCount: player.buyInCount + 1,
        currentChips: player.currentChips + startChip,
      });
    }
  };

  const handleReduceBuyIn = (id: string) => {
    const player = players.find(p => p.id === id);
    if (player && player.buyInCount > 1) {
      onUpdatePlayer(id, {
        buyInCount: player.buyInCount - 1,
        currentChips: Math.max(0, player.currentChips - startChip),
      });
    }
  };

  const handleChipChange = (id: string, value: string) => {
    // 允許空字符串，這樣用戶可以刪除 0
    if (value === '' || value === null || value === undefined) {
      onUpdatePlayer(id, { currentChips: 0 });
      return;
    }
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue >= 0) {
      onUpdatePlayer(id, { currentChips: numValue });
    }
  };

  if (players.length === 0) {
    return (
      <div className="bg-gray-800 rounded-lg p-8 text-center">
        <p className="text-gray-400 text-lg">尚無玩家登記，請使用上方表單新增玩家</p>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-gray-900 via-black to-gray-900 rounded-2xl p-4 md:p-6 border-2 border-poker-gold-600 border-opacity-40 shadow-xl shadow-poker-gold-500/20">
      <div className="flex items-center gap-3 mb-4">
        <div className="text-2xl md:text-3xl">👥</div>
        <h2 className="text-xl md:text-2xl font-display font-bold text-poker-gold-400">玩家列表</h2>
      </div>
      
      {/* 手機版：卡片式佈局 */}
      <div className="md:hidden space-y-3">
        {players.map((player) => (
          <div
            key={player.id}
            className={`bg-gray-800 rounded-xl p-4 border-2 ${
              player.paymentMethod === 'unpaid' 
                ? 'border-red-600 bg-red-900 bg-opacity-40' 
                : 'border-poker-gold-600 border-opacity-30'
            }`}
          >
            <div className="flex justify-between items-start mb-3">
              <div className="font-mono font-bold text-xl text-poker-gold-300">{player.memberId}</div>
              <div className="flex flex-col gap-2 items-end">
                <select
                  value={player.paymentMethod}
                  onChange={(e) => onUpdatePlayer(player.id, { paymentMethod: e.target.value as PaymentMethod })}
                  className={`px-3 py-1.5 rounded-lg text-sm font-semibold text-white ${paymentMethodColors[player.paymentMethod]}`}
                >
                  {(['cash', 'transfer', 'unpaid'] as PaymentMethod[]).map((method) => (
                    <option key={method} value={method} className="bg-gray-800">
                      {paymentMethodLabels[method]}
                    </option>
                  ))}
                </select>
                {/* 折扣券輸入 */}
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    placeholder="折扣券"
                    value={player.couponCode || ''}
                    onChange={(e) => onUpdatePlayer(player.id, { couponCode: e.target.value.trim() || undefined })}
                    className="w-20 px-2 py-1 bg-gray-700 rounded text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-poker-gold-500"
                  />
                  {player.couponCode && (
                    <input
                      type="number"
                      placeholder="折扣"
                      value={player.couponDiscount || ''}
                      onChange={(e) => {
                        const value = e.target.value;
                        const discount = value === '' ? undefined : Math.max(0, parseFloat(value) || 0);
                        onUpdatePlayer(player.id, { couponDiscount: discount });
                      }}
                      onWheel={(e) => e.currentTarget.blur()}
                      className="w-16 px-2 py-1 bg-gray-700 rounded text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-poker-gold-500"
                      min="0"
                    />
                  )}
                </div>
                {player.couponCode && player.couponDiscount && (
                  <div className="text-xs text-yellow-400">
                    🎫 -NT$ {player.couponDiscount.toLocaleString()}
                  </div>
                )}
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-sm">座位號</span>
                <select
                  value={player.seat || ''}
                  onChange={(e) => {
                    const seat = e.target.value === '' ? undefined : parseInt(e.target.value);
                    onUpdatePlayer(player.id, { seat });
                  }}
                  className="px-3 py-2 bg-gray-700 rounded-lg text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-poker-gold-500"
                >
                  <option value="">未設定</option>
                  {Array.from({ length: 10 }, (_, i) => i + 1).map((seatNum) => (
                    <option key={seatNum} value={seatNum} className="bg-gray-800">
                      {seatNum}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-sm">買入次數</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleReduceBuyIn(player.id)}
                    disabled={player.buyInCount <= 1}
                    className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 min-w-[48px]"
                  >
                    ➖
                  </button>
                  <span className="font-semibold text-lg w-8 text-center">{player.buyInCount}</span>
                  <button
                    onClick={() => handleBuyIn(player.id)}
                    className="px-3 py-2 bg-white hover:bg-gray-100 rounded-lg text-sm font-semibold text-black shadow-lg transition-all duration-200 border-2 border-white min-w-[48px]"
                  >
                    ➕
                  </button>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-sm">當前碼量</span>
                <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={player.currentChips || ''}
                      onChange={(e) => handleChipChange(player.id, e.target.value)}
                      onWheel={(e) => e.currentTarget.blur()}
                      className="w-32 px-3 py-2 bg-gray-700 rounded-lg text-right font-semibold"
                      min="0"
                    />
                  <span className="text-gray-400 text-sm">碼</span>
                </div>
              </div>
              
              <button
                onClick={() => onRemovePlayer(player.id)}
                className="w-full px-4 py-2.5 bg-white hover:bg-gray-100 rounded-lg text-sm font-semibold text-black shadow-lg transition-all duration-200 border-2 border-white"
              >
                🗑️ 移除玩家
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* 桌面版：表格佈局 */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full min-w-[600px]">
          <thead>
            <tr className="border-b-2 border-poker-gold-600 border-opacity-50 bg-poker-gold-900 bg-opacity-20">
              <th className="text-left py-4 px-4 font-display font-bold text-poker-gold-300">會編</th>
              <th className="text-left py-4 px-4 font-display font-bold text-poker-gold-300">座位號</th>
              <th className="text-left py-4 px-4 font-display font-bold text-poker-gold-300">買入次數</th>
              <th className="text-left py-4 px-4 font-display font-bold text-poker-gold-300">當前碼量</th>
              <th className="text-left py-4 px-4 font-display font-bold text-poker-gold-300">支付方式</th>
              <th className="text-left py-4 px-4 font-display font-bold text-poker-gold-300">操作</th>
            </tr>
          </thead>
          <tbody>
            {players.map((player) => (
              <tr 
                key={player.id} 
                className={`border-b border-poker-gold-600 border-opacity-20 hover:bg-poker-gold-900 hover:bg-opacity-20 transition-colors ${
                  player.paymentMethod === 'unpaid' ? 'bg-red-900 bg-opacity-40 border-red-600' : ''
                }`}
              >
                <td className="py-4 px-4 font-mono font-semibold text-xl">{player.memberId}</td>
                <td className="py-4 px-4">
                  <select
                    value={player.seat || ''}
                    onChange={(e) => {
                      const seat = e.target.value === '' ? undefined : parseInt(e.target.value);
                      onUpdatePlayer(player.id, { seat });
                    }}
                    className="px-3 py-1 bg-gray-700 rounded text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-poker-gold-500"
                  >
                    <option value="">未設定</option>
                    {Array.from({ length: 10 }, (_, i) => i + 1).map((seatNum) => (
                      <option key={seatNum} value={seatNum} className="bg-gray-800">
                        {seatNum}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="py-4 px-4">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleReduceBuyIn(player.id)}
                      disabled={player.buyInCount <= 1}
                      className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                    >
                      ➖
                    </button>
                    <span className="font-semibold w-8 text-center">{player.buyInCount}</span>
                    <button
                      onClick={() => handleBuyIn(player.id)}
                      className="px-2 py-1 bg-white hover:bg-gray-100 rounded text-sm font-semibold text-black shadow-lg transition-all duration-200 border-2 border-white"
                    >
                      ➕
                    </button>
                  </div>
                </td>
                <td className="py-4 px-4">
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={player.currentChips || ''}
                      onChange={(e) => handleChipChange(player.id, e.target.value)}
                      onWheel={(e) => e.currentTarget.blur()}
                      className="w-32 px-2 py-1 bg-gray-700 rounded text-right"
                      min="0"
                    />
                    <span className="text-gray-400 text-sm">碼</span>
                  </div>
                </td>
                <td className="py-4 px-4">
                  <div className="flex flex-col gap-2">
                    <select
                      value={player.paymentMethod}
                      onChange={(e) => onUpdatePlayer(player.id, { paymentMethod: e.target.value as PaymentMethod })}
                      className={`px-3 py-1 rounded text-sm font-semibold text-white ${paymentMethodColors[player.paymentMethod]}`}
                    >
                      {(['cash', 'transfer', 'unpaid'] as PaymentMethod[]).map((method) => (
                        <option key={method} value={method} className="bg-gray-800">
                          {paymentMethodLabels[method]}
                        </option>
                      ))}
                    </select>
                    {/* 折扣券輸入 */}
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        placeholder="折扣券代碼"
                        value={player.couponCode || ''}
                        onChange={(e) => onUpdatePlayer(player.id, { couponCode: e.target.value.trim() || undefined })}
                        className="flex-1 px-2 py-1 bg-gray-700 rounded text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-poker-gold-500"
                      />
                      {player.couponCode && (
                        <input
                          type="number"
                          placeholder="折扣金額"
                          value={player.couponDiscount || ''}
                          onChange={(e) => {
                            const value = e.target.value;
                            const discount = value === '' ? undefined : Math.max(0, parseFloat(value) || 0);
                            onUpdatePlayer(player.id, { couponDiscount: discount });
                          }}
                          onWheel={(e) => e.currentTarget.blur()}
                          className="w-20 px-2 py-1 bg-gray-700 rounded text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-poker-gold-500"
                          min="0"
                        />
                      )}
                    </div>
                    {player.couponCode && player.couponDiscount && (
                      <div className="text-xs text-yellow-400">
                        🎫 {player.couponCode}: -NT$ {player.couponDiscount.toLocaleString()}
                      </div>
                    )}
                  </div>
                </td>
                <td className="py-4 px-4">
                  <button
                    onClick={() => onRemovePlayer(player.id)}
                    className="px-4 py-2 bg-white hover:bg-gray-100 rounded-lg text-sm font-semibold text-black shadow-lg transition-all duration-200 border-2 border-white"
                  >
                    🗑️ 移除
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
