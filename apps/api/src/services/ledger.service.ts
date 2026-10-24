import { Prisma } from '@prisma/client';
import { prisma } from '../db/prisma.js';

export interface LedgerEntryInput {
  userId?: string | null;
  guestMemberId?: string | null;
  direction: 'DEBIT' | 'CREDIT';
  amountPaise: bigint;
}

export interface PostTransactionInput {
  groupId: string;
  type: 'EXPENSE' | 'PAYMENT' | 'WRITEOFF' | 'FX_ADJUSTMENT';
  referenceId?: string | null;
  description?: string | null;
  currency?: string;
  entries: LedgerEntryInput[];
}

export interface MemberLedgerBalance {
  memberKey: string; // "user:<id>" or "guest:<id>"
  userId: string | null;
  guestMemberId: string | null;
  name: string;
  totalDebitsPaise: bigint;
  totalCreditsPaise: bigint;
  netBalancePaise: bigint; // Positive = owed money, Negative = owes money
}

export class LedgerService {
  /**
   * Post a balanced ledger transaction inside an existing Prisma transaction or standalone
   */
  static async postTransaction(
    tx: Prisma.TransactionClient,
    input: PostTransactionInput
  ) {
    const currency = input.currency || 'INR';

    // Verify Invariant: Debits must strictly equal Credits
    let totalDebits = BigInt(0);
    let totalCredits = BigInt(0);

    for (const entry of input.entries) {
      if (entry.amountPaise <= BigInt(0)) {
        throw new Error(`Ledger entry amount must be positive. Got: ${entry.amountPaise}`);
      }
      if (entry.direction === 'DEBIT') {
        totalDebits += entry.amountPaise;
      } else if (entry.direction === 'CREDIT') {
        totalCredits += entry.amountPaise;
      } else {
        throw new Error(`Invalid ledger entry direction: ${entry.direction}`);
      }
    }

    if (totalDebits !== totalCredits) {
      throw new Error(
        `Unbalanced ledger transaction for group ${input.groupId}: Total Debits (${totalDebits} paise) must equal Total Credits (${totalCredits} paise).`
      );
    }

    // Create the LedgerTransaction
    const ledgerTx = await tx.ledgerTransaction.create({
      data: {
        groupId: input.groupId,
        type: input.type,
        referenceId: input.referenceId,
        description: input.description,
        currency,
        entries: {
          create: input.entries.map((e) => ({
            userId: e.userId || null,
            guestMemberId: e.guestMemberId || null,
            direction: e.direction,
            amountPaise: e.amountPaise
          }))
        }
      },
      include: {
        entries: true
      }
    });

    return ledgerTx;
  }

  /**
   * Post balanced ledger entries for an Expense
   * Payers get CREDIT (they are owed money by the group)
   * Split recipients get DEBIT (they owe their share to the group)
   * Debits === Credits === Total Expense Amount
   */
  static async postExpenseToLedger(
    tx: Prisma.TransactionClient,
    expenseId: string,
    data: {
      groupId: string;
      title: string;
      currency: string;
      totalAmountPaise: bigint;
      payers: { userId?: string | null; guestMemberId?: string | null; amountPaise: bigint }[];
      splits: { userId?: string | null; guestMemberId?: string | null; amountPaise: bigint }[];
    }
  ) {
    const entries: LedgerEntryInput[] = [];

    // Payers: CREDIT
    for (const p of data.payers) {
      entries.push({
        userId: p.userId,
        guestMemberId: p.guestMemberId,
        direction: 'CREDIT',
        amountPaise: p.amountPaise
      });
    }

    // Splits: DEBIT
    for (const s of data.splits) {
      entries.push({
        userId: s.userId,
        guestMemberId: s.guestMemberId,
        direction: 'DEBIT',
        amountPaise: s.amountPaise
      });
    }

    return this.postTransaction(tx, {
      groupId: data.groupId,
      type: 'EXPENSE',
      referenceId: expenseId,
      description: `Expense: ${data.title}`,
      currency: data.currency,
      entries
    });
  }

