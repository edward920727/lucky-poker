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
