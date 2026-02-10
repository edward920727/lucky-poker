import { useState, useEffect } from 'react';
import { getCurrentIP, saveAuthorizedIP, getAuthorizedIP } from '../../utils/systemSecurity';
import { getCurrentUsername } from '../utils/auth';

interface SystemSecuritySettingsProps {
  onBack: () => void;
}

export default function SystemSecuritySettings({ onBack }: SystemSecuritySettingsProps) {
  const [authorizedIP, setAuthorizedIP] = useState('');
  const [currentIP, setCurrentIP] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchingIP, setFetchingIP] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadAuthorizedIP();
  }, []);

  const loadAuthorizedIP = async () => {
    try {
      setLoading(true);
      const ip = await getAuthorizedIP();
      if (ip) {
        setAuthorizedIP(ip);
      }
    } catch (error) {
      console.error('載入授權 IP 失敗:', error);
      setError('載入授權 IP 失敗');
    } finally {
      setLoading(false);
    }
  };

  const handleFetchCurrentIP = async () => {
    setFetchingIP(true);
    setError('');
    setSuccess('');

    try {
      const ip = await getCurrentIP();
      if (ip) {
        setCurrentIP(ip);
        setAuthorizedIP(ip);
        setSuccess(`已自動填入當前 IP: ${ip}`);
      } else {
        setError('無法獲取當前 IP，請手動輸入');
      }
    } catch (error) {
      console.error('獲取當前 IP 失敗:', error);
      setError('獲取當前 IP 失敗，請手動輸入');
    } finally {
      setFetchingIP(false);
    }
  };

  const handleSave = async () => {
    setError('');
    setSuccess('');

    if (!authorizedIP.trim()) {
      setError('請輸入授權 IP 地址');
      return;
    }

    // 驗證 IP 格式
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipRegex.test(authorizedIP.trim())) {
      setError('IP 地址格式不正確，請輸入有效的 IPv4 地址（例如：192.168.1.1）');
      return;
    }

    try {
      setLoading(true);
      const result = await saveAuthorizedIP(authorizedIP.trim());
      
      if (result.success) {
        setSuccess(result.message);
      } else {
        setError(result.message);
      }
    } catch (error) {
      console.error('保存 IP 失敗:', error);
      setError('保存失敗，請稍後再試');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-6 text-white relative bg-black">
      {/* 背景裝飾 */}
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
            className="mb-4 px-4 md:px-6 py-2.5 md:py-3 bg-white hover:bg-gray-100 rounded-xl text-sm md:text-lg font-semibold text-black transition-all duration-200 border-2 border-white shadow-lg flex items-center gap-2 w-full md:w-auto justify-center md:justify-start"
          >
            <span>←</span>
            <span>返回首頁</span>
          </button>
          <div className="flex items-center gap-3 mb-2">
            <div className="text-3xl md:text-4xl">🔒</div>
            <h1 className="text-2xl md:text-4xl font-display font-black text-poker-gold-400 gold-glow">
              系統安全設定
            </h1>
          </div>
          <p className="text-gray-400 text-sm md:text-base mt-2">
            設定授權 IP 地址，只有在此 IP 範圍內的裝置才能進行帳務更動
          </p>
        </div>

        {/* 錯誤和成功訊息 */}
        {error && (
          <div className="mb-4 bg-red-900 bg-opacity-50 border-2 border-red-600 rounded-lg p-3 flex items-center gap-2">
            <span className="text-xl">⚠️</span>
            <span className="text-red-200 text-sm font-semibold">{error}</span>
          </div>
        )}
        {success && (
          <div className="mb-4 bg-green-900 bg-opacity-50 border-2 border-green-600 rounded-lg p-3 flex items-center gap-2">
            <span className="text-xl">✓</span>
            <span className="text-green-200 text-sm font-semibold">{success}</span>
          </div>
        )}

        {/* IP 設定表單 */}
        <div className="bg-gradient-to-br from-gray-900 via-black to-gray-900 rounded-2xl p-4 md:p-6 mb-6 border-2 border-poker-gold-600 border-opacity-40 shadow-xl shadow-poker-gold-500/20">
          <h2 className="text-xl md:text-2xl font-display font-bold text-poker-gold-400 mb-4">
            IP 地址設定
          </h2>

          {/* 說明文字 */}
          <div className="mb-6 p-4 bg-blue-900 bg-opacity-30 border-2 border-blue-600 border-opacity-50 rounded-lg">
            <div className="flex items-start gap-3">
              <span className="text-2xl">ℹ️</span>
              <div className="flex-1">
                <p className="text-blue-200 text-sm md:text-base font-semibold mb-2">
                  安全說明
                </p>
                <p className="text-blue-300 text-xs md:text-sm leading-relaxed">
                  只有在此 IP 範圍內的裝置才能進行帳務更動（包括儲存或修改籌碼）。此設定可有效防止未授權的網路環境進行敏感操作。
                </p>
              </div>
            </div>
          </div>

          {/* IP 輸入框 */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2 text-poker-gold-300">
              授權 IP 地址
            </label>
            <div className="flex flex-col md:flex-row gap-3">
              <input
                type="text"
                value={authorizedIP}
                onChange={(e) => {
                  setAuthorizedIP(e.target.value);
                  setError('');
                  setSuccess('');
                }}
                placeholder="例如：192.168.1.1"
                className="flex-1 px-4 py-3 bg-gray-800 border-2 border-poker-gold-600 border-opacity-50 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-poker-gold-500 focus:border-poker-gold-400 transition-all text-base md:text-lg font-mono"
                disabled={loading}
              />
              <button
                onClick={handleFetchCurrentIP}
                disabled={fetchingIP || loading}
                className="px-4 md:px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg text-sm md:text-base font-semibold text-white transition-all duration-200 border-2 border-blue-500 shadow-lg flex items-center justify-center gap-2 whitespace-nowrap"
              >
                {fetchingIP ? (
                  <>
                    <span className="animate-spin">⏳</span>
                    <span>獲取中...</span>
                  </>
                ) : (
                  <>
                    <span>🌐</span>
                    <span>抓取目前 IP</span>
                  </>
                )}
              </button>
            </div>
            <p className="text-gray-400 text-xs mt-2">
              輸入公司的公網 IP 地址，或點擊「抓取目前 IP」自動填入當前連線的 IP
            </p>
          </div>

          {/* 當前 IP 顯示 */}
          {currentIP && (
            <div className="mb-4 p-3 bg-gray-800 rounded-lg border border-poker-gold-600 border-opacity-30">
              <div className="flex items-center gap-2">
                <span className="text-poker-gold-400 text-sm font-semibold">當前連線 IP：</span>
                <span className="text-white font-mono text-sm md:text-base">{currentIP}</span>
              </div>
            </div>
          )}

          {/* 保存按鈕 */}
          <div className="flex justify-end">
            <button
              onClick={handleSave}
              disabled={loading || !authorizedIP.trim()}
              className="px-6 md:px-8 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg text-base md:text-lg font-semibold text-white transition-all duration-200 border-2 border-green-500 shadow-lg flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="animate-spin">⏳</span>
                  <span>保存中...</span>
                </>
              ) : (
                <>
                  <span>💾</span>
                  <span>保存設定</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* 安全提示 */}
        <div className="bg-gradient-to-br from-yellow-900 via-black to-yellow-900 rounded-2xl p-4 md:p-6 border-2 border-yellow-600 border-opacity-40 shadow-xl">
          <div className="flex items-start gap-3">
            <span className="text-2xl">⚠️</span>
            <div className="flex-1">
              <h3 className="text-lg md:text-xl font-display font-bold text-yellow-400 mb-2">
                重要提醒
              </h3>
              <ul className="text-yellow-200 text-xs md:text-sm space-y-2 list-disc list-inside">
                <li>此設定會影響所有裝置的帳務操作權限</li>
                <li>請確保輸入的 IP 地址正確，否則可能導致無法進行帳務更動</li>
                <li>如果忘記授權 IP，請聯繫系統管理員</li>
                <li>手機版和電腦版都會受到此 IP 限制</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
