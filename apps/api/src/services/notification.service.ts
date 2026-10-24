import { prisma } from '../db/prisma.js';

export type NotificationChannel = 'inApp' | 'email' | 'push' | 'whatsapp';
export type NotificationEvent =
  | 'expenseAdded'
  | 'expenseUpdated'
  | 'paymentRecorded'
  | 'settlementReminder'
  | 'weeklyDigest';

export class NotificationService {
  /**
   * Retrieves or initializes default preferences for a user
   */
  static async getPreferences(userId: string) {
    let pref = await prisma.notificationPreference.findUnique({
      where: { userId }
    });

    if (!pref) {
      pref = await prisma.notificationPreference.create({
        data: {
          userId,
          inApp: true,
          email: true,
          push: false,
          whatsapp: false,
          expenseAdded: true,
          expenseUpdated: true,
          paymentRecorded: true,
          settlementReminder: true,
          weeklyDigest: true,
          quietHoursEnabled: false,
          quietHoursStart: '22:00',
          quietHoursEnd: '08:00',
          timezone: 'Asia/Kolkata'
        }
      });
    }

    return pref;
  }

  /**
   * Updates user notification preferences
   */
  static async updatePreferences(
    userId: string,
    updates: {
      inApp?: boolean;
      email?: boolean;
      push?: boolean;
      whatsapp?: boolean;
      expenseAdded?: boolean;
      expenseUpdated?: boolean;
      paymentRecorded?: boolean;
      settlementReminder?: boolean;
      weeklyDigest?: boolean;
      quietHoursEnabled?: boolean;
      quietHoursStart?: string;
      quietHoursEnd?: string;
      timezone?: string;
    }
  ) {
    return prisma.notificationPreference.upsert({
      where: { userId },
      create: {
        userId,
        ...updates
      },
      update: updates
    });
  }

  /**
   * Evaluates if a notification should be dispatched based on preferences & quiet hours
   */
  static async canSend(userId: string, channel: NotificationChannel, event: NotificationEvent): Promise<boolean> {
    const pref = await this.getPreferences(userId);

    // Channel toggle check
    if (!pref[channel]) return false;

    // Event toggle check
    if (!pref[event]) return false;

    // Quiet hours check (in-app notifications are silent in feed, but email/push/whatsapp should be suppressed during quiet hours)
    if (pref.quietHoursEnabled && channel !== 'inApp' && pref.quietHoursStart && pref.quietHoursEnd) {
      const isQuiet = this.isInQuietHours(pref.timezone || 'Asia/Kolkata', pref.quietHoursStart, pref.quietHoursEnd);
      if (isQuiet) return false;
    }

    return true;
  }

  /**
   * Checks if current time is within quiet hours window in the specified timezone
   */
  private static isInQuietHours(timezone: string, startStr: string, endStr: string): boolean {
    try {
      const now = new Date();
      const localTimeStr = now.toLocaleTimeString('en-GB', {
        timeZone: timezone,
        hour12: false,
        hour: '2-digit',
        minute: '2-digit'
      });

      const [nowH, nowM] = localTimeStr.split(':').map(Number);
      const [startH, startM] = startStr.split(':').map(Number);
      const [endH, endM] = endStr.split(':').map(Number);

      const nowMins = nowH * 60 + nowM;
      const startMins = startH * 60 + startM;
      const endMins = endH * 60 + endM;

      if (startMins <= endMins) {
        return nowMins >= startMins && nowMins <= endMins;
      } else {
        // Overnight quiet hours (e.g. 22:00 to 08:00)
        return nowMins >= startMins || nowMins <= endMins;
      }
    } catch {
      return false;
    }
  }
}
