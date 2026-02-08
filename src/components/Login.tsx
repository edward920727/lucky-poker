import { useState, FormEvent } from 'react';
import { login } from '../utils/auth';

interface LoginProps {
  onLoginSuccess: () => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // 模擬短暫延遲以提供更好的 UX
    await new Promise(resolve => setTimeout(resolve, 300));

    if (login(username, password)) {
      onLoginSuccess();
    } else {
      setError('帳號或密碼錯誤，請重新輸入');
      setPassword('');
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-black relative overflow-hidden">
      {/* 背景裝飾 - 黑色籌碼帶金色發光 */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-20 left-10 w-24 h-24 chip-float chip-glow opacity-25">
          <div className="chip w-24 h-24 rounded-full"></div>
        </div>
        <div className="absolute bottom-32 right-20 w-20 h-20 chip-float chip-glow opacity-20" style={{ animationDelay: '1s' }}>
          <div className="chip w-20 h-20 rounded-full"></div>
        </div>
        <div className="absolute top-1/2 left-1/4 w-28 h-28 chip-float chip-glow opacity-18" style={{ animationDelay: '2s' }}>
          <div className="chip w-28 h-28 rounded-full"></div>
        </div>
        <div className="absolute top-1/3 right-1/4 w-22 h-22 chip-float chip-glow opacity-15" style={{ animationDelay: '1.5s' }}>
          <div className="chip w-22 h-22 rounded-full"></div>
        </div>
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Logo 和標題 */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="text-6xl md:text-7xl filter drop-shadow-[0_0_15px_rgba(255,215,0,0.8)]">🃏</div>
            <h1 className="text-4xl md:text-6xl font-display font-black text-poker-gold-400 gold-glow">
              LUCKY POKER
            </h1>
            <div className="text-6xl md:text-7xl filter drop-shadow-[0_0_15px_rgba(255,215,0,0.8)]">🂮</div>
          </div>
          <p className="text-xl md:text-2xl text-poker-gold-300 font-body font-light tracking-wider mb-4 drop-shadow-[0_0_10px_rgba(255,215,0,0.6)]">
            賽事管理系統
          </p>
          <div className="flex items-center justify-center gap-2">
            <div className="w-16 h-1 bg-gradient-to-r from-transparent via-poker-gold-500 to-transparent"></div>
            <div className="text-poker-gold-400 text-xl filter drop-shadow-[0_0_8px_rgba(255,215,0,0.8)]">♠ ♥ ♦ ♣</div>
            <div className="w-16 h-1 bg-gradient-to-r from-transparent via-poker-gold-500 to-transparent"></div>
          </div>
        </div>

        {/* 登入表單 */}
        <div className="bg-gradient-to-br from-gray-900 via-black to-gray-900 rounded-2xl p-6 md:p-8 border-2 border-poker-gold-600 border-opacity-50 shadow-2xl shadow-poker-gold-500/30">
          <div className="mb-6">
            <h2 className="text-2xl md:text-3xl font-display font-bold text-poker-gold-400 text-center mb-2">
              系統登入
            </h2>
            <p className="text-gray-400 text-sm text-center">
              請輸入您的帳號和密碼以繼續
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* 帳號輸入 */}
            <div>
              <label htmlFor="username" className="block text-sm font-semibold text-poker-gold-300 mb-2">
                帳號
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setError('');
                }}
                placeholder="請輸入帳號"
                className="w-full px-4 py-3 bg-gray-800 border-2 border-poker-gold-600 border-opacity-50 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-poker-gold-500 focus:border-poker-gold-400 transition-all"
                required
                autoComplete="username"
                disabled={isLoading}
              />
            </div>

            {/* 密碼輸入 */}
            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-poker-gold-300 mb-2">
                密碼
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError('');
                }}
                placeholder="請輸入密碼"
                className="w-full px-4 py-3 bg-gray-800 border-2 border-poker-gold-600 border-opacity-50 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-poker-gold-500 focus:border-poker-gold-400 transition-all"
                required
                autoComplete="current-password"
                disabled={isLoading}
              />
            </div>

            {/* 錯誤訊息 */}
            {error && (
              <div className="bg-red-900 bg-opacity-50 border-2 border-red-600 rounded-lg p-3 flex items-center gap-2">
                <span className="text-xl">⚠️</span>
                <span className="text-red-200 text-sm font-semibold">{error}</span>
              </div>
            )}

            {/* 登入按鈕 */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 bg-white hover:bg-gray-100 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-xl text-lg font-bold text-black transition-all duration-300 shadow-xl hover:shadow-2xl border-2 border-white overflow-hidden relative group"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-gray-200 to-transparent opacity-0 group-hover:opacity-30 transform -skew-x-12 group-hover:translate-x-full transition-all duration-1000"></div>
              <span className="relative z-10 flex items-center justify-center gap-2">
                {isLoading ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>登入中...</span>
                  </>
                ) : (
                  <>
                    <span className="text-xl">🔐</span>
                    <span>登入</span>
                  </>
                )}
              </span>
            </button>
          </form>

          {/* 安全提示 */}
          <div className="mt-6 pt-6 border-t border-poker-gold-600 border-opacity-30">
            <div className="flex items-start gap-2 text-xs text-gray-500">
              <span className="text-base">🔒</span>
              <div>
                <p className="font-semibold text-gray-400 mb-1">安全提示</p>
                <p>此系統僅供授權人員使用，請妥善保管您的登入憑證。</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
