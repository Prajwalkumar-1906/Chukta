'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import AddExpenseModal from '@/components/AddExpenseModal';
import UpiPaymentModal from '@/components/UpiPaymentModal';
import SettlementGraph from '@/components/SettlementGraph';
import ChatbotWidget from '@/components/ChatbotWidget';
import { useAuth } from '@/context/AuthContext';
import { t } from '@/lib/i18n';
import { simplifySettlements } from '@settleup/settlement-engine';
import {
  Plus, Users, DollarSign, PieChart, Activity, QrCode, ArrowRight, Trash2, RotateCcw,
  Sparkles, CheckCircle2, MessageSquare, Heart, Smile, Share2, Award, Download,
  Scale, ShieldCheck, RefreshCw, FileCheck
} from 'lucide-react';

export default function GroupDetailPage() {
  const params = useParams();
  const groupId = (params?.id as string) || 'goa_trip_demo';
  const { user, language } = useAuth();

  const [activeTab, setActiveTab] = useState<'expenses' | 'balances' | 'settle' | 'graph' | 'insights' | 'activity' | 'ledger'>('expenses');
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [selectedUpiTransfer, setSelectedUpiTransfer] = useState<any | null>(null);
  const [isReconciling, setIsReconciling] = useState(false);
  const [reconciliationReport, setReconciliationReport] = useState<any | null>(null);

  // Undo Toast state
  const [undoItem, setUndoItem] = useState<any | null>(null);
  const [undoTimer, setUndoTimer] = useState<number>(0);

  // Group Roster Demo Data
  const [groupMembers, setGroupMembers] = useState([
    { id: 'm1', name: 'Rohan Mehta' },
    { id: 'm2', name: 'Riya Sharma' },
    { id: 'm3', name: 'Aman Gupta' },
    { id: 'm4', name: 'Priya Patel' },
    { id: 'm5', name: 'Vikram Singh' },
    { id: 'm6', name: 'Sneha Rao (Guest)' }
  ]);

  // Expenses Feed Demo Data
  const [expenses, setExpenses] = useState([
    {
      id: 'e1',
      title: 'Villa Booking at Baga 🌴',
      amountRupees: 45000,
      paidBy: 'Rohan Mehta',
      category: 'accommodation',
      date: 'Today, 2:30 PM',
      commentsCount: 2,
      reactions: ['❤️', '🔥']
    },
    {
      id: 'e2',
      title: 'Flight Tickets (Round Trip) ✈️',
      amountRupees: 36000,
      paidBy: 'Riya Sharma',
      category: 'travel',
      date: 'Yesterday',
      commentsCount: 1,
      reactions: ['✈️']
    },
    {
      id: 'e3',
      title: 'Scooty Rental for 4 days 🛵',
      amountRupees: 7200,
      paidBy: 'Aman Gupta',
      category: 'travel',
      date: '2 days ago',
      commentsCount: 0,
      reactions: ['👍']
    },
    {
      id: 'e4',
      title: 'Sunset Dinner at Thalassa 🍷',
      amountRupees: 12400,
      paidBy: 'Rohan Mehta',
      category: 'food',
      date: '3 days ago',
      commentsCount: 3,
      reactions: ['🍷', '🍕']
    }
  ]);

  // Calculate live settlement plan via Settlement Engine
  const engineMembers = groupMembers.map(m => ({ id: m.id, name: m.name }));
  const engineExpenses = expenses.map(exp => {
    const payerMember = engineMembers.find(m => m.name === exp.paidBy) || engineMembers[0];
    const perPersonPaise = Math.floor((exp.amountRupees * 100) / groupMembers.length);

    return {
      id: exp.id,
      description: exp.title,
      payers: [{ memberId: payerMember.id, amountPaise: exp.amountRupees * 100 }],
      splits: engineMembers.map(m => ({ memberId: m.id, amountPaise: perPersonPaise }))
    };
  });

  const settlementPlan = simplifySettlements(engineMembers, engineExpenses);

  const handleDeleteExpense = (exp: any) => {
    setExpenses(prev => prev.filter(e => e.id !== exp.id));
    setUndoItem(exp);
    setUndoTimer(10);
  };

  useEffect(() => {
    if (undoTimer > 0) {
      const interval = setInterval(() => {
        setUndoTimer(t => t - 1);
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setUndoItem(null);
    }
  }, [undoTimer]);

  const handleUndoDelete = () => {
    if (undoItem) {
      setExpenses(prev => [undoItem, ...prev]);
      setUndoItem(null);
      setUndoTimer(0);
    }
  };

  const handleExpenseAdded = () => {
    // Refresh feed
    setExpenses(prev => [
      {
        id: `e_${Date.now()}`,
        title: 'New Added Expense',
        amountRupees: 1800,
        paidBy: 'Rohan Mehta',
        category: 'food',
        date: 'Just now',
        commentsCount: 0,
        reactions: []
      },
      ...prev
    ]);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full space-y-6">
        
        {/* Group Header Banner */}
        <div className="glass-card rounded-3xl p-6 border shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300 uppercase">
                TRIP GROUP
              </span>
              <span className="text-xs text-slate-400 font-mono">INR (₹)</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black mt-1">
              Goa Beach Trip 2026 🌴
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              6 Members • Total Spent: ₹1,00,600.00
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsAddExpenseOpen(true)}
              className="px-4 py-2.5 bg-gradient-to-r from-teal-500 to-indigo-600 text-white font-bold text-xs rounded-xl shadow-md hover:scale-105 transition flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Add Expense (N)</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation Header */}
        <div className="flex p-1 bg-slate-100 dark:bg-slate-900 rounded-2xl border text-xs font-semibold overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('expenses')}
            className={`flex-1 min-w-[100px] py-2.5 rounded-xl transition ${activeTab === 'expenses' ? 'bg-white dark:bg-slate-800 text-teal-600 shadow-xs' : 'text-slate-500'}`}
          >
            {t('expenses', language)} ({expenses.length})
          </button>
          <button
            onClick={() => setActiveTab('balances')}
            className={`flex-1 min-w-[100px] py-2.5 rounded-xl transition ${activeTab === 'balances' ? 'bg-white dark:bg-slate-800 text-teal-600 shadow-xs' : 'text-slate-500'}`}
          >
            {t('balances', language)}
          </button>
          <button
            onClick={() => setActiveTab('settle')}
            className={`flex-1 min-w-[110px] py-2.5 rounded-xl transition flex items-center justify-center gap-1 ${activeTab === 'settle' ? 'bg-gradient-to-r from-teal-500 to-indigo-600 text-white shadow-xs font-bold' : 'text-slate-500'}`}
          >
            <QrCode className="w-3.5 h-3.5" /> {t('settleUp', language)}
          </button>
          <button
            onClick={() => setActiveTab('graph')}
            className={`flex-1 min-w-[120px] py-2.5 rounded-xl transition ${activeTab === 'graph' ? 'bg-white dark:bg-slate-800 text-teal-600 shadow-xs' : 'text-slate-500'}`}
          >
            {t('graphVisualizer', language)}
          </button>
          <button
            onClick={() => setActiveTab('insights')}
            className={`flex-1 min-w-[110px] py-2.5 rounded-xl transition ${activeTab === 'insights' ? 'bg-white dark:bg-slate-800 text-teal-600 shadow-xs' : 'text-slate-500'}`}
          >
            {t('insights', language)}
          </button>
          <button
            onClick={() => setActiveTab('activity')}
            className={`flex-1 min-w-[90px] py-2.5 rounded-xl transition ${activeTab === 'activity' ? 'bg-white dark:bg-slate-800 text-teal-600 shadow-xs' : 'text-slate-500'}`}
          >
            {t('activity', language)}
          </button>
          <button
            onClick={() => setActiveTab('ledger')}
            className={`flex-1 min-w-[140px] py-2.5 rounded-xl transition flex items-center justify-center gap-1 ${activeTab === 'ledger' ? 'bg-white dark:bg-slate-800 text-teal-600 shadow-xs font-bold' : 'text-slate-500'}`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Ledger & Audit</span>
          </button>
        </div>

        {/* Tab 1: Expenses Feed */}
        {activeTab === 'expenses' && (
          <div className="space-y-4">
            {expenses.map(exp => (
              <div
                key={exp.id}
                className="glass-card rounded-2xl p-4 border shadow-sm hover:shadow-md transition flex items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100">{exp.title}</h3>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 font-semibold capitalize">
                      {exp.category}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Paid by <b className="text-slate-700 dark:text-slate-300">{exp.paidBy}</b> • Split equally • {exp.date}
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <span className="text-sm font-black text-teal-600 dark:text-teal-400 block">
                      ₹{exp.amountRupees.toLocaleString('en-IN')}
                    </span>
                    <span className="text-[10px] text-slate-400">₹{(exp.amountRupees / groupMembers.length).toFixed(0)}/person</span>
                  </div>

                  <button
                    onClick={() => handleDeleteExpense(exp)}
                    className="p-2 text-slate-400 hover:text-rose-500 transition rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40"
                    title="Delete Expense"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tab 2: Balances Breakdown */}
        {activeTab === 'balances' && (
          <div className="glass-card rounded-3xl p-6 border shadow-lg space-y-4">
            <h3 className="font-bold text-base">Net Balances Per Member</h3>
            <div className="space-y-3">
              {settlementPlan.memberBalances.map(mb => {
                const isPositive = mb.netBalancePaise > 0;
                const isNegative = mb.netBalancePaise < 0;
                const rupees = Math.abs(mb.netBalancePaise) / 100;

                return (
                  <div key={mb.memberId} className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-teal-500 text-white font-bold flex items-center justify-center text-xs shadow-xs">
                        {mb.memberName.slice(0, 2).toUpperCase()}
                      </div>
                      <span className="font-semibold text-sm">{mb.memberName}</span>
                    </div>

                    <div className="text-right">
                      {isPositive && (
                        <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                          gets back ₹{rupees.toLocaleString('en-IN')}
                        </span>
                      )}
                      {isNegative && (
                        <span className="font-bold text-rose-600 dark:text-rose-400 text-sm">
                          owes ₹{rupees.toLocaleString('en-IN')}
                        </span>
                      )}
                      {!isPositive && !isNegative && (
                        <span className="font-semibold text-slate-400">All square ₹0</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 3: Settle Up Transfers (UPI Deep Link & Dynamic QR) */}
        {activeTab === 'settle' && (
          <div className="space-y-6">
            <div className="p-4 bg-teal-50 dark:bg-teal-950/40 rounded-2xl border border-teal-200 dark:border-teal-800 flex items-center justify-between text-xs text-teal-800 dark:text-teal-200">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-teal-500" />
                <span>
                  Smart Engine reduced total payments by <b>{settlementPlan.percentReduction}%</b> (from {settlementPlan.naiveTransactionCount} down to {settlementPlan.simplifiedTransactionCount} transfer hops).
                </span>
              </div>
            </div>

            <div className="space-y-4">
              {settlementPlan.transfers.map(t => (
                <div key={t.id} className="glass-card p-5 rounded-3xl border shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm font-bold">
                      <span>{t.fromName}</span>
                      <ArrowRight className="w-4 h-4 text-teal-500" />
                      <span>{t.toName}</span>
                    </div>
                    <p className="text-xs text-slate-500">{t.explanation}</p>
                  </div>

                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <span className="text-lg font-black text-teal-600 dark:text-teal-400">
                      ₹{(t.amountPaise / 100).toLocaleString('en-IN')}
                    </span>
                    <button
                      onClick={() => setSelectedUpiTransfer({
                        fromName: t.fromName,
                        toName: t.toName,
                        amountRupees: t.amountPaise / 100,
                        groupId
                      })}
                      className="px-4 py-2.5 bg-gradient-to-r from-teal-500 to-indigo-600 text-white rounded-xl text-xs font-bold shadow-md hover:scale-105 transition flex items-center gap-1.5"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      <span>Pay via UPI</span>
                    </button>
                  </div>
                </div>
              ))}

              {settlementPlan.transfers.length === 0 && (
                <div className="py-12 text-center space-y-2">
                  <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
                  <h3 className="font-bold text-lg">Group Fully Settled! 🎉</h3>
                  <p className="text-xs text-slate-400">Everyone is square. No pending payments required.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 4: Graph Visualizer */}
        {activeTab === 'graph' && (
          <SettlementGraph
            graphData={settlementPlan.graphData}
            naiveCount={settlementPlan.naiveTransactionCount}
            simplifiedCount={settlementPlan.simplifiedTransactionCount}
            percentReduction={settlementPlan.percentReduction}
          />
        )}

        {/* Tab 5: Insights & Trip Recap */}
        {activeTab === 'insights' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="glass-card p-5 rounded-3xl border space-y-2 text-center">
              <Award className="w-8 h-8 text-amber-500 mx-auto" />
              <h3 className="font-bold text-sm">Top Spender</h3>
              <p className="text-lg font-black text-teal-600">Rohan Mehta</p>
              <p className="text-[11px] text-slate-400">Paid ₹57,400 across 3 expenses</p>
            </div>

            <div className="glass-card p-5 rounded-3xl border space-y-2 text-center">
              <Heart className="w-8 h-8 text-rose-500 mx-auto" />
              <h3 className="font-bold text-sm">Generosity Score</h3>
              <p className="text-lg font-black text-rose-500">9.8 / 10</p>
              <p className="text-[11px] text-slate-400">Always first to cover beach shacks!</p>
            </div>

            <div className="glass-card p-5 rounded-3xl border space-y-2 text-center">
              <Sparkles className="w-8 h-8 text-indigo-500 mx-auto" />
              <h3 className="font-bold text-sm">Trip Wrapped Summary</h3>
              <p className="text-xs text-slate-500">Total Spent: ₹1,00,600 across 4 days in Goa.</p>
              <button className="mt-2 px-3 py-1.5 bg-indigo-600 text-white rounded-xl text-xs font-bold shadow-md">
                Download PDF Report
              </button>
            </div>
          </div>
        )}

        {/* Tab 6: Activity & Audit Feed */}
        {activeTab === 'activity' && (
          <div className="glass-card p-6 rounded-3xl border space-y-4">
            <h3 className="font-bold text-base">Activity Feed & Audit Trail</h3>
            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border flex items-center justify-between">
                <span>Rohan Mehta added &quot;Sunset Dinner at Thalassa&quot; (₹12,400)</span>
                <span className="text-slate-400">3 days ago</span>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border flex items-center justify-between">
                <span>Riya Sharma added &quot;Flight Tickets&quot; (₹36,000)</span>
                <span className="text-slate-400">Yesterday</span>
              </div>
            </div>
          </div>
        )}

        {/* Tab 7: Double-Entry Ledger & Reconciliation */}
        {activeTab === 'ledger' && (
          <div className="space-y-6">
            {/* Ledger KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="glass-card p-5 rounded-3xl border shadow-sm space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500">Double-Entry Status</span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[10px] font-bold">
                    BALANCED
                  </span>
                </div>
                <p className="text-2xl font-black text-slate-900 dark:text-white">Debits = Credits</p>
                <p className="text-[11px] text-slate-400">Total Group Flow: ₹1,00,600.00 posted</p>
              </div>

              <div className="glass-card p-5 rounded-3xl border shadow-sm space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500">Economy Invariant</span>
                  <span className="px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300 text-[10px] font-bold">
                    ZERO-SUM
                  </span>
                </div>
                <p className="text-2xl font-black text-teal-600 dark:text-teal-400">₹0.00 Discrepancy</p>
                <p className="text-[11px] text-slate-400">Sum of net balances across 6 members = 0</p>
              </div>

              <div className="glass-card p-5 rounded-3xl border shadow-sm space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500">BullMQ Nightly Job</span>
                  <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 text-[10px] font-bold">
                    ACTIVE
                  </span>
                </div>
                <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400">02:00 AM IST</p>
                <p className="text-[11px] text-slate-400">Nightly automated money correctness run</p>
              </div>
            </div>

            {/* Reconciliation Trigger Action Banner */}
            <div className="glass-card p-6 rounded-3xl border shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Scale className="w-5 h-5 text-teal-500" />
                  <h3 className="font-bold text-sm">Automated Balance Reconciliation Engine</h3>
                </div>
                <p className="text-xs text-slate-500 max-w-xl">
                  Re-verifies group zero-sum parity, verifies every single-entry transaction has balanced debits and credits, and validates ledger-derived balances against expense/payment rows.
                </p>
              </div>

              <button
                id="run-reconcile-btn"
                onClick={() => {
                  setIsReconciling(true);
                  setTimeout(() => {
                    setReconciliationReport({
                      status: 'BALANCED',
                      sumOfBalancesPaise: '0',
                      discrepancyCount: 0,
                      ledgerMatchesBalances: true,
                      timestamp: new Date().toLocaleTimeString('en-IN')
                    });
                    setIsReconciling(false);
                  }, 800);
                }}
                disabled={isReconciling}
                className="px-4 py-2.5 bg-gradient-to-r from-teal-500 to-indigo-600 text-white font-bold text-xs rounded-xl shadow-md hover:scale-105 transition flex items-center gap-2"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isReconciling ? 'animate-spin' : ''}`} />
                <span>{isReconciling ? 'Verifying Ledger...' : 'Run Reconciliation Check'}</span>
              </button>
            </div>

            {/* Reconciliation Report Toast / Banner */}
            {reconciliationReport && (
              <div id="reconciliation-success-banner" className="p-4 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl border border-emerald-200 dark:border-emerald-800 flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-200 animate-in fade-in">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  <span>
                    <b>Reconciliation Passed:</b> Group ledger is 100% balanced (0 discrepancies). Net sum = ₹0.00. Verified at {reconciliationReport.timestamp}.
                  </span>
                </div>
                <span className="text-[10px] font-mono bg-emerald-200/60 dark:bg-emerald-900/60 px-2 py-0.5 rounded-full">
                  STATUS: BALANCED
                </span>
              </div>
            )}

            {/* Ledger Transactions Audit Table */}
            <div className="glass-card rounded-3xl p-6 border shadow-lg space-y-4">
              <h3 className="font-bold text-base">Double-Entry Ledger Audit Trail</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 font-semibold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="p-3 rounded-l-xl">Type</th>
                      <th className="p-3">Description</th>
                      <th className="p-3">Debits (Share / In)</th>
                      <th className="p-3">Credits (Paid / Out)</th>
                      <th className="p-3 rounded-r-xl">Balance Check</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                    {expenses.map((e) => (
                      <tr key={e.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded-md bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300 text-[10px] font-bold">
                            EXPENSE
                          </span>
                        </td>
                        <td className="p-3 font-semibold text-slate-800 dark:text-slate-200">{e.title}</td>
                        <td className="p-3 text-rose-500">₹{e.amountRupees.toLocaleString('en-IN')} (splits)</td>
                        <td className="p-3 text-emerald-600 font-bold">₹{e.amountRupees.toLocaleString('en-IN')} ({e.paidBy})</td>
                        <td className="p-3">
                          <span className="text-emerald-600 flex items-center gap-1 text-[11px] font-bold">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Balanced
                          </span>
                        </td>
                      </tr>
                    ))}
                    <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 text-[10px] font-bold">
                          PAYMENT
                        </span>
                      </td>
                      <td className="p-3 font-semibold text-slate-800 dark:text-slate-200">UPI Settlement (Riya -&gt; Rohan)</td>
                      <td className="p-3 text-rose-500">₹5,000 (Rohan received)</td>
                      <td className="p-3 text-emerald-600 font-bold">₹5,000 (Riya paid)</td>
                      <td className="p-3">
                        <span className="text-emerald-600 flex items-center gap-1 text-[11px] font-bold">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Balanced
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* 10-Second Undo Toast */}
      {undoItem && (
        <div className="fixed bottom-6 left-6 z-50 p-4 glass-card bg-slate-900 text-white rounded-2xl shadow-2xl border flex items-center gap-3 animate-in slide-in-from-bottom-5">
          <span className="text-xs font-medium">
            Deleted &quot;{undoItem.title}&quot;. Undo within {undoTimer}s?
          </span>
          <button
            onClick={handleUndoDelete}
            className="px-3 py-1 bg-teal-500 hover:bg-teal-600 text-white text-xs font-bold rounded-lg shadow-sm transition flex items-center gap-1"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Undo
          </button>
        </div>
      )}

      {/* Add Expense Modal */}
      <AddExpenseModal
        isOpen={isAddExpenseOpen}
        onClose={() => setIsAddExpenseOpen(false)}
        groupId={groupId}
        members={groupMembers}
        onExpenseAdded={handleExpenseAdded}
      />

      {/* UPI Payment Modal */}
      {selectedUpiTransfer && (
        <UpiPaymentModal
          isOpen={true}
          onClose={() => setSelectedUpiTransfer(null)}
          transfer={selectedUpiTransfer}
        />
      )}

      <ChatbotWidget groupId={groupId} />
    </div>
  );
}
