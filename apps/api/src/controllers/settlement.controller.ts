import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma.js';
import { AuthRequest } from '../middleware/auth.js';
import { io } from '../index.js';

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

    const payment = await prisma.payment.create({
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

    const updated = await prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: 'CONFIRMED',
        confirmedAt: new Date()
      }
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
