import { useEffect, useState, useMemo } from 'react';
import { TournamentRecord, TournamentStatus } from '../../types/tournament';
import { getAllTournaments, deleteTournament, updateTournament, setupRealtimeSyncForTournaments, getTournamentById } from '../../utils/storage';
import AuditLogPanel from './AuditLogPanel';
import MemberPaymentQuery from './MemberPaymentQuery';
import { getTaiwanTodayDateKey, getDateKey, formatTaiwanDate, getTaiwanDateTime, formatTaiwanTime } from '../utils/dateUtils';
import { checkIPAuthorization } from '../../utils/systemSecurity';

interface IndexPageProps {
  onCreateNew: () => void;
  onViewTournament: (id: string) => void;
  onLogout?: () => void;
  onOpenUserManagement?: () => void;
  onOpenSystemSecurity?: () => void;
  onViewAllTournaments?: () => void;
  onQuickEdit?: (tournamentId: string) => void;
}

interface GroupedTournaments {
  date: string; // YYYY-MM-DD 格式
  displayDate: string; // 显示用的日期格式
  tournaments: TournamentRecord[];
  totalBuyInGroups: number; // 该日期总买入组数
  totalBuyIn: number; // 该日期总买入金额
  totalDeduction: number; // 该日期总提拨金额（如果有记录）
}

