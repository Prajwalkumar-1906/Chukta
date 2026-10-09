export interface PayerInput {
  memberId: string;
  amountPaise: number;
}

export interface SplitInput {
  memberId: string;
  amountPaise: number;
}

export interface ExpenseInput {
  id: string;
  description: string;
  payers: PayerInput[];
  splits: SplitInput[];
  currency?: string;
  fxRate?: number; // Rate to convert to group base currency (default 1.0)
}

export interface MemberInfo {
  id: string;
  name: string;
}

export interface MemberBalance {
  memberId: string;
  memberName: string;
  netBalancePaise: number; // Positive = owed money (creditor), Negative = owes money (debtor)
}

export interface Transfer {
  id: string;
  from: string; // Debtor member ID
  fromName: string;
  to: string; // Creditor member ID
  toName: string;
  amountPaise: number;
  explanation: string;
}

export interface SettlementGraphNode {
  id: string;
  name: string;
  netBalancePaise: number;
}

export interface SettlementGraphLink {
  source: string;
  target: string;
  amountPaise: number;
}

export interface SettlementGraphData {
  nodes: SettlementGraphNode[];
  beforeLinks: SettlementGraphLink[];
  afterLinks: SettlementGraphLink[];
}

export interface SettlementPlan {
  transfers: Transfer[];
  memberBalances: MemberBalance[];
  naiveTransactionCount: number;
  simplifiedTransactionCount: number;
  percentReduction: number;
  modeUsed: "OPTIMAL" | "GREEDY" | "TRIVIAL";
  explanations: string[];
  graphData: SettlementGraphData;
}

/**
 * Calculates net balances per member in paise.
 * Invariant: Sum of all net balances equals 0.
 */
export function calculateNetBalances(
  members: MemberInfo[],
  expenses: ExpenseInput[],
  existingPayments: { fromMemberId: string; toMemberId: string; amountPaise: number }[] = []
): Map<string, number> {
  const balanceMap = new Map<string, number>();

  for (const m of members) {
    balanceMap.set(m.id, 0);
  }

  // Process expenses
  for (const exp of expenses) {
    const fx = exp.fxRate || 1.0;
    
    // Add paid amounts to payers
    for (const p of exp.payers) {
      const current = balanceMap.get(p.memberId) || 0;
      const basePaise = Math.round(p.amountPaise * fx);
      balanceMap.set(p.memberId, current + basePaise);
    }

    // Deduct split amounts from splitters
    for (const s of exp.splits) {
      const current = balanceMap.get(s.memberId) || 0;
      const basePaise = Math.round(s.amountPaise * fx);
      balanceMap.set(s.memberId, current - basePaise);
    }
  }

  // Process existing confirmed payments (reducing debt between members)
  for (const pay of existingPayments) {
    // Payer sent money -> net balance increases (they paid off debt)
    const fromCurrent = balanceMap.get(pay.fromMemberId) || 0;
    balanceMap.set(pay.fromMemberId, fromCurrent + pay.amountPaise);

    // Receiver got money -> net balance decreases (they were paid back)
    const toCurrent = balanceMap.get(pay.toMemberId) || 0;
    balanceMap.set(pay.toMemberId, toCurrent - pay.amountPaise);
  }

  // Ensure invariant: sum of balances == 0
  let totalSum = 0;
  for (const b of balanceMap.values()) {
    totalSum += b;
  }

  if (totalSum !== 0 && balanceMap.size > 0) {
    // Distribute remaining paise deterministically
    const firstMember = members[0].id;
    const current = balanceMap.get(firstMember) || 0;
    balanceMap.set(firstMember, current - totalSum);
  }

  return balanceMap;
}

/**
 * Calculates naive debt matrix (direct debts before simplification).
 */
