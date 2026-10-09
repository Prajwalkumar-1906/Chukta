'use client';

import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, CheckCircle2, QrCode, ExternalLink, ArrowRight, ShieldCheck, Copy, Check } from 'lucide-react';
import confetti from 'canvas-confetti';

interface UpiPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  transfer: {
    fromName: string;
    toName: string;
    toUpiId?: string;
    amountRupees: number;
    groupId: string;
  };
  onPaymentConfirmed?: () => void;
}

export default function UpiPaymentModal({
  isOpen,
  onClose,
  transfer,
  onPaymentConfirmed
}: UpiPaymentModalProps) {
  const [copied, setCopied] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);

  if (!isOpen) return null;

  const upiId = transfer.toUpiId || `${transfer.toName.toLowerCase().replace(/\s+/g, '')}@upi`;
  const amount = transfer.amountRupees;
  const upiDeepLink = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(transfer.toName)}&am=${amount}&cu=INR&tn=${encodeURIComponent('SettleUp group payment')}`;

  const copyUpi = () => {
    navigator.clipboard.writeText(upiId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleConfirmPayment = async () => {
    setIsProcessing(true);
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/v1/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groupId: transfer.groupId,
          amountRupees: transfer.amountRupees,
          idempotencyKey: `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        })
      });
    } catch (e) {}

    setIsProcessing(false);
    setIsConfirmed(true);

    // Trigger celebration confetti
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 }
    });

    setTimeout(() => {
      onPaymentConfirmed?.();
      onClose();
      setIsConfirmed(false);
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md glass-card rounded-3xl shadow-2xl border overflow-hidden p-6 relative">
        
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full transition"
        >
          <X className="w-5 h-5" />
        </button>

        {isConfirmed ? (
          <div className="py-8 text-center space-y-3">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto shadow-lg animate-bounce">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h3 className="font-bold text-xl text-slate-800 dark:text-slate-100">Payment Recorded! 🎉</h3>
            <p className="text-xs text-slate-500">
              ₹{amount.toLocaleString('en-IN')} payment from {transfer.fromName} to {transfer.toName} is confirmed.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            
            {/* Modal Header */}
            <div className="text-center space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-teal-600 bg-teal-50 dark:bg-teal-950 px-2.5 py-1 rounded-full border border-teal-200">
                Instant India UPI Transfer
              </span>
              <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100 pt-1">
                Pay {transfer.toName}
              </h3>
              <div className="text-3xl font-black gradient-text">
                ₹{amount.toLocaleString('en-IN')}
              </div>
            </div>

            {/* Dynamic QR Code */}
            <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border flex flex-col items-center justify-center shadow-inner">
              <div className="p-2 bg-white rounded-xl shadow-md border">
                <QRCodeSVG value={upiDeepLink} size={150} />
              </div>
              <p className="text-[11px] text-slate-400 mt-2 flex items-center gap-1">
                <QrCode className="w-3.5 h-3.5" /> Scan with GPay, PhonePe, Paytm, BHIM
              </p>
            </div>

            {/* UPI ID Copy Bar */}
            <div className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border text-xs">
              <div className="truncate pr-2">
                <span className="text-[10px] text-slate-400 block">VPA / UPI ID</span>
                <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{upiId}</span>
              </div>
              <button
                onClick={copyUpi}
                className="p-1.5 bg-white dark:bg-slate-700 border rounded-lg hover:bg-slate-100 transition flex items-center gap-1 text-[11px] font-medium"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            {/* Deep Link Buttons */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <a
                href={upiDeepLink}
                target="_blank"
                rel="noreferrer"
                className="p-2.5 rounded-xl bg-teal-500 hover:bg-teal-600 text-white font-bold flex items-center justify-center gap-1.5 shadow-md transition"
              >
                <span>Pay via GPay</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <a
                href={upiDeepLink}
                target="_blank"
                rel="noreferrer"
                className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold flex items-center justify-center gap-1.5 shadow-md transition"
              >
                <span>PhonePe / Paytm</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            {/* Manual Confirmation Button */}
            <button
              onClick={handleConfirmPayment}
              disabled={isProcessing}
              className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl font-bold text-sm shadow-lg hover:opacity-95 transition flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isProcessing ? 'Recording Payment...' : 'I Have Completed Payment'}</span>
            </button>

          </div>
        )}

      </div>
    </div>
  );
}
