import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth.js';
import { ReconciliationService } from '../services/reconciliation.service.js';
import { LedgerService } from '../services/ledger.service.js';
import { prisma } from '../db/prisma.js';

const triggerReconcileSchema = z.object({
  groupId: z.string().optional()
});

export async function triggerReconciliation(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const adminUserId = req.user!.userId;
    const { groupId } = triggerReconcileSchema.parse(req.body);

    if (groupId) {
      const result = await ReconciliationService.reconcileGroup(groupId, {
        triggeredBy: 'ADMIN_MANUAL',
        adminUserId
      });

      return res.json({
        message: `Reconciliation completed for group ${groupId}`,
        result: {
          ...result,
          sumOfBalancesPaise: result.sumOfBalancesPaise.toString(),
          totalDebitsPaise: result.totalDebitsPaise.toString(),
          totalCreditsPaise: result.totalCreditsPaise.toString()
        }
      });
    }

    const summary = await ReconciliationService.reconcileAllGroups({
      triggeredBy: 'ADMIN_MANUAL',
      adminUserId
    });

    res.json({
      message: `Reconciliation completed across all groups.`,
      summary: {
        totalGroups: summary.totalGroups,
        balancedCount: summary.balancedCount,
        discrepancyCount: summary.discrepancyCount,
        results: summary.results.map((r) => ({
          ...r,
          sumOfBalancesPaise: r.sumOfBalancesPaise.toString(),
          totalDebitsPaise: r.totalDebitsPaise.toString(),
          totalCreditsPaise: r.totalCreditsPaise.toString()
        }))
      }
    });
  } catch (err) {
    next(err);
  }
}

export async function getReconciliationReports(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const groupId = req.query.groupId as string | undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;

    const reports = await ReconciliationService.getReports(groupId, limit);

    res.json({
      reports: reports.map((r) => ({
        id: r.id,
        groupId: r.groupId,
        groupName: r.group?.name,
        status: r.status,
        triggeredBy: r.triggeredBy,
        adminUser: r.adminUser ? { id: r.adminUser.id, fullName: r.adminUser.fullName } : null,
        sumOfBalancesPaise: r.sumOfBalancesPaise.toString(),
        totalDebitsPaise: r.totalDebitsPaise.toString(),
        totalCreditsPaise: r.totalCreditsPaise.toString(),
        ledgerMatchesBalances: r.ledgerMatchesBalances,
        discrepancyCount: r.discrepancyCount,
        discrepancyDetails: r.discrepancyDetails ? JSON.parse(r.discrepancyDetails) : null,
        checkedAt: r.checkedAt
      }))
    });
  } catch (err) {
    next(err);
  }
}

export async function backfillLedgerController(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const groupId = req.params.groupId || req.body.groupId;

    if (groupId) {
      const stats = await LedgerService.backfillLedgerForGroup(groupId);
      return res.json({ message: `Backfill completed for group ${groupId}`, stats });
    }

    const groups = await prisma.group.findMany({ select: { id: true } });
    let totalExpenses = 0;
    let totalPayments = 0;

    for (const g of groups) {
      const stats = await LedgerService.backfillLedgerForGroup(g.id);
      totalExpenses += stats.backfilledExpenses;
      totalPayments += stats.backfilledPayments;
    }

    res.json({
      message: `Backfill completed across all groups.`,
      stats: { totalExpenses, totalPayments }
    });
  } catch (err) {
    next(err);
  }
}