export function calculateNaiveLinks(
  members: MemberInfo[],
  expenses: ExpenseInput[]
): SettlementGraphLink[] {
  const debtMatrix = new Map<string, Map<string, number>>();

  const getDebt = (from: string, to: string) => {
    return debtMatrix.get(from)?.get(to) || 0;
  };

  const setDebt = (from: string, to: string, amount: number) => {
    if (!debtMatrix.has(from)) debtMatrix.set(from, new Map());
    debtMatrix.get(from)!.set(to, amount);
  };

  for (const exp of expenses) {
    const fx = exp.fxRate || 1.0;
    const totalPaid = exp.payers.reduce((sum, p) => sum + Math.round(p.amountPaise * fx), 0);
    if (totalPaid === 0) continue;

    for (const s of exp.splits) {
      const owed = Math.round(s.amountPaise * fx);
      if (owed <= 0) continue;

      for (const p of exp.payers) {
        if (p.memberId === s.memberId) continue;
        const payerPaid = Math.round(p.amountPaise * fx);
        const shareOfDebt = Math.round((owed * payerPaid) / totalPaid);
        if (shareOfDebt > 0) {
          const current = getDebt(s.memberId, p.memberId);
          setDebt(s.memberId, p.memberId, current + shareOfDebt);
        }
      }
    }
  }

  const naiveLinks: SettlementGraphLink[] = [];
  for (const [from, targets] of debtMatrix.entries()) {
    for (const [to, amount] of targets.entries()) {
      if (amount > 0) {
        naiveLinks.push({ source: from, target: to, amountPaise: amount });
      }
    }
  }

  return naiveLinks;
}

/**
 * Solves settlement using Greedy algorithm.
 * Complexity: O(N log N)
 */
export function solveGreedy(balances: { memberId: string; balance: number }[]): { from: string; to: string; amount: number }[] {
  const creditors = balances.filter(b => b.balance > 0).sort((a, b) => b.balance - a.balance);
  const debtors = balances.filter(b => b.balance < 0).map(b => ({ memberId: b.memberId, balance: Math.abs(b.balance) })).sort((a, b) => b.balance - a.balance);

  const transfers: { from: string; to: string; amount: number }[] = [];

  let i = 0; // creditor index
  let j = 0; // debtor index

  while (i < creditors.length && j < debtors.length) {
    const c = creditors[i];
    const d = debtors[j];

    const amount = Math.min(c.balance, d.balance);
    if (amount > 0) {
      transfers.push({
        from: d.memberId,
        to: c.memberId,
        amount
      });
      c.balance -= amount;
      d.balance -= amount;
    }

    if (c.balance === 0) i++;
    if (d.balance === 0) j++;
  }

  return transfers;
}

/**
 * Solves settlement using Optimal Bitmask DP algorithm for N <= 16.
 * Complexity: O(3^N) or O(N * 2^N) with zero-sum subset partitioning.
 */
export function solveOptimal(balances: { memberId: string; balance: number }[]): { from: string; to: string; amount: number }[] {
  const n = balances.length;
  if (n <= 1) return [];

  // Compute subset sums
  const numSubsets = 1 << n;
  const subsetSum = new Int32Array(numSubsets);
  for (let mask = 1; mask < numSubsets; mask++) {
    const lsb = mask & -mask;
    const idx = Math.clz32(lsb) ^ 31;
    subsetSum[mask] = subsetSum[mask ^ lsb] + balances[idx].balance;
  }

  // DP array storing max number of zero-sum subsets
  const dp = new Int32Array(numSubsets);
  const parent = new Int32Array(numSubsets);

  for (let mask = 1; mask < numSubsets; mask++) {
    dp[mask] = 0;
    parent[mask] = 0;

    // Check if mask itself sums to 0
    if (subsetSum[mask] === 0) {
      dp[mask] = 1;
      parent[mask] = mask;
    }

    // Try splitting mask into submasks
    // Iterate over submasks
    for (let sub = (mask - 1) & mask; sub > 0; sub = (sub - 1) & mask) {
      if (dp[sub] + dp[mask ^ sub] > dp[mask]) {
        dp[mask] = dp[sub] + dp[mask ^ sub];
        parent[mask] = sub;
      }
    }
  }

  // Reconstruct subsets
  const zeroSumSubsets: number[] = [];
  function reconstruct(mask: number) {
    if (mask === 0) return;
    if (parent[mask] === mask || parent[mask] === 0) {
      if (subsetSum[mask] === 0) {
        zeroSumSubsets.push(mask);
      }
      return;
    }
    const sub = parent[mask];
    reconstruct(sub);
    reconstruct(mask ^ sub);
  }

  reconstruct(numSubsets - 1);

  // Fallback if no full zero-sum decomposition was reached for leftover
  const usedMask = zeroSumSubsets.reduce((acc, m) => acc | m, 0);
  const remainingMask = (numSubsets - 1) ^ usedMask;
  if (remainingMask > 0) {
    zeroSumSubsets.push(remainingMask);
  }

  // For each independent zero-sum subset, solve with greedy settlement
  const allTransfers: { from: string; to: string; amount: number }[] = [];
  for (const mask of zeroSumSubsets) {
    const subsetBalances: { memberId: string; balance: number }[] = [];
    for (let i = 0; i < n; i++) {
      if (mask & (1 << i)) {
        subsetBalances.push({ ...balances[i] });
      }
    }
    const transfers = solveGreedy(subsetBalances);
    allTransfers.push(...transfers);
  }

  return allTransfers;
}

