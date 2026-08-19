import { Bell, Check, CheckSquare, X, Info, FileSpreadsheet, ListTodo, AlertTriangle } from 'lucide-react';
import { Notification } from '../types';

interface NotificationPanelProps {
  notifications: Notification[];
  currentEmployeeId: string | null;
  isSupervisorOrOwner: boolean;
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onClose?: () => void;
}

export default function NotificationPanel({
  notifications,
  currentEmployeeId,
  isSupervisorOrOwner,
  onMarkRead,
  onMarkAllRead,
  onClose
}: NotificationPanelProps) {
  // Filter notifications meant for this user:
  // - If supervisor, they see 'all_supervisors' + direct notifications.
  // - Otherwise, they see only notifications with recipientId === currentEmployeeId.
  const filtered = notifications.filter((notif) => {
    if (notif.recipientId === 'all_supervisors') {
      return isSupervisorOrOwner;
    }
    return currentEmployeeId && notif.recipientId === currentEmployeeId;
  });

  const unreadCount = filtered.filter((n) => !n.isRead).length;

  const getNotifIcon = (type: string) => {
    switch (type) {
      case 'leave_submit':
        return <FileSpreadsheet className="w-4 h-4 text-orange-600" />;
      case 'leave_approve':
        return <Check className="w-4 h-4 text-emerald-600" />;
      case 'leave_reject':
        return <X className="w-4 h-4 text-red-600" />;
      case 'task_assign':
        return <ListTodo className="w-4 h-4 text-indigo-600" />;
      default:
        return <Info className="w-4 h-4 text-gray-500" />;
    }
  };

  const getNotifBg = (type: string, isRead: boolean) => {
    if (isRead) return 'bg-white opacity-80';
    switch (type) {
      case 'leave_submit':
        return 'bg-orange-50/50 border-orange-100/70';
      case 'leave_approve':
        return 'bg-emerald-50/40 border-emerald-100/70';
      case 'leave_reject':
        return 'bg-red-50/40 border-red-100/70';
      case 'task_assign':
        return 'bg-indigo-50/40 border-indigo-100/70';
      default:
        return 'bg-gray-50 border-gray-100';
    }
  };

  return (
    <div className="bg-white border border-gray-100 rounded-3xl shadow-xl overflow-hidden max-w-md w-full flex flex-col max-h-[480px]">
      {/* Header */}
      <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Bell className="w-5 h-5 text-gray-600" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] font-black h-4 w-4 rounded-full flex items-center justify-center animate-pulse">
                {unreadCount}
              </span>
            )}
          </div>
          <div>
            <h4 className="text-xs font-black text-gray-800 uppercase tracking-wider">
              Centre de Notifications
            </h4>
            <p className="text-[10px] text-gray-400 font-bold mt-0.5">
              {unreadCount} mise{unreadCount > 1 ? 's' : ''} à jour non lue{unreadCount > 1 ? 's' : ''}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={onMarkAllRead}
              className="text-[10px] text-emerald-600 hover:text-emerald-700 font-black uppercase tracking-wider flex items-center gap-1 hover:bg-emerald-50 px-2 py-1 rounded-lg transition-all"
              title="Tout marquer comme lu"
            >
              <CheckSquare className="w-3.5 h-3.5" />
              Tout lire
            </button>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 p-1.5 rounded-full hover:bg-gray-100 transition-all"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Notifications List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-gray-50/20">
        {filtered.length === 0 ? (
          <div className="py-12 text-center text-xs text-gray-400 italic">
            <Bell className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            Aucune notification reçue pour le moment.
          </div>
        ) : (
          filtered.map((notif) => {
            const formattedTime = new Date(notif.timestamp).toLocaleDateString([], {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            });

            return (
              <div
                key={notif.id}
                className={`p-3.5 rounded-2xl border flex gap-3 transition-all ${getNotifBg(
                  notif.type,
                  notif.isRead
                )} ${!notif.isRead ? 'shadow-sm border-l-4 border-l-emerald-600' : 'border-gray-100'}`}
              >
                <div className="w-8 h-8 rounded-full bg-white border flex items-center justify-center shrink-0 shadow-sm">
                  {getNotifIcon(notif.type)}
                </div>

                <div className="flex-1 min-w-0 space-y-0.5 text-left">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-xs font-black text-gray-800 ${!notif.isRead ? 'font-black' : 'font-bold text-gray-700'}`}>
                      {notif.title}
                    </p>
                    <span className="text-[8px] text-gray-400 font-mono font-black shrink-0">
                      {formattedTime}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-600 font-medium leading-relaxed">
                    {notif.message}
                  </p>

                  {!notif.isRead && (
                    <div className="pt-1 flex justify-end">
                      <button
                        onClick={() => onMarkRead(notif.id)}
                        className="text-[9px] text-emerald-600 hover:bg-emerald-50 px-2 py-0.5 rounded font-black uppercase tracking-wider flex items-center gap-0.5 transition-all"
                      >
                        <Check size={10} className="stroke-[3]" /> Marquer lu
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
