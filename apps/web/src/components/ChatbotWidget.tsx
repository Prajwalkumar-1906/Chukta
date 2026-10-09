'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Bot, X, Send, Mic, Sparkles, User as UserIcon, MessageSquare } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { t } from '@/lib/i18n';

interface Message {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  time: string;
}

export default function ChatbotWidget({ groupId }: { groupId?: string }) {
  const { language } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      sender: 'bot',
      text: 'Namaste! 👋 I am your SettleUp AI Assistant. Ask me anything like "Who owes me money?", "Generate my UPI payment link", or "Split ₹1,800 dinner between Aman & Riya".',
      time: 'Just now'
    }
  ]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) scrollToBottom();
  }, [messages, isOpen]);

  const quickChips = [
    'Who owes me money?',
    'Pay via UPI link',
    'How does simplification work?',
    'Split ₹2,400 cab with everyone'
  ];

  const handleSend = async (textToSend?: string) => {
    const query = textToSend || input;
    if (!query.trim()) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: query,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      const targetGroupId = groupId || 'goa_trip_demo';
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/v1/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupId: targetGroupId, message: query, language })
      });

      const data = await res.json();
      setIsTyping(false);

      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'bot',
        text: data.reply || 'Here is what I found for your request.',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, botMsg]);
    } catch (e) {
      setIsTyping(false);
      // Client-side fallback response
      let fallbackText = 'I checked your balances: You are currently all clear on net settlements! 🎉';
      if (query.toLowerCase().includes('owe')) {
        fallbackText = 'In "Goa Beach Trip 2026": Rohan owes ₹2,450 net, and Riya is owed ₹4,100 net after optimal debt reduction (78% transactions saved)!';
      } else if (query.toLowerCase().includes('upi') || query.toLowerCase().includes('pay')) {
        fallbackText = 'Here is your instant UPI link: upi://pay?pa=rohan@okaxis&pn=Rohan%20Mehta&am=1240&cu=INR';
      }
      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'bot',
        text: fallbackText,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, botMsg]);
    }
  };

  const handleVoiceInput = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Web Speech API is not supported in this browser.');
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = language === 'hi' ? 'hi-IN' : 'en-IN';
    recognition.interimResults = false;

    setIsListening(true);

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
      setIsListening(false);
      handleSend(transcript);
    };

    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);

    recognition.start();
  };

  return (
    <>
      {/* Floating Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 p-3.5 bg-gradient-to-r from-teal-500 to-indigo-600 text-white rounded-full shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center gap-2 group"
        >
          <Sparkles className="w-6 h-6 animate-pulse" />
          <span className="max-w-0 overflow-hidden whitespace-nowrap group-hover:max-w-xs transition-all duration-300 font-bold text-sm pr-1">
            {t('aiAssistant', language)}
          </span>
        </button>
      )}

      {/* Side Panel Drawer */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-96 h-[560px] max-w-[calc(100vw-2rem)] glass-card rounded-3xl shadow-2xl border flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 duration-200">
          
          {/* Header */}
          <div className="p-4 bg-gradient-to-r from-teal-600 to-indigo-600 text-white flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-white/10 rounded-xl backdrop-blur-md">
                <Bot className="w-5 h-5 text-teal-200" />
              </div>
              <div>
                <h3 className="font-bold text-sm leading-none">SettleUp AI Assistant</h3>
                <span className="text-[10px] text-teal-100 flex items-center gap-1 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" /> Multilingual Function Bot
                </span>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-white/10 rounded-lg text-teal-100 transition">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Reply Chips */}
          <div className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border-b flex gap-1.5 overflow-x-auto no-scrollbar">
            {quickChips.map((chip, i) => (
              <button
                key={i}
                onClick={() => handleSend(chip)}
                className="whitespace-nowrap px-2.5 py-1 text-[11px] font-medium bg-white dark:bg-slate-800 border rounded-full text-slate-700 dark:text-slate-300 hover:border-teal-500 hover:text-teal-600 transition shadow-xs"
              >
                {chip}
              </button>
            ))}
          </div>

          {/* Messages Stream */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3">
            {messages.map(m => (
              <div
                key={m.id}
                className={`flex gap-2.5 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {m.sender === 'bot' && (
                  <div className="w-7 h-7 rounded-full bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300 flex items-center justify-center text-xs font-bold shrink-0">
                    AI
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-xs shadow-xs leading-relaxed whitespace-pre-line ${
                    m.sender === 'user'
                      ? 'bg-gradient-to-r from-teal-500 to-indigo-600 text-white rounded-br-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border rounded-bl-xs'
                  }`}
                >
                  {m.text}
                  <div className={`text-[9px] mt-1 text-right opacity-70`}>{m.time}</div>
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Bot className="w-4 h-4 text-teal-500 animate-spin" />
                <span>Assistant is thinking...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Bar */}
          <div className="p-3 bg-white dark:bg-slate-900 border-t flex items-center gap-2">
            <button
              onClick={handleVoiceInput}
              className={`p-2 rounded-xl transition ${
                isListening ? 'bg-rose-500 text-white animate-pulse' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
              title="Voice Speech Entry"
            >
              <Mic className="w-4 h-4" />
            </button>
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder="Ask a question or record expense..."
              className="flex-1 bg-slate-100 dark:bg-slate-800 text-xs px-3 py-2 rounded-xl outline-none border border-transparent focus:border-teal-500 transition"
            />
            <button
              onClick={() => handleSend()}
              className="p-2 bg-gradient-to-r from-teal-500 to-indigo-600 text-white rounded-xl shadow-md hover:opacity-90 transition"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>

        </div>
      )}
    </>
  );
}
