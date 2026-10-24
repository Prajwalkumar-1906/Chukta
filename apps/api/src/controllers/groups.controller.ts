import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma.js';
import { AuthRequest } from '../middleware/auth.js';
import { simplifySettlements, MemberInfo, ExpenseInput } from '@settleup/settlement-engine';
import { LedgerService } from '../services/ledger.service.js';
import { ReconciliationService } from '../services/reconciliation.service.js';
import { io } from '../index.js';

const GroupType = { TRIP: 'TRIP', FLATMATES: 'FLATMATES', EVENT: 'EVENT', OFFICE: 'OFFICE', CUSTOM: 'CUSTOM' };
const Role = { ADMIN: 'ADMIN', MEMBER: 'MEMBER' };

const createGroupSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  type: z.string().default('TRIP'),
  baseCurrency: z.string().default('INR'),
  budgetRupees: z.number().optional()
});

const addMemberSchema = z.object({
  email: z.string().email().optional(),
  phone: z.string().optional(),
  isGuest: z.boolean().default(false),
  guestName: z.string().optional()
});

const claimGuestSchema = z.object({
  guestMemberId: z.string()
});

export async function createGroup(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const data = createGroupSchema.parse(req.body);

    const budgetPaise = data.budgetRupees ? BigInt(Math.round(data.budgetRupees * 100)) : null;

    const group = await prisma.group.create({
      data: {
        name: data.name,
        description: data.description,
        type: data.type,
        baseCurrency: data.baseCurrency,
        budgetPaise,
        createdById: userId,
        members: {
          create: {
            userId,
            role: Role.ADMIN
          }
        }
      },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, fullName: true, email: true, avatarUrl: true, upiId: true }
            }
          }
        }
      }
    });

    res.status(201).json({ group });
  } catch (err) {
    next(err);
  }
}

export async function getUserGroups(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;

    const members = await prisma.groupMember.findMany({
      where: { userId },
      include: {
        group: {
          include: {
            members: {
              include: {
                user: {
                  select: { id: true, fullName: true, email: true, avatarUrl: true }
                }
              }
            },
            expenses: {
              select: { totalAmount: true }
            }
          }
        }
      },
      orderBy: { joinedAt: 'desc' }
    });

    const groups = members.map(m => {
      const g = m.group;
      const totalSpentPaise = g.expenses.reduce((sum, e) => sum + Number(e.totalAmount), 0);
      return {
        id: g.id,
        name: g.name,
        description: g.description,
        type: g.type,
        baseCurrency: g.baseCurrency,
        budgetPaise: g.budgetPaise ? Number(g.budgetPaise) : null,
        memberCount: g.members.length,
        members: g.members,
        totalSpentPaise,
        createdAt: g.createdAt
      };
    });

    res.json({ groups });
  } catch (err) {
    next(err);
  }
}

export async function getGroupById(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    const membership = await prisma.groupMember.findFirst({
      where: { groupId: id, userId }
    });

    if (!membership) {
      return res.status(403).json({ error: 'Access denied to this group.' });
    }

    const group = await prisma.group.findUnique({
      where: { id },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, fullName: true, email: true, avatarUrl: true, upiId: true, phone: true }
            }
          }
        },
        createdBy: {
          select: { id: true, fullName: true, email: true }
        }
      }
    });

    if (!group) {
      return res.status(404).json({ error: 'Group not found.' });
    }

    res.json({ group });
  } catch (err) {
    next(err);
  }
}

export async function addMember(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;
    const data = addMemberSchema.parse(req.body);

    const membership = await prisma.groupMember.findFirst({
      where: { groupId: id, userId }
    });

    if (!membership) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    if (data.isGuest) {
      if (!data.guestName) {
        return res.status(400).json({ error: 'Guest name is required.' });
      }

      const guestMember = await prisma.groupMember.create({
        data: {
          groupId: id,
          isGuest: true,
          guestName: data.guestName,
          guestEmail: data.email,
          role: Role.MEMBER
        }
      });

      return res.status(201).json({ member: guestMember });
    }

    if (data.email) {
      const user = await prisma.user.findUnique({ where: { email: data.email } });
      if (!user) {
        // Create guest member for non-registered email
        const guestMember = await prisma.groupMember.create({
          data: {
            groupId: id,
            isGuest: true,
            guestName: data.email.split('@')[0],
            guestEmail: data.email,
            role: Role.MEMBER
          }
        });
        return res.status(201).json({ member: guestMember, note: 'Added as guest member pending registration.' });
      }

      const existingMember = await prisma.groupMember.findFirst({
        where: { groupId: id, userId: user.id }
      });

      if (existingMember) {
        return res.status(400).json({ error: 'User is already a member of this group.' });
      }

      const member = await prisma.groupMember.create({
        data: {
          groupId: id,
          userId: user.id,
          role: Role.MEMBER
        },
        include: {
          user: { select: { id: true, fullName: true, email: true, avatarUrl: true } }
        }
      });

      return res.status(201).json({ member });
    }

    res.status(400).json({ error: 'Must provide either an email or guest name.' });
  } catch (err) {
    next(err);
  }
}

