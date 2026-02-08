import { useState } from 'react';
import { getAllTournaments } from '../../utils/storage';
import { TournamentRecord } from '../../types/tournament';
import { Player } from '../../constants/pokerConfig';
import VirtualKeyboard from './VirtualKeyboard';

interface MemberPaymentQueryProps {
  onClose: () => void;
}

interface MemberRecord {
  tournament: TournamentRecord;
  player: Player;
  entryFee: number;
  totalAmount: number; // 應付總額
  paymentStatus: 'paid' | 'unpaid';
}

export default function MemberPaymentQuery({ onClose }: MemberPaymentQueryProps) {
  const [memberId, setMemberId] = useState('');
  const [showKeyboard, setShowKeyboard] = useState(false);
  const [records, setRecords] = useState<MemberRecord[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = () => {
    if (!memberId.trim()) {
      alert('請輸入會編');
      return;
    }

    setIsSearching(true);
    const allTournaments = getAllTournaments();
    const memberRecords: MemberRecord[] = [];

    allTournaments.forEach((tournament) => {
      const player = tournament.players.find(p => p.memberId === memberId.trim());
      if (player) {
        const entryFee = parseInt(tournament.tournamentType);
        const totalAmount = player.buyInCount * entryFee;
        const paymentStatus = player.paymentMethod === 'unpaid' ? 'unpaid' : 'paid';

        memberRecords.push({
          tournament,
          player,
          entryFee,
          totalAmount,
          paymentStatus,
        });
      }
    });

    // 按日期倒序排列（最新的在前）
    memberRecords.sort((a, b) => 
      new Date(b.tournament.date).getTime() - new Date(a.tournament.date).getTime()
    );

    setRecords(memberRecords);
    setIsSearching(false);
  };

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

  const unpaidCount = records.filter(r => r.paymentStatus === 'unpaid').length;
  const unpaidTotal = records
    .filter(r => r.paymentStatus === 'unpaid')
    .reduce((sum, r) => sum + r.totalAmount, 0);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl p-4 md:p-6 max-w-4xl w-full max-h-[90vh] md:max-h-[80vh] overflow-y-auto relative z-10">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl md:text-2xl font-bold">會員報名紀錄查詢</h2>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white hover:bg-gray-100 text-black rounded-lg border-2 border-white transition-all duration-200"
          >
            關閉
          </button>
        </div>

        {/* 查詢區域 */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">會編</label>
          <div className="flex gap-2">
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={memberId}
              onChange={(e) => {
                // 只允許數字輸入
                const value = e.target.value.replace(/[^0-9]/g, '');
                setMemberId(value);
              }}
              onFocus={() => {
                // 只在移動設備上顯示虛擬鍵盤
                if (window.matchMedia('(max-width: 768px)').matches || 'ontouchstart' in window) {
                  setShowKeyboard(true);
                }
              }}
              placeholder="輸入會編（數字）"
              className="flex-1 px-4 py-3 bg-gray-700 rounded-lg text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleSearch}
              disabled={isSearching}
              className="px-6 py-3 bg-poker-gold-600 hover:bg-poker-gold-700 text-white rounded-lg font-semibold transition-all duration-200 border-2 border-poker-gold-500 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSearching ? '查詢中...' : '🔍 查詢'}
            </button>
          </div>
        </div>

        {/* 查詢結果 */}
        {records.length > 0 && (
          <div className="mb-4">
            <div className="bg-gradient-to-r from-gray-700 to-gray-800 rounded-lg p-4 mb-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-gray-400 mb-1">總報名次數</p>
                  <p className="text-2xl font-bold text-white">{records.length} 次</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400 mb-1">未付次數</p>
                  <p className={`text-2xl font-bold ${unpaidCount > 0 ? 'text-red-400' : 'text-green-400'}`}>
                    {unpaidCount} 次
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-400 mb-1">未付總額</p>
                  <p className={`text-2xl font-bold ${unpaidTotal > 0 ? 'text-red-400' : 'text-green-400'}`}>
                    NT$ {unpaidTotal.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            {/* 未付清提醒 */}
            {unpaidCount > 0 && (
              <div className="bg-red-900 bg-opacity-60 border-2 border-red-600 rounded-xl p-4 mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">⚠️</span>
                  <h3 className="text-lg font-display font-bold text-red-300">未付清提醒</h3>
                </div>
                <p className="text-red-200">
                  會編 <span className="font-mono font-bold">{memberId}</span> 共有 <span className="font-bold">{unpaidCount}</span> 筆未付清紀錄，總金額 NT$ <span className="font-bold">{unpaidTotal.toLocaleString()}</span>
                </p>
              </div>
            )}
          </div>
        )}

        {/* 紀錄列表 */}
        {records.length > 0 ? (
          <div className="space-y-3">
            {records.map((record) => (
              <div
                key={`${record.tournament.id}-${record.player.id}`}
                className={`bg-gray-700 rounded-lg p-4 border-l-4 ${
                  record.paymentStatus === 'unpaid' 
                    ? 'border-red-600 bg-red-900 bg-opacity-40' 
                    : 'border-green-600'
                }`}
              >
                <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-bold text-poker-gold-400">
                        {record.tournament.tournamentName}
                      </h3>
                      {record.paymentStatus === 'unpaid' && (
                        <span className="px-3 py-1 bg-red-600 text-white text-sm font-semibold rounded-full">
                          ⚠️ 未付
                        </span>
                      )}
                      {record.paymentStatus === 'paid' && (
                        <span className="px-3 py-1 bg-green-600 text-white text-sm font-semibold rounded-full">
                          ✓ 已付
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div>
                        <span className="text-gray-400">日期：</span>
                        <span className="font-semibold">{formatDate(record.tournament.date)}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">報名費：</span>
                        <span className="font-semibold">NT$ {record.entryFee.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">買入次數：</span>
                        <span className="font-semibold">{record.player.buyInCount} 次</span>
                      </div>
                      <div>
                        <span className="text-gray-400">應付總額：</span>
                        <span className={`font-semibold ${record.paymentStatus === 'unpaid' ? 'text-red-400' : 'text-green-400'}`}>
                          NT$ {record.totalAmount.toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <div className="mt-2">
                      <span className="text-gray-400 text-sm">支付方式：</span>
                      <span className={`text-sm font-semibold ml-2 ${
                        record.player.paymentMethod === 'cash' ? 'text-green-400' :
                        record.player.paymentMethod === 'transfer' ? 'text-blue-400' :
                        'text-red-400'
                      }`}>
                        {record.player.paymentMethod === 'cash' ? '💵 現金' :
                         record.player.paymentMethod === 'transfer' ? '🏦 轉帳' :
                         '⚠️ 未付'}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        // 這裡可以添加跳轉到賽事詳情的功能
                        window.location.href = `#tournament-${record.tournament.id}`;
                        onClose();
                      }}
                      className="px-4 py-2 bg-poker-gold-600 hover:bg-poker-gold-700 text-white rounded-lg text-sm font-semibold transition-all duration-200"
                    >
                      查看賽事
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : records.length === 0 && memberId && !isSearching ? (
          <div className="text-center py-12 text-gray-400">
            <p className="text-lg">找不到會編 {memberId} 的報名紀錄</p>
          </div>
        ) : null}

        {showKeyboard && (
          <VirtualKeyboard
            value={memberId}
            onChange={setMemberId}
            onClose={() => setShowKeyboard(false)}
          />
        )}
      </div>
    </div>
  );
}
