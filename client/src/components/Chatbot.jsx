import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, Send, Bot, AlertCircle, Sparkles } from 'lucide-react';
import axios from 'axios';
import { API_URL } from '../config/api';


/**
 * DriveLegal AI Chatbot component.
 * Props:
 *   onChatSuccess — optional callback invoked after every successful AI response,
 *                   used by parent pages to re-fetch the awareness/telemetry score.
 */
const Chatbot = ({ onChatSuccess }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'model', text: 'Hello! I am your DriveLegal AI Assistant. Ask me about routes, safety, or traffic rules.' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState(null);
  // Count of SUCCESSFUL AI interactions this browser session (not incremented on failure)
  const [sessionChatCount, setSessionChatCount] = useState(0);
  const messagesEndRef = useRef(null);

  const triggerToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  // Build auth headers from JWT stored in localStorage
  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const prompt = input.trim();
    setInput('');

    setMessages(prev => [
      ...prev,
      { id: Date.now(), sender: 'user', role: 'user', text: prompt }
    ]);
    setIsLoading(true);

    try {
      // Auth header required — backend increments trafficAssistantChatsCount ONLY on success
      const response = await axios.post(
        `${API_URL}/api/ai/chat`,
        {
          prompt,
          history: messages.map(msg => ({
            role: msg.role === 'user' || msg.sender === 'user' ? 'user' : 'model',
            text: msg.text
          }))
        },
        { headers: getAuthHeaders() }
      );

      const aiText =
        response.data.response ||
        response.data.data?.response ||
        response.data.candidates?.[0]?.content?.parts?.[0]?.text ||
        'Sorry, I could not understand that.';

      setMessages(prev => [
        ...prev,
        { id: Date.now() + 1, sender: 'ai', role: 'model', text: aiText }
      ]);

      // ── Only increment on success ────────────────────────────────────────────
      setSessionChatCount(prev => prev + 1);
      if (typeof onChatSuccess === 'function') {
        onChatSuccess(); // Parent re-fetches telemetry / awareness score
      }
    } catch (error) {
      console.error('AI Chat API Call Failure:', error);
      // Session count is NOT incremented — mirrors the server-side guarantee
      setMessages(prev => [
        ...prev,
        { id: Date.now() + 1, sender: 'ai', role: 'model', text: '😅 I got confused. Please try again.' }
      ]);
      triggerToast('😅 I got confused. Please try again.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating Action Button — fixed bottom-right, z-50, mobile responsive */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(true)}
        style={{ bottom: '24px', right: '24px' }}
        className={`fixed p-4 rounded-full bg-gradient-to-r from-sky-500 to-indigo-600 shadow-[0_0_20px_rgba(99,102,241,0.4)] z-[5000] ${isOpen ? 'hidden' : 'flex'} items-center justify-center`}
      >
        <MessageSquare className="w-6 h-6 text-white" />
        {/* Session interaction badge — appears after first successful chat */}
        {sessionChatCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-[#050811] text-[9px] font-black text-white flex items-center justify-center">
            {sessionChatCount > 9 ? '9+' : sessionChatCount}
          </span>
        )}
      </motion.button>
 
      {/* Chat Window — fixed bottom-right, above all content */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            style={{ bottom: '24px', right: '24px' }}
            className="fixed w-[380px] h-[600px] max-h-[80vh] glass rounded-2xl flex flex-col overflow-hidden shadow-2xl border border-slate-700/50 z-[5000] max-w-[calc(100vw-40px)]"
          >
            {/* Header */}
            <div className="bg-slate-800/80 p-4 border-b border-slate-700/50 flex justify-between items-center backdrop-blur-md">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-sky-500/20 flex items-center justify-center border border-sky-500/30">
                  <Bot className="w-5 h-5 text-sky-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">DriveLegal AI</h3>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                    <span className="text-xs text-slate-400">Online and ready</span>
                  </div>
                </div>
              </div>

              {/* Live session chat count pill */}
              {sessionChatCount > 0 && (
                <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-sky-500/10 border border-sky-500/20 text-[9px] font-black text-sky-400">
                  <Sparkles className="w-3 h-3" />
                  {sessionChatCount} AI {sessionChatCount === 1 ? 'chat' : 'chats'} today
                </div>
              )}

              <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-900/50 relative">
              <AnimatePresence>
                {toast && (
                  <motion.div
                    initial={{ opacity: 0, y: -20, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    className={`absolute top-4 left-4 right-4 z-50 px-4 py-2.5 rounded-xl border shadow-lg flex items-center gap-2.5 backdrop-blur-md text-xs font-semibold ${
                      toast.type === 'success'
                        ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                        : 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                    }`}
                  >
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{toast.message}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {messages.map((msg, idx) => {
                const isUser = msg.role === 'user' || msg.sender === 'user';
                return (
                  <motion.div
                    key={msg.id || idx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[80%] p-3 rounded-2xl text-xs leading-relaxed shadow-md ${
                      isUser
                        ? 'bg-gradient-to-r from-sky-600 to-indigo-600 text-white rounded-tr-sm font-medium'
                        : 'glass border-slate-700/60 text-slate-200 rounded-tl-sm'
                    }`}>
                      {msg.text}
                    </div>
                  </motion.div>
                );
              })}

              {/* Typing indicator */}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="glass p-3 rounded-2xl rounded-tl-sm border-slate-700/50 flex flex-col gap-1">
                    <span className="text-[10px] text-slate-400 font-semibold">DriveLegal AI is thinking...</span>
                    <div className="flex items-center gap-1.5 mt-0.5 text-sky-400 font-black">
                      <span className="animate-bounce" style={{ animationDelay: '0ms' }}>●</span>
                      <span className="animate-bounce" style={{ animationDelay: '150ms' }}>●</span>
                      <span className="animate-bounce" style={{ animationDelay: '300ms' }}>●</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-slate-800/90 border-t border-slate-700/50 backdrop-blur-md">
              <form
                onSubmit={e => { e.preventDefault(); handleSend(); }}
                className="relative flex items-center"
              >
                <input
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  placeholder="Ask about road safety or rules..."
                  className="w-full bg-slate-900/50 border border-slate-600 rounded-xl py-3 pl-4 pr-12 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-sky-500 transition-all"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className="absolute right-2 p-1.5 rounded-lg text-sky-400 hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:hover:bg-transparent"
                >
                  <Send className="w-5 h-5" />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Chatbot;
