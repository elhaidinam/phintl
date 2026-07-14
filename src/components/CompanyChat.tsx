import React, { useState, useRef, useEffect } from 'react';
import { Send, Users, MessageSquare, Lock, Hash, MessageCircle } from 'lucide-react';
import { Employee, ChatMessage } from '../types';

const getEmployeeLastName = (fullName: string): string => {
  const parts = fullName.trim().split(/\s+/);
  return parts[parts.length - 1] || '';
};

const compareEmployeesByLastName = (a: Employee, b: Employee): number => {
  const nameA = getEmployeeLastName(a.name).toLowerCase();
  const nameB = getEmployeeLastName(b.name).toLowerCase();
  return nameA.localeCompare(nameB, 'fr');
};

interface CompanyChatProps {
  currentEmployee: Employee | null;
  employees: Employee[];
  messages: ChatMessage[];
  onSendMessage: (recipientId: string, content: string) => void;
}

export default function CompanyChat({
  currentEmployee,
  employees,
  messages,
  onSendMessage
}: CompanyChatProps) {
  const [selectedRecipientId, setSelectedRecipientId] = useState<string>('all'); // 'all' = group chat
  const [messageText, setMessageText] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when message list updates or recipient changes
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, selectedRecipientId]);

  // Filter messages based on active conversation
  const filteredMessages = messages.filter((msg) => {
    if (selectedRecipientId === 'all') {
      return msg.recipientId === 'all';
    } else {
      // Direct message between currentEmployee and selectedRecipientId
      if (!currentEmployee) return false;
      return (
        (msg.senderId === currentEmployee.id && msg.recipientId === selectedRecipientId) ||
        (msg.senderId === selectedRecipientId && msg.recipientId === currentEmployee.id)
      );
    }
  });

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim()) return;
    if (!currentEmployee) {
      alert("Veuillez vous connecter à votre espace privé pour participer au chat !");
      return;
    }
    onSendMessage(selectedRecipientId, messageText.trim());
    setMessageText('');
  };

  const selectedRecipientName =
    selectedRecipientId === 'all'
      ? 'Canal Général (Tous)'
      : employees.find((e) => e.id === selectedRecipientId)?.name || 'Collaborateur';

  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden grid grid-cols-1 md:grid-cols-12 h-[650px] md:h-[550px]">
      {/* Left Sidebar: Contacts */}
      <div className="col-span-1 md:col-span-4 border-b md:border-b-0 md:border-r border-gray-100 flex flex-col bg-gray-50/50 max-h-[140px] md:max-h-none h-full shrink-0">
        <div className="p-4 border-b border-gray-100 bg-white hidden md:block">
          <h4 className="text-sm font-black text-gray-800 uppercase tracking-wider flex items-center gap-2">
            <Users className="w-4 h-4 text-emerald-600" />
            Canaux & Membres
          </h4>
          <p className="text-[10px] text-gray-400 font-bold mt-1">
            Sélectionnez une discussion active
          </p>
        </div>

        <div className="flex-1 overflow-x-auto md:overflow-x-hidden md:overflow-y-auto p-3 flex flex-row md:flex-col gap-2 md:space-y-1">
          {/* General group chat channel */}
          <button
            onClick={() => setSelectedRecipientId('all')}
            className={`p-2.5 rounded-xl flex items-center gap-3 transition-all text-left shrink-0 w-[180px] md:w-full ${
              selectedRecipientId === 'all'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-100'
                : 'bg-white md:bg-transparent hover:bg-gray-100 text-gray-700 border border-gray-150 md:border-0'
            }`}
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
              selectedRecipientId === 'all' ? 'bg-emerald-700 text-white' : 'bg-emerald-100 text-emerald-700'
            }`}>
              <Hash className="w-4.5 h-4.5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-black truncate">Canal Général (Tous)</p>
              <p className={`text-[10px] truncate ${selectedRecipientId === 'all' ? 'text-emerald-100' : 'text-gray-400'}`}>
                Discussion d'équipe
              </p>
            </div>
          </button>

          {/* Individual employees */}
          <div className="flex flex-row md:flex-col gap-2 shrink-0 md:shrink-1">
            {[...employees]
              .filter((emp) => !currentEmployee || emp.id !== currentEmployee.id)
              .sort(compareEmployeesByLastName)
              .map((emp) => {
                const isSelected = selectedRecipientId === emp.id;
                return (
                  <button
                    key={emp.id}
                    onClick={() => setSelectedRecipientId(emp.id)}
                    className={`p-2.5 rounded-xl flex items-center gap-3 transition-all text-left shrink-0 w-[160px] md:w-full ${
                      isSelected
                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-100'
                        : 'bg-white md:bg-transparent hover:bg-gray-100 text-gray-700 border border-gray-150 md:border-0'
                    }`}
                  >
                    <img
                      src={emp.avatar}
                      alt={emp.name}
                      className="w-8 h-8 rounded-full bg-white border object-cover shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center">
                        <p className="text-xs font-black truncate">{emp.name}</p>
                        <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-green-500'}`} />
                      </div>
                      <p className={`text-[10px] truncate ${isSelected ? 'text-emerald-100' : 'text-gray-400'}`}>
                        {emp.role}
                      </p>
                    </div>
                  </button>
                );
              })}
          </div>
        </div>
      </div>

      {/* Right Area: Messages */}
      <div className="col-span-1 md:col-span-8 flex flex-col h-[510px] md:h-full bg-white">
        {/* Conversation Header */}
        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              {selectedRecipientId === 'all' ? (
                <Hash className="w-5 h-5 text-emerald-600" />
              ) : (
                <img
                  src={employees.find((e) => e.id === selectedRecipientId)?.avatar}
                  alt={selectedRecipientName}
                  className="w-full h-full rounded-full object-cover border"
                />
              )}
            </div>
            <div>
              <h5 className="text-sm font-black text-gray-800 leading-tight">
                {selectedRecipientName}
              </h5>
              <p className="text-[10px] text-gray-400 font-bold">
                {selectedRecipientId === 'all'
                  ? 'Canal d\'échange général pour toute l\'équipe'
                  : 'Discussion chiffrée de bout en bout'}
              </p>
            </div>
          </div>

          {selectedRecipientId !== 'all' && (
            <button
              onClick={() => setSelectedRecipientId('all')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-black text-xs rounded-xl transition-all border border-emerald-100 cursor-pointer shadow-sm active:scale-95"
            >
              <Hash className="w-3.5 h-3.5" />
              <span>Retour au Général</span>
            </button>
          )}
        </div>

        {/* Messages List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/30">
          {filteredMessages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2">
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
                <MessageCircle className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-black text-gray-600">Aucun message</p>
                <p className="text-[10px] text-gray-400 max-w-xs mx-auto mt-0.5">
                  Engagez la conversation ! Les messages envoyés sont instantanément visibles par le destinataire.
                </p>
              </div>
            </div>
          ) : (
            filteredMessages.map((msg) => {
              const isMe = currentEmployee && msg.senderId === currentEmployee.id;
              const formattedTime = new Date(msg.timestamp).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit'
              });

              return (
                <div
                  key={msg.id}
                  className={`flex gap-2 max-w-[85%] ${isMe ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
                >
                  <img
                    src={msg.senderAvatar}
                    alt={msg.senderName}
                    className="w-8 h-8 rounded-full border bg-white object-cover shrink-0 mt-1"
                  />
                  <div className="space-y-0.5">
                    <span className={`text-[9px] font-black block ${isMe ? 'text-right text-emerald-700' : 'text-gray-500'}`}>
                      {msg.senderName} • {formattedTime}
                    </span>
                    <div
                      className={`p-3 rounded-2xl text-xs font-semibold leading-relaxed ${
                        isMe
                          ? 'bg-emerald-600 text-white rounded-tr-none shadow-sm shadow-emerald-100'
                          : 'bg-white text-gray-800 rounded-tl-none border border-gray-100 shadow-sm'
                      }`}
                    >
                      {msg.content}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Message Input Box */}
        <div className="p-4 border-t border-gray-100 bg-white shrink-0">
          {!currentEmployee ? (
            <div className="bg-orange-50 border border-orange-100 text-orange-800 text-xs p-3 rounded-xl flex items-center gap-2 justify-center font-bold">
              <Lock size={14} className="animate-bounce" />
              <span>Connectez-vous à votre espace privé pour participer au chat</span>
            </div>
          ) : (
            <form onSubmit={handleSend} className="flex gap-2">
              <input
                type="text"
                placeholder={`Écrire à ${selectedRecipientName}...`}
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                className="flex-1 text-xs px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-gray-50 font-semibold"
              />
              <button
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 rounded-xl flex items-center justify-center transition-all shadow-md active:scale-95"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
