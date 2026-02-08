import { useState } from 'react';
import { TournamentType, Player, TOURNAMENT_TYPES, PLAYER_HISTORY_DB, PaymentMethod } from '../../constants/pokerConfig';
import PlayerList from './PlayerList';
import StatsPanel from './StatsPanel';
import PlayerInput from './PlayerInput';
import ExportButton from './ExportButton';
import PrizePoolCalculator from './PrizePoolCalculator';
import FinancialStats from './FinancialStats';
import { saveTournament } from '../../utils/storage';
import { TournamentRecord } from '../../types/tournament';
import { logAction } from '../../utils/auditLog';
import { PrizeCalculationResult } from '../../utils/prizeCalculator';

interface TournamentDashboardProps {
  tournamentType: TournamentType;
  players: Player[];
  onPlayersChange: (players: Player[]) => void;
  onBack: () => void;
  onSave?: () => void;
}

export default function TournamentDashboard({
  tournamentType,
  players,
  onPlayersChange,
  onBack,
  onSave,
}: TournamentDashboardProps) {
  const config = TOURNAMENT_TYPES[tournamentType];
  const totalPlayers = players.length;
  const expectedTotalChips = totalPlayers * config.startChip;
  const actualTotalChips = players.reduce((sum, p) => sum + p.currentChips, 0);
  const isBalanced = expectedTotalChips === actualTotalChips;
  const [prizeCalculation, setPrizeCalculation] = useState<PrizeCalculationResult | null>(null);

  const handleAddPlayer = (memberId: string, paymentMethod: PaymentMethod) => {
    // 檢查是否已存在
    if (players.some(p => p.memberId === memberId)) {
      alert('該會編已存在！');
      return;
    }

    const history = PLAYER_HISTORY_DB[memberId] || [];
    const newPlayer: Player = {
      id: Date.now().toString(),
      memberId,
      buyInCount: 1,
      currentChips: config.startChip,
      paymentMethod,
      history,
    };

    onPlayersChange([...players, newPlayer]);
    logAction('create', memberId, '系统');
  };

  const handleUpdatePlayer = (id: string, updates: Partial<Player>) => {
    const player = players.find(p => p.id === id);
    if (!player) return;

    // 记录操作日志
    if (updates.currentChips !== undefined && updates.currentChips !== player.currentChips) {
      logAction('chip_change', player.memberId, '系统', 'currentChips', player.currentChips, updates.currentChips);
    }
    if (updates.buyInCount !== undefined && updates.buyInCount !== player.buyInCount) {
      logAction('buyin', player.memberId, '系统', 'buyInCount', player.buyInCount, updates.buyInCount);
    }
    if (updates.paymentMethod !== undefined && updates.paymentMethod !== player.paymentMethod) {
      logAction('update', player.memberId, '系统', 'paymentMethod', player.paymentMethod, updates.paymentMethod);
    }

    onPlayersChange(
      players.map(p => p.id === id ? { ...p, ...updates } : p)
    );
  };

  const handleRemovePlayer = (id: string) => {
    const player = players.find(p => p.id === id);
    if (player) {
      logAction('delete', player.memberId, '系统');
    }
    onPlayersChange(players.filter(p => p.id !== id));
  };

  const handleSaveTournament = () => {
    if (players.length === 0) {
      alert('請至少新增一名玩家');
      return;
    }

    if (!isBalanced) {
      if (!confirm('碼量不平衡，確定要保存嗎？')) {
        return;
      }
    }

    const totalBuyIn = players.reduce((sum, p) => {
      const entryFee = parseInt(tournamentType);
      return sum + (p.buyInCount * entryFee);
    }, 0);

    const tournamentRecord: TournamentRecord = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      tournamentType,
      tournamentName: config.name,
      totalPlayers: players.length,
      totalBuyIn,
      players: [...players], // 深拷贝玩家数据
      expectedTotalChips,
      actualTotalChips,
      startChip: config.startChip,
    };

    saveTournament(tournamentRecord);
    alert('賽事記錄已保存！');
    if (onSave) {
      onSave();
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-6 text-white relative bg-black">
      {/* 背景装饰 - 黑色筹码带金色发光 */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-32 right-20 w-16 h-16 chip-float chip-glow opacity-20">
          <div className="chip w-16 h-16 rounded-full"></div>
        </div>
        <div className="absolute bottom-40 left-16 w-20 h-20 chip-float chip-glow opacity-15" style={{ animationDelay: '2s' }}>
          <div className="chip w-20 h-20 rounded-full"></div>
        </div>
        <div className="absolute top-1/2 left-20 w-18 h-18 chip-float chip-glow opacity-12" style={{ animationDelay: '1s' }}>
          <div className="chip w-18 h-18 rounded-full"></div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        {/* 標題列 */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <div>
            <button
              onClick={onBack}
              className="mb-4 md:mb-0 px-6 py-3 bg-white hover:bg-gray-100 rounded-xl text-lg font-semibold text-black transition-all duration-200 border-2 border-white shadow-lg flex items-center gap-2"
            >
              <span>←</span>
              <span>返回選擇賽事</span>
            </button>
            <div className="mt-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="text-4xl">🃏</div>
                <h1 className="text-3xl md:text-5xl font-display font-black text-poker-gold-400 gold-glow">
                  {config.name}
                </h1>
              </div>
              <div className="flex items-center gap-4 mt-2">
                <div className="flex items-center gap-2 bg-poker-gold-900 bg-opacity-50 px-4 py-2 rounded-lg border border-poker-gold-600">
                  <span className="text-lg">🪙</span>
                  <span className="text-poker-gold-300 font-semibold">起始碼: {config.startChip.toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-2 bg-poker-gold-900 bg-opacity-50 px-4 py-2 rounded-lg border border-poker-gold-600">
                  <span className="text-lg">💰</span>
                  <span className="text-poker-gold-300 font-semibold">參賽費: NT$ {tournamentType}</span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex flex-col md:flex-row gap-3">
            <button
              onClick={handleSaveTournament}
              className="group relative px-6 py-3 bg-white hover:bg-gray-100 rounded-xl text-lg font-semibold text-black transition-all duration-300 mb-4 md:mb-0 border-2 border-white shadow-xl hover:shadow-2xl overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-gray-200 to-transparent opacity-0 group-hover:opacity-30 transform -skew-x-12 group-hover:translate-x-full transition-all duration-1000"></div>
              <span className="relative z-10 flex items-center gap-2">
                <span>💾</span>
                <span>保存賽事記錄</span>
              </span>
            </button>
            <ExportButton 
              players={players} 
              config={config}
              prizeCalculation={prizeCalculation}
            />
          </div>
        </div>

        {/* 統計面板 */}
        <StatsPanel
          totalPlayers={totalPlayers}
          expectedTotalChips={expectedTotalChips}
          actualTotalChips={actualTotalChips}
          isBalanced={isBalanced}
        />

        {/* 財務統計 */}
        <FinancialStats players={players} tournamentType={tournamentType} />

        {/* 獎金分配計算器 */}
        <PrizePoolCalculator players={players} onCalculationChange={setPrizeCalculation} />

        {/* 玩家輸入區域 */}
        <PlayerInput
          onAddPlayer={handleAddPlayer}
          tournamentType={tournamentType}
        />

        {/* 玩家列表 */}
        <PlayerList
          players={players}
          startChip={config.startChip}
          onUpdatePlayer={handleUpdatePlayer}
          onRemovePlayer={handleRemovePlayer}
        />
      </div>
    </div>
  );
}
