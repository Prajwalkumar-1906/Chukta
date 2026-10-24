import { Queue, Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { env } from '../config/env.js';
import { prisma } from '../db/prisma.js';
import { emailService } from '../services/email.service.js';
import { NotificationService } from '../services/notification.service.js';
import { ReconciliationService } from '../services/reconciliation.service.js';

let redisConnection: IORedis | null = null;
let isRedisAvailable = false;

if (process.env.NODE_ENV !== 'test' && env.REDIS_URL) {
  try {
    redisConnection = new IORedis(env.REDIS_URL, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      lazyConnect: true,
      retryStrategy: (times) => {
        if (times > 2) return null;
        return 1000;
      }
    });

    redisConnection.connect().then(() => {
      isRedisAvailable = true;
      console.log('[BullMQ] Connected to Redis successfully.');
    }).catch(() => {
      isRedisAvailable = false;
    });

    redisConnection.on('error', () => {
      isRedisAvailable = false;
    });
  } catch {
    isRedisAvailable = false;
  }
}

export const weeklyDigestQueue = redisConnection
  ? new Queue('weekly-digest-queue', { connection: redisConnection })
  : null;

export const reconciliationQueue = redisConnection
  ? new Queue('reconciliation-queue', { connection: redisConnection })
  : null;

/**
 * Worker Logic: Weekly Digest
 */
export async function processWeeklyDigestJob(jobData: { userId?: string }) {
  console.log('[BullMQ] Processing weekly digest job...');
  const users = jobData.userId
    ? await prisma.user.findMany({ where: { id: jobData.userId } })
    : await prisma.user.findMany({ where: { anonymized: false } });

  let sentCount = 0;

  for (const user of users) {
    const canSend = await NotificationService.canSend(user.id, 'email', 'weeklyDigest');
    if (!canSend) continue;

    // Calculate user's net totals across their active groups
    const memberships = await prisma.groupMember.findMany({
      where: { userId: user.id },
      include: { group: true }
    });

    if (memberships.length === 0) continue;

    // Calculate approximate pending balances from payer and split rows
    const paidRecords = await prisma.expensePayer.findMany({
      where: { userId: user.id },
      select: { amountPaise: true }
    });
    const splitRecords = await prisma.expenseSplit.findMany({
      where: { userId: user.id },
      select: { amountPaise: true }
    });

    const totalPaidPaise = paidRecords.reduce((sum, p) => sum + p.amountPaise, BigInt(0));
    const totalSharePaise = splitRecords.reduce((sum, s) => sum + s.amountPaise, BigInt(0));

    const netPaise = totalPaidPaise - totalSharePaise;
    const owedRupees = netPaise > BigInt(0) ? Number(netPaise) / 100 : 0;
    const oweRupees = netPaise < BigInt(0) ? Math.abs(Number(netPaise)) / 100 : 0;

    await emailService.sendWeeklyDigestEmail(
      user.email,
      user.fullName,
      owedRupees,
      oweRupees,
      memberships.length,
      user.preferredLanguage
    );
    sentCount++;
  }

  return { status: 'COMPLETED', sentCount };
}

/**
 * Dispatch or directly run weekly digest
 */
export async function dispatchWeeklyDigest(userId?: string) {
  if (isRedisAvailable && weeklyDigestQueue) {
    return weeklyDigestQueue.add('send-digest', { userId });
  } else {
    return processWeeklyDigestJob({ userId });
  }
}

/**
 * Worker Logic: Group & Money Reconciliation Job
 */
export async function processReconciliationJob(jobData: { groupId?: string; adminUserId?: string }) {
  console.log('[BullMQ] Processing money reconciliation job...');
  if (jobData.groupId) {
    return ReconciliationService.reconcileGroup(jobData.groupId, {
      triggeredBy: jobData.adminUserId ? 'ADMIN_MANUAL' : 'SYSTEM_NIGHTLY',
      adminUserId: jobData.adminUserId
    });
  } else {
    return ReconciliationService.reconcileAllGroups({
      triggeredBy: jobData.adminUserId ? 'ADMIN_MANUAL' : 'SYSTEM_NIGHTLY',
      adminUserId: jobData.adminUserId
    });
  }
}

/**
 * Dispatch or directly run reconciliation job
 */
export async function dispatchReconciliation(options?: { groupId?: string; adminUserId?: string }) {
  if (isRedisAvailable && reconciliationQueue) {
    return reconciliationQueue.add('run-reconciliation', options || {});
  } else {
    return processReconciliationJob(options || {});
  }
}

/**
 * Initialize BullMQ workers if Redis is active
 */
if (isRedisAvailable && redisConnection) {
  new Worker(
    'weekly-digest-queue',
    async (job: Job) => {
      return processWeeklyDigestJob(job.data);
    },
    { connection: redisConnection }
  );

  new Worker(
    'reconciliation-queue',
    async (job: Job) => {
      return processReconciliationJob(job.data);
    },
    { connection: redisConnection }
  );

  // Schedule nightly reconciliation (runs every 24 hours at 2:00 AM)
  if (reconciliationQueue) {
    reconciliationQueue.add(
      'nightly-reconcile',
      {},
      { repeat: { pattern: '0 2 * * *' } } as any
    ).catch(() => {});
  }
}
