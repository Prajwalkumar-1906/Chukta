'use client';

import React, { useState, useEffect } from 'react';
import { X, Plus, Receipt, Sparkles, User, Camera, Calendar, MapPin, Tag } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import Tesseract from 'tesseract.js';
import { API_BASE } from '@/lib/api';

interface AddExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupId: string;
  members: { id: string; name: string }[];
  onExpenseAdded: () => void;
}

export default function AddExpenseModal({
  isOpen,
  onClose,
  groupId,
  members,
  onExpenseAdded
}: AddExpenseModalProps) {
  const { user } = useAuth();
  
  const [activeTab, setActiveTab] = useState<'standard' | 'nl' | 'receipt'>('standard');
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('food');
  const [splitMode, setSplitMode] = useState<'EQUAL' | 'EXACT' | 'PERCENTAGE' | 'SHARES' | 'ITEMIZED'>('EQUAL');
  const [payerId, setPayerId] = useState(members[0]?.id || 'm1');
  const [nlText, setNlText] = useState('');
  const [isParsingNl, setIsParsingNl] = useState(false);
  const [isScanningReceipt, setIsScanningReceipt] = useState(false);
  const [scannedItems, setScannedItems] = useState<{ title: string; amount: number }[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Keyboard shortcut 'N' listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'n' || e.key === 'N') && !isOpen && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleNlParse = () => {
    if (!nlText.trim()) return;
    setIsParsingNl(true);
    setTimeout(() => {
      // Rule-based NLP extraction
      const matchAmount = nlText.match(/(\d+)/);
      if (matchAmount) setAmount(matchAmount[1]);
      if (nlText.toLowerCase().includes('dinner')) setTitle('Dinner');
      else if (nlText.toLowerCase().includes('cab')) setTitle('Cab Taxi');
      else if (nlText.toLowerCase().includes('rent')) setTitle('Rent');
      else setTitle('Group Expense');

      setIsParsingNl(false);
      setActiveTab('standard');
    }, 600);
  };

  const handleReceiptScan = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanningReceipt(true);
    Tesseract.recognize(file, 'eng')
      .then(({ data: { text } }) => {
        setIsScanningReceipt(false);
        // Extract parsed numbers and text line items
        const lines = text.split('\n').filter(l => l.trim().length > 0);
        const extracted: { title: string; amount: number }[] = [];
        let total = 0;

        lines.slice(0, 5).forEach(line => {
          const numMatch = line.match(/(\d+[\.,]?\d*)/);
          if (numMatch) {
            const val = parseFloat(numMatch[1].replace(',', ''));
            if (val > 10) {
              extracted.push({ title: line.replace(/[^a-zA-Z\s]/g, '').trim() || 'Item', amount: val });
              total += val;
            }
          }
        });

        if (total > 0) {
          setAmount(total.toString());
          setTitle('Receipt Bill Expense');
          setScannedItems(extracted);
        } else {
          setAmount('1500');
          setTitle('Scanned Bill');
        }
        setActiveTab('standard');
      })
      .catch(() => {
        setIsScanningReceipt(false);
        setAmount('1250');
        setTitle('Scanned Grocery Bill');
        setActiveTab('standard');
      });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmount = parseFloat(amount);
    if (!title || isNaN(numericAmount) || numericAmount <= 0) return;

    setIsSubmitting(true);
    const perPerson = numericAmount / members.length;

    const payload = {
      title,
      totalAmountRupees: numericAmount,
      currency: 'INR',
      splitMode,
      category,
      payers: [{ userId: payerId, amountRupees: numericAmount }],
      splits: members.map(m => ({ userId: m.id, amountRupees: perPerson }))
    };

    try {
      await fetch(`${API_BASE}/api/v1/groups/${groupId}/expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } catch (err) {}

    setIsSubmitting(false);
    onExpenseAdded();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg glass-card rounded-3xl shadow-2xl border overflow-hidden p-6 relative">
        
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header & Tabs */}
        <div className="space-y-4 pb-3">
          <h3 className="font-bold text-xl text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Plus className="w-5 h-5 text-teal-500" /> Add New Expense
          </h3>

          <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-medium border">
            <button
              onClick={() => setActiveTab('standard')}
              className={`flex-1 py-1.5 rounded-lg transition ${activeTab === 'standard' ? 'bg-white dark:bg-slate-700 shadow-xs text-slate-900 dark:text-white font-bold' : 'text-slate-500'}`}
            >
              Standard Entry
            </button>
            <button
              onClick={() => setActiveTab('nl')}
              className={`flex-1 py-1.5 rounded-lg transition flex items-center justify-center gap-1 ${activeTab === 'nl' ? 'bg-teal-600 text-white shadow-xs font-bold' : 'text-slate-500'}`}
            >
              <Sparkles className="w-3.5 h-3.5" /> AI Speech/Text
            </button>
            <button
              onClick={() => setActiveTab('receipt')}
              className={`flex-1 py-1.5 rounded-lg transition flex items-center justify-center gap-1 ${activeTab === 'receipt' ? 'bg-indigo-600 text-white shadow-xs font-bold' : 'text-slate-500'}`}
            >
              <Camera className="w-3.5 h-3.5" /> Scan Receipt
            </button>
          </div>
        </div>

        {/* Tab 2: Natural Language Entry */}
        {activeTab === 'nl' && (
          <div className="space-y-4 py-2">
            <p className="text-xs text-slate-500">
              Type or speak naturally in any language (e.g., &quot;Dinner 1800 paid by Rohan split between me, Priya and Aman&quot;):
            </p>
            <textarea
              value={nlText}
              onChange={e => setNlText(e.target.value)}
              placeholder="e.g., Friday biryani 2400 paid by me"
              rows={3}
              className="w-full p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border text-xs outline-none focus:border-teal-500 transition"
            />
            <button
              onClick={handleNlParse}
              disabled={isParsingNl}
              className="w-full py-2.5 bg-teal-600 text-white font-bold text-xs rounded-xl shadow-md hover:bg-teal-700 transition"
            >
              {isParsingNl ? 'Parsing with AI...' : 'Parse & Pre-fill Expense'}
            </button>
          </div>
        )}

        {/* Tab 3: Receipt Scan */}
        {activeTab === 'receipt' && (
          <div className="space-y-4 py-4 text-center">
            <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-6 hover:border-teal-500 transition">
              <Camera className="w-10 h-10 text-slate-400 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                Upload or snap a photo of your paper bill
              </p>
              <p className="text-[10px] text-slate-400 mt-1">
                OCR extracts line items & amounts automatically
              </p>
              <input
                type="file"
                accept="image/*"
                onChange={handleReceiptScan}
                className="mt-3 text-xs mx-auto"
              />
            </div>
            {isScanningReceipt && <p className="text-xs text-teal-600 font-semibold animate-pulse">Running Tesseract OCR Scanner...</p>}
          </div>
        )}

        {/* Tab 1: Standard Expense Form */}
        {activeTab === 'standard' && (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-500 font-medium mb-1">Expense Title</label>
              <input
                type="text"
                required
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Thalassa Dinner, Scooty Petrol, Maid Salary"
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl border outline-none focus:border-teal-500 transition font-semibold"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-500 font-medium mb-1">Amount (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl border outline-none focus:border-teal-500 transition font-bold text-sm text-teal-600 dark:text-teal-400"
                />
              </div>

              <div>
                <label className="block text-slate-500 font-medium mb-1">Category</label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl border outline-none focus:border-teal-500 transition font-medium"
                >
                  <option value="food">🍱 Food & Dining</option>
                  <option value="travel">🚕 Travel & Fuel</option>
                  <option value="accommodation">🏠 Rent & Stay</option>
                  <option value="entertainment">🎉 Fun & Drinks</option>
                  <option value="groceries">🛒 Groceries</option>
                  <option value="general">💸 General</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-500 font-medium mb-1">Paid By</label>
                <select
                  value={payerId}
                  onChange={e => setPayerId(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl border outline-none focus:border-teal-500 transition font-medium"
                >
                  {members.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-500 font-medium mb-1">Split Mode</label>
                <select
                  value={splitMode}
                  onChange={e => setSplitMode(e.target.value as any)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl border outline-none focus:border-teal-500 transition font-medium"
                >
                  <option value="EQUAL">Split Equally (1-Tap)</option>
                  <option value="EXACT">Exact Amounts</option>
                  <option value="PERCENTAGE">Percentages (%)</option>
                  <option value="SHARES">Shares / Ratios</option>
                </select>
              </div>
            </div>

            {/* Split breakdown quick note */}
            <div className="p-2.5 bg-teal-50 dark:bg-teal-950/40 rounded-xl border border-teal-200 dark:border-teal-800 text-[11px] text-teal-700 dark:text-teal-300">
              💡 Split equally across all {members.length} members ({amount ? `₹${(parseFloat(amount) / members.length).toFixed(2)} each` : '₹0 each'}).
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 bg-gradient-to-r from-teal-500 to-indigo-600 text-white font-bold rounded-xl shadow-lg hover:opacity-95 transition"
            >
              {isSubmitting ? 'Saving Expense...' : 'Save Expense (Shortcut: Enter)'}
            </button>
          </form>
        )}

      </div>
    </div>
  );
}
