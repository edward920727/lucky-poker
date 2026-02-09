import { useState } from 'react';
import { Player } from '../../constants/pokerConfig';
import { PrizeCalculationResult } from '../../utils/prizeCalculator';

interface QuickEditPlayerListProps {
  players: Player[];
  startChip: number;
  onUpdatePlayer: (id: string, updates: Partial<Player>) => void;
  prizeCalculation: PrizeCalculationResult | null;
}

export default function QuickEditPlayerList({
  players,
  startChip,
  onUpdatePlayer,
  prizeCalculation,
}: QuickEditPlayerListProps) {
  const [focusedInput, setFocusedInput] = useState<string | null>(null);
  // 本地輸入值狀態（用於即時顯示，不觸發保存）
  const [localValues, setLocalValues] = useState<Record<string, string>>({});

  // 處理籌碼輸入（失去焦點即保存）
  const handleChipBlur = (playerId: string, value: string) => {
    setFocusedInput(null);
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue >= 0) {
      onUpdatePlayer(playerId, { currentChips: numValue });
      // 清除本地值，使用保存後的值
      const newLocalValues = { ...localValues };
      delete newLocalValues[playerId];
      setLocalValues(newLocalValues);
    } else if (value === '' || value === null || value === undefined) {
      // 允許清空，設為 0
      onUpdatePlayer(playerId, { currentChips: 0 });
      const newLocalValues = { ...localValues };
      delete newLocalValues[playerId];
      setLocalValues(newLocalValues);
    }
  };

  // 處理輸入變化（實時更新顯示，但不保存）
  const handleChipChange = (playerId: string, value: string) => {
    // 只更新本地顯示值，不觸發保存
    setLocalValues(prev => ({
      ...prev,
      [playerId]: value,
    }));
  };

  // 獲取玩家的獎金
  const getPlayerPrize = (memberId: string): number => {
    if (!prizeCalculation) return 0;
    const prize = prizeCalculation.playerPrizes.find(p => p.memberId === memberId);
    return prize ? prize.prizeAmount : 0;
  };

  // 獲取玩家的排名
  const getPlayerRank = (memberId: string): number | null => {
    if (!prizeCalculation) return null;
    const prize = prizeCalculation.playerPrizes.find(p => p.memberId === memberId);
    return prize ? prize.rank : null;
  };

  if (players.length === 0) {
    return (
      <div className="bg-gray-800 rounded-lg p-8 text-center">
        <p className="text-gray-400 text-lg">尚無玩家登記</p>
      </div>
    );
  }

  // 按籌碼排序（從高到低）
  const sortedPlayers = [...players].sort((a, b) => b.currentChips - a.currentChips);

  return (
    <div className="bg-gradient-to-br from-gray-900 via-black to-gray-900 rounded-2xl p-4 md:p-6 border-2 border-poker-gold-600 border-opacity-40 shadow-xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="text-2xl md:text-3xl">⚡</div>
        <h2 className="text-xl md:text-2xl font-display font-bold text-poker-gold-400">快速更碼</h2>
        <div className="ml-auto text-sm text-gray-400">
          {players.length} 位玩家
        </div>
      </div>

      <div className="space-y-3">
        {sortedPlayers.map((player, index) => {
          const rank = getPlayerRank(player.memberId);
          const prize = getPlayerPrize(player.memberId);
          const isTopThree = rank !== null && rank <= 3;

          return (
            <div
              key={player.id}
              className={`bg-gray-800 rounded-xl p-4 border-2 transition-all ${
                isTopThree
                  ? 'border-poker-gold-500 bg-poker-gold-900 bg-opacity-20'
                  : 'border-poker-gold-600 border-opacity-30'
              } ${
                focusedInput === player.id
                  ? 'ring-2 ring-poker-gold-500 ring-opacity-50'
                  : ''
              }`}
            >
              <div className="flex items-center gap-3 mb-3">
                {/* 排名標記 */}
                {rank !== null && rank <= 3 && (
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${
                    rank === 1 ? 'bg-yellow-500 text-black' :
                    rank === 2 ? 'bg-gray-400 text-black' :
                    'bg-orange-600 text-white'
                  }`}>
                    {rank}
                  </div>
                )}
                {(!rank || rank > 3) && (
                  <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 bg-gray-700 text-gray-400">
                    {index + 1}
                  </div>
                )}
                
                {/* 會編 */}
                <div className="font-mono font-bold text-lg text-poker-gold-300 flex-shrink-0">
                  會編 {player.memberId}
                </div>

                {/* 買入次數 */}
                <div className="ml-auto flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs text-gray-400">買入</span>
                  <span className="font-semibold">{player.buyInCount}</span>
                </div>
              </div>

              {/* 籌碼輸入框（大號，觸發數字鍵盤） */}
              <div className="mb-3">
                <label className="block text-sm text-gray-400 mb-2">當前碼量</label>
                <input
                  type="number"
                  inputMode="numeric"
                  value={localValues[player.id] !== undefined ? localValues[player.id] : (player.currentChips || 0)}
                  onFocus={() => setFocusedInput(player.id)}
                  onBlur={(e) => handleChipBlur(player.id, e.target.value)}
                  onChange={(e) => handleChipChange(player.id, e.target.value)}
                  className="w-full px-4 py-4 bg-gray-700 rounded-xl text-right text-2xl font-bold text-white focus:outline-none focus:ring-2 focus:ring-poker-gold-500 focus:ring-opacity-50"
                  placeholder="0"
                  min="0"
                  step="100"
                />
              </div>

              {/* 即時獎金顯示 */}
              {prize > 0 && (
                <div className="flex items-center justify-between pt-2 border-t border-gray-700">
                  <span className="text-sm text-gray-400">預計獎金</span>
                  <span className="text-lg font-black text-poker-gold-400">
                    NT$ {prize.toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 提示文字 */}
      <div className="mt-4 text-center text-xs text-gray-500">
        💡 點擊碼量輸入框即可修改，失去焦點自動保存
      </div>
    </div>
  );
}