/**
 * Format currency in Indian Rupees format (e.g. ₹1,240.00 or ₹1,240)
 */
export function formatPaiseToINR(paise: number): string {
  const rupees = paise / 100;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2
  }).format(rupees);
}

/**
 * Main Smart Settlement Engine execution.
 */
export function simplifySettlements(
  members: MemberInfo[],
  expenses: ExpenseInput[],
  existingPayments: { fromMemberId: string; toMemberId: string; amountPaise: number }[] = []
): SettlementPlan {
  const memberMap = new Map<string, string>();
  for (const m of members) {
    memberMap.set(m.id, m.name);
  }

  // 1. Net balances
  const rawBalances = calculateNetBalances(members, expenses, existingPayments);

  const memberBalances: MemberBalance[] = members.map(m => ({
    memberId: m.id,
    memberName: m.name,
    netBalancePaise: rawBalances.get(m.id) || 0
  }));

  // Filter non-zero balances
  const nonZeroBalances = memberBalances
    .filter(b => b.netBalancePaise !== 0)
    .map(b => ({ memberId: b.memberId, balance: b.netBalancePaise }));

  // 2. Naive links & count
  const naiveLinks = calculateNaiveLinks(members, expenses);
  const naiveTransactionCount = naiveLinks.length;

  let modeUsed: "OPTIMAL" | "GREEDY" | "TRIVIAL" = "OPTIMAL";
  let rawTransfers: { from: string; to: string; amount: number }[] = [];

  if (nonZeroBalances.length === 0) {
    modeUsed = "TRIVIAL";
    rawTransfers = [];
  } else if (nonZeroBalances.length <= 16) {
    modeUsed = "OPTIMAL";
    rawTransfers = solveOptimal(nonZeroBalances);
  } else {
    modeUsed = "GREEDY";
    rawTransfers = solveGreedy(nonZeroBalances);
  }

  // Generate transfers with human-readable explanations
  const explanations: string[] = [];
  const transfers: Transfer[] = rawTransfers.map((t, idx) => {
    const fromName = memberMap.get(t.from) || t.from;
    const toName = memberMap.get(t.to) || t.to;
    const formattedAmount = formatPaiseToINR(t.amount);

    const expText = `${fromName} pays ${toName} ${formattedAmount} to settle net balances after combining group expenses.`;
    explanations.push(expText);

    return {
      id: `trn_${idx + 1}_${t.from.slice(0, 4)}_${t.to.slice(0, 4)}`,
      from: t.from,
      fromName,
      to: t.to,
      toName,
      amountPaise: t.amount,
      explanation: expText
    };
  });

  const simplifiedTransactionCount = transfers.length;
  const percentReduction = naiveTransactionCount > 0
    ? Math.max(0, Math.round(((naiveTransactionCount - simplifiedTransactionCount) / naiveTransactionCount) * 100))
    : 0;

  // Build graph visualization data
  const afterLinks: SettlementGraphLink[] = transfers.map(t => ({
    source: t.from,
    target: t.to,
    amountPaise: t.amountPaise
  }));

  const graphNodes: SettlementGraphNode[] = members.map(m => ({
    id: m.id,
    name: m.name,
    netBalancePaise: rawBalances.get(m.id) || 0
  }));

  return {
    transfers,
    memberBalances,
    naiveTransactionCount,
    simplifiedTransactionCount,
    percentReduction,
    modeUsed,
    explanations,
    graphData: {
      nodes: graphNodes,
      beforeLinks: naiveLinks,
      afterLinks
    }
  };
}