  /**
   * Post balanced ledger entries for a Payment
   * From (payer) gets CREDIT (settling their debt)
   * To (recipient) gets DEBIT (receiving the money owed)
   * Debit === Credit === Payment Amount
   */
  static async postPaymentToLedger(
    tx: Prisma.TransactionClient,
    paymentId: string,
    data: {
      groupId: string;
      amountPaise: bigint;
      currency?: string;
      fromUserId?: string | null;
      fromGuestId?: string | null;
      toUserId?: string | null;
      toGuestId?: string | null;
      description?: string | null;
    }
  ) {
    const entries: LedgerEntryInput[] = [
      {
        userId: data.fromUserId,
        guestMemberId: data.fromGuestId,
        direction: 'CREDIT',
        amountPaise: data.amountPaise
      },
      {
        userId: data.toUserId,
        guestMemberId: data.toGuestId,
        direction: 'DEBIT',
        amountPaise: data.amountPaise
      }
    ];

    return this.postTransaction(tx, {
      groupId: data.groupId,
      type: 'PAYMENT',
      referenceId: paymentId,
      description: data.description || 'Payment settlement',
      currency: data.currency || 'INR',
      entries
    });
  }

  /**
   * Post balanced ledger entries for a Write-off
   * Creditor forfeits claim: DEBIT
   * Debtor is forgiven: CREDIT
   * Debit === Credit === Amount
   */
  static async postWriteOffToLedger(
    tx: Prisma.TransactionClient,
    data: {
      groupId: string;
      creditorUserId?: string | null;
      creditorGuestId?: string | null;
      debtorUserId?: string | null;
      debtorGuestId?: string | null;
      amountPaise: bigint;
      currency?: string;
      description?: string;
    }
  ) {
    const entries: LedgerEntryInput[] = [
      {
        userId: data.creditorUserId,
        guestMemberId: data.creditorGuestId,
        direction: 'DEBIT',
        amountPaise: data.amountPaise
      },
      {
        userId: data.debtorUserId,
        guestMemberId: data.debtorGuestId,
        direction: 'CREDIT',
        amountPaise: data.amountPaise
      }
    ];

    return this.postTransaction(tx, {
      groupId: data.groupId,
      type: 'WRITEOFF',
      description: data.description || 'Debt write-off',
      currency: data.currency || 'INR',
      entries
    });
  }

  /**
   * Post balanced ledger entries for an FX Adjustment
   */
  static async postFxAdjustmentToLedger(
    tx: Prisma.TransactionClient,
    data: {
      groupId: string;
      referenceId?: string;
      currency: string;
      description?: string;
      entries: LedgerEntryInput[];
    }
  ) {
    return this.postTransaction(tx, {
      groupId: data.groupId,
      type: 'FX_ADJUSTMENT',
      referenceId: data.referenceId,
      description: data.description || 'FX rate adjustment',
      currency: data.currency,
      entries: data.entries
    });
  }

  /**
   * Revert / delete ledger transactions when an expense or payment is deleted
   */
  static async revertLedgerTransaction(
    tx: Prisma.TransactionClient,
    referenceId: string
  ) {
    return tx.ledgerTransaction.deleteMany({
      where: { referenceId }
    });
  }

