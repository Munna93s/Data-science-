/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, User, Bot, Loader2, ArrowRight } from 'lucide-react';
import { useDataStore } from '../store/useDataStore';
import { useAuthStore } from '../store/useAuthStore';
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'motion/react';
import { computeStats } from '../lib/dataUtils';
import { db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp, query, orderBy, onSnapshot } from 'firebase/firestore';

interface Message {
  role: 'user' | 'model';
  content: string;
}

export default function AIChat() {
  const { sheets, activeSheetName, isLoading: dataLoading } = useDataStore();
  const { user, token } = useAuthStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load chat history from Firestore
  useEffect(() => {
    if (!activeSheetName || !user) return;

    const q = query(
      collection(db, 'chats'), 
      orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs
        .filter(doc => doc.data().sessionId === activeSheetName && doc.data().userId === user.email)
        .map(doc => doc.data() as Message);
      if (msgs.length > 0) setMessages(msgs);
    });

    return () => unsubscribe();
  }, [activeSheetName, user]);

  const stats = activeSheetName ? computeStats(sheets[activeSheetName]) : null;

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !activeSheetName || !user || !token) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    
    // Save user message to Firestore
    await addDoc(collection(db, 'chats'), {
      ...userMessage,
      sessionId: activeSheetName,
      userId: user.email,
      timestamp: serverTimestamp()
    });

    setInput('');
    setIsTyping(true);

    try {
      const dataSample = sheets[activeSheetName].slice(0, 30);
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          context: {
            datasetName: activeSheetName,
            totalRows: sheets[activeSheetName].length,
            stats,
            sample: dataSample
          }
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'AI Analysis failed');

      const responseText = data.content;
      
      // Save model message to Firestore
      await addDoc(collection(db, 'chats'), {
        role: 'model',
        content: responseText,
        sessionId: activeSheetName,
        userId: user.email,
        timestamp: serverTimestamp()
      });
      
    } catch (error: any) {
      setMessages(prev => [...prev, { role: 'model', content: `Error: ${error.message || 'Failed to communicate with AI'}` }]);
    } finally {
      setIsTyping(false);
    }
  };


  const quickPrompts = [
    "Summarize this data",
    "Find outliers",
    "Correlation analysis",
    "Trend forecast"
  ];

  if (!activeSheetName) return null;

  return (
    <div className="flex flex-col h-[600px] border border-border-subtle bg-slate-900/30 rounded-xl overflow-hidden shadow-xl">
      <div className="bg-slate-800/50 p-4 border-b border-border-subtle flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-brand" />
        <h2 className="font-bold">AI Analysis Assistant</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 bg-brand/5 rounded-xl border border-brand/10 border-dashed">
            <Bot className="w-12 h-12 text-brand mb-4 opacity-50" />
            <h3 className="text-slate-300 font-semibold mb-2">Ready to analyze your data</h3>
            <p className="text-sm text-slate-500 max-w-sm mb-6">
              Ask me for summaries, trends, or specific insights about your dataset.
            </p>
            <div className="grid grid-cols-2 gap-2 w-full max-w-md">
              {quickPrompts.map(p => (
                <button 
                  key={p} 
                  onClick={() => setInput(p)}
                  className="text-xs px-3 py-2 bg-slate-800 border border-border-subtle rounded-lg hover:border-brand hover:text-brand transition-all text-left flex items-center justify-between group"
                >
                  {p}
                  <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <motion.div 
            initial={{ opacity: 0, x: m.role === 'user' ? 20 : -20 }}
            animate={{ opacity: 1, x: 0 }}
            key={i} 
            className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-[85%] p-4 rounded-2xl flex gap-3 ${
              m.role === 'user' 
                ? 'bg-brand text-white rounded-tr-none' 
                : 'bg-slate-800 border border-border-subtle rounded-tl-none'
            }`}>
              {m.role === 'model' && <Bot className="w-5 h-5 shrink-0 opacity-50" />}
              <div className="markdown-body prose prose-invert prose-sm max-w-none">
                <ReactMarkdown>{m.content}</ReactMarkdown>
              </div>
              {m.role === 'user' && <User className="w-5 h-5 shrink-0 opacity-50" />}
            </div>
          </motion.div>
        ))}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-slate-800 border border-border-subtle p-4 rounded-2xl rounded-tl-none flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-brand" />
              <span className="text-xs text-slate-400">AI is thinking...</span>
            </div>
          </div>
        )}
        <div ref={scrollRef} />
      </div>

      <div className="p-4 bg-slate-900/50 border-t border-border-subtle">
        <div className="relative">
          <input 
            type="text" 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask AI anything about your data..."
            className="w-full bg-slate-800 border border-border-subtle rounded-xl py-3 pl-4 pr-12 text-sm focus:ring-2 focus:ring-brand focus:border-transparent outline-none transition-all"
          />
          <button 
            onClick={handleSend}
            disabled={!input.trim() || isTyping}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-brand text-white rounded-lg disabled:opacity-50 disabled:grayscale transition-all hover:scale-105 active:scale-95"
            id="send-msg-btn"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
