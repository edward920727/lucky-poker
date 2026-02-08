import { useState, useEffect } from 'react';
import { getAllUsers, addUser, deleteUser, User, isProtectedUser } from '../utils/userManagement';
import { logAction } from '../../utils/auditLog';
import { getCurrentUsername } from '../utils/auth';

interface UserManagementProps {
  onBack: () => void;
}

export default function UserManagement({ onBack }: UserManagementProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [currentUser, setCurrentUser] = useState<string | null>(null);

  useEffect(() => {
    loadUsers();
    setCurrentUser(getCurrentUsername());
  }, []);

  const loadUsers = () => {
    const allUsers = getAllUsers();
    setUsers(allUsers);
  };

  const handleAddUser = () => {
    setError('');
    setSuccess('');

    if (!newUsername.trim()) {
      setError('請輸入帳號');
      return;
    }

    if (!newPassword.trim()) {
      setError('請輸入密碼');
      return;
    }

    const result = addUser(newUsername, newPassword, isAdmin);
    
    if (result.success) {
      setSuccess(result.message);
      setNewUsername('');
      setNewPassword('');
      setIsAdmin(false);
      loadUsers();
      // 記錄操作日誌
      logAction('create', newUsername, currentUser || '系统');
    } else {
      setError(result.message);
    }
  };

  const handleDeleteUser = (username: string) => {
    if (!confirm(`確定要刪除用戶「${username}」嗎？`)) {
      return;
    }

    const result = deleteUser(username);
    
    if (result.success) {
      setSuccess(result.message);
      loadUsers();
      // 記錄操作日誌
      logAction('delete', username, currentUser || '系统');
    } else {
      setError(result.message);
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

      <div className="max-w-6xl mx-auto relative z-10">
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
            <div className="text-3xl md:text-4xl">👥</div>
            <h1 className="text-2xl md:text-4xl font-display font-black text-poker-gold-400 gold-glow">
              帳號管理
            </h1>
          </div>
          <p className="text-gray-400 text-sm md:text-base mt-2">
            管理系統登入帳號，只有管理員可以訪問此頁面
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

        {/* 新增用戶表單 */}
        <div className="bg-gradient-to-br from-gray-900 via-black to-gray-900 rounded-2xl p-4 md:p-6 mb-6 border-2 border-poker-gold-600 border-opacity-40 shadow-xl shadow-poker-gold-500/20">
          <h2 className="text-xl md:text-2xl font-display font-bold text-poker-gold-400 mb-4">
            新增用戶
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-poker-gold-300">帳號</label>
              <input
                type="text"
                value={newUsername}
                onChange={(e) => {
                  setNewUsername(e.target.value);
                  setError('');
                  setSuccess('');
                }}
                placeholder="請輸入帳號"
                className="w-full px-4 py-2 bg-gray-800 border-2 border-poker-gold-600 border-opacity-50 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-poker-gold-500 focus:border-poker-gold-400 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-poker-gold-300">密碼</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  setError('');
                  setSuccess('');
                }}
                placeholder="請輸入密碼"
                className="w-full px-4 py-2 bg-gray-800 border-2 border-poker-gold-600 border-opacity-50 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-poker-gold-500 focus:border-poker-gold-400 transition-all"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={handleAddUser}
                className="w-full px-4 py-2 bg-white hover:bg-gray-100 rounded-lg text-base font-semibold text-black transition-all duration-200 border-2 border-white shadow-lg"
              >
                ➕ 新增用戶
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isAdmin"
              checked={isAdmin}
              onChange={(e) => setIsAdmin(e.target.checked)}
              className="w-4 h-4 rounded border-poker-gold-600 bg-gray-800 text-poker-gold-600 focus:ring-poker-gold-500"
            />
            <label htmlFor="isAdmin" className="text-sm text-poker-gold-300 cursor-pointer">
              設為管理員（可進入管理頁面）
            </label>
          </div>
        </div>

        {/* 用戶列表 */}
        <div className="bg-gradient-to-br from-gray-900 via-black to-gray-900 rounded-2xl p-4 md:p-6 border-2 border-poker-gold-600 border-opacity-40 shadow-xl shadow-poker-gold-500/20">
          <h2 className="text-xl md:text-2xl font-display font-bold text-poker-gold-400 mb-4">
            用戶列表
          </h2>
          
          {/* 手機版：卡片式佈局 */}
          <div className="md:hidden space-y-3">
            {users.map((user) => (
              <div
                key={user.username}
                className="bg-gray-800 rounded-xl p-4 border-2 border-poker-gold-600 border-opacity-30"
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="font-bold text-lg text-poker-gold-300 mb-1">
                      {user.username}
                      {user.isAdmin && (
                        <span className="ml-2 text-xs bg-poker-gold-600 px-2 py-1 rounded-full">
                          管理員
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-400">密碼: ••••••••</div>
                  </div>
                  {!isProtectedUser(user.username) && (
                    <button
                      onClick={() => handleDeleteUser(user.username)}
                      className="px-3 py-1.5 bg-red-600 hover:bg-red-700 rounded-lg text-sm font-semibold text-white transition-all duration-200"
                    >
                      🗑️ 刪除
                    </button>
                  )}
                  {isProtectedUser(user.username) && (
                    <span className="text-xs text-gray-500">受保護帳號</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* 桌面版：表格佈局 */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="border-b-2 border-poker-gold-600 border-opacity-50 bg-poker-gold-900 bg-opacity-20">
                  <th className="text-left py-4 px-4 font-display font-bold text-poker-gold-300">帳號</th>
                  <th className="text-left py-4 px-4 font-display font-bold text-poker-gold-300">角色</th>
                  <th className="text-left py-4 px-4 font-display font-bold text-poker-gold-300">操作</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr
                    key={user.username}
                    className="border-b border-poker-gold-600 border-opacity-20 hover:bg-poker-gold-900 hover:bg-opacity-20 transition-colors"
                  >
                    <td className="py-4 px-4 font-mono font-semibold text-lg">{user.username}</td>
                    <td className="py-4 px-4">
                      {user.isAdmin ? (
                        <span className="bg-poker-gold-600 px-3 py-1 rounded-full text-sm font-semibold">
                          管理員
                        </span>
                      ) : (
                        <span className="text-gray-400 text-sm">一般用戶</span>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      {!isProtectedUser(user.username) ? (
                        <button
                          onClick={() => handleDeleteUser(user.username)}
                          className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm font-semibold text-white transition-all duration-200"
                        >
                          🗑️ 刪除
                        </button>
                      ) : (
                        <span className="text-gray-500 text-sm">受保護帳號（不可刪除）</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
