import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from './index.js';
import { prisma } from './db/prisma.js';
import { LedgerService } from './services/ledger.service.js';
import { ReconciliationService } from './services/reconciliation.service.js';
import { processReconciliationJob } from './jobs/queue.ts';

describe('Phase 11: Money Correctness & Reliability', () => {
  const ts = Date.now();
  const userAEmail = `user_a_${ts}@example.com`;
  const userBEmail = `user_b_${ts}@example.com`;

  let tokenA = '';
  let tokenB = '';
  let userAId = '';
  let userBId = '';
  let groupId = '';

  it('1. Prepares test users and group', async () => {
    // Register User A
    const regA = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: userAEmail, password: 'Password@123', fullName: 'Alice P11' });
    expect(regA.status).toBe(201);
    tokenA = regA.body.accessToken;
    userAId = regA.body.user.id;

    // Register User B
    const regB = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: userBEmail, password: 'Password@123', fullName: 'Bob P11' });
    expect(regB.status).toBe(201);
    tokenB = regB.body.accessToken;
    userBId = regB.body.user.id;

    // Create Group with User A
    const grpRes = await request(app)
      .post('/api/v1/groups')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ name: `Goa Ledger Test ${ts}`, type: 'TRIP', baseCurrency: 'INR' });
    expect(grpRes.status).toBe(201);
    groupId = grpRes.body.group.id;

    // Add User B to Group
    const addRes = await request(app)
      .post(`/api/v1/groups/${groupId}/members`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ email: userBEmail });
    expect(addRes.status).toBe(201);
  });

  describe('2. Double-Entry Ledger: Balanced Posting on Expense Creation', () => {
    let expenseId = '';

    it('posts balanced ledger entries inside the DB transaction when expense is created', async () => {
      const expRes = await request(app)
        .post(`/api/v1/groups/${groupId}/expenses`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          title: 'Dinner at Britto',
          totalAmountRupees: 1000,
          currency: 'INR',
          splitMode: 'EQUAL',
          payers: [{ userId: userAId, amountRupees: 1000 }],
          splits: [
            { userId: userAId, amountRupees: 500 },
            { userId: userBId, amountRupees: 500 }
          ]
        });

      expect(expRes.status).toBe(201);
      expenseId = expRes.body.expense.id;

      // Verify LedgerTransaction exists
      const ledgerTx = await prisma.ledgerTransaction.findFirst({
        where: { referenceId: expenseId },
        include: { entries: true }
      });

      expect(ledgerTx).toBeDefined();
      expect(ledgerTx?.type).toBe('EXPENSE');
      expect(ledgerTx?.groupId).toBe(groupId);
      expect(ledgerTx?.currency).toBe('INR');

      // Verify Entries
      const credits = ledgerTx!.entries.filter((e) => e.direction === 'CREDIT');
      const debits = ledgerTx!.entries.filter((e) => e.direction === 'DEBIT');

      const sumCredits = credits.reduce((sum, e) => sum + e.amountPaise, BigInt(0));
      const sumDebits = debits.reduce((sum, e) => sum + e.amountPaise, BigInt(0));

      expect(sumCredits).toBe(BigInt(100000)); // 1000 INR
      expect(sumDebits).toBe(BigInt(100000)); // 1000 INR
      expect(sumCredits).toBe(sumDebits); // Invariant: Debits === Credits
    });

    it('enforces that unbalanced ledger transactions are strictly rejected', async () => {
      await expect(
        prisma.$transaction(async (tx) => {
          await LedgerService.postTransaction(tx, {
            groupId,
            type: 'EXPENSE',
            currency: 'INR',
            entries: [
              { userId: userAId, direction: 'CREDIT', amountPaise: BigInt(50000) },
              { userId: userBId, direction: 'DEBIT', amountPaise: BigInt(30000) } // Unbalanced!
            ]
          });
        })
      ).rejects.toThrow(/Unbalanced ledger transaction/);
    });
  });

  describe('3. Deriving Balances from the Ledger', () => {
    it('accurately derives member net balances from double-entry ledger entries', async () => {
      const result = await LedgerService.calculateLedgerBalances(groupId);

      expect(result.isBalanced).toBe(true);
      expect(result.totalCredits).toBe(result.totalDebits);

      const balA = result.balances.find((b) => b.userId === userAId);
      const balB = result.balances.find((b) => b.userId === userBId);

      // User A paid 1000, consumed 500 -> net +500 INR (owed 500 INR)
      expect(balA?.netBalancePaise).toBe(BigInt(50000));
      // User B paid 0, consumed 500 -> net -500 INR (owes 500 INR)
      expect(balB?.netBalancePaise).toBe(BigInt(-50000));

      // Sum of net balances = 0
      expect(balA!.netBalancePaise + balB!.netBalancePaise).toBe(BigInt(0));
    });
  });

  describe('4. Payment Double-Entry Settlement Posting', () => {
    it('posts balanced ledger entries when a payment is recorded', async () => {
      // User B settles ₹500 with User A
      const payRes = await request(app)
        .post('/api/v1/payments')
        .set('Authorization', `Bearer ${tokenB}`)
        .send({
          groupId,
          toUserId: userAId,
          amountRupees: 500,
          upiTxnId: `UPI_REF_${Date.now()}`
        });

      expect(payRes.status).toBe(201);
      const paymentId = payRes.body.payment.id;

      // Verify LedgerTransaction for PAYMENT
      const ledgerTx = await prisma.ledgerTransaction.findFirst({
        where: { referenceId: paymentId },
        include: { entries: true }
      });

      expect(ledgerTx).toBeDefined();
      expect(ledgerTx?.type).toBe('PAYMENT');

      const payerCredit = ledgerTx?.entries.find((e) => e.userId === userBId && e.direction === 'CREDIT');
      const receiverDebit = ledgerTx?.entries.find((e) => e.userId === userAId && e.direction === 'DEBIT');

      expect(payerCredit?.amountPaise).toBe(BigInt(50000));
      expect(receiverDebit?.amountPaise).toBe(BigInt(50000));

      // Deriving balances again: both should now be all square (₹0)
      const afterSettlement = await LedgerService.calculateLedgerBalances(groupId);
      const balA = afterSettlement.balances.find((b) => b.userId === userAId);
      const balB = afterSettlement.balances.find((b) => b.userId === userBId);

      expect(balA?.netBalancePaise).toBe(BigInt(0));
      expect(balB?.netBalancePaise).toBe(BigInt(0));
    });
  });

  describe('5. Write-offs & FX Adjustments', () => {
    it('records debt write-off with balanced ledger entries', async () => {
      // User A writes off ₹100 for User B
      const writeOffRes = await request(app)
        .post(`/api/v1/groups/${groupId}/write-off`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          creditorUserId: userAId,
          debtorUserId: userBId,
          amountRupees: 100,
          description: 'Forgave snack expense'
        });

      expect(writeOffRes.status).toBe(201);
      expect(writeOffRes.body.transaction.type).toBe('WRITEOFF');

      // Verify ledger transaction
      const tx = await prisma.ledgerTransaction.findUnique({
        where: { id: writeOffRes.body.transaction.id },
        include: { entries: true }
      });

      expect(tx).toBeDefined();
      const creditorDebit = tx?.entries.find((e) => e.userId === userAId && e.direction === 'DEBIT');
      const debtorCredit = tx?.entries.find((e) => e.userId === userBId && e.direction === 'CREDIT');

      expect(creditorDebit?.amountPaise).toBe(BigInt(10000));
      expect(debtorCredit?.amountPaise).toBe(BigInt(10000));
    });

    it('records FX adjustment with balanced entries per currency', async () => {
      const fxRes = await request(app)
        .post(`/api/v1/groups/${groupId}/fx-adjustment`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          currency: 'USD',
          description: 'FX rate delta adjustment',
          entries: [
            { userId: userAId, direction: 'CREDIT', amountRupees: 10 },
            { userId: userBId, direction: 'DEBIT', amountRupees: 10 }
          ]
        });

      expect(fxRes.status).toBe(201);
      expect(fxRes.body.transaction.type).toBe('FX_ADJUSTMENT');
    });
  });

  describe('6. Reversion on Expense Deletion', () => {
    it('reverts/removes ledger entries atomically when an expense is deleted', async () => {
      // Create a temporary expense
      const createRes = await request(app)
        .post(`/api/v1/groups/${groupId}/expenses`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          title: 'Temporary Taxi',
          totalAmountRupees: 300,
          currency: 'INR',
          splitMode: 'EQUAL',
          payers: [{ userId: userAId, amountRupees: 300 }],
          splits: [{ userId: userAId, amountRupees: 150 }, { userId: userBId, amountRupees: 150 }]
        });

      const tempExpId = createRes.body.expense.id;

      // Verify ledger transaction exists
      const beforeDelete = await prisma.ledgerTransaction.findFirst({
        where: { referenceId: tempExpId }
      });
      expect(beforeDelete).toBeDefined();

      // Delete the expense
      const delRes = await request(app)
        .delete(`/api/v1/expenses/${tempExpId}`)
        .set('Authorization', `Bearer ${tokenA}`);
      expect(delRes.status).toBe(200);

      // Verify ledger transaction was deleted / reverted
      const afterDelete = await prisma.ledgerTransaction.findFirst({
        where: { referenceId: tempExpId }
      });
      expect(afterDelete).toBeNull();
    });
  });

  describe('7. Reconciliation Service & Nightly / Admin Job', () => {
    it('verifies group zero-sum, ledger parity, and generates a BALANCED report', async () => {
      const report = await ReconciliationService.reconcileGroup(groupId, {
        triggeredBy: 'ADMIN_MANUAL',
        adminUserId: userAId
      });

      expect(report.status).toBe('BALANCED');
      expect(report.discrepancies.length).toBe(0);
      expect(report.sumOfBalancesPaise).toBe(BigInt(0));
      expect(report.totalDebitsPaise).toBe(report.totalCreditsPaise);
      expect(report.ledgerMatchesBalances).toBe(true);

      // Verify saved in DB
      const dbReport = await prisma.reconciliationReport.findUnique({
        where: { id: report.reportId }
      });
      expect(dbReport?.status).toBe('BALANCED');
    });

    it('detects discrepancies and flags DISCREPANCY_DETECTED if ledger is tampered', async () => {
      // Artificially inject an unbalanced entry to test detection
      const badTx = await prisma.ledgerTransaction.create({
        data: {
          groupId,
          type: 'EXPENSE',
          currency: 'INR',
          entries: {
            create: [
              { userId: userAId, direction: 'CREDIT', amountPaise: BigInt(99999) },
              { userId: userBId, direction: 'DEBIT', amountPaise: BigInt(11111) } // Unbalanced!
            ]
          }
        }
      });

      const report = await ReconciliationService.reconcileGroup(groupId);
      expect(report.status).toBe('DISCREPANCY_DETECTED');
      expect(report.discrepancies.length).toBeGreaterThan(0);

      // Clean up bad test transaction
      await prisma.ledgerTransaction.delete({ where: { id: badTx.id } });
    });

    it('triggers reconciliation via admin API endpoint', async () => {
      const res = await request(app)
        .post('/api/v1/admin/reconcile')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ groupId });

      expect(res.status).toBe(200);
      expect(res.body.result.status).toBe('BALANCED');
      expect(res.body.result.discrepancies).toEqual([]);
    });

    it('retrieves reconciliation reports via admin API endpoint', async () => {
      const res = await request(app)
        .get(`/api/v1/admin/reconcile/reports?groupId=${groupId}`)
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.reports.length).toBeGreaterThan(0);
      expect(res.body.reports[0].status).toBe('BALANCED');
    });

    it('provides group ledger and balances via GET /api/v1/groups/:id/ledger', async () => {
      const res = await request(app)
        .get(`/api/v1/groups/${groupId}/ledger`)
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.isBalanced).toBe(true);
      expect(res.body.transactions.length).toBeGreaterThan(0);
      expect(res.body.balances.length).toBe(2);
    });

    it('runs the nightly BullMQ reconciliation worker without errors', async () => {
      const groupJob = await processReconciliationJob({ groupId });
      expect(groupJob).toBeDefined();
      expect((groupJob as any).status).toBe('BALANCED');
      expect((groupJob as any).discrepancies.length).toBe(0);

      const allJob = await processReconciliationJob({});
      expect(allJob).toBeDefined();
      expect(allJob.totalGroups).toBeGreaterThan(0);
      expect(allJob.balancedCount).toBeGreaterThanOrEqual(1);
    });
  });
});
