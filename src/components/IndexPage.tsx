import { useEffect, useState, useMemo } from 'react';
import { TournamentRecord } from '../../types/tournament';
import { getAllTournaments, deleteTournament, setupRealtimeSyncForTournaments } from '../../utils/storage';
import AuditLogPanel from './AuditLogPanel';
import MemberPaymentQuery from './MemberPaymentQuery';

interface IndexPageProps {
  onCreateNew: () => void;
  onViewTournament: (id: string) => void;
  onLogout?: () => void;
  onOpenUserManagement?: () => void;
}

interface GroupedTournaments {
  date: string; // YYYY-MM-DD 格式
  displayDate: string; // 显示用的日期格式
  tournaments: TournamentRecord[];
  totalBuyInGroups: number; // 该日期总买入组数
  totalBuyIn: number; // 该日期总买入金额
  totalDeduction: number; // 该日期总提拨金额（如果有记录）
}

export default function IndexPage({ onCreateNew, onViewTournament, onLogout, onOpenUserManagement }: IndexPageProps) {
  const [tournaments, setTournaments] = useState<TournamentRecord[]>([]);
  const [showAuditLog, setShowAuditLog] = useState(false);
  const [showMemberQuery, setShowMemberQuery] = useState(false);
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());
  const [filterDate, setFilterDate] = useState<string>('');

  useEffect(() => {
    loadTournaments();
    
    // 設置實時同步（當其他設備更新數據時自動刷新）
    try {
      const unsubscribe = setupRealtimeSyncForTournaments((tournaments) => {
        setTournaments(tournaments);
        // 更新展開的日期
        const dates = new Set(tournaments.map(t => getDateKey(t.date)));
        setExpandedDates(dates);
      });
      
      return () => {
        if (unsubscribe) unsubscribe();
      };
    } catch (error) {
      console.warn('實時同步設置失敗（將使用本地存儲）:', error);
    }
  }, []);

  const loadTournaments = () => {
    const records = getAllTournaments();
    setTournaments(records);
    // 默认展开所有日期
    const dates = new Set(records.map(t => getDateKey(t.date)));
    setExpandedDates(dates);
  };

  const getDateKey = (dateString: string): string => {
    return dateString.split('T')[0]; // 获取 YYYY-MM-DD 部分
  };


  const formatDateFull = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
    });
  };

  const formatCurrency = (amount: number) => {
    return `NT$ ${amount.toLocaleString()}`;
  };

  // 按日期分组并计算统计
  const groupedTournaments = useMemo(() => {
    const grouped: Record<string, GroupedTournaments> = {};

    tournaments.forEach((tournament) => {
      const dateKey = getDateKey(tournament.date);
      
      if (!grouped[dateKey]) {
        grouped[dateKey] = {
          date: dateKey,
          displayDate: formatDateFull(tournament.date),
          tournaments: [],
          totalBuyInGroups: 0,
          totalBuyIn: 0,
          totalDeduction: 0,
        };
      }

      grouped[dateKey].tournaments.push(tournament);
      grouped[dateKey].totalBuyInGroups += tournament.totalPlayers; // totalPlayers 現在存的是買入組數
      grouped[dateKey].totalBuyIn += tournament.totalBuyIn;
      // 如果有提拨金额字段，累加（目前 TournamentRecord 没有这个字段，先设为0）
      // grouped[dateKey].totalDeduction += (tournament as any).deduction || 0;
    });

    // 转换为数组并按日期倒序排列
    return Object.values(grouped).sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [tournaments]);

  // 应用日期筛选
  const filteredGroups = useMemo(() => {
    if (!filterDate) return groupedTournaments;
    return groupedTournaments.filter(group => group.date === filterDate);
  }, [groupedTournaments, filterDate]);

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

  const handleDateFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilterDate(e.target.value);
    // 如果选择了日期，自动展开该日期
    if (e.target.value) {
      setExpandedDates(new Set([e.target.value]));
    }
  };

  const clearDateFilter = () => {
    setFilterDate('');
    // 恢复展开所有日期
    const dates = new Set(tournaments.map(t => getDateKey(t.date)));
    setExpandedDates(dates);
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
        {/* 登出和帳號管理按鈕 - 右上角 */}
        {(onLogout || onOpenUserManagement) && (
          <div className="flex justify-end mb-4 gap-3">
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

        {/* 賽事記錄區 */}
        <div className="bg-black bg-opacity-80 rounded-3xl p-6 backdrop-blur-md border-2 border-poker-gold-600 border-opacity-50 shadow-2xl shadow-poker-gold-500/20">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <h2 className="text-2xl md:text-3xl font-bold">賽事記錄</h2>
            
            {/* 日期篩選器 */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
              <label className="text-sm font-semibold text-poker-gold-300 whitespace-nowrap">快速跳轉日期：</label>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <input
                  type="date"
                  value={filterDate}
                  onChange={handleDateFilterChange}
                  max={new Date().toISOString().split('T')[0]}
                  className="flex-1 sm:flex-none px-3 md:px-4 py-2 bg-gray-900 border-2 border-poker-gold-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-poker-gold-500 focus:border-poker-gold-400 transition-all"
                />
                {filterDate && (
                  <button
                    onClick={clearDateFilter}
                    className="px-3 md:px-4 py-2 bg-white hover:bg-gray-100 rounded-lg text-sm font-semibold text-black transition-all duration-200 border-2 border-white shadow-lg whitespace-nowrap"
                  >
                    ✕ 清除
                  </button>
                )}
              </div>
            </div>
          </div>
          
          {filteredGroups.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <p className="text-xl mb-2">
                {filterDate ? '該日期尚無賽事記錄' : '尚無賽事記錄'}
              </p>
              <p className="text-sm">
                {filterDate ? '請選擇其他日期或清除篩選' : '點擊上方「創建新賽事」開始第一場賽事'}
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
                                <div className="flex items-center gap-4 mb-3">
                                  <h4 className="text-xl font-display font-bold text-poker-gold-400 group-hover:text-poker-gold-300 transition-colors">
                                    {tournament.tournamentName}
                                  </h4>
                                  <span className="text-xs text-poker-gold-200 bg-poker-gold-900 bg-opacity-50 px-3 py-1 rounded-full border border-poker-gold-600 font-medium">
                                    🕐 {new Date(tournament.date).toLocaleTimeString('zh-TW', {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}
                                  </span>
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
                                    <p className="text-xs text-green-300 mb-1 font-medium">總碼量</p>
                                    <p className="text-base font-bold text-green-200">
                                      {tournament.actualTotalChips.toLocaleString()}
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
    </div>
  );
}
