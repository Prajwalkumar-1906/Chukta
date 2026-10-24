import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma.js';
import { AuthRequest } from '../middleware/auth.js';
import { io } from '../index.js';
import { LedgerService } from '../services/ledger.service.js';

const payerSchema = z.object({
  userId: z.string().optional(),
  guestMemberId: z.string().optional(),
  amountRupees: z.number().positive()
});

const splitSchema = z.object({
  userId: z.string().optional(),
  guestMemberId: z.string().optional(),
  amountRupees: z.number().nonnegative(),
  percentage: z.number().optional(),
  shares: z.number().optional(),
  daysStayed: z.number().optional()
});

const itemSchema = z.object({
  title: z.string(),
  amountRupees: z.number().positive(),
  assignedUserId: z.string().optional(),
  assignedGuestId: z.string().optional()
});

const createExpenseSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  totalAmountRupees: z.number().positive(),
  currency: z.string().default('INR'),
  fxRate: z.number().default(1.0),
  splitMode: z.string().default('EQUAL'),
  category: z.string().default('general'),
  receiptUrl: z.string().optional(),
  location: z.string().optional(),
  visibilityDate: z.string().optional(),
  payers: z.array(payerSchema).min(1),
  splits: z.array(splitSchema).min(1),
  items: z.array(itemSchema).optional()
});

export async function createExpense(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const { id: groupId } = req.params;
    const data = createExpenseSchema.parse(req.body);

    const membership = await prisma.groupMember.findFirst({
      where: { groupId, userId }
    });

    if (!membership) {
      return res.status(403).json({ error: 'Access denied to this group.' });
    }

    const totalPaise = BigInt(Math.round(data.totalAmountRupees * 100));

    // Validate payer amounts sum to total amount
    const payersTotalRupees = data.payers.reduce((sum, p) => sum + p.amountRupees, 0);
    if (Math.abs(payersTotalRupees - data.totalAmountRupees) > 0.05) {
      return res.status(400).json({ error: 'Total payer amounts must equal total expense amount.' });
    }

    // Execute atomic multi-row write transaction
    const expense = await prisma.$transaction(async (tx) => {
      const exp = await tx.expense.create({
        data: {
          groupId,
          title: data.title,
          description: data.description,
          totalAmount: totalPaise,
          currency: data.currency,
          fxRate: data.fxRate,
          splitMode: data.splitMode,
          category: data.category,
          receiptUrl: data.receiptUrl,
          location: data.location,
          visibilityDate: data.visibilityDate ? new Date(data.visibilityDate) : null,
          createdById: userId
        }
      });

      // Payers
      for (const p of data.payers) {
        await tx.expensePayer.create({
          data: {
            expenseId: exp.id,
            userId: p.userId,
            guestMemberId: p.guestMemberId,
            amountPaise: BigInt(Math.round(p.amountRupees * 100))
          }
        });
      }

      // Splits
      for (const s of data.splits) {
        await tx.expenseSplit.create({
          data: {
            expenseId: exp.id,
            userId: s.userId,
            guestMemberId: s.guestMemberId,
            amountPaise: BigInt(Math.round(s.amountRupees * 100)),
            percentage: s.percentage,
            shares: s.shares,
            daysStayed: s.daysStayed
          }
        });
      }

      // Items (for ITEMIZED mode)
      if (data.items && data.items.length > 0) {
        for (const item of data.items) {
          await tx.expenseItem.create({
            data: {
              expenseId: exp.id,
              title: item.title,
              amountPaise: BigInt(Math.round(item.amountRupees * 100)),
              assignedUserId: item.assignedUserId,
              assignedGuestId: item.assignedGuestId
            }
          });
        }
      }

      // Double-Entry Ledger: Balanced posting inside the same DB transaction
      await LedgerService.postExpenseToLedger(tx, exp.id, {
        groupId,
        title: data.title,
        currency: data.currency,
        totalAmountPaise: totalPaise,
        payers: data.payers.map((p) => ({
          userId: p.userId,
          guestMemberId: p.guestMemberId,
          amountPaise: BigInt(Math.round(p.amountRupees * 100))
        })),
        splits: data.splits.map((s) => ({
          userId: s.userId,
          guestMemberId: s.guestMemberId,
          amountPaise: BigInt(Math.round(s.amountRupees * 100))
        }))
      });

      // Audit Log
      await tx.auditLog.create({
        data: {
          groupId,
          userId,
          action: 'CREATE_EXPENSE',
          entityType: 'EXPENSE',
          entityId: exp.id,
          details: JSON.stringify({ title: data.title, amount: data.totalAmountRupees })
        }
      });

      return exp;
    });

    // Realtime Broadcast via Socket.IO
    io.to(`group:${groupId}`).emit('expense:created', {
      expenseId: expense.id,
      groupId,
      title: data.title,
      amountRupees: data.totalAmountRupees
    });

    res.status(201).json({ expense });
  } catch (err) {
    next(err);
  }
}

export async function getGroupExpenses(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const { id: groupId } = req.params;

    const membership = await prisma.groupMember.findFirst({
      where: { groupId, userId }
    });

    if (!membership) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const expenses = await prisma.expense.findMany({
      where: { groupId },
      include: {
        createdBy: {
          select: { id: true, fullName: true, avatarUrl: true }
        },
        payers: {
          include: {
            user: { select: { id: true, fullName: true, avatarUrl: true } },
            guestMember: { select: { id: true, guestName: true } }
          }
        },
        splits: {
          include: {
            user: { select: { id: true, fullName: true, avatarUrl: true } },
            guestMember: { select: { id: true, guestName: true } }
          }
        },
        items: true,
        comments: {
          include: { user: { select: { id: true, fullName: true, avatarUrl: true } } }
        },
        reactions: {
          include: { user: { select: { id: true, fullName: true } } }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ expenses });
  } catch (err) {
    next(err);
  }
}

export async function deleteExpense(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const { expenseId } = req.params;

    const expense = await prisma.expense.findUnique({
      where: { id: expenseId }
    });

    if (!expense) {
      return res.status(404).json({ error: 'Expense not found.' });
    }

    const membership = await prisma.groupMember.findFirst({
      where: { groupId: expense.groupId, userId }
    });

    if (!membership) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    await prisma.$transaction(async (tx) => {
      await LedgerService.revertLedgerTransaction(tx, expenseId);
      await tx.expense.delete({ where: { id: expenseId } });

      await tx.auditLog.create({
        data: {
          groupId: expense.groupId,
          userId,
          action: 'DELETE_EXPENSE',
          entityType: 'EXPENSE',
          entityId: expenseId,
          details: JSON.stringify({ title: expense.title, amount: Number(expense.totalAmount) })
        }
      });
    });

    // Broadcast realtime event
    io.to(`group:${expense.groupId}`).emit('expense:deleted', {
      expenseId,
      groupId: expense.groupId
    });

    res.json({ message: 'Expense deleted successfully', deletedExpense: expense });
  } catch (err) {
    next(err);
  }
}
