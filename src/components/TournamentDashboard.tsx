import { useState, useEffect } from 'react';
import { TournamentType, Player, TOURNAMENT_TYPES, PLAYER_HISTORY_DB, PaymentMethod } from '../../constants/pokerConfig';
import PlayerList from './PlayerList';
import StatsPanel from './StatsPanel';
import PlayerInput from './PlayerInput';
import ExportButton from './ExportButton';
import PrizePoolCalculator from './PrizePoolCalculator';
import FinancialStats from './FinancialStats';
import { saveTournament, getAllTournaments } from '../../utils/storage';
import { TournamentRecord, CustomTournamentConfig } from '../../types/tournament';
import { getTaiwanDateTime, getTaiwanTodayDateKey, getDateKey } from '../utils/dateUtils';
import { logAction } from '../../utils/auditLog';
import { PrizeCalculationResult } from '../../utils/prizeCalculator';
import { getAdministrativeFee } from '../../utils/administrativeFeeConfig';
import { checkIPAuthorization } from '../../utils/systemSecurity';

interface TournamentDashboardProps {
  tournamentType: TournamentType;
  customConfig?: CustomTournamentConfig | null;
  players: Player[];
  onPlayersChange: (players: Player[]) => void;
  onBack: () => void;
  onSave?: () => void;
}

