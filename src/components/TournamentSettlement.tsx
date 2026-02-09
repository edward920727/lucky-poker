import { useState, useEffect } from 'react';
import { ICM_ADMINISTRATIVE_FEE_CONFIG } from '../../constants/icmRewardConfig';
import { getAdministrativeFeeConfig, updateAdministrativeFeeConfigBatch } from '../../utils/administrativeFeeConfig';

interface TournamentSettlementProps {
  onBack: () => void;
  onSave?: () => void;
}

export default function TournamentSettlement({ onBack, onSave }: TournamentSettlementProps) {
  const [feeConfig, setFeeConfig] = useState<Record<number, number>>({});
  const [editingFee, setEditingFee] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // 載入當前行政費配置
  useEffect(() => {
    const config = getAdministrativeFeeConfig();
    setFeeConfig(config);
  }, []);

  const availableEntryFees = Object.keys(ICM_ADMINISTRATIVE_FEE_CONFIG).map(Number).sort((a, b) => a - b);

  const handleFeeChange = (entryFee: number, newFee: string) => {
    const feeNum = parseInt(newFee) || 0;
    if (feeNum >= 0) {
      setFeeConfig(prev => ({
        ...prev,
        [entryFee]: feeNum,
      }));
    }
  };

  const handleSave = () => {
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      // 保存行政費配置到 localStorage
      updateAdministrativeFeeConfigBatch(feeConfig);
      setSaveSuccess(true);
      alert('行政費設定已成功保存！此設定將應用到所有比賽創建和獎金計算。');
      
      // 觸發頁面重新載入以應用新配置
      setTimeout(() => {
        if (onSave) {
          onSave();
        }
      }, 1000);
    } catch (error) {
      console.error('保存行政費配置失敗:', error);
      alert('保存失敗，請稍後再試');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    if (confirm('確定要重置為默認配置嗎？')) {
      const defaultConfig = ICM_ADMINISTRATIVE_FEE_CONFIG;
      setFeeConfig(defaultConfig);
      updateAdministrativeFeeConfigBatch(defaultConfig);
      alert('已重置為默認配置');
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-6 text-white relative bg-black">
      {/* 背景装饰 */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-32 right-20 w-16 h-16 chip-float chip-glow opacity-20">
          <div className="chip w-16 h-16 rounded-full"></div>
        </div>
        <div className="absolute bottom-40 left-16 w-20 h-20 chip-float chip-glow opacity-15" style={{ animationDelay: '2s' }}>
          <div className="chip w-20 h-20 rounded-full"></div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto relative z-10">
        {/* 標題列 */}
        <div className="mb-6">
          <button
            onClick={onBack}
            className="mb-4 px-4 md:px-6 py-2.5 md:py-3 bg-white hover:bg-gray-100 rounded-xl text-sm md:text-lg font-semibold text-black transition-all duration-200 border-2 border-white shadow-lg flex items-center gap-2"
          >
            <span>←</span>
            <span>返回</span>
          </button>
          <div className="flex items-center gap-3 mb-4">
            <div className="text-3xl md:text-4xl">⚙️</div>
            <h1 className="text-2xl md:text-4xl font-display font-black text-poker-gold-400 gold-glow">
              行政費設定
            </h1>
          </div>
          <p className="text-gray-400 text-sm md:text-base">
            設定不同報名費對應的行政費用，此設定將應用到所有比賽創建和獎金計算
          </p>
        </div>

        {/* 行政費設定表格 */}
        <div className="bg-gradient-to-br from-gray-900 via-black to-gray-900 rounded-2xl p-6 md:p-8 mb-6 border-2 border-poker-gold-600 border-opacity-40 shadow-xl">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl md:text-2xl font-bold text-poker-gold-400">報名費與行政費對應表</h2>
            <button
              onClick={handleReset}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-semibold transition-all duration-200"
            >
              🔄 重置為默認
            </button>
          </div>
          
          <div className="space-y-4">
            {availableEntryFees.map((entryFee) => {
              const currentFee = feeConfig[entryFee] || 0;
              const isEditing = editingFee === entryFee;
              
              return (
                <div
                  key={entryFee}
                  className="bg-gray-800 rounded-xl p-4 border border-gray-700 hover:border-poker-gold-600 transition-all"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-poker-gold-400 to-poker-gold-600 flex items-center justify-center border-2 border-poker-gold-300 shadow-lg">
                          <span className="text-xl font-bold text-white">{entryFee}</span>
                        </div>
                        <div>
                          <p className="text-lg font-semibold text-white">報名費 NT$ {entryFee.toLocaleString()}</p>
                          <p className="text-xs text-gray-400">對應行政費</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      {isEditing ? (
                        <>
                          <input
                            type="number"
                            min="0"
                            value={currentFee}
                            onChange={(e) => handleFeeChange(entryFee, e.target.value)}
                            className="w-32 px-4 py-2 bg-gray-700 border-2 border-poker-gold-600 rounded-lg text-white text-lg focus:outline-none focus:ring-2 focus:ring-poker-gold-500"
                            autoFocus
                          />
                          <button
                            onClick={() => setEditingFee(null)}
                            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-semibold transition-all"
                          >
                            ✓
                          </button>
                        </>
                      ) : (
                        <>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-poker-gold-400">
                              NT$ {currentFee.toLocaleString()}
                            </p>
                            <p className="text-xs text-gray-400">行政費</p>
                          </div>
                          <button
                            onClick={() => setEditingFee(entryFee)}
                            className="px-4 py-2 bg-poker-gold-600 hover:bg-poker-gold-700 text-white rounded-lg text-sm font-semibold transition-all"
                          >
                            ✏️ 編輯
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  
                  {/* 顯示計算示例 */}
                  <div className="mt-3 pt-3 border-t border-gray-700">
                    <p className="text-xs text-gray-500">
                      計算示例：總獎池 = (報名費 {entryFee.toLocaleString()} - 行政費 {currentFee.toLocaleString()}) × 參賽人數
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 保存按鈕 */}
        <div className="flex gap-4">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className={`flex-1 px-6 py-4 rounded-xl font-bold text-lg transition-all duration-200 border-2 ${
              isSaving
                ? 'bg-gray-600 text-gray-400 border-gray-500 cursor-not-allowed'
                : saveSuccess
                ? 'bg-green-600 text-white border-green-400'
                : 'bg-poker-gold-600 hover:bg-poker-gold-700 text-white border-poker-gold-400 shadow-lg hover:shadow-xl'
            }`}
          >
            {isSaving ? '保存中...' : saveSuccess ? '✓ 已保存' : '💾 保存設定'}
          </button>
        </div>

        {/* 說明文字 */}
        <div className="mt-6 bg-blue-900 bg-opacity-30 rounded-xl p-4 border border-blue-700">
          <p className="text-sm text-blue-200">
            💡 <strong>說明：</strong>此設定會自動應用到：
          </p>
          <ul className="text-sm text-blue-300 mt-2 ml-4 list-disc space-y-1">
            <li>比賽創建時的行政費計算</li>
            <li>獎金計算器的行政費自動填充</li>
            <li>所有賽事的獎池計算</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
