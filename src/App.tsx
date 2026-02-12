import { useState, useEffect } from 'react';
import IndexPage from './components/IndexPage';
import TournamentSelector from './components/TournamentSelector';
import TournamentDashboard from './components/TournamentDashboard';
import TournamentView from './components/TournamentView';
import TournamentSettlement from './components/TournamentSettlement';
import UserManagement from './components/UserManagement';
import AllTournamentsView from './components/AllTournamentsView';
import QuickEditView from './components/QuickEditView';
import SystemSecuritySettings from './components/SystemSecuritySettings';
import DailyReport from './components/DailyReport';
import Login from './components/Login';
import { TournamentType, Player } from '../constants/pokerConfig';
import { CustomTournamentConfig } from '../types/tournament';
import { isAuthenticated, logout, getCurrentUsername } from './utils/auth';
import { isAdmin } from './utils/userManagement';

type AppView = 'index' | 'selector' | 'dashboard' | 'view' | 'userManagement' | 'systemSecurity' | 'allTournaments' | 'settlement' | 'quickEdit' | 'dailyReport';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [currentView, setCurrentView] = useState<AppView>('index');
  const [tournamentType, setTournamentType] = useState<TournamentType | null>(null);
  const [customConfig, setCustomConfig] = useState<CustomTournamentConfig | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [viewingTournamentId, setViewingTournamentId] = useState<string | null>(null);
  const [selectedReportDate, setSelectedReportDate] = useState<string | undefined>(undefined);

  // 檢查登入狀態
  useEffect(() => {
    const checkAuth = () => {
      const authenticated = isAuthenticated();
      setIsLoggedIn(authenticated);
      setIsCheckingAuth(false);
    };
    checkAuth();
  }, []);

  // 處理登入成功
  const handleLoginSuccess = () => {
    setIsLoggedIn(true);
  };

  // 處理登出
  const handleLogout = () => {
    logout();
    setIsLoggedIn(false);
    setCurrentView('index');
    setTournamentType(null);
    setPlayers([]);
    setViewingTournamentId(null);
  };

  const handleCreateNew = () => {
    setCurrentView('selector');
    setTournamentType(null);
    setCustomConfig(null);
    setPlayers([]);
  };

  const handleTournamentSelect = (type: TournamentType) => {
    setTournamentType(type);
    setCustomConfig(null);
    setPlayers([]);
    setCurrentView('dashboard');
  };

  const handleCreateCustom = (config: CustomTournamentConfig) => {
    setTournamentType('custom');
    setCustomConfig(config);
    setPlayers([]);
    setCurrentView('dashboard');
  };

  const handleBackToSelection = () => {
    setCurrentView('selector');
    setTournamentType(null);
    setCustomConfig(null);
    setPlayers([]);
  };

  const handleBackToIndex = () => {
    setCurrentView('index');
    setTournamentType(null);
    setCustomConfig(null);
    setPlayers([]);
    setViewingTournamentId(null);
  };

  const handleSaveTournament = () => {
    setCurrentView('index');
    setTournamentType(null);
    setCustomConfig(null);
    setPlayers([]);
  };

  const handleViewTournament = (id: string) => {
    setViewingTournamentId(id);
    setCurrentView('view');
  };

  const handleQuickEdit = (id: string) => {
    setViewingTournamentId(id);
    setCurrentView('quickEdit');
  };

  const handleBackFromQuickEdit = () => {
    setCurrentView('index');
    setViewingTournamentId(null);
  };

  const handleOpenUserManagement = () => {
    setCurrentView('userManagement');
  };

  const handleBackFromUserManagement = () => {
    setCurrentView('index');
  };

  const handleOpenSystemSecurity = () => {
    setCurrentView('systemSecurity');
  };

  const handleBackFromSystemSecurity = () => {
    setCurrentView('index');
  };

  const handleViewAllTournaments = () => {
    setCurrentView('allTournaments');
  };

  const handleBackFromAllTournaments = () => {
    setCurrentView('index');
  };

  const handleOpenSettlement = (tournamentId?: string) => {
    setViewingTournamentId(tournamentId || null);
    setCurrentView('settlement');
  };

  const handleBackFromSettlement = () => {
    setCurrentView('index');
    setViewingTournamentId(null);
  };

  const handleSaveSettlement = () => {
    setCurrentView('index');
    setViewingTournamentId(null);
  };

  const handleOpenDailyReport = (date?: string) => {
    if (date && typeof date === 'string') {
      setSelectedReportDate(date);
    } else {
      setSelectedReportDate(undefined);
    }
    setCurrentView('dailyReport');
  };

  const handleBackFromDailyReport = () => {
    setSelectedReportDate(undefined);
    setCurrentView('index');
  };

  // 如果正在檢查登入狀態，顯示載入畫面
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center">
          <div className="text-6xl mb-4 filter drop-shadow-[0_0_15px_rgba(255,215,0,0.8)]">🃏</div>
          <div className="text-poker-gold-400 text-xl font-semibold">載入中...</div>
        </div>
      </div>
    );
  }

  // 如果未登入，顯示登入頁面
  if (!isLoggedIn) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  // 已登入，顯示應用程式內容
  if (currentView === 'index') {
    const currentUsername = getCurrentUsername();
    const userIsAdmin = currentUsername ? isAdmin(currentUsername) : false;
    
    return (
      <IndexPage
        onCreateNew={handleCreateNew}
        onViewTournament={handleViewTournament}
        onLogout={handleLogout}
        onOpenUserManagement={userIsAdmin ? handleOpenUserManagement : undefined}
        onOpenSystemSecurity={userIsAdmin ? handleOpenSystemSecurity : undefined}
        onViewAllTournaments={handleViewAllTournaments}
        onQuickEdit={handleQuickEdit}
        onOpenDailyReport={handleOpenDailyReport}
      />
    );
  }

  if (currentView === 'allTournaments') {
    return (
      <AllTournamentsView
        onBack={handleBackFromAllTournaments}
        onViewTournament={handleViewTournament}
        onOpenDailyReport={handleOpenDailyReport}
      />
    );
  }

  if (currentView === 'userManagement') {
    const currentUsername = getCurrentUsername();
    const userIsAdmin = currentUsername ? isAdmin(currentUsername) : false;
    
    // 如果不是管理員，強制返回首頁
    if (!userIsAdmin) {
      setCurrentView('index');
      return null;
    }
    
    return <UserManagement onBack={handleBackFromUserManagement} />;
  }

  if (currentView === 'systemSecurity') {
    const currentUsername = getCurrentUsername();
    const userIsAdmin = currentUsername ? isAdmin(currentUsername) : false;
    
    // 如果不是管理員，強制返回首頁
    if (!userIsAdmin) {
      setCurrentView('index');
      return null;
    }
    
    return <SystemSecuritySettings onBack={handleBackFromSystemSecurity} />;
  }

  if (currentView === 'selector') {
    return <TournamentSelector onSelect={handleTournamentSelect} onCreateCustom={handleCreateCustom} onOpenSettlement={() => handleOpenSettlement()} onBack={handleBackToIndex} />;
  }

  if (currentView === 'view' && viewingTournamentId) {
    return (
      <TournamentView
        tournamentId={viewingTournamentId}
        onBack={handleBackToIndex}
      />
    );
  }

  if (currentView === 'dashboard' && tournamentType) {
    return (
      <TournamentDashboard
        tournamentType={tournamentType}
        customConfig={customConfig}
        players={players}
        onPlayersChange={setPlayers}
        onBack={handleBackToSelection}
        onSave={handleSaveTournament}
      />
    );
  }

  if (currentView === 'settlement') {
    return (
      <TournamentSettlement
        onBack={handleBackFromSettlement}
        onSave={handleSaveSettlement}
      />
    );
  }

  if (currentView === 'quickEdit' && viewingTournamentId) {
    return (
      <QuickEditView
        tournamentId={viewingTournamentId}
        onBack={handleBackFromQuickEdit}
      />
    );
  }

  if (currentView === 'dailyReport') {
    return (
      <DailyReport
        onBack={handleBackFromDailyReport}
        selectedDate={selectedReportDate}
      />
    );
  }

  return null;
}

export default App;
