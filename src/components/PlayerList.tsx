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
  points: '點數',
  unpaid: '未付',
};

const paymentMethodColors: Record<PaymentMethod, string> = {
  cash: 'bg-green-600',
  transfer: 'bg-blue-600',
  points: 'bg-purple-600',
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

  const handleChipChange = (id: string, newChips: number) => {
    if (newChips < 0) return;
    onUpdatePlayer(id, { currentChips: newChips });
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
              <select
                value={player.paymentMethod}
                onChange={(e) => onUpdatePlayer(player.id, { paymentMethod: e.target.value as PaymentMethod })}
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold text-white ${paymentMethodColors[player.paymentMethod]}`}
              >
                {(['cash', 'transfer', 'points', 'unpaid'] as PaymentMethod[]).map((method) => (
                  <option key={method} value={method} className="bg-gray-800">
                    {paymentMethodLabels[method]}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-sm">買入次數</span>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-lg">{player.buyInCount}</span>
                  <button
                    onClick={() => handleBuyIn(player.id)}
                    className="px-4 py-2 bg-white hover:bg-gray-100 rounded-lg text-sm font-semibold text-black shadow-lg transition-all duration-200 border-2 border-white min-w-[60px]"
                  >
                    ➕ +1
                  </button>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-sm">當前碼量</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={player.currentChips}
                    onChange={(e) => handleChipChange(player.id, parseInt(e.target.value) || 0)}
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
                  <div className="flex items-center gap-2">
                    <span>{player.buyInCount}</span>
                    <button
                      onClick={() => handleBuyIn(player.id)}
                      className="px-3 py-1 bg-white hover:bg-gray-100 rounded-lg text-sm font-semibold text-black shadow-lg transition-all duration-200 border-2 border-white"
                    >
                      ➕ +1
                    </button>
                  </div>
                </td>
                <td className="py-4 px-4">
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={player.currentChips}
                      onChange={(e) => handleChipChange(player.id, parseInt(e.target.value) || 0)}
                      className="w-32 px-2 py-1 bg-gray-700 rounded text-right"
                      min="0"
                    />
                    <span className="text-gray-400 text-sm">碼</span>
                  </div>
                </td>
                <td className="py-4 px-4">
                  <select
                    value={player.paymentMethod}
                    onChange={(e) => onUpdatePlayer(player.id, { paymentMethod: e.target.value as PaymentMethod })}
                    className={`px-3 py-1 rounded text-sm font-semibold text-white ${paymentMethodColors[player.paymentMethod]}`}
                  >
                    {(['cash', 'transfer', 'points', 'unpaid'] as PaymentMethod[]).map((method) => (
                      <option key={method} value={method} className="bg-gray-800">
                        {paymentMethodLabels[method]}
                      </option>
                    ))}
                  </select>
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