export default function IndexPage({ onCreateNew, onViewTournament, onLogout, onOpenUserManagement, onOpenSystemSecurity, onViewAllTournaments }: IndexPageProps) {
  const [tournaments, setTournaments] = useState<TournamentRecord[]>([]);
  const [showAuditLog, setShowAuditLog] = useState(false);
  const [showMemberQuery, setShowMemberQuery] = useState(false);
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());
  const [quickEditTournament, setQuickEditTournament] = useState<TournamentRecord | null>(null);
  const [chipInputValues, setChipInputValues] = useState<Record<string, string>>({});

  const loadTournaments = () => {
    const records = getAllTournaments();
    // 確保賽事按日期和時間倒序排列（最新的在前）
    const sortedRecords = [...records].sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      // 如果日期相同，按 ID 倒序（ID 是時間戳，越大越新）
      if (dateA === dateB) {
        return parseInt(b.id) - parseInt(a.id);
      }
      return dateB - dateA;
    });
    setTournaments(sortedRecords);
    // 預設不展開任何日期
    setExpandedDates(new Set());
  };

  useEffect(() => {
    loadTournaments();
    
    // 設置實時同步（當其他設備更新數據時自動刷新）
    let unsubscribe: (() => void) | null = null;
    try {
      unsubscribe = setupRealtimeSyncForTournaments((tournaments) => {
        setTournaments(tournaments);
        // 保持當前展開狀態，不自動展開新日期
      });
    } catch (error) {
      console.warn('實時同步設置失敗（將使用本地存儲）:', error);
    }
    
    // 監聽 storage 事件（當本地存儲更新時，用於跨標籤頁同步）
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'lucky_poker_tournaments') {
        loadTournaments();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    // 定期檢查本地存儲（用於同一個標籤頁內的更新）
    let lastTournamentCount = getAllTournaments().length;
    const intervalId = setInterval(() => {
      const currentData = localStorage.getItem('lucky_poker_tournaments');
      if (currentData) {
        try {
          const currentTournaments = JSON.parse(currentData);
          if (currentTournaments.length !== lastTournamentCount) {
            lastTournamentCount = currentTournaments.length;
            loadTournaments();
          }
        } catch (e) {
          // 忽略解析錯誤
        }
      }
    }, 1000); // 每秒檢查一次
    
    return () => {
      if (unsubscribe) unsubscribe();
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(intervalId);
    };
  }, []);

  const formatDateFull = (dateString: string) => {
    return formatTaiwanDate(dateString, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
    });
  };

  const formatCurrency = (amount: number) => {
    return `NT$ ${amount.toLocaleString()}`;
  };

  // 按日期分组并计算统计（只顯示今天的）
  const groupedTournaments = useMemo(() => {
    const grouped: Record<string, GroupedTournaments> = {};
    const todayKey = getTaiwanTodayDateKey();
    
    tournaments.forEach((tournament) => {
      // 跳過無效的賽事日期
      if (!tournament.date) {
        console.warn('跳過無日期欄位的賽事:', tournament.tournamentName);
        return;
      }
      
      const dateKey = getDateKey(tournament.date);
      
      // 跳過無效的日期鍵
      if (!dateKey || dateKey === 'Invalid Date' || dateKey.trim() === '' || !/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
        console.warn('跳過無效日期的賽事:', tournament.tournamentName, '日期鍵:', dateKey, '原始日期:', tournament.date);
        return;
      }
      
      // 只處理今天的賽事（使用字符串直接比較 YYYY-MM-DD，避免時區問題）
      if (dateKey !== todayKey) {
        return;
      }
      
      if (!grouped[dateKey]) {
        try {
          grouped[dateKey] = {
            date: dateKey,
            displayDate: formatDateFull(tournament.date),
            tournaments: [],
            totalBuyInGroups: 0,
            totalBuyIn: 0,
            totalDeduction: 0,
          };
        } catch (e) {
          console.warn('格式化日期失敗，使用默認格式:', e, tournament.date);
          grouped[dateKey] = {
            date: dateKey,
            displayDate: dateKey, // 如果格式化失敗，直接使用日期鍵
            tournaments: [],
            totalBuyInGroups: 0,
            totalBuyIn: 0,
            totalDeduction: 0,
          };
        }
      }

      grouped[dateKey].tournaments.push(tournament);
      grouped[dateKey].totalBuyInGroups += tournament.totalPlayers; // totalPlayers 現在存的是買入組數
      grouped[dateKey].totalBuyIn += tournament.totalBuyIn;
      // 如果有提拨金额字段，累加（目前 TournamentRecord 没有这个字段，先设为0）
      // grouped[dateKey].totalDeduction += (tournament as any).deduction || 0;
    });

    // 對每個日期的賽事按時間倒序排列（最新的在前）
    Object.keys(grouped).forEach(dateKey => {
      grouped[dateKey].tournaments.sort((a, b) => {
        // 按日期時間倒序排列（最新的在前）
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        // 如果日期相同，按 ID 倒序（ID 是時間戳，越大越新）
        if (dateA === dateB) {
          return parseInt(b.id) - parseInt(a.id);
        }
        return dateB - dateA;
      });
    });

    // 转换为数组并按日期倒序排列
    return Object.values(grouped).sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [tournaments]);

  // 只顯示今天的賽事（已經在 groupedTournaments 中過濾）
  const filteredGroups = groupedTournaments;

  const toggleDate = (date: string) => {
    const newExpanded = new Set(expandedDates);
    if (newExpanded.has(date)) {
      newExpanded.delete(date);
    } else {
      newExpanded.add(date);
    }
    setExpandedDates(newExpanded);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('確定要刪除此賽事記錄嗎？')) {
      deleteTournament(id);
      loadTournaments();
    }
  };

  const handleStatusChange = (tournamentId: string, newStatus: TournamentStatus, e: React.MouseEvent) => {
    e.stopPropagation();
    const tournament = getTournamentById(tournamentId);
    if (tournament) {
      const updated: TournamentRecord = {
        ...tournament,
        status: newStatus,
      };
      updateTournament(updated);
      loadTournaments();
    }
  };

  const handleQuickEditClick = () => {
    if (filteredGroups.length > 0 && filteredGroups[0].tournaments.length > 0) {
      const latestTournament = filteredGroups[0].tournaments[0];
      const fullTournament = getTournamentById(latestTournament.id);
      if (fullTournament) {
        setQuickEditTournament(fullTournament);
        // 初始化编辑筹码值
        const inputValues: Record<string, string> = {};
        fullTournament.players.forEach(p => {
          const chipValue = p.currentChips || 0;
          inputValues[p.id] = chipValue.toString();
        });
        setChipInputValues(inputValues);
      }
    }
  };

  const handleChipInputChange = (playerId: string, value: string) => {
    // 允许空字符串，用于删除所有内容
    setChipInputValues(prev => ({
      ...prev,
      [playerId]: value,
    }));
  };

  const handleChipBlur = async (playerId: string) => {
    if (!quickEditTournament) return;
    
    // 檢查 IP 授權
    const ipCheck = await checkIPAuthorization();
    if (!ipCheck.authorized) {
      alert(ipCheck.message || '非授權網路，禁止修改');
      // 恢復原值
      const originalChips = quickEditTournament.players.find(p => p.id === playerId)?.currentChips || 0;
      setChipInputValues(prev => ({
        ...prev,
        [playerId]: originalChips.toString(),
      }));
      return;
    }
    
    const inputValue = chipInputValues[playerId] || '';
    const newChips = inputValue === '' ? 0 : parseFloat(inputValue) || 0;
    
    // 更新显示值（确保显示为数字）
    setChipInputValues(prev => ({
      ...prev,
      [playerId]: newChips.toString(),
    }));

    // 更新比赛数据
    const updatedPlayers = quickEditTournament.players.map(p =>
      p.id === playerId ? { ...p, currentChips: newChips } : p
    );

    const actualTotalChips = updatedPlayers.reduce((sum, p) => sum + (p.currentChips || 0), 0);
    
    const updated: TournamentRecord = {
      ...quickEditTournament,
      players: updatedPlayers,
      actualTotalChips,
    };

    updateTournament(updated);
    setQuickEditTournament(updated);
    loadTournaments();
  };

  const getStatusLabel = (status?: TournamentStatus): string => {
    switch (status) {
      case 'in_progress': return '進行中';
      case 'completed': return '已完賽';
      case 'cancelled': return '取消';
      default: return '進行中';
    }
  };

  const getStatusColor = (status?: TournamentStatus): string => {
    switch (status) {
      case 'in_progress': return 'bg-blue-600 border-blue-500 text-blue-200';
      case 'completed': return 'bg-green-600 border-green-500 text-green-200';
      case 'cancelled': return 'bg-red-600 border-red-500 text-red-200';
      default: return 'bg-blue-600 border-blue-500 text-blue-200';
    }
  };



  return (
    <div className="min-h-screen text-white relative bg-black">
      {/* 背景装饰 - 黑色筹码带金色发光 */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-20 left-10 w-20 h-20 chip-float chip-glow opacity-30">
          <div className="chip w-20 h-20 rounded-full"></div>
        </div>
        <div className="absolute top-40 right-20 w-16 h-16 chip-float chip-glow opacity-25" style={{ animationDelay: '1s' }}>
          <div className="chip w-16 h-16 rounded-full"></div>
        </div>
        <div className="absolute bottom-32 left-1/4 w-24 h-24 chip-float chip-glow opacity-20" style={{ animationDelay: '2s' }}>
          <div className="chip w-24 h-24 rounded-full"></div>
        </div>
        <div className="absolute top-1/2 right-10 w-18 h-18 chip-float chip-glow opacity-15" style={{ animationDelay: '1.5s' }}>
          <div className="chip w-18 h-18 rounded-full"></div>
        </div>
        <div className="absolute bottom-20 right-1/3 w-22 h-22 chip-float chip-glow opacity-18" style={{ animationDelay: '2.5s' }}>
          <div className="chip w-22 h-22 rounded-full"></div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 relative z-10">
        {/* 所有賽事記錄和帳號管理按鈕 - 平行排列 */}
        <div className="flex justify-between items-center mb-4 gap-3">
          {/* 左側：所有賽事記錄按鈕 */}
          {onViewAllTournaments && (
            <button
              onClick={onViewAllTournaments}
              className="px-4 md:px-6 py-2 md:py-3 bg-white hover:bg-gray-100 text-black rounded-xl text-sm md:text-base font-semibold transition-all duration-200 border-2 border-white shadow-lg flex items-center gap-2"
            >
              <span>📋</span>
              <span>所有賽事記錄</span>
            </button>
          )}

          {/* 右側：登出和帳號管理按鈕 */}
          {(onLogout || onOpenUserManagement || onOpenSystemSecurity) && (
            <div className="flex gap-3">
            {onOpenUserManagement && (
              <button
                onClick={onOpenUserManagement}
                className="px-4 md:px-6 py-2 md:py-3 bg-poker-gold-600 hover:bg-poker-gold-700 text-white rounded-xl text-sm md:text-base font-semibold transition-all duration-200 border-2 border-poker-gold-500 shadow-lg flex items-center gap-2"
              >
                <span>👥</span>
                <span className="hidden sm:inline">帳號管理</span>
                <span className="sm:hidden">管理</span>
              </button>
            )}
            {onOpenSystemSecurity && (
              <button
                onClick={onOpenSystemSecurity}
                className="px-4 md:px-6 py-2 md:py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm md:text-base font-semibold transition-all duration-200 border-2 border-blue-500 shadow-lg flex items-center gap-2"
              >
                <span>🔒</span>
                <span className="hidden sm:inline">系統安全</span>
                <span className="sm:hidden">安全</span>
              </button>
            )}
              {onLogout && (
                <button
                  onClick={onLogout}
                  className="px-4 md:px-6 py-2 md:py-3 bg-white hover:bg-gray-100 rounded-xl text-sm md:text-base font-semibold text-black transition-all duration-200 border-2 border-white shadow-lg flex items-center gap-2"
                >
                  <span>🚪</span>
                  <span>登出</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* 頂部欄 */}
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center gap-4 mb-4">
            <div className="text-6xl filter drop-shadow-[0_0_10px_rgba(255,215,0,0.8)]">🃏</div>
            <h1 className="text-5xl md:text-6xl font-display font-black text-poker-gold-400 gold-glow">
              LUCKY POKER
            </h1>
            <div className="text-6xl filter drop-shadow-[0_0_10px_rgba(255,215,0,0.8)]">🂮</div>
          </div>
          <p className="text-2xl md:text-3xl font-body font-light text-poker-gold-300 tracking-wider drop-shadow-[0_0_8px_rgba(255,215,0,0.6)]">
            賽事管理系統
          </p>
          <div className="flex items-center justify-center gap-2 mt-4">
            <div className="w-16 h-1 bg-gradient-to-r from-transparent via-poker-gold-500 to-transparent"></div>
            <div className="text-poker-gold-400 text-xl filter drop-shadow-[0_0_8px_rgba(255,215,0,0.8)]">♠ ♥ ♦ ♣</div>
            <div className="w-16 h-1 bg-gradient-to-r from-transparent via-poker-gold-500 to-transparent"></div>
          </div>
        </div>

        {/* 主功能區 */}
        <div className="mb-8 flex flex-col md:flex-row justify-center items-center gap-4 flex-wrap">
          <button
            onClick={onCreateNew}
            className="group relative bg-white hover:bg-gray-100 text-black font-bold py-6 px-12 rounded-2xl text-2xl md:text-3xl shadow-2xl transform hover:scale-105 transition-all duration-300 flex items-center gap-4 overflow-hidden border-2 border-white"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-gray-200 to-transparent opacity-0 group-hover:opacity-30 transform -skew-x-12 group-hover:translate-x-full transition-all duration-1000"></div>
            <span className="text-4xl relative z-10">🃏</span>
            <span className="relative z-10">創建新賽事</span>
          </button>
          
          {/* 手機版專屬：快速結算按鈕 */}
          {filteredGroups.length > 0 && filteredGroups[0].tournaments.length > 0 && (
            <button
              onClick={handleQuickEditClick}
              className="md:hidden group relative bg-gradient-to-r from-poker-gold-600 to-poker-gold-700 hover:from-poker-gold-700 hover:to-poker-gold-800 text-white font-bold py-6 px-12 rounded-2xl text-2xl shadow-2xl transform hover:scale-105 transition-all duration-300 flex items-center gap-4 overflow-hidden border-2 border-poker-gold-500"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-0 group-hover:opacity-20 transform -skew-x-12 group-hover:translate-x-full transition-all duration-1000"></div>
              <span className="text-4xl relative z-10">⚡</span>
              <span className="relative z-10">快速更碼</span>
            </button>
          )}
          
          <button
            onClick={() => setShowMemberQuery(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-8 rounded-xl text-lg shadow-xl transition-all duration-200 border-2 border-blue-500 flex items-center gap-2"
          >
            <span>🔍</span>
            <span>會員查詢</span>
          </button>
          <button
            onClick={() => setShowAuditLog(true)}
            className="bg-white hover:bg-gray-100 text-black font-semibold py-4 px-8 rounded-xl text-lg shadow-xl transition-all duration-200 border-2 border-white flex items-center gap-2"
          >
            <span>📋</span>
            <span>操作日誌</span>
          </button>
        </div>

        {/* 今日賽事記錄區 */}
        <div className="bg-black bg-opacity-80 rounded-3xl p-6 backdrop-blur-md border-2 border-poker-gold-600 border-opacity-50 shadow-2xl shadow-poker-gold-500/20">
          <div className="mb-6">
            <h2 className="text-2xl md:text-3xl font-bold">今日賽事記錄</h2>
            <p className="text-sm text-gray-400 mt-2">顯示 {formatTaiwanDate(getTaiwanDateTime(), { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })} 的賽事</p>
          </div>
          
          {filteredGroups.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <p className="text-xl mb-2">
                今日尚無賽事記錄
              </p>
              <p className="text-sm">
                點擊上方「創建新賽事」開始第一場賽事，或點擊「所有賽事記錄」查看歷史記錄
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredGroups.map((group) => {
                const isExpanded = expandedDates.has(group.date);
                
                return (
                  <div
                    key={group.date}
                    className="bg-gradient-to-r from-gray-900 via-black to-gray-900 rounded-2xl overflow-hidden border-2 border-poker-gold-500 border-opacity-40 shadow-xl shadow-poker-gold-500/20 hover:border-opacity-80 hover:shadow-poker-gold-500/40 transition-all duration-300"
                  >
                    {/* 日期標題（可點擊展開/收合） */}
                    <button
                      onClick={() => toggleDate(group.date)}
                      className="w-full p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4 hover:bg-gradient-to-r hover:from-gray-900 hover:via-black hover:to-gray-900 transition-all duration-200 text-left relative overflow-hidden group"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-poker-gold-500/0 via-poker-gold-500/20 to-poker-gold-500/0 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                      <div className="flex-1 relative z-10">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="text-3xl">📅</div>
                          <h3 className="text-2xl md:text-3xl font-display font-bold text-poker-gold-400 gold-glow">
                            {group.displayDate}
                          </h3>
                          <span className="text-sm text-poker-gold-200 bg-poker-gold-900 bg-opacity-50 px-4 py-1.5 rounded-full border border-poker-gold-600 font-semibold">
                            {group.tournaments.length} 場賽事
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 mt-3">
                          <div className="bg-gradient-to-br from-blue-600 to-blue-800 bg-opacity-40 px-4 py-3 rounded-xl border border-blue-500 border-opacity-50 shadow-lg">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-lg">👥</span>
                              <p className="text-xs text-blue-200 font-medium">總買入組數</p>
                            </div>
                            <p className="text-xl font-bold text-blue-100">{group.totalBuyInGroups} 組</p>
                          </div>
                          <div className="bg-gradient-to-br from-poker-gold-600 to-poker-gold-800 bg-opacity-40 px-4 py-3 rounded-xl border border-poker-gold-500 border-opacity-50 shadow-lg">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-lg">💰</span>
                              <p className="text-xs text-poker-gold-200 font-medium">總買入金額</p>
                            </div>
                            <p className="text-xl font-bold text-poker-gold-200">
                              {formatCurrency(group.totalBuyIn)}
                            </p>
                          </div>
                          {group.totalDeduction > 0 && (
                            <div className="bg-gradient-to-br from-orange-600 to-orange-800 bg-opacity-40 px-4 py-3 rounded-xl border border-orange-500 border-opacity-50 shadow-lg">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-lg">📊</span>
                                <p className="text-xs text-orange-200 font-medium">總提撥金額</p>
                              </div>
                              <p className="text-xl font-bold text-orange-200">
                                {formatCurrency(group.totalDeduction)}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 relative z-10">
                        <span className="text-poker-gold-300 text-sm font-semibold">
                          {isExpanded ? '收起' : '展開'}
                        </span>
                        <div className="w-10 h-10 rounded-full bg-poker-gold-600 bg-opacity-30 border-2 border-poker-gold-500 flex items-center justify-center">
                          <svg
                            className={`w-5 h-5 text-poker-gold-300 transition-transform duration-300 ${
                              isExpanded ? 'transform rotate-180' : ''
                            }`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={3}
                              d="M19 9l-7 7-7-7"
                            />
                          </svg>
                        </div>
                      </div>
                    </button>

                    {/* 該日期的賽事列表（可展開/收合） */}
                    {isExpanded && (
                      <div className="px-6 pb-6 space-y-3">
                        {group.tournaments.map((tournament, idx) => (
                          <div
                            key={tournament.id}
                            onClick={() => onViewTournament(tournament.id)}
                            className="group relative bg-gradient-to-r from-gray-900 via-black to-gray-900 hover:from-gray-800 hover:via-gray-900 hover:to-gray-800 rounded-xl p-5 cursor-pointer transition-all duration-300 hover:shadow-2xl hover:shadow-poker-gold-500/30 hover:scale-[1.02] border-l-4 border-poker-gold-500 border-opacity-60 hover:border-poker-gold-400 hover:border-opacity-100 overflow-hidden"
                          >
                            <div className="absolute top-0 right-0 w-32 h-32 bg-poker-gold-500 opacity-0 group-hover:opacity-10 transform rotate-45 translate-x-16 -translate-y-16 transition-opacity duration-300"></div>
                            <div className="absolute top-2 right-2 text-4xl opacity-20 group-hover:opacity-30 transition-opacity">
                              {idx % 4 === 0 ? '🃏' : idx % 4 === 1 ? '🂮' : idx % 4 === 2 ? '🂭' : '🂫'}
                            </div>
                            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                              <div className="flex-1 relative z-10">
                                <div className="flex items-center gap-4 mb-3 flex-wrap">
                                  <h4 className="text-xl font-display font-bold text-poker-gold-400 group-hover:text-poker-gold-300 transition-colors">
                                    {tournament.tournamentName}
                                  </h4>
                                  <span className="text-xs text-poker-gold-200 bg-poker-gold-900 bg-opacity-50 px-3 py-1 rounded-full border border-poker-gold-600 font-medium">
                                    🕐 {formatTaiwanTime(tournament.date, {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}
                                  </span>
                                  {/* 狀態選擇器 */}
                                  <select
                                    onClick={(e) => e.stopPropagation()}
                                    onChange={(e) => handleStatusChange(tournament.id, e.target.value as TournamentStatus, e as any)}
                                    value={tournament.status || 'in_progress'}
                                    className={`text-xs px-3 py-1 rounded-full border font-medium cursor-pointer ${getStatusColor(tournament.status || 'in_progress')}`}
                                  >
                                    <option value="in_progress">進行中</option>
                                    <option value="completed">已完賽</option>
                                    <option value="cancelled">取消</option>
                                  </select>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                  <div className="bg-blue-600 bg-opacity-20 px-3 py-2 rounded-lg border border-blue-500 border-opacity-30">
                                    <p className="text-xs text-blue-300 mb-1 font-medium">買入組數</p>
                                    <p className="text-base font-bold text-blue-200">{tournament.totalPlayers} 組</p>
                                  </div>
                                  <div className="bg-poker-gold-600 bg-opacity-20 px-3 py-2 rounded-lg border border-poker-gold-500 border-opacity-30">
                                    <p className="text-xs text-poker-gold-300 mb-1 font-medium">總買入金額</p>
                                    <p className="text-base font-bold text-poker-gold-200">
                                      {formatCurrency(tournament.totalBuyIn)}
                                    </p>
                                  </div>
                                  <div className="bg-green-600 bg-opacity-20 px-3 py-2 rounded-lg border border-green-500 border-opacity-30">
                                    <p className="text-xs text-green-300 mb-1 font-medium">行政費用</p>
                                    <p className="text-base font-bold text-green-200">
                                      {formatCurrency(tournament.totalAdministrativeFee || 0)}
                                    </p>
                                  </div>
                                </div>
                              </div>
                              <div className="flex gap-2 relative z-10">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onViewTournament(tournament.id);
                                  }}
                                  className="px-4 py-2 bg-poker-gold-600 hover:bg-poker-gold-700 text-white rounded-lg text-sm font-semibold transition-all duration-200 shadow-lg hover:shadow-xl border-2 border-poker-gold-500"
                                >
                                  ✏️ 修改
                                </button>
                                <button
                                  onClick={(e) => handleDelete(tournament.id, e)}
                                  className="px-4 py-2 bg-white hover:bg-gray-100 rounded-lg text-sm font-semibold text-black transition-all duration-200 shadow-lg hover:shadow-xl border-2 border-white"
                                >
                                  🗑️ 刪除
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 操作日誌面板 */}
      {showAuditLog && (
        <AuditLogPanel onClose={() => setShowAuditLog(false)} />
      )}

      {/* 會員查詢面板 */}
      {showMemberQuery && (
        <MemberPaymentQuery onClose={() => setShowMemberQuery(false)} />
      )}

      {/* 快速更碼彈窗 */}
      {quickEditTournament && (
        <div className="fixed inset-0 bg-black bg-opacity-80 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto border-2 border-poker-gold-600">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-display font-bold text-poker-gold-400">
                ⚡ 快速更碼 - {quickEditTournament.tournamentName}
              </h2>
              <button
                onClick={() => {
                  setQuickEditTournament(null);
                  setChipInputValues({});
                }}
                className="text-gray-400 hover:text-white text-2xl"
              >
                ✕
              </button>
            </div>

            {/* 比賽狀態顯示 */}
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm text-gray-400">比賽狀態：</span>
                <span className={`text-sm px-3 py-1 rounded-full border font-medium ${getStatusColor(quickEditTournament.status || 'in_progress')}`}>
                  {getStatusLabel(quickEditTournament.status || 'in_progress')}
                </span>
              </div>
            </div>

            {/* 只有進行中的比賽才顯示會員列表 */}
            {(!quickEditTournament.status || quickEditTournament.status === 'in_progress') ? (
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-poker-gold-300 mb-3">會員編號列表</h3>
                {quickEditTournament.players.map((player) => (
                  <div
                    key={player.id}
                    className="bg-gray-800 rounded-xl p-4 border border-gray-700"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <span className="font-mono font-bold text-lg text-poker-gold-300">
                          會編 {player.memberId}
                        </span>
                        {player.seat && (
                          <span className="ml-2 px-2 py-0.5 bg-blue-600 rounded text-xs font-semibold text-white">
                            座位 {player.seat}
                          </span>
                        )}
                        {(player as any).name && (
                          <span className="ml-2 text-sm text-gray-400">{(player as any).name}</span>
                        )}
                      </div>
                      <span className="text-xs text-gray-400">買入 {player.buyInCount} 組</span>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">當前碼量</label>
                      <input
                        type="tel"
                        inputMode="decimal"
                        value={chipInputValues[player.id] !== undefined ? chipInputValues[player.id] : (player.currentChips || 0).toString()}
                        onChange={(e) => {
                          // 允许输入数字、小数点、负号（但我们会过滤掉负号）
                          const value = e.target.value.replace(/[^0-9.]/g, '');
                          handleChipInputChange(player.id, value);
                        }}
                        onBlur={() => handleChipBlur(player.id)}
                        className="w-full px-4 py-3 bg-gray-700 rounded-xl text-right text-xl font-bold text-white focus:outline-none focus:ring-2 focus:ring-poker-gold-500"
                        placeholder="0"
                        pattern="[0-9]*"
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                <p className="text-lg mb-2">此比賽已{getStatusLabel(quickEditTournament.status)}</p>
                <p className="text-sm">無法修改碼量</p>
              </div>
            )}

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => {
                  // 确保所有输入框都保存
                  quickEditTournament.players.forEach(player => {
                    handleChipBlur(player.id);
                  });
                  setQuickEditTournament(null);
                  setChipInputValues({});
                }}
                className="flex-1 bg-poker-gold-600 hover:bg-poker-gold-700 text-white font-bold py-3 px-6 rounded-xl transition-all duration-200"
              >
                完成
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
