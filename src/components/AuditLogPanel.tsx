import { useState, useEffect } from 'react';
import { AuditLog } from '../../types/auditLog';
import { getAllLogs, getLogsByMemberId } from '../../utils/auditLog';

interface AuditLogPanelProps {
  onClose: () => void;
  memberId?: string; // 如果提供，只显示该会编的日志
}

export default function AuditLogPanel({ onClose, memberId }: AuditLogPanelProps) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    loadLogs();
  }, [memberId, filter]);

  const loadLogs = () => {
    let allLogs: AuditLog[];
    if (memberId) {
      allLogs = getLogsByMemberId(memberId);
    } else {
      allLogs = getAllLogs();
    }

    // 应用过滤器
    if (filter !== 'all') {
      allLogs = allLogs.filter(log => log.action === filter);
    }

    setLogs(allLogs);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'create':
        return 'text-green-400';
      case 'update':
      case 'chip_change':
      case 'buyin':
        return 'text-yellow-400';
      case 'delete':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      create: '新增',
      update: '修改',
      delete: '刪除',
      buyin: '買入',
      chip_change: '碼量變更',
    };
    return labels[action] || action;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl p-6 max-w-4xl w-full max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">
            {memberId ? `會編 ${memberId} 操作記錄` : '操作日誌 (Audit Log)'}
          </h2>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white hover:bg-gray-100 text-black rounded-lg border-2 border-white transition-all duration-200"
          >
            關閉
          </button>
        </div>

        {/* 過濾器 */}
        {!memberId && (
          <div className="mb-4 flex gap-2 flex-wrap">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold border-2 transition-all duration-200 ${
                filter === 'all' ? 'bg-gray-200 text-black border-white' : 'bg-white text-black border-white hover:bg-gray-100'
              }`}
            >
              全部
            </button>
            <button
              onClick={() => setFilter('create')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold border-2 transition-all duration-200 ${
                filter === 'create' ? 'bg-gray-200 text-black border-white' : 'bg-white text-black border-white hover:bg-gray-100'
              }`}
            >
              新增
            </button>
            <button
              onClick={() => setFilter('chip_change')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold border-2 transition-all duration-200 ${
                filter === 'chip_change' ? 'bg-gray-200 text-black border-white' : 'bg-white text-black border-white hover:bg-gray-100'
              }`}
            >
              碼量變更
            </button>
            <button
              onClick={() => setFilter('buyin')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold border-2 transition-all duration-200 ${
                filter === 'buyin' ? 'bg-gray-200 text-black border-white' : 'bg-white text-black border-white hover:bg-gray-100'
              }`}
            >
              買入
            </button>
            <button
              onClick={() => setFilter('delete')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold border-2 transition-all duration-200 ${
                filter === 'delete' ? 'bg-gray-200 text-black border-white' : 'bg-white text-black border-white hover:bg-gray-100'
              }`}
            >
              刪除
            </button>
          </div>
        )}

        {/* 日誌列表 */}
        {logs.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p>尚無操作記錄</p>
          </div>
        ) : (
          <div className="space-y-3">
            {logs.map((log) => (
              <div
                key={log.id}
                className="bg-gray-700 p-4 rounded-lg border-l-4 border-blue-500 hover:bg-gray-600 transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-2">
                  <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                    <span className={`font-semibold text-sm sm:text-base ${getActionColor(log.action)}`}>
                      [{getActionLabel(log.action)}]
                    </span>
                    <span className="font-mono text-base sm:text-lg">會編 {log.memberId}</span>
                    {log.operator && log.operator !== '系统' && (
                      <span className="px-2 sm:px-3 py-1 bg-poker-gold-600 text-white text-xs sm:text-sm font-semibold rounded-full border border-poker-gold-400 whitespace-nowrap">
                        👤 {log.operator}
                      </span>
                    )}
                    {(!log.operator || log.operator === '系统') && (
                      <span className="px-2 sm:px-3 py-1 bg-gray-600 text-gray-300 text-xs sm:text-sm font-semibold rounded-full border border-gray-500 whitespace-nowrap">
                        🤖 系統
                      </span>
                    )}
                  </div>
                  <span className="text-xs sm:text-sm text-gray-400 whitespace-nowrap">
                    {formatDate(log.timestamp)}
                  </span>
                </div>
                <div className="text-sm text-gray-300 mt-2">
                  {log.description}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