  /**
   * Calculate member balances derived strictly from the double-entry ledger.
   * Net Balance = Total Credits - Total Debits.
   */
  static async calculateLedgerBalances(
    groupId: string,
    currency?: string
  ): Promise<{
    balances: MemberLedgerBalance[];
    totalDebits: bigint;
    totalCredits: bigint;
    isBalanced: boolean;
  }> {
    // Ensure legacy expenses or confirmed payments are backfilled to the ledger
    await this.backfillLedgerForGroup(groupId);

    const whereClause: Prisma.LedgerTransactionWhereInput = { groupId };
    if (currency) {
      whereClause.currency = currency;
    }

    const transactions = await prisma.ledgerTransaction.findMany({
      where: whereClause,
      include: {
        entries: {
          include: {
            user: { select: { id: true, fullName: true } },
            guestMember: { select: { id: true, guestName: true } }
          }
        }
      }
    });

    const members = await prisma.groupMember.findMany({
      where: { groupId },
      include: {
        user: { select: { id: true, fullName: true } }
      }
    });

    // Map member key -> balances
    const balanceMap = new Map<string, MemberLedgerBalance>();

    for (const m of members) {
      const key = m.isGuest ? `guest:${m.id}` : `user:${m.userId}`;
      const name = m.isGuest ? (m.guestName || 'Guest') : (m.user?.fullName || 'User');
      balanceMap.set(key, {
        memberKey: key,
        userId: m.userId,
        guestMemberId: m.isGuest ? m.id : null,
        name,
        totalDebitsPaise: BigInt(0),
        totalCreditsPaise: BigInt(0),
        netBalancePaise: BigInt(0)
      });
    }

    let overallDebits = BigInt(0);
    let overallCredits = BigInt(0);

    for (const tx of transactions) {
      for (const entry of tx.entries) {
        const key = entry.guestMemberId
          ? `guest:${entry.guestMemberId}`
          : entry.userId
          ? `user:${entry.userId}`
          : null;

        if (!key) continue;

        let record = balanceMap.get(key);
        if (!record) {
          const name = entry.guestMember?.guestName || entry.user?.fullName || 'Member';
          record = {
            memberKey: key,
            userId: entry.userId,
            guestMemberId: entry.guestMemberId,
            name,
            totalDebitsPaise: BigInt(0),
            totalCreditsPaise: BigInt(0),
            netBalancePaise: BigInt(0)
          };
          balanceMap.set(key, record);
        }

        if (entry.direction === 'DEBIT') {
          record.totalDebitsPaise += entry.amountPaise;
          overallDebits += entry.amountPaise;
        } else if (entry.direction === 'CREDIT') {
          record.totalCreditsPaise += entry.amountPaise;
          overallCredits += entry.amountPaise;
        }
      }
    }

    // Calculate net balance for each member
    const balances = Array.from(balanceMap.values()).map((b) => {
      b.netBalancePaise = b.totalCreditsPaise - b.totalDebitsPaise;
      return b;
    });

    const isBalanced = overallDebits === overallCredits;

    return {
      balances,
      totalDebits: overallDebits,
      totalCredits: overallCredits,
      isBalanced
    };
  }

  /**
   * Backfill double-entry ledger transactions for pre-existing expenses and payments
   * that were created before ledger tracking was enabled.
   */
  static async backfillLedgerForGroup(groupId: string): Promise<{
    backfilledExpenses: number;
    backfilledPayments: number;
  }> {
    let backfilledExpenses = 0;
    let backfilledPayments = 0;

    await prisma.$transaction(async (tx) => {
      // 1. Backfill expenses
      const expenses = await tx.expense.findMany({
        where: { groupId },
        include: {
          payers: true,
          splits: true
        }
      });

      for (const exp of expenses) {
        const existingTx = await tx.ledgerTransaction.findFirst({
          where: { referenceId: exp.id }
        });

        if (!existingTx && exp.payers.length > 0 && exp.splits.length > 0) {
          const payerSum = exp.payers.reduce((sum, p) => sum + p.amountPaise, BigInt(0));
          const splitSum = exp.splits.reduce((sum, s) => sum + s.amountPaise, BigInt(0));

          if (payerSum === splitSum && payerSum > BigInt(0)) {
            await this.postExpenseToLedger(tx, exp.id, {
              groupId,
              title: exp.title,
              currency: exp.currency,
              totalAmountPaise: exp.totalAmount,
              payers: exp.payers.map((p) => ({
                userId: p.userId,
                guestMemberId: p.guestMemberId,
                amountPaise: p.amountPaise
              })),
              splits: exp.splits.map((s) => ({
                userId: s.userId,
                guestMemberId: s.guestMemberId,
                amountPaise: s.amountPaise
              }))
            });
            backfilledExpenses++;
          }
        }
      }

      // 2. Backfill confirmed payments
      const payments = await tx.payment.findMany({
        where: { groupId, status: 'CONFIRMED' }
      });

      for (const pay of payments) {
        const existingTx = await tx.ledgerTransaction.findFirst({
          where: { referenceId: pay.id }
        });

        if (!existingTx) {
          await this.postPaymentToLedger(tx, pay.id, {
            groupId,
            amountPaise: pay.amountPaise,
            fromUserId: pay.fromUserId,
            fromGuestId: pay.fromGuestId,
            toUserId: pay.toUserId,
            toGuestId: pay.toGuestId,
            description: pay.upiTxnId ? `Payment via UPI (${pay.upiTxnId})` : 'Settlement payment'
          });
          backfilledPayments++;
        }
      }
    });

    return { backfilledExpenses, backfilledPayments };
  }
}
