import { PlayerHistory } from '../../constants/pokerConfig';

interface PlayerHistoryModalProps {
  memberId: string;
  history: PlayerHistory[];
  onClose: () => void;
}

export default function PlayerHistoryModal({ memberId, history, onClose }: PlayerHistoryModalProps) {
  if (history.length === 0) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 md:p-4">
      <div className="bg-gray-800 rounded-xl p-4 md:p-6 max-w-2xl w-full max-h-[90vh] md:max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">會編 {memberId} 歷史紀錄</h2>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white hover:bg-gray-100 text-black rounded-lg border-2 border-white transition-all duration-200"
          >
            關閉
          </button>
        </div>

        <div className="space-y-3">
          {history.map((record, index) => (
            <div
              key={index}
              className="bg-gray-700 p-4 rounded-lg"
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-lg font-semibold">{record.tournamentName}</div>
                  <div className="text-sm text-gray-400 mt-1">日期: {record.date}</div>
                  {record.rank && (
                    <div className="text-sm text-yellow-400 mt-1">名次: 第 {record.rank} 名</div>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold text-green-400">
                    {record.finalChips.toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-400">最終碼量</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