export default function TournamentDashboard({
  tournamentType,
  customConfig,
  players,
  onPlayersChange,
  onBack,
  onSave,
}: TournamentDashboardProps) {
  // 判斷是否為自定義賽事
  const isCustom = tournamentType === 'custom' && customConfig;
  const config = isCustom 
    ? { name: customConfig.name, startChip: customConfig.startChip }
    : TOURNAMENT_TYPES[tournamentType as keyof typeof TOURNAMENT_TYPES];
  const entryFee = isCustom ? customConfig.entryFee : parseInt(tournamentType);
  
  const totalBuyInGroups = players.reduce((sum, p) => sum + p.buyInCount, 0);
  const expectedTotalChips = totalBuyInGroups * config.startChip;
  const actualTotalChips = players.reduce((sum, p) => sum + p.currentChips, 0);
  const isBalanced = expectedTotalChips === actualTotalChips;
  const [prizeCalculation, setPrizeCalculation] = useState<PrizeCalculationResult | null>(null);
  const [tournamentNumber, setTournamentNumber] = useState<number | null>(null);
  const [showNumberInput, setShowNumberInput] = useState(false);
  const [activityBonus, setActivityBonus] = useState<number>(isCustom && customConfig && customConfig.activityBonus ? customConfig.activityBonus : 0);

  // 自動計算當天同類型賽事的場次
  useEffect(() => {
    const todayKey = getTaiwanTodayDateKey();
    const allTournaments = getAllTournaments();
    
    // 獲取今天同類型的所有賽事（使用台灣時區）
    const todaySameTypeTournaments = allTournaments.filter(t => {
      const tournamentDate = getDateKey(t.date);
      return tournamentDate === todayKey && t.tournamentType === tournamentType;
    });

    // 從賽事名稱中提取場次號碼
    const extractNumber = (name: string): number | null => {
      const match = name.match(/#(\d+)$/);
      return match ? parseInt(match[1]) : null;
    };

    // 找出已有的最大場次號碼
    const existingNumbers = todaySameTypeTournaments
      .map(t => extractNumber(t.tournamentName))
      .filter((n): n is number => n !== null);

    const maxNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) : 0;
    const nextNumber = maxNumber + 1;

    // 如果沒有手動設置，使用自動計算的場次
    if (tournamentNumber === null) {
      setTournamentNumber(nextNumber);
    }
  }, [tournamentType, tournamentNumber]);

  const handleAddPlayer = (memberId: string, paymentMethod: PaymentMethod) => {
    // 檢查是否已存在
    if (players.some(p => p.memberId === memberId)) {
      alert('該會編已存在！');
      return;
    }

    const history = PLAYER_HISTORY_DB[memberId] || [];
    const newPlayer: Player = {
      id: Date.now().toString(),
      memberId,
      buyInCount: 1,
      currentChips: config.startChip,
      paymentMethod,
      history,
    };

    onPlayersChange([...players, newPlayer]);
    logAction('create', memberId);
  };

  const handleUpdatePlayer = async (id: string, updates: Partial<Player>) => {
    const player = players.find(p => p.id === id);
    if (!player) return;

    // 如果修改筹码或买入次数，检查 IP 授权
    if ((updates.currentChips !== undefined && updates.currentChips !== player.currentChips) ||
        (updates.buyInCount !== undefined && updates.buyInCount !== player.buyInCount)) {
      const ipCheck = await checkIPAuthorization();
      if (!ipCheck.authorized) {
        alert(ipCheck.message || '非授權網路，禁止修改');
        return;
      }
    }

    // 记录操作日志
    if (updates.currentChips !== undefined && updates.currentChips !== player.currentChips) {
      logAction('chip_change', player.memberId, undefined, 'currentChips', player.currentChips, updates.currentChips);
    }
    if (updates.buyInCount !== undefined && updates.buyInCount !== player.buyInCount) {
      logAction('buyin', player.memberId, undefined, 'buyInCount', player.buyInCount, updates.buyInCount);
    }
    if (updates.paymentMethod !== undefined && updates.paymentMethod !== player.paymentMethod) {
      logAction('update', player.memberId, undefined, 'paymentMethod', player.paymentMethod, updates.paymentMethod);
    }

    onPlayersChange(
      players.map(p => p.id === id ? { ...p, ...updates } : p)
    );
  };

  const handleRemovePlayer = (id: string) => {
    const player = players.find(p => p.id === id);
    if (player) {
      logAction('delete', player.memberId);
    }
    onPlayersChange(players.filter(p => p.id !== id));
  };

  const handleSaveTournament = async () => {
    // 檢查 IP 授權
    const ipCheck = await checkIPAuthorization();
    if (!ipCheck.authorized) {
      alert(ipCheck.message || '非授權網路，禁止修改');
      return;
    }

    if (players.length === 0) {
      alert('請至少新增一名玩家');
      return;
    }

    if (!isBalanced) {
      if (!confirm('碼量不平衡，確定要保存嗎？')) {
        return;
      }
    }

    const totalBuyIn = players.reduce((sum, p) => {
      return sum + (p.buyInCount * entryFee);
    }, 0);

    // 計算行政費和獎池
    const administrativeFeePerPerson = isCustom && customConfig
      ? customConfig.administrativeFee
      : getAdministrativeFee(entryFee);
    const totalAdministrativeFee = administrativeFeePerPerson * totalBuyInGroups;
    
    // 使用狀態中的活動獎金（如果已修改）或從配置中獲取
    const finalActivityBonus = activityBonus > 0 ? activityBonus : 
      (isCustom && customConfig && customConfig.activityBonus ? customConfig.activityBonus : 0);
    
    // 財務資訊的總獎池 = (報名費 - 行政費) × 組數 - 活動獎金（不扣提撥）
    const totalPrizePool = (entryFee - administrativeFeePerPerson) * totalBuyInGroups - finalActivityBonus;
    
    // 獲取提撥金（用於保存，但不影響財務資訊的總獎池計算）
    const totalDeduction = isCustom && customConfig && customConfig.totalDeduction
      ? customConfig.totalDeduction
      : 0;

    // 構建賽事名稱，如果設置了場次號碼，添加到名稱後面
    let tournamentName: string = config.name;
    if (tournamentNumber !== null && tournamentNumber > 0) {
      tournamentName = `${config.name}#${tournamentNumber}`;
    }

    // 使用台灣時區生成日期字符串（getTaiwanDateTime 已包含驗證邏輯）
    const taiwanDateTime = getTaiwanDateTime();
    
    // 驗證日期格式是否有效（getTaiwanDateTime 應該總是返回有效日期，這裡只是雙重檢查）
    const testDate = new Date(taiwanDateTime);
    if (isNaN(testDate.getTime())) {
      console.error('生成的日期無效，這不應該發生:', taiwanDateTime);
      // 如果確實無效，使用 ISO 格式作為最後備用
      const fallbackDate = new Date().toISOString().replace('Z', '').split('.')[0];
      console.warn('使用備用日期:', fallbackDate);
    }

    const tournamentRecord: TournamentRecord = {
      id: Date.now().toString(),
      date: taiwanDateTime,
      tournamentType: isCustom ? 'custom' : tournamentType,
      tournamentName: tournamentName as string,
      status: 'in_progress', // 默認狀態為進行中
      totalPlayers: totalBuyInGroups, // 改為買入組數
      totalBuyIn, // 總收入
      administrativeFee: administrativeFeePerPerson, // 每人行政費
      totalAdministrativeFee, // 總行政費
      totalDeduction: totalDeduction > 0 ? totalDeduction : undefined, // 單場總提撥金
      totalPrizePool, // 總獎池（淨獎池）
      activityBonus: finalActivityBonus > 0 ? finalActivityBonus : undefined, // 活動獎金
      players: [...players], // 深拷贝玩家数据
      expectedTotalChips,
      actualTotalChips,
      startChip: config.startChip,
      ...(isCustom && customConfig ? { 
        customConfig: {
          ...customConfig,
          activityBonus: finalActivityBonus > 0 ? finalActivityBonus : undefined,
        }
      } : {}),
    };

    saveTournament(tournamentRecord);
    
    // 觸發報表更新事件
    window.dispatchEvent(new CustomEvent('tournament-updated'));
    
    alert('賽事記錄已保存！');
    if (onSave) {
      onSave();
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-6 text-white relative bg-black">
      {/* 背景装饰 - 黑色筹码带金色发光 */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-32 right-20 w-16 h-16 chip-float chip-glow opacity-20">
          <div className="chip w-16 h-16 rounded-full"></div>
        </div>
        <div className="absolute bottom-40 left-16 w-20 h-20 chip-float chip-glow opacity-15" style={{ animationDelay: '2s' }}>
          <div className="chip w-20 h-20 rounded-full"></div>
        </div>
        <div className="absolute top-1/2 left-20 w-18 h-18 chip-float chip-glow opacity-12" style={{ animationDelay: '1s' }}>
          <div className="chip w-18 h-18 rounded-full"></div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        {/* 標題列 */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div className="w-full md:w-auto">
            <button
              onClick={onBack}
              className="mb-4 md:mb-0 px-4 md:px-6 py-2.5 md:py-3 bg-white hover:bg-gray-100 rounded-xl text-sm md:text-lg font-semibold text-black transition-all duration-200 border-2 border-white shadow-lg flex items-center gap-2 w-full md:w-auto justify-center md:justify-start"
            >
              <span>←</span>
              <span className="hidden sm:inline">返回選擇賽事</span>
              <span className="sm:hidden">返回</span>
            </button>
            <div className="mt-4">
              <div className="flex items-center gap-2 md:gap-3 mb-2">
                <div className="text-3xl md:text-4xl">🃏</div>
                <h1 className="text-2xl md:text-5xl font-display font-black text-poker-gold-400 gold-glow break-words">
                  {config.name}
                </h1>
              </div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 mt-2">
                <div className="flex items-center gap-2 bg-poker-gold-900 bg-opacity-50 px-3 md:px-4 py-2 rounded-lg border border-poker-gold-600">
                  <span className="text-base md:text-lg">🪙</span>
                  <span className="text-poker-gold-300 font-semibold text-sm md:text-base">起始碼: {config.startChip.toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-2 bg-poker-gold-900 bg-opacity-50 px-3 md:px-4 py-2 rounded-lg border border-poker-gold-600">
                  <span className="text-base md:text-lg">💰</span>
                  <span className="text-poker-gold-300 font-semibold text-sm md:text-base">參賽費: NT$ {entryFee.toLocaleString()}</span>
                </div>
                {isCustom && customConfig && (
                  <>
                    {customConfig.administrativeFee > 0 && (
                      <div className="flex items-center gap-2 bg-poker-gold-900 bg-opacity-50 px-3 md:px-4 py-2 rounded-lg border border-poker-gold-600">
                        <span className="text-base md:text-lg">📋</span>
                        <span className="text-poker-gold-300 font-semibold text-sm md:text-base">行政費: NT$ {customConfig.administrativeFee.toLocaleString()}</span>
                      </div>
                    )}
                    {customConfig.totalDeduction && customConfig.totalDeduction > 0 && (
                      <div className="flex items-center gap-2 bg-orange-900 bg-opacity-50 px-3 md:px-4 py-2 rounded-lg border border-orange-600">
                        <span className="text-base md:text-lg">💸</span>
                        <span className="text-orange-300 font-semibold text-sm md:text-base">單場總提撥: NT$ {customConfig.totalDeduction.toLocaleString()}</span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 mt-4 md:mt-0">
            <button
              onClick={handleSaveTournament}
              className="group relative px-4 md:px-6 py-3 bg-white hover:bg-gray-100 rounded-xl text-base md:text-lg font-semibold text-black transition-all duration-300 border-2 border-white shadow-xl hover:shadow-2xl overflow-hidden w-full sm:w-auto"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-gray-200 to-transparent opacity-0 group-hover:opacity-30 transform -skew-x-12 group-hover:translate-x-full transition-all duration-1000"></div>
              <span className="relative z-10 flex items-center justify-center gap-2">
                <span>💾</span>
                <span className="whitespace-nowrap">保存賽事記錄</span>
              </span>
            </button>
            
            {/* 設置場次按鈕 */}
            {!showNumberInput ? (
              <button
                onClick={() => setShowNumberInput(true)}
                className={`px-4 md:px-6 py-3 rounded-xl text-base md:text-lg font-semibold transition-all duration-300 border-2 shadow-xl hover:shadow-2xl w-full sm:w-auto ${
                  tournamentNumber !== null && tournamentNumber > 0
                    ? 'bg-poker-gold-600 hover:bg-poker-gold-700 text-white border-poker-gold-500'
                    : 'bg-gray-700 hover:bg-gray-600 text-white border-gray-600'
                }`}
              >
                <span className="flex items-center justify-center gap-2">
                  <span>#</span>
                  <span className="whitespace-nowrap">
                    {tournamentNumber !== null && tournamentNumber > 0 
                      ? `設置場次: #${tournamentNumber}` 
                      : '設置場次'}
                  </span>
                </span>
              </button>
            ) : (
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <input
                  type="number"
                  min="1"
                  value={tournamentNumber || ''}
                  onChange={(e) => {
                    const value = parseInt(e.target.value);
                    setTournamentNumber(isNaN(value) || value < 1 ? null : value);
                  }}
                  onWheel={(e) => e.currentTarget.blur()}
                  placeholder="輸入場次號碼"
                  className="flex-1 px-4 py-3 bg-gray-800 border-2 border-poker-gold-600 rounded-xl text-white text-base focus:outline-none focus:ring-2 focus:ring-poker-gold-500"
                  autoFocus
                />
                <button
                  onClick={() => setShowNumberInput(false)}
                  className="px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl text-base font-semibold transition-all duration-200 border-2 border-green-500"
                >
                  ✓
                </button>
              </div>
            )}

            <div className="w-full sm:w-auto">
              <ExportButton 
                players={players} 
                config={config}
                prizeCalculation={prizeCalculation}
                tournamentName={tournamentNumber !== null && tournamentNumber > 0 
                  ? `${config.name}#${tournamentNumber}` 
                  : undefined}
              />
            </div>
          </div>
        </div>

        {/* 統計面板 */}
        <StatsPanel
          totalBuyInGroups={totalBuyInGroups}
          expectedTotalChips={expectedTotalChips}
          actualTotalChips={actualTotalChips}
          isBalanced={isBalanced}
        />

        {/* 財務統計 */}
        <FinancialStats players={players} tournamentType={tournamentType} customConfig={customConfig} />

        {/* 獎金分配計算器 */}
        <PrizePoolCalculator 
          players={players} 
          tournamentType={tournamentType}
          customConfig={customConfig}
          onCalculationChange={setPrizeCalculation}
          onActivityBonusChange={setActivityBonus}
        />

        {/* 玩家輸入區域 */}
        <PlayerInput
          onAddPlayer={handleAddPlayer}
        />

        {/* 玩家列表 */}
        <PlayerList
          players={players}
          startChip={config.startChip}
          onUpdatePlayer={handleUpdatePlayer}
          onRemovePlayer={handleRemovePlayer}
        />
      </div>
    </div>
  );
}
