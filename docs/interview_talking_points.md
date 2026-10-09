# SettleUp Architecture & Technical Deep-Dive

## 1. Smart Settlement Engine: Greedy vs. Optimal Bitmask DP
- **Problem Statement**: Given a set of $N$ members with arbitrary debts and credits, find a minimum set of directed transfers $\{ (u_i, v_i, a_i) \}$ such that applying all transfers zeroes every member's balance.
- **NP-Hardness**: Minimizing the exact number of transaction transfers in a debt graph is equivalent to finding the maximum number of disjoint subset partitions that sum to zero (Minimum 3-SAT reduction / Subset Sum reduction), which is NP-hard.
- **Optimal Mode (Bitmask DP)**:
  - Applicable for groups up to $N \le 16$.
  - Computes all $2^N$ subset balances and finds the maximum number of disjoint zero-sum subsets $k$ using DP:
    $$dp[S] = \max_{sub \subset S, \sum(sub)=0} (dp[sub] + dp[S \setminus sub])$$
  - Each zero-sum subset of size $|S_i|$ settles in $|S_i| - 1$ transactions.
  - Total simplified transactions = $N - k$.
  - Complexity: $O(3^N)$ subset iterations or $O(N \cdot 2^N)$ with SOS DP pruning.
- **Greedy Mode**:
  - Max-heap matching of largest creditor and largest debtor.
  - Complexity: $O(N \log N)$.
  - Guarantees at most $N - 1$ transactions.

---

## 2. Measured Benchmark Results
| Members ($N$) | Expenses | Naive Hops (Avg) | Simplified Hops (Avg) | Reduction (%) | Latency (ms) |
|---|---|---|---|---|---|
| **4** | 30 | 12.0 | 3.0 | **75.0%** | 0.207 ms |
| **6** | 30 | 29.1 | 5.0 | **82.6%** | 0.362 ms |
| **8** | 50 | 55.0 | 7.0 | **87.5%** | 0.543 ms |
| **12** | 50 | 120.9 | 11.0 | **90.9%** | 1.347 ms |
| **16** | 50 | 199.2 | 15.0 | **92.4%** | 119.72 ms |

---

## 3. Database Choice: PostgreSQL Over MongoDB
- **Financial Precision & Invariants**: Money is stored strictly as `INTEGER` (paise) to eliminate floating-point rounding errors (`0.1 + 0.2 != 0.3`).
- **ACID Transactions**: Expenses with multiple payers, split breakdowns, line items, and audit logs are created atomically using `prisma.$transaction`.
- **Relational Integrity**: Foreign key constraints prevent orphaned expenses or ghost members.

---

## 4. Real-time Synchronization Architecture
- **Socket.IO Rooms**: Each group is isolated in a dedicated socket room `group:<groupId>`.
- **Handshake Authentication**: Sockets verify JWT access token on connection.
- **Broadcast Events**: `expense:created`, `expense:deleted`, `payment:recorded`, `payment:confirmed`, and `presence:typing`.
