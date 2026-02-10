import { useState, useEffect } from 'react';
import { CustomTournamentConfig } from '../../types/tournament';
import { getICMRewardStructure } from '../../constants/icmRewardConfig';

interface CustomTournamentFormProps {
  onSubmit: (config: CustomTournamentConfig) => void;
  onCancel: () => void;
}

export default function CustomTournamentForm({ onSubmit, onCancel }: CustomTournamentFormProps) {
  const [name, setName] = useState('');
  const [entryFee, setEntryFee] = useState('');
  const [administrativeFee, setAdministrativeFee] = useState('');
  const [totalDeduction, setTotalDeduction] = useState('');
  const [activityBonus, setActivityBonus] = useState('');
  const [topThreeSplitFirst, setTopThreeSplitFirst] = useState('50');
  const [topThreeSplitSecond, setTopThreeSplitSecond] = useState('30');
  const [topThreeSplitThird, setTopThreeSplitThird] = useState('20');
  const [startChip, setStartChip] = useState('');
  const [isManualEdit, setIsManualEdit] = useState<{
    administrativeFee: boolean;
    totalDeduction: boolean;
    topThreeSplit: boolean;
    activityBonus: boolean;
  }>({
    administrativeFee: false,
    totalDeduction: false,
    topThreeSplit: false,
    activityBonus: false,
  });

  // 當報名費變化時，自動帶入ICM結構的值
  useEffect(() => {
    const entryFeeNum = parseInt(entryFee);
    if (!isNaN(entryFeeNum) && entryFeeNum > 0) {
      const icmStructure = getICMRewardStructure(entryFeeNum);
      if (icmStructure) {
        if (!isManualEdit.administrativeFee) {
          setAdministrativeFee(icmStructure.administrativeFee.toString());
        }
        if (!isManualEdit.totalDeduction) {
          setTotalDeduction(icmStructure.totalDeduction.toString());
        }
        if (!isManualEdit.activityBonus && icmStructure.activityBonus !== undefined) {
          setActivityBonus(icmStructure.activityBonus.toString());
        }
        if (!isManualEdit.topThreeSplit) {
          setTopThreeSplitFirst(icmStructure.topThreeSplit[0].toString());
          setTopThreeSplitSecond(icmStructure.topThreeSplit[1].toString());
          setTopThreeSplitThird(icmStructure.topThreeSplit[2].toString());
        }
      }
    }
  }, [entryFee, isManualEdit]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const entryFeeNum = parseInt(entryFee);
    const administrativeFeeNum = parseInt(administrativeFee);
    const totalDeductionNum = totalDeduction ? parseInt(totalDeduction) : undefined;
    const activityBonusNum = activityBonus ? parseInt(activityBonus) : undefined;
    const startChipNum = parseInt(startChip);

    if (!name.trim()) {
      alert('請輸入比賽名稱');
      return;
    }

    if (isNaN(entryFeeNum) || entryFeeNum <= 0) {
      alert('請輸入有效的買入金額');
      return;
    }

    if (isNaN(administrativeFeeNum) || administrativeFeeNum < 0) {
      alert('請輸入有效的行政費用');
      return;
    }

    if (totalDeduction && (isNaN(totalDeductionNum!) || totalDeductionNum! < 0)) {
      alert('請輸入有效的單次總提撥');
      return;
    }

    if (activityBonus && (isNaN(activityBonusNum!) || activityBonusNum! < 0)) {
      alert('請輸入有效的活動獎金金額');
      return;
    }

    if (isNaN(startChipNum) || startChipNum <= 0) {
      alert('請輸入有效的起始籌碼');
      return;
    }

    const topThreeSplitFirstNum = parseInt(topThreeSplitFirst) || 50;
    const topThreeSplitSecondNum = parseInt(topThreeSplitSecond) || 30;
    const topThreeSplitThirdNum = parseInt(topThreeSplitThird) || 20;

    onSubmit({
      name: name.trim(),
      entryFee: entryFeeNum,
      administrativeFee: administrativeFeeNum,
      startChip: startChipNum,
      totalDeduction: totalDeductionNum,
      topThreeSplit: [topThreeSplitFirstNum, topThreeSplitSecondNum, topThreeSplitThirdNum],
      activityBonus: activityBonusNum,
    });
  };

  return (
    <div className="min-h-screen p-6 flex flex-col items-center justify-center relative overflow-hidden bg-black">
      {/* 背景装饰 */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-20 left-20 w-24 h-24 chip-float chip-glow opacity-25">
          <div className="chip w-24 h-24 rounded-full"></div>
        </div>
        <div className="absolute bottom-32 right-32 w-20 h-20 chip-float chip-glow opacity-20" style={{ animationDelay: '1s' }}>
          <div className="chip w-20 h-20 rounded-full"></div>
        </div>
      </div>

      <button
        onClick={onCancel}
        className="absolute top-4 md:top-6 left-4 md:left-6 px-4 md:px-6 py-2 md:py-3 bg-white hover:bg-gray-100 rounded-xl text-sm md:text-lg font-semibold text-black transition-all duration-200 z-20 border-2 border-white shadow-xl flex items-center gap-1 md:gap-2"
      >
        <span>←</span>
        <span className="hidden sm:inline">返回</span>
        <span className="sm:hidden">返回</span>
      </button>

      <div className="relative z-10 w-full max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-5xl font-display font-black text-poker-gold-400 gold-glow mb-4">
            創建新賽事
          </h1>
          <p className="text-xl md:text-2xl text-poker-gold-300 font-body font-light">
            設定比賽資訊
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 md:p-8 shadow-2xl space-y-6">
          <div>
            <label htmlFor="name" className="block text-sm font-semibold text-gray-700 mb-2">
              比賽名稱 <span className="text-red-500">*</span>
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 focus:border-poker-gold-500 focus:outline-none text-black text-lg"
              placeholder="例如：春季錦標賽"
              required
            />
          </div>

          <div>
            <label htmlFor="activityBonus" className="block text-sm font-semibold text-gray-700 mb-2">
              活動獎金 (NT$)
            </label>
            <div className="flex items-center gap-2">
              <input
                id="activityBonus"
                type="number"
                value={activityBonus}
                onChange={(e) => {
                  setActivityBonus(e.target.value);
                  setIsManualEdit(prev => ({ ...prev, activityBonus: true }));
                }}
                className="flex-1 px-4 py-3 rounded-xl border-2 border-gray-300 focus:border-poker-gold-500 focus:outline-none text-black text-lg"
                placeholder="例如：1000"
                min="0"
              />
              <button
                type="button"
                onClick={() => {
                  const entryFeeNum = parseInt(entryFee);
                  if (!isNaN(entryFeeNum)) {
                    const icmStructure = getICMRewardStructure(entryFeeNum);
                    if (icmStructure && icmStructure.activityBonus !== undefined) {
                      setActivityBonus(icmStructure.activityBonus.toString());
                      setIsManualEdit(prev => ({ ...prev, activityBonus: false }));
                    } else {
                      setActivityBonus('');
                      setIsManualEdit(prev => ({ ...prev, activityBonus: false }));
                    }
                  }
                }}
                className="px-3 py-3 bg-gray-200 hover:bg-gray-300 rounded-xl text-sm font-semibold text-black transition-all"
                title="恢復自動值"
              >
                🔄
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              從總獎金池額外抽出的活動獎金，不參與玩家獎金分配（預設為 0，可手動設定）
            </p>
          </div>

          <div>
            <label htmlFor="entryFee" className="block text-sm font-semibold text-gray-700 mb-2">
              買入金額 (NT$) <span className="text-red-500">*</span>
            </label>
            <input
              id="entryFee"
              type="number"
              value={entryFee}
              onChange={(e) => setEntryFee(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 focus:border-poker-gold-500 focus:outline-none text-black text-lg"
              placeholder="例如：5000"
              min="1"
              required
            />
          </div>

          <div>
            <label htmlFor="administrativeFee" className="block text-sm font-semibold text-gray-700 mb-2">
              單組行政費 (NT$) <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                id="administrativeFee"
                type="number"
                value={administrativeFee}
                onChange={(e) => {
                  setAdministrativeFee(e.target.value);
                  setIsManualEdit(prev => ({ ...prev, administrativeFee: true }));
                }}
                className="flex-1 px-4 py-3 rounded-xl border-2 border-gray-300 focus:border-poker-gold-500 focus:outline-none text-black text-lg"
                placeholder="例如：600"
                min="0"
                required
              />
              <button
                type="button"
                onClick={() => {
                  const entryFeeNum = parseInt(entryFee);
                  if (!isNaN(entryFeeNum)) {
                    const icmStructure = getICMRewardStructure(entryFeeNum);
                    if (icmStructure) {
                      setAdministrativeFee(icmStructure.administrativeFee.toString());
                      setIsManualEdit(prev => ({ ...prev, administrativeFee: false }));
                    }
                  }
                }}
                className="px-3 py-3 bg-gray-200 hover:bg-gray-300 rounded-xl text-sm font-semibold text-black transition-all"
                title="恢復自動值"
              >
                🔄
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">每組的行政費用（選擇報名費後自動帶入，可手動修改）</p>
          </div>

          <div>
            <label htmlFor="totalDeduction" className="block text-sm font-semibold text-gray-700 mb-2">
              單次總提撥 (NT$) <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                id="totalDeduction"
                type="number"
                value={totalDeduction}
                onChange={(e) => {
                  setTotalDeduction(e.target.value);
                  setIsManualEdit(prev => ({ ...prev, totalDeduction: true }));
                }}
                className="flex-1 px-4 py-3 rounded-xl border-2 border-gray-300 focus:border-poker-gold-500 focus:outline-none text-black text-lg"
                placeholder="例如：500"
                min="0"
                required
              />
              <button
                type="button"
                onClick={() => {
                  const entryFeeNum = parseInt(entryFee);
                  if (!isNaN(entryFeeNum)) {
                    const icmStructure = getICMRewardStructure(entryFeeNum);
                    if (icmStructure) {
                      setTotalDeduction(icmStructure.totalDeduction.toString());
                      setIsManualEdit(prev => ({ ...prev, totalDeduction: false }));
                    }
                  }
                }}
                className="px-3 py-3 bg-gray-200 hover:bg-gray-300 rounded-xl text-sm font-semibold text-black transition-all"
                title="恢復自動值"
              >
                🔄
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              <strong>整場固定一次</strong>的提撥金額（選擇報名費後自動帶入，可手動修改）
              <br />
              <span className="text-orange-600">⚠️ 注意：這是整場比賽的提撥，不是每組的提撥</span>
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              前三名提撥獎金獲得比例 (%) <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label htmlFor="topThreeSplitFirst" className="block text-xs text-gray-600 mb-1">第一名</label>
                <div className="flex items-center gap-2">
                  <input
                    id="topThreeSplitFirst"
                    type="number"
                    value={topThreeSplitFirst}
                    onChange={(e) => {
                      setTopThreeSplitFirst(e.target.value);
                      setIsManualEdit(prev => ({ ...prev, topThreeSplit: true }));
                    }}
                    className="flex-1 px-3 py-2 rounded-lg border-2 border-gray-300 focus:border-poker-gold-500 focus:outline-none text-black"
                    min="0"
                    max="100"
                    required
                  />
                </div>
              </div>
              <div>
                <label htmlFor="topThreeSplitSecond" className="block text-xs text-gray-600 mb-1">第二名</label>
                <input
                  id="topThreeSplitSecond"
                  type="number"
                  value={topThreeSplitSecond}
                  onChange={(e) => {
                    setTopThreeSplitSecond(e.target.value);
                    setIsManualEdit(prev => ({ ...prev, topThreeSplit: true }));
                  }}
                  className="w-full px-3 py-2 rounded-lg border-2 border-gray-300 focus:border-poker-gold-500 focus:outline-none text-black"
                  min="0"
                  max="100"
                  required
                />
              </div>
              <div>
                <label htmlFor="topThreeSplitThird" className="block text-xs text-gray-600 mb-1">第三名</label>
                <div className="flex items-center gap-2">
                  <input
                    id="topThreeSplitThird"
                    type="number"
                    value={topThreeSplitThird}
                    onChange={(e) => {
                      setTopThreeSplitThird(e.target.value);
                      setIsManualEdit(prev => ({ ...prev, topThreeSplit: true }));
                    }}
                    className="flex-1 px-3 py-2 rounded-lg border-2 border-gray-300 focus:border-poker-gold-500 focus:outline-none text-black"
                    min="0"
                    max="100"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const entryFeeNum = parseInt(entryFee);
                      if (!isNaN(entryFeeNum)) {
                        const icmStructure = getICMRewardStructure(entryFeeNum);
                        if (icmStructure) {
                          setTopThreeSplitFirst(icmStructure.topThreeSplit[0].toString());
                          setTopThreeSplitSecond(icmStructure.topThreeSplit[1].toString());
                          setTopThreeSplitThird(icmStructure.topThreeSplit[2].toString());
                          setIsManualEdit(prev => ({ ...prev, topThreeSplit: false }));
                        }
                      }
                    }}
                    className="px-2 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-xs font-semibold text-black transition-all"
                    title="恢復自動值"
                  >
                    🔄
                  </button>
                </div>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              前三名從單場總提撥金中獲得的比例（預設：第一名 50% / 第二名 30% / 第三名 20%，可手動修改）
            </p>
          </div>

          <div>
            <label htmlFor="startChip" className="block text-sm font-semibold text-gray-700 mb-2">
              起始籌碼 <span className="text-red-500">*</span>
            </label>
            <input
              id="startChip"
              type="number"
              value={startChip}
              onChange={(e) => setStartChip(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 focus:border-poker-gold-500 focus:outline-none text-black text-lg"
              placeholder="例如：50000"
              min="1"
              required
            />
          </div>

          {/* 計算預覽 */}
          {entryFee && administrativeFee && totalDeduction && (
            <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
              <p className="text-sm font-semibold text-blue-800 mb-2">💰 ICM 計算規則預覽：</p>
              <div className="space-y-1 text-xs text-blue-700">
                <p>報名費：NT$ {parseInt(entryFee) || 0}（每組）</p>
                <p>單組行政費：NT$ {parseInt(administrativeFee) || 0}（每組）</p>
                <p className="font-semibold text-orange-700">單場總提撥：NT$ {parseInt(totalDeduction) || 0}（整場固定一次）</p>
                <p className="font-semibold">
                  第一步：總獎金池 = (報名費 {parseInt(entryFee) || 0} - 行政費 {parseInt(administrativeFee) || 0}) × 組數
                </p>
                <p className="font-semibold">
                  第二步：淨獎池 = 總獎金池 - 單場總提撥 {parseInt(totalDeduction) || 0}
                </p>
                <p className="font-semibold">
                  第三步：提撥分配 = 單場總提撥 {parseInt(totalDeduction) || 0} 按獲得比例分配給前三名（第一名 {parseInt(topThreeSplitFirst) || 50}% / 第二名 {parseInt(topThreeSplitSecond) || 30}% / 第三名 {parseInt(topThreeSplitThird) || 20}%）
                </p>
                <p className="font-semibold text-blue-900">
                  第四步：最終獎金 = (個人籌碼 / 總發行籌碼) × 淨獎池 + 前三名提撥獎金
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  第五步：所有獎金無條件捨去至百位數
                </p>
              </div>
            </div>
          )}

          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-6 py-3 bg-gray-200 hover:bg-gray-300 rounded-xl text-lg font-semibold text-black transition-all duration-200"
            >
              取消
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-3 bg-gradient-to-r from-poker-gold-400 to-poker-gold-600 hover:from-poker-gold-500 hover:to-poker-gold-700 rounded-xl text-lg font-semibold text-white transition-all duration-200 shadow-lg"
            >
              創建賽事
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
