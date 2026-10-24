'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import SettlementGraph from '@/components/SettlementGraph';
import ChatbotWidget from '@/components/ChatbotWidget';
import { useAuth } from '@/context/AuthContext';
import { t } from '@/lib/i18n';
import { simplifySettlements, MemberInfo, ExpenseInput } from '@settleup/settlement-engine';
import { Zap, ShieldCheck, QrCode, Sparkles, ArrowRight, CheckCircle2, Play, Users, DollarSign } from 'lucide-react';

export default function LandingPage() {
  const { language } = useAuth();

  // Interactive Live Demo State ("Try without signing up")
  const [demoMembers, setDemoMembers] = useState<string[]>(['Aman', 'Riya', 'Rohan', 'Priya']);
  const [newMemberName, setNewMemberName] = useState('');
  const [demoExpenses, setDemoExpenses] = useState<{ id: string; description: string; paidBy: string; amount: number }[]>([
    { id: '1', description: 'Goa Villa Booking', paidBy: 'Rohan', amount: 24000 },
    { id: '2', description: 'Flight Tickets', paidBy: 'Riya', amount: 18000 },
    { id: '3', description: 'Scooty Rental', paidBy: 'Aman', amount: 6000 },
    { id: '4', description: 'Beach Shack Dinner', paidBy: 'Priya', amount: 12000 }
  ]);

  const [expTitle, setExpTitle] = useState('');
  const [expAmount, setExpAmount] = useState('');
  const [expPayer, setExpPayer] = useState('Rohan');

  const addDemoMember = () => {
    if (!newMemberName.trim() || demoMembers.includes(newMemberName.trim())) return;
    setDemoMembers([...demoMembers, newMemberName.trim()]);
    setNewMemberName('');
  };

  const addDemoExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(expAmount);
    if (!expTitle || isNaN(val) || val <= 0) return;

    setDemoExpenses([
      ...demoExpenses,
      { id: Date.now().toString(), description: expTitle, paidBy: expPayer, amount: val }
    ]);
    setExpTitle('');
    setExpAmount('');
  };

  // Run live settlement engine on demo data
  const engineMembers: MemberInfo[] = demoMembers.map((name, idx) => ({ id: `m_${idx}`, name }));
  const engineExpenses: ExpenseInput[] = demoExpenses.map(exp => {
    const payerMember = engineMembers.find(m => m.name === exp.paidBy) || engineMembers[0];
    const perPersonPaise = Math.floor((exp.amount * 100) / demoMembers.length);

    return {
      id: exp.id,
      description: exp.description,
      payers: [{ memberId: payerMember.id, amountPaise: exp.amount * 100 }],
      splits: engineMembers.map(m => ({ memberId: m.id, amountPaise: perPersonPaise }))
    };
  });

  const demoPlan = simplifySettlements(engineMembers, engineExpenses);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <Navbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden py-16 md:py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto text-center space-y-6">
          
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-300 text-xs font-semibold animate-bounce">
            <Sparkles className="w-3.5 h-3.5" /> India’s #1 Smart Settlement Engine
          </div>

          <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-tight">
            Simplify Group Debts to the <span className="gradient-text">Absolute Minimum</span>
          </h1>

          <p className="text-base sm:text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto font-medium">
            Split trips, flatmate rent, and office lunches. Settle up in 1-tap with dynamic <b>UPI QR Codes</b> & <b>GPay/PhonePe deep links</b>.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
            <Link
              href="/dashboard"
              className="w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-teal-500 to-indigo-600 text-white font-bold text-sm rounded-xl shadow-xl hover:scale-105 active:scale-95 transition flex items-center justify-center gap-2"
            >
              <span>Go to App Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href="#demo"
              className="w-full sm:w-auto px-6 py-3.5 glass-card rounded-xl font-bold text-sm text-slate-700 dark:text-slate-200 border hover:bg-slate-100 dark:hover:bg-slate-800 transition flex items-center justify-center gap-2"
            >
              <Play className="w-4 h-4 fill-current text-teal-600" />
              <span>{t('tryDemo', language)}</span>
            </a>
          </div>

        </div>
      </section>

      {/* Live Interactive Engine Demo Section */}
      <section id="demo" className="py-12 px-4 sm:px-6 lg:px-8 bg-white dark:bg-slate-900 border-y">
        <div className="max-w-6xl mx-auto space-y-8">
          
          <div className="text-center space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-teal-600">
              Interactive Playground
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold">
              Try the Settlement Engine Live (No Login Required)
            </h2>
            <p className="text-xs text-slate-500 max-w-xl mx-auto">
              Add names and expenses below. Watch the debt graph simplify from a messy web into minimum direct UPI payments in real-time!
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Control Panel: Add Members & Expenses */}
            <div className="lg:col-span-5 glass-card p-6 rounded-3xl border space-y-5">
              
              {/* Member Roster */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                  Group Members ({demoMembers.length})
                </label>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {demoMembers.map(m => (
                    <span key={m} className="px-2.5 py-1 bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 rounded-lg text-xs font-semibold">
                      {m}
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newMemberName}
                    onChange={e => setNewMemberName(e.target.value)}
                    placeholder="Add member name..."
                    className="flex-1 p-2 bg-slate-50 dark:bg-slate-800 rounded-xl border text-xs outline-none"
                  />
                  <button
                    onClick={addDemoMember}
                    className="px-3 py-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-xl text-xs font-bold hover:opacity-90 transition"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Add Demo Expense Form */}
              <form onSubmit={addDemoExpense} className="space-y-3 pt-3 border-t">
                <span className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Add Quick Expense
                </span>
                <input
                  type="text"
                  required
                  value={expTitle}
                  onChange={e => setExpTitle(e.target.value)}
                  placeholder="Expense Title (e.g. Goa Shack Dinner)"
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 rounded-xl border text-xs outline-none"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    required
                    value={expAmount}
                    onChange={e => setExpAmount(e.target.value)}
                    placeholder="Amount (₹)"
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 rounded-xl border text-xs font-bold outline-none"
                  />
                  <select
                    value={expPayer}
                    onChange={e => setExpPayer(e.target.value)}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 rounded-xl border text-xs font-semibold outline-none"
                  >
                    {demoMembers.map(m => (
                      <option key={m} value={m}>Paid by {m}</option>
                    ))}
                  </select>
                </div>
                <button
                  type="submit"
                  className="w-full py-2 bg-gradient-to-r from-teal-500 to-indigo-600 text-white rounded-xl text-xs font-bold shadow-md hover:opacity-95 transition"
                >
                  + Add Expense
                </button>
              </form>

              {/* Added Expenses List */}
              <div className="space-y-2 pt-2">
                <span className="block text-[11px] font-bold text-slate-400 uppercase">
                  Recorded Expenses ({demoExpenses.length})
                </span>
                <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1 text-xs">
                  {demoExpenses.map(e => (
                    <div key={e.id} className="p-2 bg-slate-50 dark:bg-slate-800/60 rounded-xl border flex items-center justify-between">
                      <div>
                        <span className="font-semibold block">{e.description}</span>
                        <span className="text-[10px] text-slate-400">Paid by {e.paidBy}</span>
                      </div>
                      <span className="font-bold text-teal-600">₹{e.amount.toLocaleString('en-IN')}</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* Visualizer Output Panel */}
            <div className="lg:col-span-7">
              <SettlementGraph
                graphData={demoPlan.graphData}
                naiveCount={demoPlan.naiveTransactionCount}
                simplifiedCount={demoPlan.simplifiedTransactionCount}
                percentReduction={demoPlan.percentReduction}
              />
            </div>

          </div>
        </div>
      </section>

      {/* Feature Highlights Grid */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto space-y-12">
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-black">Built Specifically for India</h2>
          <p className="text-sm text-slate-500">Every feature crafted for seamless group payments and trips.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass-card p-6 rounded-3xl border space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300 flex items-center justify-center font-bold">
              <QrCode className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base">Instant UPI Links & QR</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Generate dynamic UPI QR codes and deep links for GPay, PhonePe, Paytm, and BHIM in 1-tap.
            </p>
          </div>

          <div className="glass-card p-6 rounded-3xl border space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 flex items-center justify-center font-bold">
              <Sparkles className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base">AI Speech & NLP Entry</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Speak or type &quot;Dinner 1800 paid by Rohan split with Priya and Aman&quot; in Hinglish or regional languages.
            </p>
          </div>

          <div className="glass-card p-6 rounded-3xl border space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 flex items-center justify-center font-bold">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base">Bitmask DP Simplification</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Our O(3^N) subset algorithm guarantees maximum debt elimination without passing money through third parties.
            </p>
          </div>
        </div>
      </section>

      {/* Floating AI Assistant */}
      <ChatbotWidget />

      {/* Footer */}
      <footer className="mt-auto py-8 border-t bg-white dark:bg-slate-900 text-center text-xs text-slate-500">
        <p>© 2026 SettleUp. Built with Next.js 14, TypeScript & Smart Settlement Engine.</p>
      </footer>
    </div>
  );
}
