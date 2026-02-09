import { TournamentRecord } from '../types/tournament';
import { 
  getAllTournamentsAsync as getAllTournamentsFromCloud, 
  saveTournament as saveTournamentCloud, 
  deleteTournament as deleteTournamentCloud,
  getTournamentById as getTournamentByIdCloud,
  updateTournament as updateTournamentCloud,
  setupRealtimeSync
} from './cloudStorage';

const STORAGE_KEY = 'lucky_poker_tournaments';

/**
 * 获取所有赛事记录（同步版本，用於兼容）
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
 * 異步獲取所有賽事記錄（推薦使用，支持雲端同步）
 */
export async function getAllTournamentsAsync(): Promise<TournamentRecord[]> {
  return await getAllTournamentsFromCloud();
}

/**
 * 保存赛事记录（同步版本，用於兼容）
 */
export function saveTournament(tournament: TournamentRecord): void {
  try {
    const tournaments = getAllTournaments();
    const index = tournaments.findIndex(t => t.id === tournament.id);
    if (index === -1) {
      tournaments.push(tournament);
    } else {
      tournaments[index] = tournament;
    }
    // 按日期倒序排列（最新的在前）
    tournaments.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tournaments));
    
    // 異步同步到雲端（不阻塞）
    saveTournamentCloud(tournament).catch(err => {
      console.error('雲端同步失敗（不影響本地保存）:', err);
    });
  } catch (error) {
    console.error('保存赛事记录失败:', error);
    alert('保存赛事记录失败，请重试');
  }
}

/**
 * 删除赛事记录（同步版本，用於兼容）
 */
export function deleteTournament(id: string): void {
  try {
    const tournaments = getAllTournaments();
    const filtered = tournaments.filter(t => t.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    
    // 異步從雲端刪除（不阻塞）
    deleteTournamentCloud(id).catch(err => {
      console.error('雲端刪除失敗（不影響本地刪除）:', err);
    });
  } catch (error) {
    console.error('删除赛事记录失败:', error);
    alert('删除赛事记录失败，请重试');
  }
}

/**
 * 根据 ID 获取赛事记录（同步版本，用於兼容）
 */
export function getTournamentById(id: string): TournamentRecord | null {
  const tournaments = getAllTournaments();
  return tournaments.find(t => t.id === id) || null;
}

/**
 * 異步根據 ID 獲取賽事記錄（推薦使用，支持雲端同步）
 */
export async function getTournamentByIdAsync(id: string): Promise<TournamentRecord | null> {
  try {
    return await getTournamentByIdCloud(id);
  } catch (error) {
    console.error('從雲端獲取失敗:', error);
    return getTournamentById(id);
  }
}

/**
 * 更新赛事记录（同步版本，用於兼容）
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
      const entryFee = tournament.tournamentType === 'custom' && tournament.customConfig
        ? tournament.customConfig.entryFee
        : parseInt(tournament.tournamentType);
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
    
    // 異步同步到雲端（不阻塞）
    updateTournamentCloud(tournaments[index]).catch(err => {
      console.error('雲端同步失敗（不影響本地更新）:', err);
    });
  } catch (error) {
    console.error('更新赛事记录失败:', error);
    alert('更新赛事记录失败，请重试');
  }
}

/**
 * 設置實時同步（當雲端數據變化時自動更新）
 */
export function setupRealtimeSyncForTournaments(
  onUpdate: (tournaments: TournamentRecord[]) => void
): () => void {
  return setupRealtimeSync(onUpdate);
}