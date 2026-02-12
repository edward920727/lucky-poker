import { useState, useEffect, useMemo, useCallback } from 'react';
import { TournamentRecord } from '../../types/tournament';
import { DailyReport, ExpenseRecord, ExpenseType, ActivityBonusStats, TournamentTypeStats } from '../../types/dailyReport';
import { getAllTournaments } from '../../utils/storage';
import { getDailyReport, saveDailyReport } from '../../utils/dailyReportStorage';
import { getAdministrativeFee } from '../../utils/administrativeFeeConfig';
import { TOURNAMENT_TYPES } from '../../constants/pokerConfig';
import { getTaiwanTodayDateKey, formatTaiwanDate } from '../utils/dateUtils';

interface DailyReportProps {
  onBack: () => void;
  selectedDate?: string; // 可选的日期，如果不提供则使用今天
}

const EXPENSE_TYPE_LABELS: Record<ExpenseType, string> = {
  entertainment: '招待',
  miscellaneous: '杂项',
  pt_salary: 'PT薪水',
};

const ACTIVITY_BONUS_AMOUNTS = [100, 200, 300, 500];

export default function DailyReportView({ onBack, selectedDate }: DailyReportProps) {
  console.log('DailyReportView 组件已加载', { onBack, selectedDate });
  
  const [report, setReport] = useState<DailyReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedReportDate, setSelectedReportDate] = useState<string>(() => {
    // 确保 selectedDate 是字符串类型
    let date: string;
    if (selectedDate && typeof selectedDate === 'string') {
      date = selectedDate;
    } else {
      date = getTaiwanTodayDateKey();
    }
    console.log('初始化日期:', date, 'selectedDate 类型:', typeof selectedDate);
    return date;
  });
  
  // 当 selectedDate prop 变化时更新
  useEffect(() => {
    if (selectedDate && typeof selectedDate === 'string') {
      console.log('selectedDate prop 变化，更新为:', selectedDate);
      setSelectedReportDate(selectedDate);
    }
  }, [selectedDate]);
  
  // 额外支出表单
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [expenseType, setExpenseType] = useState<ExpenseType>('miscellaneous');
  const [expenseAmount, setExpenseAmount] = useState<string>('');
  const [expenseDescription, setExpenseDescription] = useState<string>('');
  
  // 现金管理
  const [previousDayCash, setPreviousDayCash] = useState<string>('');
  const [actualCash, setActualCash] = useState<string>('');

  // 从赛事记录计算报表数据（必须在 loadData 之前定义）
  const calculateReportFromTournaments = useCallback((dayTournaments: TournamentRecord[], date: string): DailyReport => {
    // 统计各赛事类型的组数
    const tournamentStatsMap = new Map<string, TournamentTypeStats>();
    
    let totalAdministrativeFee = 0;
    const activityBonusMap = new Map<number, ActivityBonusStats>();
    
    // 初始化活动奖金统计
    ACTIVITY_BONUS_AMOUNTS.forEach(amount => {
      activityBonusMap.set(amount, { amount, count: 0, total: 0 });
    });

    dayTournaments.forEach(tournament => {
      // 计算组数（总买入次数）
      const groups = tournament.players.reduce((sum, p) => sum + p.buyInCount, 0);
      
      // 获取赛事类型和名称
      let typeKey: string = tournament.tournamentType;
      let typeName = tournament.tournamentName;
      
      if (tournament.tournamentType === 'custom' && tournament.customConfig) {
        typeKey = `custom_${tournament.customConfig.entryFee}`;
        typeName = tournament.customConfig.name || `自訂賽事 ${tournament.customConfig.entryFee}`;
      } else if (tournament.tournamentType in TOURNAMENT_TYPES) {
        typeName = TOURNAMENT_TYPES[tournament.tournamentType as keyof typeof TOURNAMENT_TYPES].name;
      }

      // 统计组数
      if (tournamentStatsMap.has(typeKey)) {
        const stats = tournamentStatsMap.get(typeKey)!;
        stats.groups += groups;
      } else {
        tournamentStatsMap.set(typeKey, {
          type: typeKey,
          name: typeName,
          groups,
        });
      }

      // 计算行政费
      const entryFee = tournament.tournamentType === 'custom' && tournament.customConfig
        ? tournament.customConfig.entryFee
        : parseInt(tournament.tournamentType);
      
      const adminFee = tournament.totalAdministrativeFee || 
        (tournament.administrativeFee ? tournament.administrativeFee * groups : 
         getAdministrativeFee(entryFee) * groups);
      
      totalAdministrativeFee += adminFee;

      // 统计活动奖金（優先使用 tournament.activityBonus，如果沒有則使用 customConfig.activityBonus）
      const bonusAmount = tournament.activityBonus || 
        (tournament.tournamentType === 'custom' && tournament.customConfig?.activityBonus) || 
        0;
      
      if (bonusAmount > 0) {
        if (activityBonusMap.has(bonusAmount)) {
          const stats = activityBonusMap.get(bonusAmount)!;
          stats.count += 1;
          stats.total += bonusAmount;
        } else {
          // 如果不是标准金额，也记录
          activityBonusMap.set(bonusAmount, {
            amount: bonusAmount,
            count: 1,
            total: bonusAmount,
          });
        }
      }
    });

    const tournamentStats = Array.from(tournamentStatsMap.values());
    const activityBonuses = Array.from(activityBonusMap.values())
      .filter(s => s.count > 0)
      .sort((a, b) => a.amount - b.amount);
    
    const totalActivityBonus = activityBonuses.reduce((sum, s) => sum + s.total, 0);
    const totalIncome = totalAdministrativeFee + totalActivityBonus;

    return {
      id: date,
      date,
      tournamentStats,
      totalAdministrativeFee,
      activityBonuses,
      totalActivityBonus,
      totalIncome,
      expenses: [],
      totalExpenses: 0,
      previousDayCash: 0, // 将在加载时从前一天报表获取
      expectedCash: 0, // 将在保存时更新
      actualCash: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }, []);

  const loadData = useCallback(async () => {
    console.log('开始加载报表数据，日期:', selectedReportDate);
    setIsLoading(true);
    try {
      // 加载赛事记录
      const allTournaments = getAllTournaments();
      console.log('获取到所有赛事:', allTournaments.length);
      const dateKey = selectedReportDate.split('T')[0];
      console.log('筛选日期键:', dateKey);
      
      // 筛选当天的赛事
      const dayTournaments = allTournaments.filter(t => {
        const tournamentDate = t.date.split('T')[0];
        return tournamentDate === dateKey;
      });

      // 加载或创建报表
      let existingReport: DailyReport | null = null;
      try {
        existingReport = await getDailyReport(dateKey);
      } catch (error) {
        console.warn('获取报表失败，将创建新报表:', error);
      }

      if (existingReport) {
        console.log('找到已存在的报表:', existingReport);
        setReport(existingReport);
        setPreviousDayCash(existingReport.previousDayCash.toString());
        setActualCash(existingReport.actualCash.toString());
      } else {
        console.log('创建新报表，当天赛事数:', dayTournaments.length);
        // 创建新报表
        const newReport = calculateReportFromTournaments(dayTournaments, dateKey);
        console.log('新报表创建完成:', newReport);
        
        // 尝试获取前一天的报表来计算前日现金
        try {
          const prevDate = new Date(dateKey);
          prevDate.setDate(prevDate.getDate() - 1);
          const prevDateKey = prevDate.toISOString().split('T')[0];
          const prevReport = await getDailyReport(prevDateKey);
          if (prevReport) {
            newReport.previousDayCash = prevReport.actualCash || 0;
          }
        } catch (error) {
          console.warn('获取前一天报表失败:', error);
        }
        
        setReport(newReport);
        setPreviousDayCash(newReport.previousDayCash.toString());
        setActualCash(newReport.actualCash.toString());
      }
    } catch (error) {
      console.error('加载报表数据失败:', error);
      // 即使出错也创建一个空报表，避免一直显示加载中
      const dateKey = selectedReportDate.split('T')[0];
      console.log('创建空报表，日期键:', dateKey);
      const emptyReport: DailyReport = {
        id: dateKey,
        date: dateKey,
        tournamentStats: [],
        totalAdministrativeFee: 0,
        activityBonuses: [],
        totalActivityBonus: 0,
        totalIncome: 0,
        expenses: [],
        totalExpenses: 0,
        previousDayCash: 0,
        expectedCash: 0,
        actualCash: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setReport(emptyReport);
      setPreviousDayCash('0');
      setActualCash('0');
      console.log('已设置空报表');
    } finally {
      setIsLoading(false);
      console.log('加载完成，isLoading 设为 false');
    }
  }, [selectedReportDate, calculateReportFromTournaments]);

  // 立即显示一个测试内容，确保组件被渲染
  useEffect(() => {
    console.log('DailyReportView useEffect 执行');
  }, []);
  
  // 加载数据
  useEffect(() => {
    console.log('开始调用 loadData');
    loadData();
  }, [loadData]);

  // 监听赛事数据变化，自动更新报表
  useEffect(() => {
    const handleTournamentUpdate = () => {
      if (report) {
        // 重新加载所有赛事数据
        const allTournaments = getAllTournaments();
        const dateKey = selectedReportDate.split('T')[0];
        const dayTournaments = allTournaments.filter(t => {
          const tournamentDate = t.date.split('T')[0];
          return tournamentDate === dateKey;
        });
        
        // 重新计算报表数据
        const updatedReport = calculateReportFromTournaments(dayTournaments, dateKey);
        // 保留现有的支出和现金数据
        updatedReport.expenses = report.expenses;
        updatedReport.totalExpenses = report.totalExpenses;
        updatedReport.previousDayCash = report.previousDayCash;
        updatedReport.actualCash = report.actualCash;
        updatedReport.expectedCash = report.previousDayCash + updatedReport.totalIncome - updatedReport.totalExpenses;
        setReport(updatedReport);
      }
    };

    window.addEventListener('tournament-updated', handleTournamentUpdate);
    return () => {
      window.removeEventListener('tournament-updated', handleTournamentUpdate);
    };
  }, [report, selectedReportDate, calculateReportFromTournaments]);


  // 刷新報表數據（重新從賽事記錄收集）
  const handleRefresh = useCallback(async () => {
    if (!report) return;
    
    setIsLoading(true);
    try {
      // 重新加載所有賽事記錄
      const allTournaments = getAllTournaments();
      const dateKey = selectedReportDate.split('T')[0];
      
      // 篩選當天的賽事
      const dayTournaments = allTournaments.filter(t => {
        const tournamentDate = t.date.split('T')[0];
        return tournamentDate === dateKey;
      });

      // 重新計算報表數據（從賽事記錄）
      const refreshedReport = calculateReportFromTournaments(dayTournaments, dateKey);
      
      // 保留現有的支出和現金數據（用戶手動輸入的）
      // 使用當前輸入框的值（如果用戶已修改但未保存）
      const currentPrevCash = parseFloat(previousDayCash) || report.previousDayCash || 0;
      const currentActualCash = parseFloat(actualCash) || report.actualCash || 0;
      
      refreshedReport.expenses = report.expenses;
      refreshedReport.totalExpenses = report.totalExpenses;
      refreshedReport.previousDayCash = currentPrevCash;
      refreshedReport.actualCash = currentActualCash;
      refreshedReport.expectedCash = currentPrevCash + refreshedReport.totalIncome - refreshedReport.totalExpenses;
      
      // 保留創建時間，更新修改時間
      refreshedReport.createdAt = report.createdAt;
      refreshedReport.updatedAt = new Date().toISOString();
      
      setReport(refreshedReport);
      // 同步更新輸入框的值
      setPreviousDayCash(currentPrevCash.toString());
      setActualCash(currentActualCash.toString());
      
      alert('報表數據已刷新！');
    } catch (error) {
      console.error('刷新報表數據失敗:', error);
      alert('刷新報表數據失敗，請重試');
    } finally {
      setIsLoading(false);
    }
  }, [report, selectedReportDate, calculateReportFromTournaments, previousDayCash, actualCash]);

  // 保存报表
  const handleSave = async () => {
    if (!report) return;

    const prevCash = parseFloat(previousDayCash) || 0;
    const actual = parseFloat(actualCash) || 0;
    const expected = prevCash + report.totalIncome - report.totalExpenses;

    const updatedReport: DailyReport = {
      ...report,
      previousDayCash: prevCash,
      expectedCash: expected,
      actualCash: actual,
      updatedAt: new Date().toISOString(),
    };

    try {
      await saveDailyReport(updatedReport);
      setReport(updatedReport);
      alert('报表已保存');
    } catch (error) {
      console.error('保存报表失败:', error);
      alert('保存报表失败，请重试');
    }
  };

  // 添加额外支出
  const handleAddExpense = () => {
    const amount = parseFloat(expenseAmount);
    if (!amount || amount <= 0) {
      alert('请输入有效的金额');
      return;
    }

    if (!report) return;

    const newExpense: ExpenseRecord = {
      id: Date.now().toString(),
      type: expenseType,
      amount,
      description: expenseDescription.trim() || undefined,
      createdAt: new Date().toISOString(),
    };

    const updatedExpenses = [...report.expenses, newExpense];
    const totalExpenses = updatedExpenses.reduce((sum, e) => sum + e.amount, 0);

    const updatedReport: DailyReport = {
      ...report,
      expenses: updatedExpenses,
      totalExpenses,
      updatedAt: new Date().toISOString(),
    };

    setReport(updatedReport);
    setExpenseAmount('');
    setExpenseDescription('');
    setShowExpenseForm(false);
  };

  // 删除支出
  const handleDeleteExpense = (expenseId: string) => {
    if (!report) return;
    if (!confirm('确定要删除这笔支出吗？')) return;

    const updatedExpenses = report.expenses.filter(e => e.id !== expenseId);
    const totalExpenses = updatedExpenses.reduce((sum, e) => sum + e.amount, 0);

    const updatedReport: DailyReport = {
      ...report,
      expenses: updatedExpenses,
      totalExpenses,
      updatedAt: new Date().toISOString(),
    };

    setReport(updatedReport);
  };

  // 计算今日应有现金
  const expectedCash = useMemo(() => {
    if (!report) return 0;
    const prevCash = parseFloat(previousDayCash) || 0;
    return prevCash + report.totalIncome - report.totalExpenses;
  }, [report, previousDayCash]);

  // 计算现金差异
  const cashDifference = useMemo(() => {
    const expected = expectedCash;
    const actual = parseFloat(actualCash) || 0;
    return actual - expected;
  }, [expectedCash, actualCash]);

  console.log('渲染检查 - isLoading:', isLoading, 'report:', report);
  
  // 如果正在加载，显示加载画面
  if (isLoading) {
    console.log('显示加载中画面');
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center" style={{ backgroundColor: '#000' }}>
        <div className="text-center">
          <div className="text-6xl mb-4 filter drop-shadow-[0_0_15px_rgba(255,215,0,0.8)]">📊</div>
          <div className="text-poker-gold-400 text-xl font-semibold">載入中...</div>
        </div>
      </div>
    );
  }

  // 确保 report 存在
  const displayReport = report || (() => {
    const dateKey = selectedReportDate.split('T')[0];
    const emptyReport: DailyReport = {
      id: dateKey,
      date: dateKey,
      tournamentStats: [],
      totalAdministrativeFee: 0,
      activityBonuses: [],
      totalActivityBonus: 0,
      totalIncome: 0,
      expenses: [],
      totalExpenses: 0,
      previousDayCash: 0,
      expectedCash: 0,
      actualCash: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    console.log('使用空报表作为显示报表:', emptyReport);
    return emptyReport;
  })();

  console.log('准备渲染报表界面，displayReport:', displayReport);
  
  // 如果还是没有报表，至少显示一个基本界面
  if (!displayReport) {
    console.error('displayReport 仍然为 null 或 undefined');
    return (
      <div className="min-h-screen bg-black text-white p-4 md:p-8" style={{ backgroundColor: '#000' }}>
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold text-red-400 mb-4">錯誤：無法載入報表</h1>
          <button
            onClick={onBack}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg"
          >
            返回
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#000000', 
      color: '#ffffff', 
      padding: '2rem',
      width: '100%',
      position: 'relative',
      zIndex: 1
    }}>
      <div style={{ 
        maxWidth: '1200px', 
        margin: '0 auto',
        color: '#ffffff'
      }}>
        {/* 标题栏 */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          marginBottom: '1.5rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button
              onClick={onBack}
              style={{ 
                backgroundColor: '#374151', 
                color: '#ffffff', 
                padding: '0.5rem 1rem', 
                borderRadius: '0.5rem',
                border: 'none',
                cursor: 'pointer',
                fontSize: '1rem'
              }}
            >
              ← 返回
            </button>
            <div>
              <h1 style={{ 
                fontSize: '2rem', 
                fontWeight: 'bold', 
                color: '#fbbf24',
                margin: 0
              }}>
                📊 每日報表
              </h1>
              <p style={{ 
                color: '#9ca3af', 
                marginTop: '0.25rem',
                fontSize: '0.875rem',
                margin: 0
              }}>
                {formatTaiwanDate(selectedReportDate, {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  weekday: 'long',
                })}
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              type="date"
              id="report-date"
              name="report-date"
              value={selectedReportDate}
              onChange={(e) => setSelectedReportDate(e.target.value)}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#1f2937',
                border: '1px solid #4b5563',
                borderRadius: '0.5rem',
                color: '#ffffff',
                fontSize: '1rem'
              }}
            />
            <button
              onClick={handleRefresh}
              disabled={isLoading}
              style={{
                padding: '0.5rem 1.5rem',
                backgroundColor: isLoading ? '#6b7280' : '#3b82f6',
                color: '#ffffff',
                borderRadius: '0.5rem',
                border: 'none',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                fontWeight: '600',
                fontSize: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
              title="重新收集當天的賽事數據"
            >
              {isLoading ? (
                <>
                  <span>🔄</span>
                  <span>刷新中...</span>
                </>
              ) : (
                <>
                  <span>🔄</span>
                  <span>刷新</span>
                </>
              )}
            </button>
            <button
              onClick={handleSave}
              style={{
                padding: '0.5rem 1.5rem',
                backgroundColor: '#d97706',
                color: '#ffffff',
                borderRadius: '0.5rem',
                border: 'none',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '1rem'
              }}
            >
              保存
            </button>
          </div>
        </div>

        {/* 赛事统计 */}
        <div style={{
          backgroundColor: '#1f2937',
          borderRadius: '1rem',
          padding: '1.5rem',
          marginBottom: '1.5rem',
          border: '2px solid rgba(217, 119, 6, 0.4)'
        }}>
          <h2 style={{
            fontSize: '1.5rem',
            fontWeight: 'bold',
            color: '#fbbf24',
            marginBottom: '1rem'
          }}>
            🎯 賽事統計
          </h2>
          {displayReport.tournamentStats.length > 0 ? (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1rem'
            }}>
              {displayReport.tournamentStats.map((stat) => (
                <div
                  key={stat.type}
                  style={{
                    backgroundColor: '#374151',
                    borderRadius: '0.75rem',
                    padding: '1rem',
                    border: '1px solid #4b5563'
                  }}
                >
                  <div style={{ color: '#9ca3af', fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                    {stat.name}
                  </div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#ffffff' }}>
                    {stat.groups} 組
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ color: '#9ca3af', textAlign: 'center', padding: '2rem' }}>
              當天沒有賽事記錄
            </div>
          )}
        </div>

        {/* 收入统计 */}
        <div className="bg-gradient-to-br from-green-900 to-green-800 rounded-2xl p-6 mb-6 border-2 border-green-600 border-opacity-40 shadow-xl">
          <h2 className="text-2xl font-display font-bold text-green-300 mb-4">
            💰 收入統計
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 行政费 */}
            <div className="bg-green-800 bg-opacity-50 rounded-xl p-4">
              <div className="text-green-200 text-sm mb-2">總行政費</div>
              <div className="text-3xl font-bold text-white">
                NT$ {displayReport.totalAdministrativeFee.toLocaleString()}
              </div>
            </div>

            {/* 活动奖金 */}
            <div className="bg-green-800 bg-opacity-50 rounded-xl p-4">
              <div className="text-green-200 text-sm mb-2">活動獎金總額</div>
              <div className="text-3xl font-bold text-white">
                NT$ {displayReport.totalActivityBonus.toLocaleString()}
              </div>
            </div>
          </div>

          {/* 活动奖金明细 */}
          {displayReport.activityBonuses.length > 0 && (
            <div className="mt-4">
              <div className="text-green-200 text-sm mb-2">活動獎金明細</div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {displayReport.activityBonuses.map((bonus) => (
                  <div
                    key={bonus.amount}
                    className="bg-green-800 bg-opacity-30 rounded-lg p-3 border border-green-600"
                  >
                    <div className="text-green-200 text-xs mb-1">NT$ {bonus.amount}</div>
                    <div className="text-white font-semibold">
                      {bonus.count} 次
                    </div>
                    <div className="text-green-300 text-sm">
                      小計: NT$ {bonus.total.toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 总收入 */}
          <div className="mt-4 pt-4 border-t border-green-600">
            <div className="flex justify-between items-center">
              <div className="text-green-200 text-lg font-semibold">總收入</div>
              <div className="text-4xl font-bold text-white">
                NT$ {displayReport.totalIncome.toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        {/* 支出统计 */}
        <div className="bg-gradient-to-br from-red-900 to-red-800 rounded-2xl p-6 mb-6 border-2 border-red-600 border-opacity-40 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-display font-bold text-red-300">
              💸 支出統計
            </h2>
            <button
              onClick={() => setShowExpenseForm(!showExpenseForm)}
              className="px-4 py-2 bg-red-700 hover:bg-red-600 rounded-lg transition-colors text-sm"
            >
              {showExpenseForm ? '取消' : '+ 新增支出'}
            </button>
          </div>

          {/* 新增支出表单 */}
          {showExpenseForm && (
            <div className="bg-red-800 bg-opacity-50 rounded-xl p-4 mb-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <select
                  id="expense-type"
                  name="expense-type"
                  value={expenseType}
                  onChange={(e) => setExpenseType(e.target.value as ExpenseType)}
                  className="px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white"
                >
                  {Object.entries(EXPENSE_TYPE_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
                <input
                  type="number"
                  id="expense-amount"
                  name="expense-amount"
                  placeholder="金額"
                  value={expenseAmount}
                  onChange={(e) => setExpenseAmount(e.target.value)}
                  className="px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white"
                />
                <input
                  type="text"
                  id="expense-description"
                  name="expense-description"
                  placeholder="備註（選填）"
                  value={expenseDescription}
                  onChange={(e) => setExpenseDescription(e.target.value)}
                  className="px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white"
                />
                <button
                  onClick={handleAddExpense}
                  className="px-4 py-2 bg-green-600 hover:bg-green-500 rounded-lg transition-colors"
                >
                  添加
                </button>
              </div>
            </div>
          )}

          {/* 支出列表 */}
          {displayReport.expenses.length > 0 ? (
            <div className="space-y-2 mb-4">
              {displayReport.expenses.map((expense) => (
                <div
                  key={expense.id}
                  className="bg-red-800 bg-opacity-50 rounded-lg p-3 flex items-center justify-between"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-red-200 font-semibold">
                      {EXPENSE_TYPE_LABELS[expense.type]}
                    </span>
                    <span className="text-white">NT$ {expense.amount.toLocaleString()}</span>
                    {expense.description && (
                      <span className="text-red-300 text-sm">({expense.description})</span>
                    )}
                  </div>
                  <button
                    onClick={() => handleDeleteExpense(expense.id)}
                    className="px-3 py-1 bg-red-700 hover:bg-red-600 rounded transition-colors text-sm"
                  >
                    刪除
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-red-200 text-center py-4">暫無支出記錄</div>
          )}

          {/* 总支出 */}
          <div className="pt-4 border-t border-red-600">
            <div className="flex justify-between items-center">
              <div className="text-red-200 text-lg font-semibold">總支出</div>
              <div className="text-3xl font-bold text-white">
                NT$ {displayReport.totalExpenses.toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        {/* 现金管理 */}
        <div className="bg-gradient-to-br from-blue-900 to-blue-800 rounded-2xl p-6 mb-6 border-2 border-blue-600 border-opacity-40 shadow-xl">
          <h2 className="text-2xl font-display font-bold text-blue-300 mb-4">
            💵 現金管理
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-blue-800 bg-opacity-50 rounded-xl p-4">
              <div className="text-blue-200 text-sm mb-2">前日櫃檯現金</div>
              <input
                type="number"
                id="previous-day-cash"
                name="previous-day-cash"
                value={previousDayCash}
                onChange={(e) => setPreviousDayCash(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-2xl font-bold"
                placeholder="0"
              />
            </div>
            <div className="bg-blue-800 bg-opacity-50 rounded-xl p-4">
              <div className="text-blue-200 text-sm mb-2">今日應有現金</div>
              <div className="text-3xl font-bold text-white">
                NT$ {expectedCash.toLocaleString()}
              </div>
              <div className="text-blue-200 text-xs mt-1">
                (前日 + 收入 - 支出)
              </div>
            </div>
            <div className="bg-blue-800 bg-opacity-50 rounded-xl p-4">
              <div className="text-blue-200 text-sm mb-2">實際現金</div>
              <input
                type="number"
                id="actual-cash"
                name="actual-cash"
                value={actualCash}
                onChange={(e) => setActualCash(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-2xl font-bold"
                placeholder="0"
              />
            </div>
            <div className="bg-blue-800 bg-opacity-50 rounded-xl p-4">
              <div className="text-blue-200 text-sm mb-2">現金差異</div>
              <div className={`text-3xl font-bold ${cashDifference >= 0 ? 'text-green-300' : 'text-red-300'}`}>
                {cashDifference >= 0 ? '+' : ''}NT$ {cashDifference.toLocaleString()}
              </div>
              <div className="text-blue-200 text-xs mt-1">
                (實際 - 應有)
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
