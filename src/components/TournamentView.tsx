import { useEffect, useState } from 'react';
import { TournamentRecord } from '../../types/tournament';
import { getTournamentById } from '../../utils/storage';
import { TOURNAMENT_TYPES } from '../../constants/pokerConfig';
import StatsPanel from './StatsPanel';
import ExportButton from './ExportButton';

interface TournamentViewProps {
  tournamentId: string;
  onBack: () => void;
}

export default function TournamentView({ tournamentId, onBack }: TournamentViewProps) {
  const [tournament, setTournament] = useState<TournamentRecord | null>(null);

  useEffect(() => {
    const record = getTournamentById(tournamentId);
    setTournament(record);
  }, [tournamentId]);

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

  const config = TOURNAMENT_TYPES[tournament.tournamentType];
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen p-4 md:p-6 bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto">
        {/* 標題列 */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <button
              onClick={onBack}
              className="mb-4 md:mb-0 px-6 py-3 bg-white hover:bg-gray-100 text-black rounded-lg text-lg font-semibold transition-all duration-200 border-2 border-white"
            >
              ← 返回首頁
            </button>
            <h1 className="text-3xl md:text-4xl font-bold mt-2">
              {tournament.tournamentName}
            </h1>
            <p className="text-gray-400 mt-1">
              日期: {formatDate(tournament.date)} | 參賽費: NT$ {tournament.tournamentType}
            </p>
            <p className="text-gray-400 mt-1">
              起始碼量: {tournament.startChip.toLocaleString()}
            </p>
          </div>
          <div className="w-full md:w-auto">
            <ExportButton 
              players={tournament.players} 
              config={config} 
            />
          </div>
        </div>

        {/* 統計面板 */}
        <StatsPanel
          totalPlayers={tournament.totalPlayers}
          expectedTotalChips={tournament.expectedTotalChips}
          actualTotalChips={tournament.actualTotalChips}
          isBalanced={tournament.expectedTotalChips === tournament.actualTotalChips}
        />

        {/* 玩家列表（只读模式） */}
        <div className="bg-gray-800 rounded-lg p-4 md:p-6">
          <h2 className="text-xl md:text-2xl font-bold mb-4">玩家列表</h2>
          
          {/* 手機版：卡片式佈局 */}
          <div className="md:hidden space-y-3">
            {tournament.players.map((player) => (
              <div key={player.id} className="bg-gray-700 rounded-lg p-4 border border-gray-600">
                <div className="font-mono font-bold text-lg text-poker-gold-300 mb-2">{player.memberId}</div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-400">買入次數：</span>
                    <span className="font-semibold">{player.buyInCount}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">當前碼量：</span>
                    <span className="font-semibold">{player.currentChips.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* 桌面版：表格佈局 */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full min-w-[400px]">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-3 px-4">會編</th>
                  <th className="text-left py-3 px-4">買入次數</th>
                  <th className="text-left py-3 px-4">當前碼量</th>
                </tr>
              </thead>
              <tbody>
                {tournament.players.map((player) => (
                  <tr key={player.id} className="border-b border-gray-700 hover:bg-gray-700">
                    <td className="py-4 px-4 font-mono font-semibold text-xl">{player.memberId}</td>
                    <td className="py-4 px-4">{player.buyInCount}</td>
                    <td className="py-4 px-4">{player.currentChips.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
