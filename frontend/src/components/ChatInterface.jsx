import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Moon, Sun, Trash2, Send, Copy, ThumbsUp, ThumbsDown, X, BookOpen, Calculator, AlertTriangle, Clock, FileText, Bookmark, Share2 } from 'lucide-react';
import numlLogo from '../assets/numl_logo.png';

const MAX_LOCAL_MESSAGES = 25;

const generateId = () => 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);

export default function ChatInterface() {
  const [messages, setMessages] = useState([]);
  const [theme, setTheme] = useState('light');
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showClearModal, setShowClearModal] = useState(false);
  const [activeSource, setActiveSource] = useState(null);
  const [feedbackState, setFeedbackState] = useState({});
  const [copiedId, setCopiedId] = useState(null);
  const [isServerWarm, setIsServerWarm] = useState(false);

  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const deepLinkProcessed = useRef(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const query = params.get('q');
    if (query && !deepLinkProcessed.current) {
      deepLinkProcessed.current = true;

      // Clean the URL silently back to root route
      window.history.replaceState(null, '', window.location.pathname);

      setTimeout(() => {
        sendMessage(query, true);
      }, 300);
    }
  }, []);

  useEffect(() => {
    const pingBackend = async () => {
      try {
        const backendUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000';
        const res = await fetch(`${backendUrl}/`, {
          method: 'GET',
          headers: { 'Cache-Control': 'no-cache' }
        });
        if (res.ok) {
          setIsServerWarm(true);
        }
      } catch (err) {
        console.warn('Backend warmup ping failed or warming up...', err);
      }
    };
    pingBackend();
  }, []);

  useEffect(() => {
    const savedTheme = localStorage.getItem('numl_theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    setTheme(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);
    if (savedTheme === 'dark') document.documentElement.classList.add('dark');

    try {
      const saved = localStorage.getItem('numl_chat_history');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
        } else resetChat(false);
      } else resetChat(false);
    } catch (e) {
      resetChat(false);
    }
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      const toSave = messages.slice(-MAX_LOCAL_MESSAGES);
      localStorage.setItem('numl_chat_history', JSON.stringify(toSave));
    }
  }, [messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('numl_theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const resetChat = (removeFromStorage = true) => {
    if (removeFromStorage) localStorage.removeItem('numl_chat_history');
    setMessages([{
      id: generateId(),
      role: 'assistant',
      content: 'Hello! I am your NUML Policy Assistant. How can I help you regarding university regulations and policies today?'
    }]);
  };

  const clearHistory = () => {
    setShowClearModal(false);
    resetChat();
  };

  const handleCopy = (id, content) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleShare = (id) => {
    const msgIndex = messages.findIndex(m => m.id === id);
    let query = '';
    if (msgIndex > 0 && messages[msgIndex - 1].role === 'user') {
      query = messages[msgIndex - 1].content;
    }

    const shareUrl = query
      ? `${window.location.origin}${window.location.pathname}?q=${encodeURIComponent(query)}`
      : window.location.href;

    navigator.clipboard.writeText(shareUrl);
    setCopiedId(`share_${id}`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleFeedback = (id, type) => {
    setFeedbackState(prev => ({ ...prev, [id]: type }));
  };

  const handleInput = (e) => {
    setInput(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!isLoading && input.trim()) sendMessage();
    }
  };

  const sendMessage = async (textOverride = null, isDeepLink = false) => {
    const textToSend = textOverride || input;
    if (!textToSend.trim()) return;

    const userMsg = { id: generateId(), role: 'user', content: textToSend.trim(), sources: [] };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    setIsLoading(true);

    const historyPayload = messages.map(m => ({ role: m.role, content: m.content }));

    try {
      const backendUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000';
      const res = await fetch(`${backendUrl}/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: textToSend.trim(), history: historyPayload })
      });
      const data = await res.json();

      let rawMarkdown = data.answer || "No response generated.";
      if (typeof rawMarkdown === 'string') {
        // Normalize stringified newlines and collapse 3+ newlines into a standard double break
        rawMarkdown = rawMarkdown.replace(/\\n/g, '\n').replace(/\n{3,}/g, '\n\n');
      }

      setMessages(prev => [...prev, {
        id: generateId(),
        role: 'assistant',
        content: rawMarkdown,
        sources: data.sources || []
      }]);
    } catch (err) {
      setMessages(prev => [...prev, {
        id: generateId(),
        role: 'assistant',
        content: "Unable to connect. Please check your connection and try again.",
        isError: true
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const showSuggestions = messages.length === 1 && messages[0].role === 'assistant';

  return (
    <div className="flex flex-col h-screen w-full bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-sans transition-colors duration-300">

      {/* Header */}
      <header className="sticky top-0 z-10 w-full backdrop-blur-md bg-white/80 dark:bg-slate-900/60 border-b border-slate-200 dark:border-white/10 shadow-sm">
        <div className="flex justify-between items-center max-w-7xl mx-auto w-full px-6 sm:px-8 py-2.5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm border-2 border-white overflow-hidden shrink-0">
              <img src={numlLogo} alt="NUML Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <h1 className="text-[15px] font-extrabold bg-gradient-to-br from-blue-900 to-blue-500 dark:from-blue-400 dark:to-blue-300 bg-clip-text text-transparent leading-tight mb-0.5">
                NUML Policy Assistant
              </h1>
              {isServerWarm ? (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-[9px] uppercase tracking-wider font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Online
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-[9px] uppercase tracking-wider font-bold" title="Waking up server...">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span> Connecting...
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              aria-label="Toggle Dark Mode"
            >
              {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
            </button>
            <button
              onClick={() => setShowClearModal(true)}
              className="p-2 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 hover:bg-red-50 dark:hover:bg-white/10 hover:border-red-200 hover:text-red-500 dark:hover:text-red-400 transition-colors"
              aria-label="Clear Chat History"
            >
              <Trash2 size={15} />
            </button>
          </div>
        </div>
      </header>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 pb-32 flex flex-col items-center">
        <div className="max-w-3xl mx-auto w-full px-4 flex flex-col gap-3">
          {messages.map((msg, index) => (
            <div key={msg.id || index} className={`flex max-w-[85%] md:max-w-[80%] ${msg.role === 'user' ? 'self-end' : 'self-start'} animate-in slide-in-from-bottom-4 duration-300`}>
              <div className={`p-3 md:px-4 md:py-3 rounded-2xl shadow-sm text-[13.5px] leading-relaxed ${msg.role === 'user'
                ? 'bg-blue-900 text-white rounded-br-sm'
                : msg.isError
                  ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800/50 rounded-bl-sm'
                  : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-bl-sm'
                }`}>
                {msg.role === 'user' ? (
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                ) : (
                  <div className="prose dark:prose-invert max-w-none break-words text-[14px]">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        p: ({node, ...props}) => <p className="my-2 leading-relaxed" {...props} />,
                        table: ({ node, ...props }) => (
                          <div className="my-4 w-full overflow-hidden rounded-none border border-slate-200 dark:border-white/20 bg-slate-50 dark:bg-white/5 shadow-sm">
                            <table className="w-full border-collapse border-spacing-0 text-left text-sm !m-0 !p-0" {...props} />
                          </div>
                        ),
                        thead: ({ node, ...props }) => (
                          <thead className="bg-slate-100 dark:bg-white/10 !m-0 !p-0" {...props} />
                        ),
                        tbody: ({ node, ...props }) => (
                          <tbody className="divide-y divide-slate-200 dark:divide-white/10 !m-0 !p-0" {...props} />
                        ),
                        tr: ({ node, ...props }) => (
                          <tr className="even:bg-slate-50 dark:even:bg-white/[0.02] hover:bg-slate-100 dark:hover:bg-white/[0.04] transition-colors !m-0 !p-0" {...props} />
                        ),
                        th: ({ node, ...props }) => (
                          <th
                            className="border-b border-r border-slate-200 dark:border-white/20 last:border-r-0 px-4 py-2.5 font-semibold text-slate-800 dark:text-white tracking-wider align-middle"
                            {...props}
                          />
                        ),
                        td: ({ node, ...props }) => (
                          <td
                            className="border-b border-r border-slate-200 dark:border-white/10 last:border-r-0 px-4 py-2.5 text-slate-700 dark:text-gray-200 align-middle"
                            {...props}
                          />
                        ),
                        code({ node, inline, className, children, ...props }) {
                          const match = /language-(\w+)/.exec(className || '')
                          return !inline && match ? (
                            <SyntaxHighlighter
                              style={vscDarkPlus}
                              language={match[1]}
                              PreTag="div"
                              className="rounded-md my-4 !bg-[#0f172a] !text-[13px] custom-scrollbar"
                              {...props}
                            >
                              {String(children).replace(/\n$/, '')}
                            </SyntaxHighlighter>
                          ) : (
                            <code className={className} {...props}>
                              {children}
                            </code>
                          )
                        }
                      }}
                    >
                      {msg.content}
                    </ReactMarkdown>

                    {msg.sources && msg.sources.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700">
                        <h4 className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2 font-semibold">Reference Sources</h4>
                        <ul className="flex flex-wrap gap-2 m-0 p-0 list-none">
                          {(() => {
                            const uniqueSources = [];
                            const seen = new Set();
                            msg.sources.forEach(src => {
                              const docName = src.doc_title || src.document || src.doc || 'Document';
                              const page = src.page ?? 'N/A';
                              const key = `${docName}-${page}`;
                              if (!seen.has(key)) {
                                seen.add(key);
                                uniqueSources.push({ ...src, _docName: docName, _page: page });
                              }
                            });
                            return uniqueSources.map((src, i) => (
                              <button
                                key={i}
                                onClick={() => setActiveSource(src)}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-500/50 hover:bg-blue-50 dark:hover:bg-white/10 text-[11px] rounded-lg transition-colors group cursor-pointer"
                              >
                                <Bookmark size={12} className="text-blue-600 dark:text-blue-400 shrink-0" />
                                <span className="font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[150px]">{src._docName}</span>
                                <span className="text-slate-500 dark:text-slate-400 shrink-0">Pg {src._page}</span>
                              </button>
                            ));
                          })()}
                        </ul>
                      </div>
                    )}

                    {msg.role === 'assistant' && !msg.isError && (
                      <div className="mt-3 -mb-1 flex items-center justify-end gap-1 border-t border-slate-100 dark:border-slate-700/50 pt-2">
                        <button onClick={() => handleShare(msg.id)} className="p-1.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors relative group" title="Share Link">
                          <Share2 size={14} />
                          {copiedId === `share_${msg.id}` && (
                            <span className="absolute -top-7 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] px-2 py-1 rounded shadow-sm whitespace-nowrap">Link Copied!</span>
                          )}
                        </button>
                        <button onClick={() => handleCopy(msg.id, msg.content)} className="p-1.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors relative group" title="Copy Answer">
                          <Copy size={14} />
                          {copiedId === msg.id && (
                            <span className="absolute -top-7 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] px-2 py-1 rounded shadow-sm whitespace-nowrap">Copied!</span>
                          )}
                        </button>
                        <button onClick={() => handleFeedback(msg.id, 'up')} className={`p-1.5 transition-colors ${feedbackState[msg.id] === 'up' ? 'text-emerald-500' : 'text-slate-400 hover:text-emerald-500'}`} title="Helpful">
                          <ThumbsUp size={14} fill={feedbackState[msg.id] === 'up' ? "currentColor" : "none"} />
                        </button>
                        <button onClick={() => handleFeedback(msg.id, 'down')} className={`p-1.5 transition-colors ${feedbackState[msg.id] === 'down' ? 'text-red-500' : 'text-slate-400 hover:text-red-500'}`} title="Not Helpful">
                          <ThumbsDown size={14} fill={feedbackState[msg.id] === 'down' ? "currentColor" : "none"} />
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex max-w-[85%] md:max-w-[80%] self-start animate-in slide-in-from-bottom-4 duration-300">
              <div className="p-3 md:px-4 md:py-3 rounded-2xl shadow-sm text-[13.5px] leading-relaxed bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-bl-sm flex items-center gap-1.5 min-h-[44px]">
                <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}

          {showSuggestions && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl mx-auto w-full mt-6 mb-2 animate-in slide-in-from-bottom-4 duration-500 delay-100 fill-mode-both">
              {[
                { icon: <BookOpen size={16} className="text-blue-500" />, title: 'Repeat Courses', text: 'Can I repeat a course to improve a C or D grade?' },
                { icon: <Calculator size={16} className="text-emerald-500" />, title: 'CGPA Calculation', text: "How is CGPA calculated on NUML's absolute grading scale?" },
                { icon: <AlertTriangle size={16} className="text-amber-500" />, title: 'Failing Courses', text: 'What happens if a student fails more than 50% of registered courses?' },
                { icon: <Clock size={16} className="text-indigo-500" />, title: 'Attendance Policy', text: 'What is the minimum attendance required to sit in final exams?' }
              ].map((s, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(s.text)}
                  className="text-left p-4 rounded-xl bg-white dark:bg-slate-800/40 border border-slate-300/80 dark:border-slate-700/50 hover:border-blue-400 dark:hover:bg-slate-800/80 dark:hover:border-blue-500/50 transition-all shadow-sm hover:shadow-md group flex flex-col gap-1.5"
                >
                  <span className="flex items-center gap-2 text-[14px] font-semibold text-slate-800 dark:text-slate-100 group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors">
                    {s.icon} <span>{s.title}</span>
                  </span>
                  <span className="text-[12px] text-slate-600 dark:text-slate-300">
                    {s.text}
                  </span>
                </button>
              ))}
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <footer className="p-3 md:py-3 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 shrink-0 shadow-[0_-4px_12px_rgba(0,0,0,0.02)] flex flex-col items-center relative z-10">
        <div className="w-full max-w-3xl flex flex-col">
          <div className="flex gap-2 items-end w-full">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              placeholder="Ask about NUML policies..."
              rows={1}
              className="flex-1 py-2.5 px-4 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-3xl text-[13.5px] text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400 outline-none resize-none min-h-[42px] max-h-[160px] focus:border-blue-600 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-600/20 dark:focus:ring-blue-400/20 transition-all"
              style={{ scrollbarWidth: 'none' }}
            />
            <button
              onClick={() => sendMessage()}
              disabled={!input.trim() || isLoading}
              className="w-[42px] h-[42px] shrink-0 rounded-full bg-blue-900 dark:bg-blue-600 text-white flex items-center justify-center hover:bg-blue-800 dark:hover:bg-blue-500 active:scale-95 disabled:bg-slate-400 dark:disabled:bg-slate-600 disabled:cursor-not-allowed transition-all shadow-md"
            >
              <Send size={18} className="ml-0.5" />
            </button>
          </div>
          <div className="mt-2 text-center space-y-0.5">
            <p className="text-[11px] text-slate-500 dark:text-slate-400 opacity-90">
              NUML Policy Assistant can make mistakes. Verify important policy details with official university documents.
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 opacity-90">
              © 2026 NUML Policy Assistant • Developed by <a href="https://linkedin.com/in/iammarafzal" target="_blank" rel="noreferrer" className="text-blue-700 dark:text-blue-400 font-semibold hover:underline">Ammar Afzal</a>
            </p>
          </div>
        </div>
      </footer>

      {/* Clear History Modal */}
      {showClearModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-[340px] w-full shadow-2xl border border-slate-200 dark:border-slate-700 animate-in zoom-in-95 duration-200">
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-2 text-lg">Clear History</h3>
            <p className="text-slate-600 dark:text-slate-400 text-[14px] mb-6">Are you sure you want to clear your conversation history?</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowClearModal(false)}
                className="px-5 py-2 rounded-full text-sm font-semibold border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={clearHistory}
                className="px-5 py-2 rounded-full text-sm font-semibold bg-blue-900 dark:bg-blue-600 text-white hover:bg-blue-800 dark:hover:bg-blue-500 transition-colors"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Source Drawer */}
      {activeSource && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex justify-end animate-in fade-in duration-300">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 h-full shadow-2xl border-l border-slate-200 dark:border-slate-800 flex flex-col animate-in slide-in-from-right duration-300">
            <div className="flex justify-between items-center p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
              <h3 className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2 text-lg">
                <FileText size={18} className="text-blue-600 dark:text-blue-400" /> Source Snippet
              </h3>
              <button onClick={() => setActiveSource(null)} className="p-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 text-[14px] text-slate-700 dark:text-slate-300 leading-relaxed font-serif whitespace-pre-wrap">
              {activeSource.raw_text || activeSource.content || "No detailed content available for this chunk."}
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center text-sm text-slate-600 dark:text-slate-400">
              <span className="font-semibold truncate flex-1 pr-4 text-[13px]">{activeSource.doc_title || (activeSource.document || activeSource.doc || '').split('/').pop().split('\\').pop()}</span>
              <span className="tabular-nums shrink-0 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-2 py-1 rounded text-xs font-bold">Page {activeSource.page ?? 'N/A'}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
