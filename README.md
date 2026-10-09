# SettleUp ⚡

> **Smart Indian Group Expense Splitter** featuring an optimal debt simplification engine, instant UPI deep links & dynamic QR codes, natural language expense entry, AI chatbot assistant, and real-time Socket.IO synchronization.

![SettleUp Demo](https://img.shields.io/badge/Status-Production--Ready-emerald) ![TypeScript](https://img.shields.io/badge/Language-TypeScript-blue) ![Next.js](https://img.shields.io/badge/Framework-Next.js%2014-black)

---

## 🌟 Core Features

- **Smart Settlement Engine**: Minimizes a complex web of debts down to at most $N-1$ direct payments using **Bitmask Dynamic Programming** ($O(3^N)$ for $N \le 16$) and **Greedy Max-Heap** ($O(N \log N)$ for $N > 16$).
- **UPI Deep Links & Dynamic QR Codes**: Generate instant `upi://pay?pa=...` links and QR codes for GPay, PhonePe, Paytm, and BHIM in 1-tap.
- **Natural Language & Speech Entry**: Type or speak "Dinner 1800 paid by Rohan split with Priya and Aman" to parse expenses automatically using the Web Speech API.
- **Multilingual AI Chatbot Assistant**: In-app side drawer assistant capable of tool calls (`get_balances`, `generate_upi_link`, `explain_settlement`, `send_nudge`) answering in 11 Indian languages & Hinglish.
- **All 6 Split Modes**: Equal, Exact Amounts, Percentages (%), Shares/Ratios, Itemized line-items, and By-Days-Stayed.
- **10-Second Undo Toast**: Instant undo recovery on destructive expense deletions.
- **Interactive Settlement Graph**: Animated SVG node-link visualizer showing direct debt hops vs simplified transfers with a "Replay Simplification" button.

---

## 📐 Architecture & System Design

```
+---------------------------------------------------------------------------------+
|                                 SettleUp Web                                    |
|              Next.js 14 App Router • Tailwind CSS • Framer Motion               |
+---------------------------------------+-----------------------------------------+
                                        | HTTP / Socket.IO
                                        v
+---------------------------------------------------------------------------------+
|                                 SettleUp API                                    |
|                  Node.js • Express • Socket.IO • JWT Auth                       |
+-------------------+-------------------------------------+-----------------------+
                    |                                     |
                    v                                     v
   +---------------------------------+   +----------------------------------+
   |   @settleup/settlement-engine   |   |        Prisma PostgreSQL         |
   |   (Pure TS, Bitmask DP & Heap)  |   |   (INTEGER Paise, Multi-Row Txns)|
   +---------------------------------+   +----------------------------------+
```

---

## 📊 Measured Benchmark Results

| Group Members ($N$) | Recorded Expenses | Naive Hops (Avg) | Simplified Hops (Avg) | Transaction Reduction (%) | Engine Execution Time |
|---|---|---|---|---|---|
| **4** | 30 | 12.0 | 3.0 | **75.0%** | 0.207 ms |
| **6** | 30 | 29.1 | 5.0 | **82.6%** | 0.362 ms |
| **8** | 50 | 55.0 | 7.0 | **87.5%** | 0.543 ms |
| **12** | 50 | 120.9 | 11.0 | **90.9%** | 1.347 ms |
| **16** | 50 | 199.2 | 15.0 | **92.4%** | 119.72 ms |

---

## 🚀 Quick Start Guide

### Option 1: Docker Compose (PostgreSQL + API + Web)
```bash
docker compose up --build
```
Access the application at `http://localhost:3000`.

### Option 2: Local Development Setup
```bash
# 1. Install workspace dependencies
npm install

# 2. Build settlement engine package
npm run build --workspace=packages/settlement-engine

# 3. Seed demo database (Goa Trip, Flatmates, Office Lunches)
npm run db:push
npm run db:seed

# 4. Start API & Web servers
npm run dev
```

- **Web Frontend**: `http://localhost:3000`
- **API Server**: `http://localhost:4000`

---

## 🧪 Running Engine Tests & Benchmarks

```bash
# Run unit & fast-check property-based tests
npm run test --workspace=packages/settlement-engine

# Run live benchmark suite
npm run benchmark --workspace=packages/settlement-engine
```

---

## 📄 Documentation

Deep-dive technical documentation and system trade-offs are available in [`/docs/interview_talking_points.md`](file:///d:/Desktop/Projects/FULL%20STACK/docs/interview_talking_points.md).
