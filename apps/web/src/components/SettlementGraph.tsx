'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, ArrowRight, CheckCircle2, ShieldCheck } from 'lucide-react';
import { SettlementGraphData } from '@settleup/settlement-engine';

interface SettlementGraphProps {
  graphData?: SettlementGraphData;
  naiveCount: number;
  simplifiedCount: number;
  percentReduction: number;
}

export default function SettlementGraph({
  graphData,
  naiveCount = 12,
  simplifiedCount = 3,
  percentReduction = 75
}: SettlementGraphProps) {
  const [viewState, setViewState] = useState<'before' | 'after'>('after');
  const [isReplaying, setIsReplaying] = useState(false);

  // Demo fallback nodes if graphData not supplied
  const nodes = graphData?.nodes || [
    { id: 'm1', name: 'Rohan Mehta', netBalancePaise: -245000 },
    { id: 'm2', name: 'Riya Sharma', netBalancePaise: 410000 },
    { id: 'm3', name: 'Aman Gupta', netBalancePaise: -125000 },
    { id: 'm4', name: 'Priya Patel', netBalancePaise: -40000 },
    { id: 'm5', name: 'Vikram Singh', netBalancePaise: 0 }
  ];

  const beforeLinks = graphData?.beforeLinks || [
    { source: 'm1', target: 'm2', amountPaise: 120000 },
    { source: 'm1', target: 'm3', amountPaise: 50000 },
    { source: 'm3', target: 'm2', amountPaise: 90000 },
    { source: 'm4', target: 'm2', amountPaise: 40000 },
    { source: 'm5', target: 'm1', amountPaise: 30000 },
    { source: 'm1', target: 'm4', amountPaise: 25000 }
  ];

  const afterLinks = graphData?.afterLinks || [
    { source: 'm1', target: 'm2', amountPaise: 245000 },
    { source: 'm3', target: 'm2', amountPaise: 125000 },
    { source: 'm4', target: 'm2', amountPaise: 40000 }
  ];

  const linksToDisplay = viewState === 'before' ? beforeLinks : afterLinks;

  // Calculate circular layout positions for nodes
  const width = 600;
  const height = 360;
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = 140;

  const nodePositions: Record<string, { x: number; y: number }> = {};
  nodes.forEach((node, idx) => {
    const angle = (idx / nodes.length) * 2 * Math.PI - Math.PI / 2;
    nodePositions[node.id] = {
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle)
    };
  });

  const handleReplay = () => {
    setIsReplaying(true);
    setViewState('before');
    setTimeout(() => {
      setViewState('after');
      setIsReplaying(false);
    }, 1500);
  };

  return (
    <div className="glass-card rounded-3xl p-6 border shadow-xl relative overflow-hidden">
      
      {/* Header controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300 font-bold text-xs">
              Smart Engine Visualizer
            </span>
            <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950 dark:text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-200">
              {percentReduction}% Payments Saved
            </span>
          </div>
          <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100 mt-1">
            Debt Network Simplification
          </h3>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border text-xs">
            <button
              onClick={() => setViewState('before')}
              className={`px-3 py-1.5 rounded-lg font-medium transition ${
                viewState === 'before' ? 'bg-white dark:bg-slate-700 shadow-xs text-slate-900 dark:text-white' : 'text-slate-500'
              }`}
            >
              Messy Web ({naiveCount} txns)
            </button>
            <button
              onClick={() => setViewState('after')}
              className={`px-3 py-1.5 rounded-lg font-medium transition ${
                viewState === 'after' ? 'bg-teal-600 text-white shadow-md' : 'text-slate-500'
              }`}
            >
              Simplified ({simplifiedCount} txns)
            </button>
          </div>

          <button
            onClick={handleReplay}
            disabled={isReplaying}
            className="p-2.5 bg-gradient-to-r from-teal-500 to-indigo-600 text-white rounded-xl shadow-md hover:scale-105 active:scale-95 transition flex items-center gap-1 text-xs font-semibold"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isReplaying ? 'animate-spin' : ''}`} />
            <span className="hidden md:inline">Replay Simplification</span>
          </button>
        </div>
      </div>

      {/* SVG Canvas */}
      <div className="relative w-full h-[360px] flex items-center justify-center my-4">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
          <defs>
            <marker
              id="arrowhead"
              markerWidth="10"
              markerHeight="7"
              refX="18"
              refY="3.5"
              orient="auto"
            >
              <polygon points="0 0, 10 3.5, 0 7" fill="#0d9488" />
            </marker>
          </defs>

          {/* Links / Hops */}
          <AnimatePresence>
            {linksToDisplay.map((link, idx) => {
              const start = nodePositions[link.source] || { x: centerX, y: centerY };
              const end = nodePositions[link.target] || { x: centerX, y: centerY };

              return (
                <g key={`link_${link.source}_${link.target}_${idx}`}>
                  <motion.line
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 0.7 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                    x1={start.x}
                    y1={start.y}
                    x2={end.x}
                    y2={end.y}
                    stroke={viewState === 'before' ? '#94a3b8' : '#0d9488'}
                    strokeWidth={viewState === 'before' ? 1.5 : 2.5}
                    strokeDasharray={viewState === 'before' ? '4,4' : undefined}
                    markerEnd="url(#arrowhead)"
                  />
                  {/* Debt amount label on edge */}
                  <text
                    x={(start.x + end.x) / 2}
                    y={(start.y + end.y) / 2 - 6}
                    fill={viewState === 'before' ? '#64748b' : '#0d9488'}
                    fontSize="10"
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    ₹{(link.amountPaise / 100).toLocaleString('en-IN')}
                  </text>
                </g>
              );
            })}
          </AnimatePresence>

          {/* Nodes */}
          {nodes.map(n => {
            const pos = nodePositions[n.id] || { x: centerX, y: centerY };
            const isCreditor = n.netBalancePaise > 0;
            const isDebtor = n.netBalancePaise < 0;

            return (
              <motion.g
                key={n.id}
                animate={{ x: pos.x, y: pos.y }}
                transition={{ type: 'spring', stiffness: 120, damping: 14 }}
              >
                <circle
                  r={22}
                  fill={isCreditor ? '#10b981' : isDebtor ? '#f43f5e' : '#64748b'}
                  className="shadow-lg opacity-90 cursor-pointer"
                />
                <text
                  textAnchor="middle"
                  dy="4"
                  fill="#ffffff"
                  fontSize="10"
                  fontWeight="bold"
                >
                  {n.name.slice(0, 2).toUpperCase()}
                </text>
                <text
                  textAnchor="middle"
                  dy="36"
                  fill="currentColor"
                  fontSize="11"
                  fontWeight="600"
                  className="text-slate-800 dark:text-slate-200"
                >
                  {n.name.split(' ')[0]}
                </text>
              </motion.g>
            );
          })}
        </svg>
      </div>

      {/* Footer Metrics */}
      <div className="grid grid-cols-3 gap-3 pt-3 border-t text-center text-xs">
        <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50">
          <span className="text-slate-400 block text-[10px]">Naive Hops</span>
          <span className="font-bold text-slate-700 dark:text-slate-300 text-sm">{naiveCount} Payments</span>
        </div>
        <div className="p-2 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800">
          <span className="text-teal-600 dark:text-teal-400 block text-[10px]">Smart Plan Hops</span>
          <span className="font-bold text-teal-700 dark:text-teal-300 text-sm">{simplifiedCount} Payments</span>
        </div>
        <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
          <span className="text-emerald-600 dark:text-emerald-400 block text-[10px]">Efficiency Gain</span>
          <span className="font-bold text-emerald-700 dark:text-emerald-300 text-sm">+{percentReduction}% Faster</span>
        </div>
      </div>

    </div>
  );
}
