import { prisma } from '../db/prisma.js';
import { LedgerService } from './ledger.service.js';

export interface DiscrepancyItem {
  type: 'ZERO_SUM_VIOLATION' | 'LEDGER_UNBALANCED' | 'MEMBER_BALANCE_MISMATCH' | 'TRANSACTION_UNBALANCED';
  details: string;
  memberId?: string;
  transactionId?: string;
  diffPaise?: string;
}

export interface ReconciliationResult {
  groupId: string;
  groupName: string;
  status: 'BALANCED' | 'DISCREPANCY_DETECTED';
  sumOfBalancesPaise: bigint;
  totalDebitsPaise: bigint;
  totalCreditsPaise: bigint;
  ledgerMatchesBalances: boolean;
  discrepancies: DiscrepancyItem[];
  reportId: string;
  checkedAt: Date;
}

export class ReconciliationService {
  /**
   * Run reconciliation for a single group.
   * Verifies:
   * 1. Sum of member balances == 0
   * 2. Total Ledger Debits == Total Ledger Credits
   * 3. Every individual Ledger Transaction is internally balanced
   * 4. Member balances derived from the ledger match balances computed from expense/payment rows
   */
  static async reconcileGroup(
    groupId: string,
    options?: { triggeredBy?: string; adminUserId?: string }
  ): Promise<ReconciliationResult> {
    // Backfill legacy expenses or confirmed payments to ledger so balances are derivable
    await LedgerService.backfillLedgerForGroup(groupId);

    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: {
        members: {
          include: {
            user: { select: { id: true, fullName: true } }
          }
        },
        expenses: {
          include: {
            payers: true,
            splits: true
          }
        },
        payments: {
          where: { status: 'CONFIRMED' }
        },
        ledgerTransactions: {
          include: {
            entries: true
          }
        }
      }
    });

    if (!group) {
      throw new Error(`Group with ID ${groupId} not found.`);
    }

    const discrepancies: DiscrepancyItem[] = [];

    // 1. Calculate traditional balances from expense payers, splits, and payments
    const traditionalBalances = new Map<string, bigint>();
    for (const m of group.members) {
      const key = m.isGuest ? `guest:${m.id}` : `user:${m.userId}`;
      traditionalBalances.set(key, BigInt(0));
    }

    // Add expenses
    for (const exp of group.expenses) {
      for (const p of exp.payers) {
        const key = p.guestMemberId ? `guest:${p.guestMemberId}` : `user:${p.userId}`;
        const current = traditionalBalances.get(key) || BigInt(0);
        traditionalBalances.set(key, current + p.amountPaise);
      }
      for (const s of exp.splits) {
        const key = s.guestMemberId ? `guest:${s.guestMemberId}` : `user:${s.userId}`;
        const current = traditionalBalances.get(key) || BigInt(0);
        traditionalBalances.set(key, current - s.amountPaise);
      }
    }

    // Add confirmed payments
    for (const pay of group.payments) {
      const fromKey = pay.fromGuestId ? `guest:${pay.fromGuestId}` : `user:${pay.fromUserId}`;
      const toKey = pay.toGuestId ? `guest:${pay.toGuestId}` : `user:${pay.toUserId}`;

      if (fromKey) {
        const curr = traditionalBalances.get(fromKey) || BigInt(0);
        traditionalBalances.set(fromKey, curr + pay.amountPaise);
      }
      if (toKey) {
        const curr = traditionalBalances.get(toKey) || BigInt(0);
        traditionalBalances.set(toKey, curr - pay.amountPaise);
      }
    }

    // Add write-offs and ledger adjustments to account for full transaction history
    for (const tx of group.ledgerTransactions) {
      if (tx.type === 'WRITEOFF' || tx.type === 'FX_ADJUSTMENT') {
        for (const entry of tx.entries) {
          const key = entry.guestMemberId ? `guest:${entry.guestMemberId}` : `user:${entry.userId}`;
          if (key) {
            const curr = traditionalBalances.get(key) || BigInt(0);
            if (entry.direction === 'CREDIT') {
              traditionalBalances.set(key, curr + entry.amountPaise);
            } else if (entry.direction === 'DEBIT') {
              traditionalBalances.set(key, curr - entry.amountPaise);
            }
          }
        }
      }
    }

    // Invariant 1: Sum of all member balances must equal 0
    let sumOfBalancesPaise = BigInt(0);
    for (const [, bal] of traditionalBalances.entries()) {
      sumOfBalancesPaise += bal;
    }

    if (sumOfBalancesPaise !== BigInt(0)) {
      discrepancies.push({
        type: 'ZERO_SUM_VIOLATION',
        details: `Sum of member balances (${sumOfBalancesPaise} paise) does not equal 0.`,
        diffPaise: sumOfBalancesPaise.toString()
      });
    }

    // Invariant 2: Total debits == Total credits across all ledger transactions in group
    let totalDebitsPaise = BigInt(0);
    let totalCreditsPaise = BigInt(0);

    for (const tx of group.ledgerTransactions) {
      let txDebits = BigInt(0);
      let txCredits = BigInt(0);

      for (const entry of tx.entries) {
        if (entry.direction === 'DEBIT') {
          txDebits += entry.amountPaise;
          totalDebitsPaise += entry.amountPaise;
        } else if (entry.direction === 'CREDIT') {
          txCredits += entry.amountPaise;
          totalCreditsPaise += entry.amountPaise;
        }
      }

      // Invariant 3: Transaction-level balance
      if (txDebits !== txCredits) {
        discrepancies.push({
          type: 'TRANSACTION_UNBALANCED',
          transactionId: tx.id,
          details: `Ledger transaction ${tx.id} (${tx.type}) is unbalanced: Debits ${txDebits} !== Credits ${txCredits}.`,
          diffPaise: (txDebits - txCredits).toString()
        });
      }
    }

    if (totalDebitsPaise !== totalCreditsPaise) {
      discrepancies.push({
        type: 'LEDGER_UNBALANCED',
        details: `Total group ledger debits (${totalDebitsPaise}) !== Total group ledger credits (${totalCreditsPaise}).`,
        diffPaise: (totalDebitsPaise - totalCreditsPaise).toString()
      });
    }

    // Invariant 4: Member balances derived from the ledger must equal traditional balances
    const ledgerCalc = await LedgerService.calculateLedgerBalances(groupId);
    const ledgerBalanceMap = new Map<string, bigint>();
    for (const b of ledgerCalc.balances) {
      ledgerBalanceMap.set(b.memberKey, b.netBalancePaise);
    }

    let memberMismatches = 0;
    for (const [key, tradBal] of traditionalBalances.entries()) {
      const ledgBal = ledgerBalanceMap.get(key) || BigInt(0);
      if (tradBal !== ledgBal) {
        memberMismatches++;
        discrepancies.push({
          type: 'MEMBER_BALANCE_MISMATCH',
          memberId: key,
          details: `Member ${key} balance mismatch: Traditional (${tradBal} paise) !== Ledger (${ledgBal} paise).`,
          diffPaise: (tradBal - ledgBal).toString()
        });
      }
    }

    const ledgerMatchesBalances = memberMismatches === 0;
    const isBalanced = discrepancies.length === 0;
    const status = isBalanced ? 'BALANCED' : 'DISCREPANCY_DETECTED';

    // Persist report in DB
    const report = await prisma.reconciliationReport.create({
      data: {
        groupId,
        status,
        triggeredBy: options?.triggeredBy || 'SYSTEM_NIGHTLY',
        adminUserId: options?.adminUserId || null,
        sumOfBalancesPaise,
        totalDebitsPaise,
        totalCreditsPaise,
        ledgerMatchesBalances,
        discrepancyCount: discrepancies.length,
        discrepancyDetails: discrepancies.length > 0 ? JSON.stringify(discrepancies) : null,
        checkedAt: new Date()
      }
    });

    return {
      groupId,
      groupName: group.name,
      status,
      sumOfBalancesPaise,
      totalDebitsPaise,
      totalCreditsPaise,
      ledgerMatchesBalances,
      discrepancies,
      reportId: report.id,
      checkedAt: report.checkedAt
    };
  }

  /**
   * Run reconciliation across all groups in the system (e.g. nightly cron)
   */
  static async reconcileAllGroups(options?: {
    triggeredBy?: string;
    adminUserId?: string;
  }): Promise<{
    totalGroups: number;
    balancedCount: number;
    discrepancyCount: number;
    results: ReconciliationResult[];
  }> {
    const groups = await prisma.group.findMany({
      select: { id: true, name: true }
    });

    const results: ReconciliationResult[] = [];
    let balancedCount = 0;
    let discrepancyCount = 0;

    for (const group of groups) {
      try {
        const res = await this.reconcileGroup(group.id, options);
        results.push(res);
        if (res.status === 'BALANCED') {
          balancedCount++;
        } else {
          discrepancyCount++;
        }
      } catch (err: any) {
        console.error(`[Reconciliation] Error reconciling group ${group.id}:`, err);
        discrepancyCount++;
      }
    }

    return {
      totalGroups: groups.length,
      balancedCount,
      discrepancyCount,
      results
    };
  }

  /**
   * Fetch historical reconciliation reports
   */
  static async getReports(groupId?: string, limit = 50) {
    return prisma.reconciliationReport.findMany({
      where: groupId ? { groupId } : undefined,
      orderBy: { checkedAt: 'desc' },
      take: limit,
      include: {
        group: { select: { id: true, name: true } },
        adminUser: { select: { id: true, fullName: true, email: true } }
      }
    });
  }
}
