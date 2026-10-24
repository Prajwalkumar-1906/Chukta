import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma.js';
import { AuthRequest } from '../middleware/auth.js';
import { io } from '../index.js';
import { LedgerService } from '../services/ledger.service.js';

const recordPaymentSchema = z.object({
  groupId: z.string(),
  toUserId: z.string().optional(),
  toGuestId: z.string().optional(),
  amountRupees: z.number().positive(),
  upiTxnId: z.string().optional(),
  idempotencyKey: z.string().optional()
});

export async function createSettlement(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const { groupId } = req.body;

    const membership = await prisma.groupMember.findFirst({
      where: { groupId, userId }
    });

    if (!membership) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const settlement = await prisma.settlement.create({
      data: {
        groupId,
        createdById: userId,
        status: 'PENDING'
      }
    });

    res.status(201).json({ settlement });
  } catch (err) {
    next(err);
  }
}

export async function recordPayment(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const data = recordPaymentSchema.parse(req.body);

    const membership = await prisma.groupMember.findFirst({
      where: { groupId: data.groupId, userId }
    });

    if (!membership) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const amountPaise = BigInt(Math.round(data.amountRupees * 100));

    // Check idempotency if key provided
    if (data.idempotencyKey) {
      const existing = await prisma.payment.findFirst({
        where: { upiTxnId: data.idempotencyKey }
      });
      if (existing) {
        return res.json({ payment: existing, duplicate: true });
      }
    }

    const payment = await prisma.$transaction(async (tx) => {
      const p = await tx.payment.create({
        data: {
          groupId: data.groupId,
          fromUserId: userId,
          toUserId: data.toUserId,
          toGuestId: data.toGuestId,
          amountPaise,
          upiTxnId: data.upiTxnId || data.idempotencyKey,
          status: 'CONFIRMED', // Auto confirm in dev mock flow
          confirmedAt: new Date()
        },
        include: {
          fromUser: { select: { id: true, fullName: true } },
          toUser: { select: { id: true, fullName: true, upiId: true } }
        }
      });

      // Double-Entry Ledger: Balanced posting inside the same DB transaction
      await LedgerService.postPaymentToLedger(tx, p.id, {
        groupId: data.groupId,
        amountPaise,
        fromUserId: userId,
        toUserId: data.toUserId,
        toGuestId: data.toGuestId,
        description: data.upiTxnId ? `Payment via UPI (${data.upiTxnId})` : 'Settlement payment'
      });

      // Audit Log
      await tx.auditLog.create({
        data: {
          groupId: data.groupId,
          userId,
          action: 'RECORD_PAYMENT',
          entityType: 'PAYMENT',
          entityId: p.id,
          details: JSON.stringify({ amount: data.amountRupees, toUserId: data.toUserId, toGuestId: data.toGuestId })
        }
      });

      return p;
    });

    // Realtime Broadcast
    io.to(`group:${data.groupId}`).emit('payment:recorded', {
      paymentId: payment.id,
      groupId: data.groupId,
      fromName: payment.fromUser?.fullName,
      toName: payment.toUser?.fullName,
      amountRupees: data.amountRupees
    });

    res.status(201).json({ payment });
  } catch (err) {
    next(err);
  }
}

export async function confirmPayment(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const { paymentId } = req.params;

    const payment = await prisma.payment.findUnique({
      where: { id: paymentId }
    });

    if (!payment) {
      return res.status(404).json({ error: 'Payment record not found.' });
    }

    if (payment.toUserId !== userId) {
      return res.status(403).json({ error: 'Only the recipient can confirm this payment.' });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const p = await tx.payment.update({
        where: { id: paymentId },
        data: {
          status: 'CONFIRMED',
          confirmedAt: new Date()
        }
      });

      // Check if ledger transaction exists; if not, post it!
      const existingLedger = await tx.ledgerTransaction.findFirst({
        where: { referenceId: paymentId }
      });

      if (!existingLedger) {
        await LedgerService.postPaymentToLedger(tx, paymentId, {
          groupId: p.groupId,
          amountPaise: p.amountPaise,
          fromUserId: p.fromUserId,
          fromGuestId: p.fromGuestId,
          toUserId: p.toUserId,
          toGuestId: p.toGuestId,
          description: p.upiTxnId ? `Payment via UPI (${p.upiTxnId})` : 'Settlement payment'
        });
      }

      return p;
    });

    io.to(`group:${payment.groupId}`).emit('payment:confirmed', {
      paymentId,
      groupId: payment.groupId
    });

    res.json({ payment: updated });
  } catch (err) {
    next(err);
  }
}
