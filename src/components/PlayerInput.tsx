import { useState } from 'react';
import { TournamentType, PaymentMethod } from '../../constants/pokerConfig';
import VirtualKeyboard from './VirtualKeyboard';
import PlayerHistoryModal from './PlayerHistoryModal';
import { PLAYER_HISTORY_DB } from '../../constants/pokerConfig';

interface PlayerInputProps {
  onAddPlayer: (memberId: string, paymentMethod: PaymentMethod) => void;
  tournamentType: TournamentType;
}

export default function PlayerInput({ onAddPlayer }: PlayerInputProps) {
  const [memberId, setMemberId] = useState('');
  const [showKeyboard, setShowKeyboard] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [historyData, setHistoryData] = useState<any>(null);

  const handleMemberIdChange = (value: string) => {
    setMemberId(value);
    // 當輸入會編時，檢查是否有歷史紀錄
    if (value && PLAYER_HISTORY_DB[value]) {
      const history = PLAYER_HISTORY_DB[value];
      setHistoryData({ memberId: value, history });
      setShowHistory(true);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberId.trim()) {
      alert('請輸入會編');
      return;
    }
    // 新增玩家時使用默認支付方式 'cash'，之後可在玩家列表中調整
    onAddPlayer(memberId.trim(), 'cash');
    setMemberId('');
    setShowKeyboard(false);
  };

  return (
    <div className="bg-gradient-to-br from-gray-900 via-black to-gray-900 rounded-2xl p-6 mb-6 border-2 border-poker-gold-600 border-opacity-40 shadow-xl shadow-poker-gold-500/20">
      <div className="flex items-center gap-3 mb-4">
        <div className="text-3xl">➕</div>
        <h2 className="text-2xl font-display font-bold text-poker-gold-400">新增玩家</h2>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">會編</label>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={memberId}
            onChange={(e) => {
              // 只允許數字輸入
              const value = e.target.value.replace(/[^0-9]/g, '');
              handleMemberIdChange(value);
            }}
            onFocus={() => {
              // 只在移動設備上顯示虛擬鍵盤
              if (window.matchMedia('(max-width: 768px)').matches || 'ontouchstart' in window) {
                setShowKeyboard(true);
              }
            }}
            placeholder="輸入會編（數字）"
            className="w-full px-4 py-3 bg-gray-700 rounded-lg text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-400 mt-2">
            💡 提示：支付方式可在玩家列表中調整
          </p>
        </div>
        <button
          type="submit"
          className="group relative w-full py-4 bg-white hover:bg-gray-100 rounded-xl text-lg font-bold text-black transition-all duration-300 shadow-xl hover:shadow-2xl border-2 border-white overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-gray-200 to-transparent opacity-0 group-hover:opacity-30 transform -skew-x-12 group-hover:translate-x-full transition-all duration-1000"></div>
          <span className="relative z-10 flex items-center justify-center gap-2">
            <span className="text-xl">🃏</span>
            <span>新增玩家</span>
          </span>
        </button>
      </form>

      {showKeyboard && (
        <VirtualKeyboard
          value={memberId}
          onChange={handleMemberIdChange}
          onClose={() => setShowKeyboard(false)}
        />
      )}

      {showHistory && historyData && (
        <PlayerHistoryModal
          memberId={historyData.memberId}
          history={historyData.history}
          onClose={() => setShowHistory(false)}
        />
      )}
    </div>
  );
}
