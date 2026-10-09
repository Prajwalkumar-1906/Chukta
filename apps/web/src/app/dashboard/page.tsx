'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import ChatbotWidget from '@/components/ChatbotWidget';
import { useAuth } from '@/context/AuthContext';
import { t } from '@/lib/i18n';
import { Plus, Users, ArrowUpRight, ArrowDownLeft, CheckCircle2, Zap, Calendar, Wallet } from 'lucide-react';

interface Group {
  id: string;
  name: string;
  description?: string;
  type: string;
  baseCurrency: string;
  budgetPaise?: number;
  memberCount: number;
  totalSpentPaise: number;
  createdAt: string;
}

export default function DashboardPage() {
  const { user, language } = useAuth();
  const [groups, setGroups] = useState<Group[]>([
    {
      id: 'goa_trip_demo',
      name: 'Goa Beach Trip 2026 🌴',
      description: 'Annual college reunion trip to Baga & Anjuna',
      type: 'TRIP',
      baseCurrency: 'INR',
      budgetPaise: 30000000,
      memberCount: 6,
      totalSpentPaise: 24780000,
      createdAt: '2026-10-01'
    },
    {
      id: 'flat_402_demo',
      name: 'Indiranagar Flat #402 🏠',
      description: 'Shared flat monthly rent & utilities',
      type: 'FLATMATES',
      baseCurrency: 'INR',
      budgetPaise: 10000000,
      memberCount: 4,
      totalSpentPaise: 8749900,
      createdAt: '2026-09-15'
    },
    {
      id: 'office_lunch_demo',
      name: 'Tech Stack Team Lunches 🍱',
      description: 'Friday team outings and coffee breaks',
      type: 'OFFICE',
      baseCurrency: 'INR',
      memberCount: 5,
      totalSpentPaise: 695000,
      createdAt: '2026-09-20'
    }
  ]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupType, setNewGroupType] = useState('TRIP');
  const [newGroupBudget, setNewGroupBudget] = useState('');

  // Fetch groups from API
  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/v1/groups`)
      .then(res => res.json())
      .then(data => {
        if (data.groups && data.groups.length > 0) {
          setGroups(data.groups);
        }
      })
      .catch(() => {});
  }, []);

  const handleCreateGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;

    const newG: Group = {
      id: `group_${Date.now()}`,
      name: newGroupName,
      type: newGroupType,
      baseCurrency: 'INR',
      budgetPaise: newGroupBudget ? parseFloat(newGroupBudget) * 100 : undefined,
      memberCount: 1,
      totalSpentPaise: 0,
      createdAt: new Date().toISOString()
    };

    setGroups([newG, ...groups]);
    setNewGroupName('');
    setNewGroupBudget('');
    setIsModalOpen(false);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'TRIP': return '🌴';
      case 'FLATMATES': return '🏠';
      case 'OFFICE': return '🍱';
      case 'EVENT': return '🎉';
      default: return '💸';
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-8">
        
        {/* Welcome & Quick Action Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black">
              Welcome back, {user?.fullName?.split(' ')[0] || 'Rohan'}! 👋
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              Here is your group balances summary across all active groups.
            </p>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2.5 bg-gradient-to-r from-teal-500 to-indigo-600 text-white font-bold text-xs rounded-xl shadow-lg hover:scale-105 active:scale-95 transition flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>{t('createGroup', language)}</span>
          </button>
        </div>

        {/* Hero Balance Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          
          {/* Card 1: You Owe */}
          <div className="glass-card p-5 rounded-3xl border shadow-lg space-y-2 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                {t('youOwe', language)}
              </span>
              <div className="w-8 h-8 rounded-full bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400 flex items-center justify-center">
                <ArrowUpRight className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-rose-600 dark:text-rose-400">
              ₹2,450.00
            </div>
            <p className="text-[11px] text-slate-400">Pending across 1 group transfer</p>
          </div>

          {/* Card 2: You Are Owed */}
          <div className="glass-card p-5 rounded-3xl border shadow-lg space-y-2 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                {t('youAreOwed', language)}
              </span>
              <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400 flex items-center justify-center">
                <ArrowDownLeft className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
              ₹4,100.00
            </div>
            <p className="text-[11px] text-slate-400">Owed by 2 friends</p>
          </div>

          {/* Card 3: Net Position */}
          <div className="glass-card p-5 rounded-3xl border shadow-lg space-y-2 bg-gradient-to-br from-teal-500/10 to-indigo-500/10">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-teal-700 dark:text-teal-300 uppercase tracking-wider">
                {t('netBalance', language)}
              </span>
              <div className="w-8 h-8 rounded-full bg-teal-500 text-white flex items-center justify-center font-bold text-xs">
                +
              </div>
            </div>
            <div className="text-2xl font-black text-teal-600 dark:text-teal-400">
              +₹1,650.00
            </div>
            <p className="text-[11px] text-teal-600/80 font-semibold">Net overall positive position 🎉</p>
          </div>

        </div>

        {/* Groups Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">Your Expense Groups ({groups.length})</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {groups.map(g => {
              const spentRupees = g.totalSpentPaise / 100;
              const budgetRupees = g.budgetPaise ? g.budgetPaise / 100 : null;
              const budgetPercent = budgetRupees ? Math.min(100, Math.round((spentRupees / budgetRupees) * 100)) : 0;

              return (
                <Link
                  key={g.id}
                  href={`/groups/${g.id}`}
                  className="glass-card rounded-3xl p-6 border shadow-md hover:shadow-xl hover:scale-[1.02] transition-all flex flex-col justify-between space-y-4 group"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-2xl">{getTypeIcon(g.type)}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {g.type}
                      </span>
                    </div>
                    <h3 className="font-bold text-base group-hover:text-teal-600 transition">
                      {g.name}
                    </h3>
                    {g.description && <p className="text-xs text-slate-500 line-clamp-2">{g.description}</p>}
                  </div>

                  <div className="space-y-3 pt-3 border-t">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400 flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" /> {g.memberCount} Members
                      </span>
                      <span className="font-bold text-slate-700 dark:text-slate-200">
                        ₹{spentRupees.toLocaleString('en-IN')} Total
                      </span>
                    </div>

                    {/* Budget Progress Bar */}
                    {budgetRupees && (
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] font-semibold text-slate-400">
                          <span>Budget Progress</span>
                          <span className={budgetPercent >= 80 ? 'text-amber-500 font-bold' : ''}>{budgetPercent}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-500 ${
                              budgetPercent >= 100 ? 'bg-rose-500' : budgetPercent >= 80 ? 'bg-amber-500' : 'bg-teal-500'
                            }`}
                            style={{ width: `${budgetPercent}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

      </main>

      {/* Modal: Create Group */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md glass-card rounded-3xl shadow-2xl border p-6 relative">
            <h3 className="font-bold text-lg mb-4">Create New Expense Group</h3>
            <form onSubmit={handleCreateGroup} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-500 font-medium mb-1">Group Name</label>
                <input
                  type="text"
                  required
                  value={newGroupName}
                  onChange={e => setNewGroupName(e.target.value)}
                  placeholder="e.g. Manali Trip ⛷️, Flat 301 🏠"
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl border outline-none font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-500 font-medium mb-1">Group Type</label>
                  <select
                    value={newGroupType}
                    onChange={e => setNewGroupType(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl border outline-none font-medium"
                  >
                    <option value="TRIP">🌴 Trip</option>
                    <option value="FLATMATES">🏠 Flatmates</option>
                    <option value="OFFICE">🍱 Office</option>
                    <option value="EVENT">🎉 Event</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-500 font-medium mb-1">Budget (₹ Optional)</label>
                  <input
                    type="number"
                    value={newGroupBudget}
                    onChange={e => setNewGroupBudget(e.target.value)}
                    placeholder="e.g. 50000"
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl border outline-none font-bold text-teal-600"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-500 font-semibold hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-teal-500 to-indigo-600 text-white font-bold rounded-xl shadow-md hover:opacity-95 transition"
                >
                  Create Group
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ChatbotWidget />
    </div>
  );
}