export async function claimGuestProfile(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const { guestMemberId } = claimGuestSchema.parse(req.body);

    const guestMember = await prisma.groupMember.findUnique({
      where: { id: guestMemberId }
    });

    if (!guestMember || !guestMember.isGuest) {
      return res.status(400).json({ error: 'Invalid guest member.' });
    }

    // Update guest member to point to logged in user
    const updated = await prisma.groupMember.update({
      where: { id: guestMemberId },
      data: {
        userId,
        isGuest: false
      },
      include: {
        user: { select: { id: true, fullName: true, email: true, avatarUrl: true } }
      }
    });

    res.json({ message: 'Profile claimed successfully', member: updated });
  } catch (err) {
    next(err);
  }
}

export async function getGroupBalances(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    const membership = await prisma.groupMember.findFirst({
      where: { groupId: id, userId }
    });

    if (!membership) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const group = await prisma.group.findUnique({
      where: { id },
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
        }
      }
    });

    if (!group) {
      return res.status(404).json({ error: 'Group not found.' });
    }

    // Format members for settlement engine
    const engineMembers: MemberInfo[] = group.members.map(m => ({
      id: m.isGuest ? m.id : m.userId!,
      name: m.isGuest ? (m.guestName || 'Guest') : (m.user?.fullName || 'User')
    }));

    // Format expenses
    const engineExpenses: ExpenseInput[] = group.expenses.map(exp => ({
      id: exp.id,
      description: exp.title,
      currency: exp.currency,
      fxRate: exp.fxRate,
      payers: exp.payers.map(p => ({
        memberId: p.userId || p.guestMemberId!,
        amountPaise: Number(p.amountPaise)
      })),
      splits: exp.splits.map(s => ({
        memberId: s.userId || s.guestMemberId!,
        amountPaise: Number(s.amountPaise)
      }))
    }));

    // Format existing confirmed payments
    const existingPayments = group.payments.map(p => ({
      fromMemberId: p.fromUserId || p.fromGuestId!,
      toMemberId: p.toUserId || p.toGuestId!,
      amountPaise: Number(p.amountPaise)
    }));

    const plan = simplifySettlements(engineMembers, engineExpenses, existingPayments);
    const ledgerResult = await LedgerService.calculateLedgerBalances(id);

    res.json({
      groupId: id,
      baseCurrency: group.baseCurrency,
      settlementPlan: plan,
      ledger: {
        isBalanced: ledgerResult.isBalanced,
        totalDebitsPaise: ledgerResult.totalDebits.toString(),
        totalCreditsPaise: ledgerResult.totalCredits.toString(),
        balances: ledgerResult.balances.map(b => ({
          memberKey: b.memberKey,
          userId: b.userId,
          guestMemberId: b.guestMemberId,
          name: b.name,
          totalDebitsPaise: b.totalDebitsPaise.toString(),
          totalCreditsPaise: b.totalCreditsPaise.toString(),
          netBalancePaise: b.netBalancePaise.toString()
        }))
      }
    });
  } catch (err) {
    next(err);
  }
}

const writeOffSchema = z.object({
  creditorUserId: z.string().optional(),
  creditorGuestId: z.string().optional(),
  debtorUserId: z.string().optional(),
  debtorGuestId: z.string().optional(),
  amountRupees: z.number().positive(),
  description: z.string().optional()
});

export async function recordWriteOff(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const { id: groupId } = req.params;
    const data = writeOffSchema.parse(req.body);

    const membership = await prisma.groupMember.findFirst({
      where: { groupId, userId }
    });

    if (!membership) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const amountPaise = BigInt(Math.round(data.amountRupees * 100));

    const ledgerTx = await prisma.$transaction(async (tx) => {
      const lTx = await LedgerService.postWriteOffToLedger(tx, {
        groupId,
        creditorUserId: data.creditorUserId,
        creditorGuestId: data.creditorGuestId,
        debtorUserId: data.debtorUserId,
        debtorGuestId: data.debtorGuestId,
        amountPaise,
        description: data.description || 'Debt write-off'
      });

      await tx.auditLog.create({
        data: {
          groupId,
          userId,
          action: 'WRITE_OFF',
          entityType: 'LEDGER',
          entityId: lTx.id,
          details: JSON.stringify({ amountRupees: data.amountRupees, description: data.description })
        }
      });

      return lTx;
    });

    io.to(`group:${groupId}`).emit('writeoff:recorded', {
      groupId,
      amountRupees: data.amountRupees,
      description: data.description
    });

    res.status(201).json({
      message: 'Write-off recorded successfully in ledger',
      transaction: {
        id: ledgerTx.id,
        type: ledgerTx.type,
        amountPaise: amountPaise.toString()
      }
    });
  } catch (err) {
    next(err);
  }
}

