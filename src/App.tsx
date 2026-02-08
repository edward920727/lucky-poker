import { useState } from 'react';
import IndexPage from './components/IndexPage';
import TournamentSelector from './components/TournamentSelector';
import TournamentDashboard from './components/TournamentDashboard';
import TournamentView from './components/TournamentView';
import { TournamentType, Player } from '../constants/pokerConfig';

type AppView = 'index' | 'selector' | 'dashboard' | 'view';

function App() {
  const [currentView, setCurrentView] = useState<AppView>('index');
  const [tournamentType, setTournamentType] = useState<TournamentType | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [viewingTournamentId, setViewingTournamentId] = useState<string | null>(null);

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

  if (currentView === 'index') {
    return (
      <IndexPage
        onCreateNew={handleCreateNew}
        onViewTournament={handleViewTournament}
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
