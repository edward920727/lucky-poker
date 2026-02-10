import { useState, useEffect, useMemo, useCallback } from 'react';
import { TournamentRecord } from '../../types/tournament';
import { Player } from '../../constants/pokerConfig';
import { getTournamentById, updateTournament } from '../../utils/storage';
import { calculateICMPrize, PrizeCalculationResult } from '../../utils/prizeCalculator';
import { getICMRewardStructure, getAdministrativeFee } from '../../constants/icmRewardConfig';
import { TOURNAMENT_TYPES } from '../../constants/pokerConfig';
import QuickEditPlayerList from './QuickEditPlayerList';

interface QuickEditViewProps {
  tournamentId: string;
  onBack: () => void;
}

export default function QuickEditView({ tournamentId, onBack }: QuickEditViewProps) {
  const [tournament, setTournament] = useState<TournamentRecord | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // 載入賽事數據的函數（集中處理，比對是否需要更新）
  const loadTournamentData = useCallback(() => {
    const record = getTournamentById(tournamentId);
    if (record) {
      // 比較玩家列表是否有變化
      const currentPlayerIds = new Set(record.players?.map(p => p.id) || []);
      const existingPlayerIds = new Set(players.map(p => p.id));
      const hasPlayerChange = 
        currentPlayerIds.size !== existingPlayerIds.size ||
        [...currentPlayerIds].some(id => !existingPlayerIds.has(id)) ||
        [...existingPlayerIds].some(id => !currentPlayerIds.has(id));
      
      // 如果有變化，更新狀態
      if (hasPlayerChange || !tournament || tournament.id !== record.id) {
        setTournament(record);
        setPlayers(JSON.parse(JSON.stringify(record.players || []))); // 深拷貝
      } else {
        // 即使沒有玩家變化，也要更新 tournament 對象（可能其他字段有變化）
        setTournament(record);
      }
    }
  }, [tournamentId, players, tournament]);

  // 初始載入和監聽數據變化
  useEffect(() => {
    // 立即載入一次（使用集中處理函數）
    loadTournamentData();

    // 監聽 localStorage 變化（跨標籤頁同步）
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'lucky_poker_tournaments' && e.newValue) {
        // 重新載入數據
        setTimeout(() => {
          loadTournamentData();
        }, 100); // 稍微延遲，確保數據已寫入
      }
    };

    window.addEventListener('storage', handleStorageChange);

    // 監聽自定義事件（用於同一個標籤頁內的更新）
    const handleTournamentUpdate = (e: CustomEvent) => {
      if (e.detail?.tournamentId === tournamentId) {
        setTimeout(() => {
          loadTournamentData();
        }, 100);
      }
    };

    window.addEventListener('tournament-updated' as any, handleTournamentUpdate);

    // 定期檢查數據是否有更新（用於同一個標籤頁內的更新）
    const intervalId = setInterval(() => {
      loadTournamentData();
    }, 500); // 每 500ms 檢查一次

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('tournament-updated' as any, handleTournamentUpdate);
      clearInterval(intervalId);
    };
  }, [tournamentId, loadTournamentData]);

  // 計算 entryFee
  const entryFee = useMemo(() => {
    if (!tournament) return 0;
    if (tournament.tournamentType === 'custom' && tournament.customConfig) {
      return tournament.customConfig.entryFee;
    }
    return parseInt(tournament.tournamentType);
  }, [tournament]);

  // 自動保存函數（防抖）
  const autoSave = useCallback(
    (updatedPlayers: Player[]) => {
      if (!tournament) return;

      // 計算新的財務數據
      const totalBuyInGroups = updatedPlayers.reduce((sum, p) => sum + p.buyInCount, 0);
      const totalBuyIn = updatedPlayers.reduce((sum, p) => sum + (p.buyInCount * entryFee), 0);
      
      const administrativeFeePerPerson = tournament.administrativeFee || 
        (tournament.tournamentType === 'custom' && tournament.customConfig?.administrativeFee) ||
        getAdministrativeFee(entryFee);
      const totalAdministrativeFee = administrativeFeePerPerson * totalBuyInGroups;
      
      // 獲取提撥金
      const totalDeduction = tournament.totalDeduction ||
        (tournament.tournamentType === 'custom' && tournament.customConfig?.totalDeduction) ||
        (tournament.tournamentType && getICMRewardStructure(parseInt(tournament.tournamentType))?.totalDeduction) ||
        0;

      // 計算總獎池
      const totalPrizePool = (entryFee - administrativeFeePerPerson) * totalBuyInGroups - totalDeduction;

      // 構建更新對象，只包含有效的字段
      const updatedTournament: TournamentRecord = {
        ...tournament,
        players: updatedPlayers,
        totalPlayers: totalBuyInGroups,
        totalBuyIn,
        totalAdministrativeFee,
        totalPrizePool,
        // 如果是自定義賽事，更新 customConfig
        customConfig: tournament.customConfig ? {
          ...tournament.customConfig,
          ...(totalDeduction > 0 ? { totalDeduction } : {}),
        } : undefined,
      };
      
      // 只在 totalDeduction > 0 時添加該字段
      if (totalDeduction > 0) {
        updatedTournament.totalDeduction = totalDeduction;
      } else {
        // 明確刪除該字段（如果存在）
        delete (updatedTournament as any).totalDeduction;
      }

      setIsSaving(true);
      updateTournament(updatedTournament);
      setTournament(updatedTournament);
      setLastSaved(new Date());
      
      // 模擬保存延遲（實際上是同步的，但給用戶反饋）
      setTimeout(() => {
        setIsSaving(false);
      }, 300);
    },
    [tournament, entryFee]
  );

  // 更新玩家籌碼（自動保存）
  const handlePlayerUpdate = useCallback((id: string, updates: Partial<Player>) => {
    setPlayers(prevPlayers => {
      const updatedPlayers = prevPlayers.map(p => 
        p.id === id ? { ...p, ...updates } : p
      );
      // 異步保存，避免阻塞 UI
      setTimeout(() => autoSave(updatedPlayers), 0);
      return updatedPlayers;
    });
  }, [autoSave]);

  // 計算獎金分配（即時更新）
  const prizeCalculation: PrizeCalculationResult | null = useMemo(() => {
    if (!tournament || players.length === 0) return null;
    
    const totalGroups = tournament.totalPlayers || players.reduce((sum, p) => sum + p.buyInCount, 0);
    
    if (tournament.tournamentType === 'custom' && tournament.customConfig) {
      const customConfig = tournament.customConfig;
      if (customConfig.totalDeduction && customConfig.topThreeSplit) {
        try {
          return calculateICMPrize(
            {
              entryFee: customConfig.entryFee,
              administrativeFee: customConfig.administrativeFee,
              totalGroups,
              totalDeduction: customConfig.totalDeduction,
              topThreeSplit: customConfig.topThreeSplit,
            },
            players
          );
        } catch (error) {
          console.error('計算ICM獎金時發生錯誤:', error);
          return null;
        }
      }
    } else if (tournament.tournamentType) {
      const entryFeeNum = parseInt(tournament.tournamentType);
      const administrativeFee = tournament.administrativeFee || getAdministrativeFee(entryFeeNum);
      const icmStructure = getICMRewardStructure(entryFeeNum);
      
      if (icmStructure) {
        try {
          return calculateICMPrize(
            {
              entryFee: entryFeeNum,
              administrativeFee,
              totalGroups,
              totalDeduction: icmStructure.totalDeduction,
              topThreeSplit: icmStructure.topThreeSplit,
            },
            players
          );
        } catch (error) {
          console.error('計算ICM獎金時發生錯誤:', error);
          return null;
        }
      }
    }
    
    return null;
  }, [tournament, players]);

  if (!tournament) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-gray-400">載入中...</p>
        </div>
      </div>
    );
  }

  const config = tournament.tournamentType === 'custom' && tournament.customConfig
    ? { name: tournament.customConfig.name, startChip: tournament.customConfig.startChip }
    : TOURNAMENT_TYPES[tournament.tournamentType as keyof typeof TOURNAMENT_TYPES];

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* 頂部標題欄 */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-display font-bold text-poker-gold-400 mb-1">
              ⚡ 快速結算/更碼
            </h1>
            <p className="text-sm text-gray-400">{config?.name || '賽事'}</p>
          </div>
          <div className="text-right">
            {isSaving && (
              <div className="text-xs text-yellow-400 mb-1">💾 保存中...</div>
            )}
            {lastSaved && !isSaving && (
              <div className="text-xs text-green-400 mb-1">
                ✓ {lastSaved.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })}
              </div>
            )}
          </div>
        </div>

        {/* 玩家列表（快速編輯模式） */}
        <QuickEditPlayerList
          players={players}
          onUpdatePlayer={handlePlayerUpdate}
          prizeCalculation={prizeCalculation}
        />

        {/* 獎金預覽（僅顯示前三名） */}
        {prizeCalculation && prizeCalculation.playerPrizes.length > 0 && (
          <div className="mt-6 bg-gradient-to-br from-gray-900 via-black to-gray-900 rounded-2xl p-4 md:p-6 border-2 border-poker-gold-600 border-opacity-40 shadow-xl">
            <h2 className="text-xl font-display font-bold text-poker-gold-400 mb-4 flex items-center gap-2">
              <span>💰</span>
              <span>即時獎金預覽</span>
            </h2>
            <div className="space-y-3">
              {prizeCalculation.playerPrizes.slice(0, 3).map((prize, index) => (
                <div
                  key={prize.memberId}
                  className="bg-gray-800 rounded-xl p-4 border-2 border-poker-gold-600 border-opacity-30"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
                        index === 0 ? 'bg-yellow-500 text-black' :
                        index === 1 ? 'bg-gray-400 text-black' :
                        'bg-orange-600 text-white'
                      }`}>
                        {index + 1}
                      </div>
                      <div>
                        <div className="font-mono font-bold text-lg text-poker-gold-300">
                          會編 {prize.memberId}
                        </div>
                        <div className="text-sm text-gray-400">
                          {prize.chips.toLocaleString()} 碼 ({prize.chipPercentage.toFixed(1)}%)
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-black text-poker-gold-400">
                        NT$ {prize.prizeAmount.toLocaleString()}
                      </div>
                      {prize.topThreeBonus > 0 && (
                        <div className="text-xs text-yellow-400 mt-1">
                          +保底 {prize.topThreeBonus.toLocaleString()}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {prizeCalculation.playerPrizes.length > 3 && (
              <div className="mt-4 text-center text-sm text-gray-400">
                還有 {prizeCalculation.playerPrizes.length - 3} 位玩家進圈
              </div>
            )}
          </div>
        )}

        {/* 底部完成按鈕 */}
        <div className="fixed bottom-0 left-0 right-0 bg-black border-t-2 border-poker-gold-600 border-opacity-50 p-4 z-50">
          <button
            onClick={onBack}
            className="w-full bg-poker-gold-600 hover:bg-poker-gold-700 text-white font-bold py-4 px-6 rounded-xl text-lg shadow-xl transition-all duration-200 border-2 border-poker-gold-500"
          >
            ✓ 完成並關閉
          </button>
        </div>
      </div>
    </div>
  );
}
