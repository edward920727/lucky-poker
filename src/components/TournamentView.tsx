import { useEffect, useState, useMemo } from 'react';
import { TournamentRecord } from '../../types/tournament';
import { getTournamentById, updateTournament } from '../../utils/storage';
import { TOURNAMENT_TYPES, Player, PaymentMethod, PLAYER_HISTORY_DB } from '../../constants/pokerConfig';
import StatsPanel from './StatsPanel';
import ExportButton from './ExportButton';
import PlayerList from './PlayerList';
import { logAction } from '../../utils/auditLog';
import VirtualKeyboard from './VirtualKeyboard';
import { calculateICMPrize, PrizeCalculationResult } from '../../utils/prizeCalculator';
import { getICMRewardStructure } from '../../constants/icmRewardConfig';
import { getAdministrativeFee } from '../../utils/administrativeFeeConfig';
import { formatTaiwanDate, formatTaiwanTime } from '../utils/dateUtils';
import { checkIPAuthorization } from '../../utils/systemSecurity';

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

interface PaymentMethodStatsProps {
  players: Player[];
  entryFee: number;
}

// 支付方式統計組件（定義在文件頂部，確保作用域正確）
function PaymentMethodStats({ players, entryFee }: PaymentMethodStatsProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const calculateByPaymentMethod = (method: PaymentMethod) => {
    return players
      .filter(p => p.paymentMethod === method)
      .reduce((sum, p) => {
        // 計算該玩家的實際支付金額 = (買入次數 × 報名費) - 折扣券折扣
        const totalAmount = p.buyInCount * entryFee;
        const discount = p.couponDiscount || 0;
        return sum + (totalAmount - discount);
      }, 0);
  };

  const cashTotal = calculateByPaymentMethod('cash');
  const transferTotal = calculateByPaymentMethod('transfer');
  const unpaidTotal = calculateByPaymentMethod('unpaid');
  const totalExpected = players.reduce((sum, p) => sum + (p.buyInCount * entryFee), 0);
  const totalReceived = cashTotal + transferTotal;

  return (
    <div className="mb-4">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between gap-3 mb-2 hover:opacity-80 transition-opacity"
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">💳</span>
          <span className="text-base font-semibold text-poker-gold-300">支付方式統計</span>
        </div>
        <svg
          className={`w-5 h-5 text-poker-gold-400 transition-transform duration-300 ${isExpanded ? 'transform rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      {isExpanded && (
        <div className="animate-fadeIn space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="bg-gradient-to-br from-green-600 to-green-800 p-3 rounded-xl border-2 border-green-500 border-opacity-50">
              <p className="text-sm font-semibold text-green-200 mb-1">💵 現金</p>
              <p className="text-xl font-black text-white">NT$ {cashTotal.toLocaleString()}</p>
            </div>
            <div className="bg-gradient-to-br from-blue-600 to-blue-800 p-3 rounded-xl border-2 border-blue-500 border-opacity-50">
              <p className="text-sm font-semibold text-blue-200 mb-1">🏦 轉帳</p>
              <p className="text-xl font-black text-white">NT$ {transferTotal.toLocaleString()}</p>
            </div>
            <div className={`p-3 rounded-xl border-2 border-opacity-50 ${unpaidTotal > 0 ? 'bg-gradient-to-br from-red-600 to-red-800 border-red-500 animate-pulse' : 'bg-gradient-to-br from-gray-600 to-gray-800 border-gray-500'}`}>
              <p className="text-sm font-semibold text-white opacity-90 mb-1">⚠️ 未付</p>
              <p className="text-xl font-black text-white">NT$ {unpaidTotal.toLocaleString()}</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-gray-700 p-3 rounded-xl border border-gray-600">
              <p className="text-sm text-gray-300 mb-1 font-semibold">應收總額（已扣除折扣券）</p>
              <p className="text-xl font-black text-white">NT$ {totalExpected.toLocaleString()}</p>
            </div>
            <div className={`p-3 rounded-xl border-2 border-opacity-50 ${totalReceived === totalExpected ? 'bg-gradient-to-br from-green-600 to-green-800 border-green-500' : 'bg-gradient-to-br from-yellow-600 to-yellow-800 border-yellow-500'}`}>
              <p className="text-sm text-white opacity-90 mb-1 font-semibold">實收總額</p>
              <p className="text-xl font-black text-white">NT$ {totalReceived.toLocaleString()}</p>
            </div>
          </div>
          {players.some(p => p.couponCode && p.couponDiscount) && (
            <div className="bg-yellow-900 bg-opacity-30 p-3 rounded-xl border border-yellow-600 border-opacity-50">
              <p className="text-sm text-yellow-300 mb-1 font-semibold">🎫 折扣券總折扣</p>
              <p className="text-xl font-black text-yellow-400">
                -NT$ {players.reduce((sum, p) => sum + (p.couponDiscount || 0), 0).toLocaleString()}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

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
  const [editedTotalDeduction, setEditedTotalDeduction] = useState<string>('');
  const [editedActivityBonus, setEditedActivityBonus] = useState<string>('');
  const [isAdjustingPrizes, setIsAdjustingPrizes] = useState(false);
  const [adjustedPrizes, setAdjustedPrizes] = useState<Record<string, number>>({});

  useEffect(() => {
    const record = getTournamentById(tournamentId);
    if (record) {
      setTournament(record);
      setEditedPlayers(JSON.parse(JSON.stringify(record.players))); // 深拷貝
      // 初始化提撥金編輯值（整場固定一次）
      if (record.customConfig?.totalDeduction !== undefined) {
        setEditedTotalDeduction(record.customConfig.totalDeduction.toString());
      } else if (record.totalDeduction !== undefined) {
        setEditedTotalDeduction(record.totalDeduction.toString());
      } else {
        setEditedTotalDeduction('');
      }

      // 初始化活動獎金編輯值
      if (record.customConfig?.activityBonus !== undefined) {
        setEditedActivityBonus(record.customConfig.activityBonus.toString());
      } else if (record.activityBonus !== undefined) {
        setEditedActivityBonus(record.activityBonus.toString());
      } else {
        setEditedActivityBonus('');
      }

      // 如果有已保存的調整獎金，載入它
      if (record.adjustedPrizes) {
        setAdjustedPrizes(record.adjustedPrizes);
      }
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

  // 計算 entryFee（用於支付方式統計）
  const entryFee = useMemo(() => {
    if (!tournament) return 0;
    if (tournament.tournamentType === 'custom' && tournament.customConfig) {
      return tournament.customConfig.entryFee || 0;
    }
    return parseInt(tournament.tournamentType);
  }, [tournament]);

  // 計算獎金分配（使用賽事記錄中的總買入金額作為獎池）
  // 注意：只在非編輯模式下計算，編輯模式下不計算獎金
  // 必須在所有 Hooks 中，在任何條件返回之前
  const prizeCalculation: PrizeCalculationResult | null = useMemo(() => {
    // 編輯模式下不計算獎金
    if (isEditMode) return null;
    
    if (!tournament || displayPlayers.length === 0) return null;
    
    // 所有賽事都使用新的ICM計算邏輯
    const totalGroups = tournament.totalPlayers || displayPlayers.reduce((sum, p) => sum + p.buyInCount, 0);
    
    if (tournament.tournamentType === 'custom' && tournament.customConfig) {
      // 自定義賽事
      const customConfig = tournament.customConfig;
      if (customConfig.totalDeduction && customConfig.topThreeSplit) {
        try {
          return calculateICMPrize(
            {
              entryFee: customConfig.entryFee,
              administrativeFee: customConfig.administrativeFee,
              totalGroups,
              totalDeduction: customConfig.totalDeduction,
              activityBonus: customConfig.activityBonus || 0,
              topThreeSplit: customConfig.topThreeSplit,
            },
            displayPlayers
          );
        } catch (error) {
          console.error('計算ICM獎金時發生錯誤:', error);
          return null;
        }
      }
    } else if (tournament.tournamentType) {
      // 標準賽事，從ICM配置中獲取參數
      const entryFee = parseInt(tournament.tournamentType);
      const administrativeFee = tournament.administrativeFee || getAdministrativeFee(entryFee);
      const icmStructure = getICMRewardStructure(entryFee);
      
      if (icmStructure) {
        try {
          return calculateICMPrize(
            {
              entryFee,
              administrativeFee,
              totalGroups,
              totalDeduction: icmStructure.totalDeduction,
              activityBonus: tournament.activityBonus || icmStructure.activityBonus || 0,
              topThreeSplit: icmStructure.topThreeSplit,
            },
            displayPlayers
          );
        } catch (error) {
          console.error('計算ICM獎金時發生錯誤:', error);
          return null;
        }
      }
    }
    
    return null;
  }, [tournament, displayPlayers, isEditMode]);

  // 檢查是否有獎金調整（必須在 prizeCalculation 定義之後）
  const hasPrizeAdjustments = useMemo(() => {
    if (!prizeCalculation || !isAdjustingPrizes) return false;
    return Object.keys(adjustedPrizes).length > 0 && 
      prizeCalculation.playerPrizes.some(p => {
        const adjusted = adjustedPrizes[p.memberId];
        return adjusted !== undefined && adjusted !== p.prizeAmount;
      });
  }, [adjustedPrizes, prizeCalculation, isAdjustingPrizes]);

  const handleSave = async () => {
    if (!tournament) return;

    // 檢查 IP 授權
    const ipCheck = await checkIPAuthorization();
    if (!ipCheck.authorized) {
      alert(ipCheck.message || '非授權網路，禁止修改');
      return;
    }

    // 計算新的提撥金和獎池
    const totalDeductionNum = editedTotalDeduction ? parseInt(editedTotalDeduction) : 0;
    const activityBonusNum = editedActivityBonus ? parseInt(editedActivityBonus) : 0;
    const totalBuyInGroups = editedPlayers.reduce((sum, p) => sum + p.buyInCount, 0);
    // 單次總提撥是整場固定一次，不是每組的
    const totalDeduction = totalDeductionNum;
    
    // 重新計算總獎池
    const entryFee = tournament.tournamentType === 'custom' && tournament.customConfig
      ? (tournament.customConfig.entryFee || 0)
      : parseInt(tournament.tournamentType);
    const totalBuyIn = editedPlayers.reduce((sum, p) => {
      return sum + (p.buyInCount * entryFee);
    }, 0);
    
    const administrativeFeePerPerson = tournament.administrativeFee || 0;
    const totalAdministrativeFee = administrativeFeePerPerson * totalBuyInGroups;
    
    // 第一步：總獎金池 = (單組報名費 - 行政費) × 總組數
    const rawTotalPrizePool = (entryFee - administrativeFeePerPerson) * totalBuyInGroups;
    // 財務資訊的總獎池 = 總獎金池 - 活動獎金（不扣提撥）
    const totalPrizePool = rawTotalPrizePool - activityBonusNum;

    // 構建更新對象，只包含有效的字段
    const updatedTournament: TournamentRecord = {
      ...tournament,
      players: editedPlayers,
      totalPlayers: totalBuyInGroups,
      totalBuyIn,
      totalAdministrativeFee,
      totalPrizePool,
      activityBonus: activityBonusNum > 0 ? activityBonusNum : undefined,
      // 如果是自定義賽事，更新 customConfig 中的提撥金
      customConfig: tournament.customConfig ? {
        ...tournament.customConfig,
        ...(totalDeduction > 0 ? { totalDeduction } : {}),
        ...(activityBonusNum > 0 ? { activityBonus: activityBonusNum } : {}),
      } : undefined,
    };
    
    // 只在 totalDeduction > 0 時添加該字段
    if (totalDeduction > 0) {
      updatedTournament.totalDeduction = totalDeduction;
    } else {
      // 明確刪除該字段（如果存在）
      delete (updatedTournament as any).totalDeduction;
    }

    updateTournament(updatedTournament);
    setTournament(updatedTournament);
    setIsEditMode(false);
    alert('賽事記錄已更新！');
  };

  const handleCancel = () => {
    if (tournament) {
      setEditedPlayers(JSON.parse(JSON.stringify(tournament.players))); // 深拷貝
      // 重置提撥金編輯值
      if (tournament.customConfig?.totalDeduction !== undefined) {
        setEditedTotalDeduction(tournament.customConfig?.totalDeduction.toString() || '');
      } else if (tournament.totalDeduction !== undefined) {
        setEditedTotalDeduction(tournament.totalDeduction.toString());
      } else {
        setEditedTotalDeduction('');
      }

      // 重置活動獎金編輯值
      if (tournament.customConfig && tournament.customConfig.activityBonus !== undefined) {
        setEditedActivityBonus(tournament.customConfig.activityBonus.toString() || '');
      } else if (tournament.activityBonus !== undefined) {
        setEditedActivityBonus(tournament.activityBonus.toString());
      } else {
        setEditedActivityBonus('');
      }
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
      setEditedPlayers(playersCopy);
      setIsEditMode(true);
    } catch (error) {
      console.error('進入編輯模式時發生錯誤:', error);
      alert('進入編輯模式失敗，請重新整理頁面後再試');
    }
  };

  const handleUpdatePlayer = async (id: string, updates: Partial<Player>) => {
    const player = editedPlayers.find(p => p.id === id);
    if (!player) return;

    // 如果修改筹码或买入次数，检查 IP 授权
    if ((updates.currentChips !== undefined && updates.currentChips !== player.currentChips) ||
        (updates.buyInCount !== undefined && updates.buyInCount !== player.buyInCount)) {
      const ipCheck = await checkIPAuthorization();
      if (!ipCheck.authorized) {
        alert(ipCheck.message || '非授權網路，禁止修改');
        return;
      }
    }

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

    const isCustom = tournament.tournamentType === 'custom' && tournament.customConfig;
    const customConfig = tournament.customConfig;
    const config = isCustom && customConfig
      ? { name: customConfig.name || '', startChip: customConfig.startChip || 0 }
      : TOURNAMENT_TYPES[tournament.tournamentType as keyof typeof TOURNAMENT_TYPES];
    if (!config) {
      alert('無法獲取賽事配置');
      return;
    }
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

  const isCustom = tournament.tournamentType === 'custom' && tournament.customConfig;
  const customConfig = tournament.customConfig;
  const config = isCustom && customConfig
    ? { name: customConfig.name || '', startChip: customConfig.startChip || 0 }
    : TOURNAMENT_TYPES[tournament.tournamentType as keyof typeof TOURNAMENT_TYPES];
  if (!config) {
    return (
      <div className="min-h-screen p-4 md:p-6 bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl mb-4">無法獲取賽事配置</p>
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

  const formatDate = (dateString: string) => {
    const dateStr = formatTaiwanDate(dateString, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const timeStr = formatTaiwanTime(dateString, {
      hour: '2-digit',
      minute: '2-digit',
    });
    return `${dateStr} ${timeStr}`;
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
              日期: {formatDate(tournament.date)} | 參賽費: NT$ {entryFee.toLocaleString()}
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
                {prizeCalculation && prizeCalculation.playerPrizes.length > 0 && !isAdjustingPrizes && (
                  <button
                    onClick={() => {
                      // 打開調整界面
                      setIsAdjustingPrizes(true);
                      
                      // 初始化 adjustedPrizes
                      if (prizeCalculation) {
                        // 如果有已保存的調整獎金，使用它；否則從計算結果初始化
                        if (tournament?.adjustedPrizes && Object.keys(tournament.adjustedPrizes).length > 0) {
                          setAdjustedPrizes(tournament.adjustedPrizes);
                        } else {
                          // 從計算結果初始化
                          const initialPrizes: Record<string, number> = {};
                          prizeCalculation.playerPrizes.forEach(p => {
                            initialPrizes[p.memberId] = p.prizeAmount;
                          });
                          setAdjustedPrizes(initialPrizes);
                        }
                      }
                    }}
                    className="px-4 md:px-6 py-2 md:py-3 rounded-xl text-sm md:text-base font-semibold transition-all duration-200 border-2 relative z-10 bg-gray-600 hover:bg-gray-700 text-white border-gray-500 cursor-pointer"
                  >
                    💰 調整獎金
                  </button>
                )}
                <div className="w-full sm:w-auto">
                  <ExportButton 
                    players={tournament.players} 
                    config={config}
                    prizeCalculation={prizeCalculation ? {
                      ...prizeCalculation,
                      // 如果有調整後的獎金，使用調整後的；否則使用計算的
                      playerPrizes: tournament.adjustedPrizes 
                        ? prizeCalculation.playerPrizes.map(p => ({
                            ...p,
                            prizeAmount: tournament.adjustedPrizes![p.memberId] ?? p.prizeAmount
                          }))
                        : prizeCalculation.playerPrizes,
                      totalDistributed: tournament.adjustedPrizes
                        ? Object.values(tournament.adjustedPrizes).reduce((sum, p) => sum + p, 0)
                        : prizeCalculation.totalDistributed
                    } : null}
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

        {/* 財務資訊 */}
        {tournament.totalBuyIn && (
          <div className="bg-gradient-to-br from-gray-900 via-black to-gray-900 rounded-2xl p-4 md:p-6 mb-6 border-2 border-poker-gold-600 border-opacity-40 shadow-xl relative z-10">
            <h2 className="text-xl md:text-2xl font-display font-bold text-poker-gold-400 mb-4 flex items-center gap-3">
              <span>💰</span>
              <span>財務資訊</span>
            </h2>
            
            {/* 支付方式統計 - 可展開 */}
            <PaymentMethodStats players={displayPlayers} entryFee={entryFee} />
            {isEditMode ? (
              <div className="space-y-4">
                <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                  <label className="block text-sm text-gray-400 mb-2">
                    單場總提撥金 (NT$)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editedTotalDeduction}
                    onChange={(e) => setEditedTotalDeduction(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-700 border-2 border-poker-gold-600 rounded-xl text-white text-lg focus:outline-none focus:ring-2 focus:ring-poker-gold-500"
                    placeholder="輸入單場總提撥金"
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    <span className="text-orange-400 font-semibold">⚠️ 注意：這是整場比賽的提撥，不是每組的提撥</span>
                    <br />
                    當前組數：{editedPlayers.reduce((sum, p) => sum + p.buyInCount, 0)} 組
                  </p>
                </div>
                <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                  <label className="block text-sm text-gray-400 mb-2">
                    活動獎金 (NT$)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editedActivityBonus}
                    onChange={(e) => setEditedActivityBonus(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-700 border-2 border-poker-gold-600 rounded-xl text-white text-lg focus:outline-none focus:ring-2 focus:ring-poker-gold-500"
                    placeholder="輸入活動獎金"
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    從總獎金池額外抽出的活動獎金，不參與玩家獎金分配
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                    <p className="text-sm text-gray-400 mb-2">總收入</p>
                    <p className="text-2xl font-bold text-white">
                      NT$ {editedPlayers.reduce((sum, p) => {
                        const entryFee = tournament.tournamentType === 'custom' && tournament.customConfig
                          ? (tournament.customConfig.entryFee || 0)
                          : parseInt(tournament.tournamentType);
                        return sum + (p.buyInCount * entryFee);
                      }, 0).toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">報名費 × 買入組數</p>
                  </div>
                  {tournament.totalAdministrativeFee !== undefined && tournament.totalAdministrativeFee > 0 && (
                    <div className="bg-red-900 bg-opacity-50 rounded-xl p-4 border border-red-700">
                      <p className="text-sm text-gray-400 mb-2">總行政費</p>
                      <p className="text-2xl font-bold text-red-300">
                        NT$ {((tournament.administrativeFee || 0) * editedPlayers.reduce((sum, p) => sum + p.buyInCount, 0)).toLocaleString()}
                      </p>
                      {tournament.administrativeFee !== undefined && (
                        <p className="text-xs text-gray-500 mt-1">
                          每人 {tournament.administrativeFee.toLocaleString()} × {editedPlayers.reduce((sum, p) => sum + p.buyInCount, 0)} 組
                        </p>
                      )}
                    </div>
                  )}
                  {editedTotalDeduction && parseInt(editedTotalDeduction) > 0 && (
                    <div className="bg-orange-900 bg-opacity-50 rounded-xl p-4 border border-orange-700">
                      <p className="text-sm text-gray-400 mb-2">單場總提撥金</p>
                      <p className="text-2xl font-bold text-orange-300">
                        NT$ {parseInt(editedTotalDeduction).toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        整場固定一次（不是每組）
                      </p>
                    </div>
                  )}
                  {editedActivityBonus && parseInt(editedActivityBonus) > 0 && (
                    <div className="bg-purple-900 bg-opacity-50 rounded-xl p-4 border border-purple-700">
                      <p className="text-sm text-gray-400 mb-2">活動獎金</p>
                      <p className="text-2xl font-bold text-purple-300">
                        NT$ {parseInt(editedActivityBonus).toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        從總獎金池額外抽出，不參與玩家獎金分配
                      </p>
                    </div>
                  )}
                  <div className="bg-poker-gold-900 bg-opacity-50 rounded-xl p-4 border border-poker-gold-700">
                    <p className="text-sm text-gray-400 mb-2">總獎池（預覽）</p>
                    <p className="text-2xl font-bold text-poker-gold-300">
                      NT$ {(() => {
                        const entryFee = tournament.tournamentType === 'custom' && tournament.customConfig
                          ? (tournament.customConfig.entryFee || 0)
                          : parseInt(tournament.tournamentType);
                        const administrativeFee = tournament.administrativeFee || 0;
                        const totalGroups = editedPlayers.reduce((sum, p) => sum + p.buyInCount, 0);
                        // 財務資訊的總獎池 = (報名費 - 行政費) × 組數 - 活動獎金（不扣提撥）
                        const totalPrizePool = (entryFee - administrativeFee) * totalGroups;
                        const activityBonus = parseInt(editedActivityBonus) || 0;
                        const financialTotalPrizePool = totalPrizePool - activityBonus;
                        return financialTotalPrizePool.toLocaleString();
                      })()}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      (報名費 - 行政費) × 組數 - 活動獎金
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                  <p className="text-sm text-gray-400 mb-2">總收入</p>
                  <p className="text-2xl font-bold text-white">
                    NT$ {tournament.totalBuyIn.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">報名費 × 買入組數</p>
                </div>
                {tournament.totalAdministrativeFee !== undefined && tournament.totalAdministrativeFee > 0 && (
                  <div className="bg-red-900 bg-opacity-50 rounded-xl p-4 border border-red-700">
                    <p className="text-sm text-gray-400 mb-2">總行政費</p>
                    <p className="text-2xl font-bold text-red-300">
                      NT$ {tournament.totalAdministrativeFee.toLocaleString()}
                    </p>
                    {tournament.administrativeFee !== undefined && (
                      <p className="text-xs text-gray-500 mt-1">
                        每人 {tournament.administrativeFee.toLocaleString()} × {tournament.totalPlayers} 組
                      </p>
                    )}
                  </div>
                )}
                {tournament.totalDeduction !== undefined && tournament.totalDeduction > 0 && (
                  <div className="bg-orange-900 bg-opacity-50 rounded-xl p-4 border border-orange-700">
                    <p className="text-sm text-gray-400 mb-2">總提撥金</p>
                    <p className="text-2xl font-bold text-orange-300">
                      NT$ {tournament.totalDeduction.toLocaleString()}
                    </p>
                  </div>
                )}
                {tournament.activityBonus !== undefined && tournament.activityBonus > 0 && (
                  <div className="bg-purple-900 bg-opacity-50 rounded-xl p-4 border border-purple-700">
                    <p className="text-sm text-gray-400 mb-2">活動獎金</p>
                    <p className="text-2xl font-bold text-purple-300">
                      NT$ {tournament.activityBonus.toLocaleString()}
                    </p>
                  </div>
                )}
                <div className="bg-poker-gold-900 bg-opacity-50 rounded-xl p-4 border border-poker-gold-700">
                  <p className="text-sm text-gray-400 mb-2">總獎池</p>
                  <p className="text-2xl font-bold text-poker-gold-300">
                    NT$ {(() => {
                      const customConfig = tournament.customConfig;
                      const entryFee = tournament.tournamentType === 'custom' && customConfig
                        ? (customConfig.entryFee || 0)
                        : parseInt(tournament.tournamentType);
                      const administrativeFee = tournament.administrativeFee || 0;
                      const totalGroups = tournament.totalPlayers || displayPlayers.reduce((sum, p) => sum + p.buyInCount, 0);
                      const activityBonus = tournament.activityBonus || 
                        (tournament.tournamentType === 'custom' && customConfig?.activityBonus) || 
                        0;
                      // 財務資訊的總獎池 = (報名費 - 行政費) × 組數 - 活動獎金（不扣提撥）
                      const financialTotalPrizePool = (entryFee - administrativeFee) * totalGroups - activityBonus;
                      return financialTotalPrizePool.toLocaleString();
                    })()}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    (報名費 - 行政費) × 組數 - 活動獎金
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 統計面板 */}
        <div className="relative z-10">
          <StatsPanel
            totalBuyInGroups={totalBuyInGroups}
            expectedTotalChips={expectedTotalChips}
            actualTotalChips={actualTotalChips}
            isBalanced={isBalanced}
          />
        </div>

        {/* 獎金調整界面 */}
        {isAdjustingPrizes && prizeCalculation && prizeCalculation.playerPrizes.length > 0 && !isEditMode && (
          <div className="bg-gray-800 rounded-xl p-4 md:p-6 mb-6 border-2 border-yellow-500 relative z-10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-yellow-400">手動調整獎金</h3>
              {hasPrizeAdjustments && (
                <span className="px-3 py-1 bg-green-600 text-white text-sm rounded-lg font-semibold">
                  ✓ 已調整
                </span>
              )}
            </div>
            
            <div className="space-y-3 max-h-96 overflow-y-auto mb-4">
              {prizeCalculation.playerPrizes.map((playerPrize) => {
                const player = displayPlayers.find(p => String(p.memberId) === String(playerPrize.memberId));
                if (!player) return null;
                
                const currentPrize = adjustedPrizes[playerPrize.memberId] ?? playerPrize.prizeAmount;
                const isChanged = currentPrize !== playerPrize.prizeAmount;
                
                return (
                  <div 
                    key={playerPrize.memberId} 
                    className={`flex items-center gap-4 p-3 rounded-lg transition-all ${
                      isChanged 
                        ? 'bg-yellow-900/30 border-2 border-yellow-500/50' 
                        : 'bg-gray-700 border border-gray-600'
                    }`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <div className="font-mono font-bold text-lg text-poker-gold-300">{player.memberId}</div>
                        {isChanged && (
                          <span className="px-2 py-0.5 bg-yellow-600 text-white text-xs rounded font-semibold">
                            已修改
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-400 mt-1">
                        排名: {playerPrize.rank} | 籌碼: {player.currentChips.toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        原獎金: NT$ {playerPrize.prizeAmount.toLocaleString()}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-300">NT$</span>
                      <input
                        type="number"
                        min="0"
                        value={currentPrize}
                        onChange={(e) => {
                          const value = parseInt(e.target.value) || 0;
                          setAdjustedPrizes(prev => ({
                            ...prev,
                            [playerPrize.memberId]: Math.max(0, value)
                          }));
                        }}
                        className={`w-32 px-3 py-2 rounded-lg text-white text-right focus:outline-none focus:ring-2 transition-all ${
                          isChanged
                            ? 'bg-yellow-800 border-2 border-yellow-500 focus:ring-yellow-500'
                            : 'bg-gray-600 border border-gray-500 focus:ring-yellow-500'
                        }`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            
            <div className="pt-4 border-t border-gray-600">
              {(() => {
                // 計算當前顯示的總獎金
                const currentPrizes = Object.keys(adjustedPrizes).length > 0 
                  ? adjustedPrizes 
                  : (() => {
                      const initialPrizes: Record<string, number> = {};
                      prizeCalculation.playerPrizes.forEach(p => {
                        initialPrizes[p.memberId] = p.prizeAmount;
                      });
                      return initialPrizes;
                    })();
                const adjustedTotal = Object.values(currentPrizes).reduce((sum, p) => sum + p, 0);
                const difference = prizeCalculation.netPool - adjustedTotal;
                const isBalanced = Math.abs(difference) < 0.01;
                
                return (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div className="bg-gray-700 rounded-lg p-3 border border-gray-600">
                        <div className="text-sm text-gray-400 mb-1">調整後總獎金</div>
                        <div className="text-xl font-bold text-white">
                          NT$ {adjustedTotal.toLocaleString()}
                        </div>
                      </div>
                      <div className="bg-gray-700 rounded-lg p-3 border border-gray-600">
                        <div className="text-sm text-gray-400 mb-1">淨獎池</div>
                        <div className="text-xl font-bold text-white">
                          NT$ {prizeCalculation.netPool.toLocaleString()}
                        </div>
                      </div>
                      <div className={`rounded-lg p-3 border-2 ${
                        isBalanced 
                          ? 'bg-green-900/30 border-green-500/50' 
                          : 'bg-yellow-900/30 border-yellow-500/50'
                      }`}>
                        <div className="text-sm text-gray-300 mb-1">差額</div>
                        <div className={`text-xl font-bold ${isBalanced ? 'text-green-300' : 'text-yellow-300'}`}>
                          {difference > 0 ? '+' : ''}
                          {difference.toLocaleString()}
                        </div>
                      </div>
                    </div>
                    
                    {!isBalanced && (
                      <div className="bg-yellow-900/20 border border-yellow-600/50 rounded-lg p-3 mb-4">
                        <p className="text-sm text-yellow-400 flex items-center gap-2">
                          <span>⚠️</span>
                          <span>調整後總獎金與淨獎池不一致，請檢查並調整</span>
                        </p>
                      </div>
                    )}
                    
                    {isBalanced && hasPrizeAdjustments && (
                      <div className="bg-green-900/20 border border-green-600/50 rounded-lg p-3 mb-4">
                        <p className="text-sm text-green-400 flex items-center gap-2">
                          <span>✓</span>
                          <span>獎金分配已平衡，可以保存</span>
                        </p>
                      </div>
                    )}
                    
                    {/* 調整完成按鈕 */}
                    <div className="flex gap-3 mt-4">
                      <button
                        onClick={() => {
                          // 取消調整，恢復原始值
                          if (prizeCalculation) {
                            const initialPrizes: Record<string, number> = {};
                            prizeCalculation.playerPrizes.forEach(p => {
                              initialPrizes[p.memberId] = p.prizeAmount;
                            });
                            setAdjustedPrizes(initialPrizes);
                          }
                          setIsAdjustingPrizes(false);
                        }}
                        className="flex-1 px-4 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-semibold transition-all duration-200"
                      >
                        取消
                      </button>
                      <button
                        onClick={() => {
                          // 保存調整
                          if (tournament) {
                            const updatedTournament = {
                              ...tournament,
                              adjustedPrizes,
                            };
                            updateTournament(updatedTournament);
                            setTournament(updatedTournament);
                            setIsAdjustingPrizes(false);
                            alert('獎金調整已保存！');
                          }
                        }}
                        disabled={!hasPrizeAdjustments}
                        className={`flex-1 px-4 py-3 rounded-lg font-semibold transition-all duration-200 ${
                          hasPrizeAdjustments
                            ? 'bg-green-600 hover:bg-green-700 text-white cursor-pointer'
                            : 'bg-gray-500 text-gray-400 cursor-not-allowed opacity-50'
                        }`}
                      >
                        ✓ 調整完成
                      </button>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        )}

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
                  <div className="flex items-center gap-2 mb-2">
                    <div className="font-mono font-bold text-lg text-poker-gold-300">{player.memberId}</div>
                    {player.seat && (
                      <span className="px-2 py-1 bg-blue-600 rounded text-xs font-semibold text-white">
                        座位 {player.seat}
                      </span>
                    )}
                  </div>
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
                    <th className="text-left py-3 px-4">座位號</th>
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
                      <td className="py-4 px-4">
                        {player.seat ? (
                          <span className="px-3 py-1 bg-blue-600 rounded text-sm font-semibold text-white">
                            {player.seat}
                          </span>
                        ) : (
                          <span className="text-gray-500 text-sm">未設定</span>
                        )}
                      </td>
                      <td className="py-4 px-4">{player.buyInCount}</td>
                      <td className="py-4 px-4">{player.currentChips.toLocaleString()}</td>
                      <td className="py-4 px-4">
                        <div className="flex flex-col gap-1">
                          <span className={`px-3 py-1 rounded-lg text-sm font-semibold text-white ${paymentMethodColors[player.paymentMethod]}`}>
                            {paymentMethodLabels[player.paymentMethod]}
                          </span>
                          {player.couponCode && player.couponDiscount && (
                            <span className="text-xs text-yellow-400">
                              🎫 {player.couponCode}: -NT$ {player.couponDiscount.toLocaleString()}
                            </span>
                          )}
                        </div>
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