const fxAdjustmentSchema = z.object({
  currency: z.string().min(1),
  description: z.string().optional(),
  entries: z.array(z.object({
    userId: z.string().optional(),
    guestMemberId: z.string().optional(),
    direction: z.enum(['DEBIT', 'CREDIT']),
    amountRupees: z.number().positive()
  })).min(2)
});

export async function recordFxAdjustment(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const { id: groupId } = req.params;
    const data = fxAdjustmentSchema.parse(req.body);

    const membership = await prisma.groupMember.findFirst({
      where: { groupId, userId }
    });

    if (!membership) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const entries = data.entries.map(e => ({
      userId: e.userId,
      guestMemberId: e.guestMemberId,
      direction: e.direction,
      amountPaise: BigInt(Math.round(e.amountRupees * 100))
    }));

    const ledgerTx = await prisma.$transaction(async (tx) => {
      const lTx = await LedgerService.postFxAdjustmentToLedger(tx, {
        groupId,
        currency: data.currency,
        description: data.description,
        entries
      });

      await tx.auditLog.create({
        data: {
          groupId,
          userId,
          action: 'FX_ADJUSTMENT',
          entityType: 'LEDGER',
          entityId: lTx.id,
          details: JSON.stringify({ currency: data.currency, description: data.description })
        }
      });

      return lTx;
    });

    res.status(201).json({
      message: 'FX adjustment recorded successfully in ledger',
      transaction: {
        id: ledgerTx.id,
        type: ledgerTx.type,
        currency: ledgerTx.currency
      }
    });
  } catch (err) {
    next(err);
  }
}

export async function getGroupLedger(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const { id: groupId } = req.params;

    const membership = await prisma.groupMember.findFirst({
      where: { groupId, userId }
    });

    if (!membership) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const transactions = await prisma.ledgerTransaction.findMany({
      where: { groupId },
      include: {
        entries: {
          include: {
            user: { select: { id: true, fullName: true } },
            guestMember: { select: { id: true, guestName: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const ledgerCalc = await LedgerService.calculateLedgerBalances(groupId);

    res.json({
      groupId,
      isBalanced: ledgerCalc.isBalanced,
      totalDebitsPaise: ledgerCalc.totalDebits.toString(),
      totalCreditsPaise: ledgerCalc.totalCredits.toString(),
      balances: ledgerCalc.balances.map(b => ({
        memberKey: b.memberKey,
        userId: b.userId,
        guestMemberId: b.guestMemberId,
        name: b.name,
        totalDebitsPaise: b.totalDebitsPaise.toString(),
        totalCreditsPaise: b.totalCreditsPaise.toString(),
        netBalancePaise: b.netBalancePaise.toString()
      })),
      transactions: transactions.map(tx => ({
        id: tx.id,
        type: tx.type,
        description: tx.description,
        currency: tx.currency,
        referenceId: tx.referenceId,
        createdAt: tx.createdAt,
        entries: tx.entries.map(e => ({
          id: e.id,
          userId: e.userId,
          guestMemberId: e.guestMemberId,
          memberName: e.guestMember?.guestName || e.user?.fullName || 'Member',
          direction: e.direction,
          amountPaise: e.amountPaise.toString()
        }))
      }))
    });
  } catch (err) {
    next(err);
  }
}

export async function reconcileGroupEndpoint(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const { id: groupId } = req.params;

    const membership = await prisma.groupMember.findFirst({
      where: { groupId, userId }
    });

    if (!membership) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const result = await ReconciliationService.reconcileGroup(groupId, {
      triggeredBy: 'ADMIN_MANUAL',
      adminUserId: userId
    });

    res.json({
      reconciliation: {
        ...result,
        sumOfBalancesPaise: result.sumOfBalancesPaise.toString(),
        totalDebitsPaise: result.totalDebitsPaise.toString(),
        totalCreditsPaise: result.totalCreditsPaise.toString()
      }
    });
  } catch (err) {
    next(err);
  }
}
