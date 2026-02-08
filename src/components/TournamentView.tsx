import { useEffect, useState, useMemo } from 'react';
import { TournamentRecord } from '../../types/tournament';
import { getTournamentById, updateTournament } from '../../utils/storage';
import { TOURNAMENT_TYPES, Player, PaymentMethod, PLAYER_HISTORY_DB } from '../../constants/pokerConfig';
import StatsPanel from './StatsPanel';
import ExportButton from './ExportButton';
import PlayerList from './PlayerList';
import { logAction } from '../../utils/auditLog';
import VirtualKeyboard from './VirtualKeyboard';
import { calculatePrize, PrizeCalculationResult } from '../../utils/prizeCalculator';

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

interface TournamentViewProps {
  tournamentId: string;
  onBack: () => void;
}

export default function TournamentView({ tournamentId, onBack }: TournamentViewProps) {
  const [tournament, setTournament] = useState<TournamentRecord | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedPlayers, setEditedPlayers] = useState<Player[]>([]);
  const [newMemberId, setNewMemberId] = useState('');
  const [showKeyboard, setShowKeyboard] = useState(false);

  useEffect(() => {
    const record = getTournamentById(tournamentId);
    if (record) {
      setTournament(record);
      setEditedPlayers(JSON.parse(JSON.stringify(record.players))); // 深拷貝
    }
  }, [tournamentId]);

  // 當 tournament 變化時，同步更新 editedPlayers
  useEffect(() => {
    if (tournament && !isEditMode) {
      setEditedPlayers(JSON.parse(JSON.stringify(tournament.players)));
    }
  }, [tournament, isEditMode]);

  // 計算 displayPlayers（必須在所有 Hooks 中，在任何條件返回之前）
  const displayPlayers = tournament 
    ? (isEditMode ? editedPlayers : tournament.players)
    : [];

  // 計算獎金分配（使用賽事記錄中的總買入金額作為獎池）
  // 注意：只在非編輯模式下計算，編輯模式下不計算獎金
  // 必須在所有 Hooks 中，在任何條件返回之前
  const prizeCalculation: PrizeCalculationResult | null = useMemo(() => {
    // 編輯模式下不計算獎金
    if (isEditMode) return null;
    
    if (!tournament || displayPlayers.length === 0) return null;
    
    // 使用賽事記錄中的 totalBuyIn 作為總獎池
    const totalPrizePool = tournament.totalBuyIn || 0;
    
    // 如果沒有獎池，返回 null
    if (totalPrizePool <= 0) return null;
    
    // 使用默認的前三名百分比 [15%, 10%, 5%]
    const topThreePercentages: [number, number, number] = [15, 10, 5];
    
    try {
      // 計算獎金分配
      return calculatePrize(totalPrizePool, topThreePercentages, displayPlayers);
    } catch (error) {
      console.error('計算獎金時發生錯誤:', error);
      return null;
    }
  }, [tournament, displayPlayers, isEditMode]);

  const handleSave = () => {
    if (!tournament) return;

    const updatedTournament: TournamentRecord = {
      ...tournament,
      players: editedPlayers,
    };

    updateTournament(updatedTournament);
    setTournament(updatedTournament);
    setIsEditMode(false);
    alert('賽事記錄已更新！');
  };

  const handleCancel = () => {
    if (tournament) {
      setEditedPlayers(JSON.parse(JSON.stringify(tournament.players))); // 深拷貝
    }
    setIsEditMode(false);
  };

  const handleEditMode = () => {
    if (!tournament) {
      console.error('無法進入編輯模式：tournament 為 null');
      return;
    }
    
    try {
      // 確保 editedPlayers 是最新的
      const players = tournament.players || [];
      const playersCopy = players.length > 0 
        ? JSON.parse(JSON.stringify(players)) // 深拷貝
        : [];
      console.log('進入編輯模式，players:', playersCopy);
      setEditedPlayers(playersCopy);
      setIsEditMode(true);
    } catch (error) {
      console.error('進入編輯模式時發生錯誤:', error);
      alert('進入編輯模式失敗，請重新整理頁面後再試');
    }
  };

  const handleUpdatePlayer = (id: string, updates: Partial<Player>) => {
    const player = editedPlayers.find(p => p.id === id);
    if (!player) return;

    // 记录操作日志
    if (updates.currentChips !== undefined && updates.currentChips !== player.currentChips) {
      logAction('chip_change', player.memberId, undefined, 'currentChips', player.currentChips, updates.currentChips);
    }
    if (updates.buyInCount !== undefined && updates.buyInCount !== player.buyInCount) {
      logAction('buyin', player.memberId, undefined, 'buyInCount', player.buyInCount, updates.buyInCount);
    }
    if (updates.paymentMethod !== undefined && updates.paymentMethod !== player.paymentMethod) {
      logAction('update', player.memberId, undefined, 'paymentMethod', player.paymentMethod, updates.paymentMethod);
    }

    setEditedPlayers(
      editedPlayers.map(p => p.id === id ? { ...p, ...updates } : p)
    );
  };

  const handleRemovePlayer = (id: string) => {
    const player = editedPlayers.find(p => p.id === id);
    if (player) {
      logAction('delete', player.memberId);
    }
    setEditedPlayers(editedPlayers.filter(p => p.id !== id));
  };

  const handleAddPlayer = () => {
    if (!tournament) return;
    
    if (!newMemberId.trim()) {
      alert('請輸入會編');
      return;
    }

    // 檢查是否已存在
    if (editedPlayers.some(p => p.memberId === newMemberId.trim())) {
      alert('該會編已存在！');
      return;
    }

    const config = TOURNAMENT_TYPES[tournament.tournamentType];
    const history = PLAYER_HISTORY_DB[newMemberId.trim()] || [];
    const newPlayer: Player = {
      id: Date.now().toString(),
      memberId: newMemberId.trim(),
      buyInCount: 1,
      currentChips: config.startChip,
      paymentMethod: 'cash',
      history,
    };

    logAction('create', newPlayer.memberId);
    setEditedPlayers([...editedPlayers, newPlayer]);
    setNewMemberId('');
    setShowKeyboard(false);
  };

  // 安全計算統計數據，避免空數組錯誤（必須在所有 Hooks 中）
  const totalBuyInGroups = displayPlayers.length > 0 
    ? displayPlayers.reduce((sum, p) => sum + (p.buyInCount || 0), 0)
    : 0;
  
  const expectedTotalChips = tournament 
    ? totalBuyInGroups * tournament.startChip 
    : 0;
  
  const actualTotalChips = displayPlayers.length > 0
    ? displayPlayers.reduce((sum, p) => sum + (p.currentChips || 0), 0)
    : 0;
  
  const isBalanced = expectedTotalChips === actualTotalChips;

  // 條件返回必須在所有 Hooks 之後
  if (!tournament) {
    return (
      <div className="min-h-screen p-4 md:p-6 bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl mb-4">找不到賽事記錄</p>
          <button
            onClick={onBack}
            className="px-6 py-3 bg-white hover:bg-gray-100 text-black rounded-lg border-2 border-white transition-all duration-200"
          >
            返回首頁
          </button>
        </div>
      </div>
    );
  }

  const config = TOURNAMENT_TYPES[tournament.tournamentType];

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen p-4 md:p-6 bg-gray-900 text-white relative z-10">
      <div className="max-w-7xl mx-auto relative z-10">
        {/* 標題列 */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 relative z-10">
          <div className="relative z-10">
            <button
              onClick={onBack}
              className="mb-4 md:mb-0 px-6 py-3 bg-white hover:bg-gray-100 text-black rounded-lg text-lg font-semibold transition-all duration-200 border-2 border-white relative z-10"
            >
              ← 返回首頁
            </button>
            <h1 className="text-3xl md:text-4xl font-bold mt-2">
              {tournament.tournamentName}
            </h1>
            <p className="text-gray-400 mt-1">
              日期: {formatDate(tournament.date)} | 參賽費: NT$ {tournament.tournamentType}
            </p>
            <p className="text-gray-400 mt-1">
              起始碼量: {tournament.startChip.toLocaleString()}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto relative z-10">
            {!isEditMode ? (
              <>
                <button
                  onClick={handleEditMode}
                  className="px-4 md:px-6 py-2 md:py-3 bg-poker-gold-600 hover:bg-poker-gold-700 text-white rounded-xl text-sm md:text-base font-semibold transition-all duration-200 border-2 border-poker-gold-500 shadow-lg flex items-center justify-center gap-2 relative z-10 cursor-pointer"
                >
                  <span>✏️</span>
                  <span>修改賽事</span>
                </button>
                <div className="w-full sm:w-auto">
                  <ExportButton 
                    players={tournament.players} 
                    config={config}
                    prizeCalculation={prizeCalculation}
                    tournamentName={tournament.tournamentName}
                  />
                </div>
              </>
            ) : (
              <>
                <button
                  onClick={handleSave}
                  className="px-4 md:px-6 py-2 md:py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm md:text-base font-semibold transition-all duration-200 border-2 border-green-500 shadow-lg flex items-center justify-center gap-2 relative z-10 cursor-pointer"
                >
                  <span>💾</span>
                  <span>保存修改</span>
                </button>
                <button
                  onClick={handleCancel}
                  className="px-4 md:px-6 py-2 md:py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-xl text-sm md:text-base font-semibold transition-all duration-200 border-2 border-gray-500 shadow-lg flex items-center justify-center gap-2 relative z-10 cursor-pointer"
                >
                  <span>✕</span>
                  <span>取消</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* 統計面板 */}
        <div className="relative z-10">
          <StatsPanel
            totalBuyInGroups={totalBuyInGroups}
            expectedTotalChips={expectedTotalChips}
            actualTotalChips={actualTotalChips}
            isBalanced={isBalanced}
          />
        </div>

        {/* 玩家列表 */}
        <div className="relative z-10">
          {isEditMode ? (
            <>
              {/* 新增玩家區域 */}
              <div className="bg-gradient-to-br from-gray-900 via-black to-gray-900 rounded-2xl p-4 md:p-6 mb-4 border-2 border-poker-gold-600 border-opacity-40 shadow-xl shadow-poker-gold-500/20">
                <div className="flex items-center gap-3 mb-4">
                  <div className="text-2xl md:text-3xl">➕</div>
                  <h2 className="text-xl md:text-2xl font-display font-bold text-poker-gold-400">新增玩家</h2>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={newMemberId}
                    onChange={(e) => {
                      // 只允許數字輸入
                      const value = e.target.value.replace(/[^0-9]/g, '');
                      setNewMemberId(value);
                    }}
                    onFocus={() => {
                      // 只在移動設備上顯示虛擬鍵盤
                      if (window.matchMedia('(max-width: 768px)').matches || 'ontouchstart' in window) {
                        setShowKeyboard(true);
                      }
                    }}
                    placeholder="輸入會編（數字）"
                    className="flex-1 px-4 py-3 bg-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={handleAddPlayer}
                    className="px-6 py-3 bg-white hover:bg-gray-100 rounded-lg text-base font-semibold text-black transition-all duration-200 border-2 border-white shadow-lg flex items-center justify-center gap-2"
                  >
                    <span>➕</span>
                    <span>新增</span>
                  </button>
                </div>
              </div>

              {/* 玩家列表 */}
              {editedPlayers.length > 0 ? (
                <PlayerList
                  players={editedPlayers}
                  startChip={tournament.startChip}
                  onUpdatePlayer={handleUpdatePlayer}
                  onRemovePlayer={handleRemovePlayer}
                />
              ) : (
                <div className="bg-gray-800 rounded-lg p-4 md:p-6">
                  <h2 className="text-xl md:text-2xl font-bold mb-4">玩家列表</h2>
                  <p className="text-gray-400 text-center py-8">此賽事尚無玩家記錄，請使用上方表單新增玩家</p>
                </div>
              )}
            </>
          ) : (
          <div className="bg-gray-800 rounded-lg p-4 md:p-6">
            <h2 className="text-xl md:text-2xl font-bold mb-4">玩家列表</h2>
            
            {/* 手機版：卡片式佈局 */}
            <div className="md:hidden space-y-3">
              {displayPlayers.map((player) => (
                <div 
                  key={player.id} 
                  className={`bg-gray-700 rounded-lg p-4 border-2 ${
                    player.paymentMethod === 'unpaid' 
                      ? 'border-red-600 bg-red-900 bg-opacity-40' 
                      : 'border-gray-600'
                  }`}
                >
                  <div className="font-mono font-bold text-lg text-poker-gold-300 mb-2">{player.memberId}</div>
                  <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                    <div>
                      <span className="text-gray-400">買入次數：</span>
                      <span className="font-semibold">{player.buyInCount}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">當前碼量：</span>
                      <span className="font-semibold">{player.currentChips.toLocaleString()}</span>
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-400 text-sm">支付方式：</span>
                    <span className={`ml-2 px-3 py-1 rounded-lg text-sm font-semibold text-white ${paymentMethodColors[player.paymentMethod]}`}>
                      {paymentMethodLabels[player.paymentMethod]}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            
            {/* 桌面版：表格佈局 */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full min-w-[500px]">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left py-3 px-4">會編</th>
                    <th className="text-left py-3 px-4">買入次數</th>
                    <th className="text-left py-3 px-4">當前碼量</th>
                    <th className="text-left py-3 px-4">支付方式</th>
                  </tr>
                </thead>
                <tbody>
                  {displayPlayers.map((player) => (
                    <tr 
                      key={player.id} 
                      className={`border-b border-gray-700 hover:bg-gray-700 ${
                        player.paymentMethod === 'unpaid' ? 'bg-red-900 bg-opacity-20' : ''
                      }`}
                    >
                      <td className="py-4 px-4 font-mono font-semibold text-xl">{player.memberId}</td>
                      <td className="py-4 px-4">{player.buyInCount}</td>
                      <td className="py-4 px-4">{player.currentChips.toLocaleString()}</td>
                      <td className="py-4 px-4">
                        <span className={`px-3 py-1 rounded-lg text-sm font-semibold text-white ${paymentMethodColors[player.paymentMethod]}`}>
                          {paymentMethodLabels[player.paymentMethod]}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          )}
        </div>
      </div>

      {/* 虛擬鍵盤 */}
      {showKeyboard && (
        <VirtualKeyboard
          value={newMemberId}
          onChange={setNewMemberId}
          onClose={() => setShowKeyboard(false)}
        />
      )}
    </div>
  );
}
