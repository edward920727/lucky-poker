import { useEffect, useState, useMemo } from 'react';
import { TournamentRecord } from '../../types/tournament';
import { getAllTournaments, deleteTournament, setupRealtimeSyncForTournaments } from '../../utils/storage';

interface AllTournamentsViewProps {
  onBack: () => void;
  onViewTournament: (id: string) => void;
}

interface GroupedTournaments {
  date: string; // YYYY-MM-DD 格式
  displayDate: string; // 显示用的日期格式
  tournaments: TournamentRecord[];
  totalBuyInGroups: number; // 该日期总买入组数
  totalBuyIn: number; // 该日期总买入金额
  totalDeduction: number; // 该日期总提拨金额（如果有记录）
}

export default function AllTournamentsView({ onBack, onViewTournament }: AllTournamentsViewProps) {
  const [tournaments, setTournaments] = useState<TournamentRecord[]>([]);
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');

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
      grouped[dateKey].totalBuyInGroups += tournament.totalPlayers;
      grouped[dateKey].totalBuyIn += tournament.totalBuyIn;
    });

    // 转换为数组并按日期倒序排列
    return Object.values(grouped).sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [tournaments]);

  // 应用搜索和日期范围筛选
  const filteredGroups = useMemo(() => {
    let filtered = groupedTournaments;

    // 日期范围筛选（直接比较 YYYY-MM-DD 字符串，避免时区问题）
    if (startDate || endDate) {
      filtered = filtered.filter(group => {
        const groupDate = group.date; // 已经是 YYYY-MM-DD 格式
        
        if (startDate && endDate) {
          // 有开始和结束日期，检查是否在范围内（字符串比较）
          return groupDate >= startDate && groupDate <= endDate;
        } else if (startDate) {
          // 只有开始日期，筛选该日期及之后
          return groupDate >= startDate;
        } else if (endDate) {
          // 只有结束日期，筛选该日期及之前
          return groupDate <= endDate;
        }
        return true;
      });
    }

    // 搜索筛选（搜索賽事名稱或會編）
    if (searchTerm.trim()) {
      filtered = filtered.map(group => ({
        ...group,
        tournaments: group.tournaments.filter(t => 
          t.tournamentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          t.players.some(p => p.memberId.includes(searchTerm))
        )
      })).filter(group => group.tournaments.length > 0);
    }

    return filtered;
  }, [groupedTournaments, startDate, endDate, searchTerm]);

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

  // 快捷日期範圍設置
  const setDateRange = (range: 'today' | 'week' | 'month' | 'year' | 'all') => {
    const now = new Date();
    // 使用本地時區獲取今天的日期字符串（YYYY-MM-DD）
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    
    switch (range) {
      case 'today':
        setStartDate(todayStr);
        setEndDate(todayStr);
        setExpandedDates(new Set([todayStr]));
        break;
      case 'week':
        // 計算本週第一天（週日）
        const dayOfWeek = now.getDay(); // 0=週日, 1=週一, ..., 6=週六
        const weekStartDate = new Date(now);
        weekStartDate.setDate(now.getDate() - dayOfWeek);
        const weekStartStr = `${weekStartDate.getFullYear()}-${String(weekStartDate.getMonth() + 1).padStart(2, '0')}-${String(weekStartDate.getDate()).padStart(2, '0')}`;
        setStartDate(weekStartStr);
        setEndDate(todayStr);
        // 展開本週的所有日期
        const weekDates = new Set<string>();
        for (let i = 0; i <= dayOfWeek; i++) {
          const date = new Date(weekStartDate);
          date.setDate(weekStartDate.getDate() + i);
          const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
          weekDates.add(dateStr);
        }
        setExpandedDates(weekDates);
        break;
      case 'month':
        // 本月第一天
        const monthStartStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
        setStartDate(monthStartStr);
        setEndDate(todayStr);
        break;
      case 'year':
        // 今年第一天
        const yearStartStr = `${now.getFullYear()}-01-01`;
        setStartDate(yearStartStr);
        setEndDate(todayStr);
        break;
      case 'all':
        setStartDate('');
        setEndDate('');
        const dates = new Set(tournaments.map(t => getDateKey(t.date)));
        setExpandedDates(dates);
        break;
    }
  };

  const clearDateFilter = () => {
    setStartDate('');
    setEndDate('');
    // 恢复展开所有日期
    const dates = new Set(tournaments.map(t => getDateKey(t.date)));
    setExpandedDates(dates);
  };

  const clearSearch = () => {
    setSearchTerm('');
  };

  // 計算總統計
  const totalStats = useMemo(() => {
    return filteredGroups.reduce((acc, group) => {
      acc.totalBuyInGroups += group.totalBuyInGroups;
      acc.totalBuyIn += group.totalBuyIn;
      acc.totalTournaments += group.tournaments.length;
      return acc;
    }, { totalBuyInGroups: 0, totalBuyIn: 0, totalTournaments: 0 });
  }, [filteredGroups]);

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
      </div>

      <div className="max-w-7xl mx-auto p-6 relative z-10">
        {/* 返回按鈕 */}
        <div className="mb-6">
          <button
            onClick={onBack}
            className="px-4 md:px-6 py-2 md:py-3 bg-white hover:bg-gray-100 text-black rounded-xl text-sm md:text-base font-semibold transition-all duration-200 border-2 border-white shadow-lg flex items-center gap-2"
          >
            <span>←</span>
            <span>返回首頁</span>
          </button>
        </div>

        {/* 標題 */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl md:text-5xl font-display font-black text-poker-gold-400 gold-glow mb-4">
            所有賽事記錄
          </h1>
          <p className="text-lg md:text-xl text-poker-gold-300">
            查詢與管理所有歷史賽事記錄
          </p>
        </div>

        {/* 總統計 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-gradient-to-br from-blue-600 to-blue-800 bg-opacity-40 px-6 py-4 rounded-xl border border-blue-500 border-opacity-50 shadow-lg">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">📊</span>
              <p className="text-sm text-blue-200 font-medium">總賽事數</p>
            </div>
            <p className="text-2xl font-bold text-blue-100">{totalStats.totalTournaments} 場</p>
          </div>
          <div className="bg-gradient-to-br from-poker-gold-600 to-poker-gold-800 bg-opacity-40 px-6 py-4 rounded-xl border border-poker-gold-500 border-opacity-50 shadow-lg">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">👥</span>
              <p className="text-sm text-poker-gold-200 font-medium">總買入組數</p>
            </div>
            <p className="text-2xl font-bold text-poker-gold-200">{totalStats.totalBuyInGroups} 組</p>
          </div>
          <div className="bg-gradient-to-br from-green-600 to-green-800 bg-opacity-40 px-6 py-4 rounded-xl border border-green-500 border-opacity-50 shadow-lg">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">💰</span>
              <p className="text-sm text-green-200 font-medium">總買入金額</p>
            </div>
            <p className="text-2xl font-bold text-green-200">{formatCurrency(totalStats.totalBuyIn)}</p>
          </div>
        </div>

        {/* 搜索和篩選區 */}
        <div className="bg-black bg-opacity-80 rounded-3xl p-6 backdrop-blur-md border-2 border-poker-gold-600 border-opacity-50 shadow-2xl shadow-poker-gold-500/20 mb-6">
          {/* 快捷日期範圍按鈕 */}
          <div className="mb-4">
            <label className="block text-sm font-semibold text-poker-gold-300 mb-2">快速選擇期間</label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setDateRange('today')}
                className="px-4 py-2 bg-poker-gold-600 hover:bg-poker-gold-700 text-white rounded-lg text-sm font-semibold transition-all duration-200 border-2 border-poker-gold-500 shadow-lg"
              >
                📅 今天
              </button>
              <button
                onClick={() => setDateRange('week')}
                className="px-4 py-2 bg-poker-gold-600 hover:bg-poker-gold-700 text-white rounded-lg text-sm font-semibold transition-all duration-200 border-2 border-poker-gold-500 shadow-lg"
              >
                📆 本週
              </button>
              <button
                onClick={() => setDateRange('month')}
                className="px-4 py-2 bg-poker-gold-600 hover:bg-poker-gold-700 text-white rounded-lg text-sm font-semibold transition-all duration-200 border-2 border-poker-gold-500 shadow-lg"
              >
                📊 本月
              </button>
              <button
                onClick={() => setDateRange('year')}
                className="px-4 py-2 bg-poker-gold-600 hover:bg-poker-gold-700 text-white rounded-lg text-sm font-semibold transition-all duration-200 border-2 border-poker-gold-500 shadow-lg"
              >
                📈 本年
              </button>
              <button
                onClick={() => setDateRange('all')}
                className="px-4 py-2 bg-white hover:bg-gray-100 text-black rounded-lg text-sm font-semibold transition-all duration-200 border-2 border-white shadow-lg"
              >
                🌐 全部
              </button>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-4">
            {/* 搜索框 */}
            <div className="flex-1">
              <label className="block text-sm font-semibold text-poker-gold-300 mb-2">搜索賽事或會編</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="輸入賽事名稱或會編..."
                  className="flex-1 px-4 py-2 bg-gray-900 border-2 border-poker-gold-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-poker-gold-500 focus:border-poker-gold-400 transition-all"
                />
                {searchTerm && (
                  <button
                    onClick={clearSearch}
                    className="px-4 py-2 bg-white hover:bg-gray-100 rounded-lg text-sm font-semibold text-black transition-all duration-200 border-2 border-white shadow-lg"
                  >
                    ✕ 清除
                  </button>
                )}
              </div>
            </div>

            {/* 日期範圍篩選 */}
            <div className="flex-1">
              <label className="block text-sm font-semibold text-poker-gold-300 mb-2">自訂日期範圍</label>
              <div className="flex flex-col sm:flex-row items-center gap-2">
                <div className="flex-1 flex items-center gap-2">
                  <label className="text-xs text-gray-400 whitespace-nowrap">開始日期</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    max={endDate || new Date().toISOString().split('T')[0]}
                    className="flex-1 px-4 py-2 bg-gray-900 border-2 border-poker-gold-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-poker-gold-500 focus:border-poker-gold-400 transition-all"
                  />
                </div>
                <div className="text-poker-gold-400 font-bold">~</div>
                <div className="flex-1 flex items-center gap-2">
                  <label className="text-xs text-gray-400 whitespace-nowrap">結束日期</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    min={startDate}
                    max={new Date().toISOString().split('T')[0]}
                    className="flex-1 px-4 py-2 bg-gray-900 border-2 border-poker-gold-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-poker-gold-500 focus:border-poker-gold-400 transition-all"
                  />
                </div>
                {(startDate || endDate) && (
                  <button
                    onClick={clearDateFilter}
                    className="px-4 py-2 bg-white hover:bg-gray-100 rounded-lg text-sm font-semibold text-black transition-all duration-200 border-2 border-white shadow-lg whitespace-nowrap"
                  >
                    ✕ 清除
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 賽事記錄列表 */}
        <div className="bg-black bg-opacity-80 rounded-3xl p-6 backdrop-blur-md border-2 border-poker-gold-600 border-opacity-50 shadow-2xl shadow-poker-gold-500/20">
          {filteredGroups.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <p className="text-xl mb-2">
                {searchTerm || startDate || endDate ? '沒有找到符合條件的賽事記錄' : '尚無賽事記錄'}
              </p>
              <p className="text-sm">
                {searchTerm || startDate || endDate ? '請調整搜索條件或清除篩選' : '點擊「返回首頁」創建新賽事'}
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
    </div>
  );
}
