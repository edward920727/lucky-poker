import { useState, useEffect } from 'react';
import IndexPage from './components/IndexPage';
import TournamentSelector from './components/TournamentSelector';
import TournamentDashboard from './components/TournamentDashboard';
import TournamentView from './components/TournamentView';
import Login from './components/Login';
import { TournamentType, Player } from '../constants/pokerConfig';
import { isAuthenticated, logout } from './utils/auth';

type AppView = 'index' | 'selector' | 'dashboard' | 'view';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [currentView, setCurrentView] = useState<AppView>('index');
  const [tournamentType, setTournamentType] = useState<TournamentType | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [viewingTournamentId, setViewingTournamentId] = useState<string | null>(null);

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
    setPlayers([]);
  };

  const handleTournamentSelect = (type: TournamentType) => {
    setTournamentType(type);
    setPlayers([]);
    setCurrentView('dashboard');
  };

  const handleBackToSelection = () => {
    setCurrentView('selector');
    setTournamentType(null);
    setPlayers([]);
  };

  const handleBackToIndex = () => {
    setCurrentView('index');
    setTournamentType(null);
    setPlayers([]);
    setViewingTournamentId(null);
  };

  const handleSaveTournament = () => {
    setCurrentView('index');
    setTournamentType(null);
    setPlayers([]);
  };

  const handleViewTournament = (id: string) => {
    setViewingTournamentId(id);
    setCurrentView('view');
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
    return (
      <IndexPage
        onCreateNew={handleCreateNew}
        onViewTournament={handleViewTournament}
        onLogout={handleLogout}
      />
    );
  }

  if (currentView === 'selector') {
    return <TournamentSelector onSelect={handleTournamentSelect} onBack={handleBackToIndex} />;
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
        players={players}
        onPlayersChange={setPlayers}
        onBack={handleBackToSelection}
        onSave={handleSaveTournament}
      />
    );
  }

  return null;
}

export default App;
