import { TournamentRecord } from '../types/tournament';

const STORAGE_KEY = 'lucky_poker_tournaments';

/**
 * 获取所有赛事记录
 */
export function getAllTournaments(): TournamentRecord[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    return JSON.parse(data);
  } catch (error) {
    console.error('读取赛事记录失败:', error);
    return [];
  }
}

/**
 * 保存赛事记录
 */
export function saveTournament(tournament: TournamentRecord): void {
  try {
    const tournaments = getAllTournaments();
    tournaments.push(tournament);
    // 按日期倒序排列（最新的在前）
    tournaments.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tournaments));
  } catch (error) {
    console.error('保存赛事记录失败:', error);
    alert('保存赛事记录失败，请重试');
  }
}

/**
 * 删除赛事记录
 */
export function deleteTournament(id: string): void {
  try {
    const tournaments = getAllTournaments();
    const filtered = tournaments.filter(t => t.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('删除赛事记录失败:', error);
    alert('删除赛事记录失败，请重试');
  }
}

/**
 * 根据 ID 获取赛事记录
 */
export function getTournamentById(id: string): TournamentRecord | null {
  const tournaments = getAllTournaments();
  return tournaments.find(t => t.id === id) || null;
}

/**
 * 更新赛事记录
 */
export function updateTournament(tournament: TournamentRecord): void {
  try {
    const tournaments = getAllTournaments();
    const index = tournaments.findIndex(t => t.id === tournament.id);
    if (index === -1) {
      throw new Error('找不到要更新的赛事记录');
    }
    
    // 重新計算統計數據
    const totalBuyInGroups = tournament.players.reduce((sum, p) => sum + p.buyInCount, 0);
    const expectedTotalChips = totalBuyInGroups * tournament.startChip;
    const actualTotalChips = tournament.players.reduce((sum, p) => sum + p.currentChips, 0);
    const totalBuyIn = tournament.players.reduce((sum, p) => {
      const entryFee = parseInt(tournament.tournamentType);
      return sum + (p.buyInCount * entryFee);
    }, 0);
    
    tournaments[index] = {
      ...tournament,
      totalPlayers: totalBuyInGroups,
      totalBuyIn,
      expectedTotalChips,
      actualTotalChips,
    };
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tournaments));
  } catch (error) {
    console.error('更新赛事记录失败:', error);
    alert('更新赛事记录失败，请重试');
  }
}