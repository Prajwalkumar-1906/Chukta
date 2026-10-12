import { z } from 'zod';
import { GROUP_TYPES, SPLIT_MODES, MEMBER_ROLES, PAYMENT_METHODS, NUDGE_TONES } from '../constants.js';

export const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().optional(),
  upiId: z.string().optional(),
  preferredLanguage: z.string().default('en'),
  dpdpConsent: z.boolean().default(true)
});

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, 'Password is required')
});

export const PhoneOtpRequestSchema = z.object({
  phone: z.string().min(10, 'Valid 10-digit phone number is required')
});

export const PhoneOtpVerifySchema = z.object({
  phone: z.string().min(10),
  otp: z.string().length(6, '6-digit OTP required'),
  fullName: z.string().optional()
});

export const CreateGroupSchema = z.object({
  name: z.string().min(1, 'Group name is required').max(100),
  description: z.string().optional(),
  type: z.enum(GROUP_TYPES).default('TRIP'),
  baseCurrency: z.string().default('INR'),
  budgetPaise: z.number().int().nonnegative().optional()
});

export const AddGroupMemberSchema = z.object({
  email: z.string().email().optional(),
  isGuest: z.boolean().default(false),
  guestName: z.string().optional(),
  role: z.enum(MEMBER_ROLES).default('MEMBER')
});

export const PayerInputSchema = z.object({
  userId: z.string().optional().nullable(),
  guestMemberId: z.string().optional().nullable(),
  amountPaise: z.number().int().positive()
});

export const SplitInputSchema = z.object({
  userId: z.string().optional().nullable(),
  guestMemberId: z.string().optional().nullable(),
  amountPaise: z.number().int().nonnegative(),
  percentage: z.number().optional().nullable(),
  shares: z.number().optional().nullable(),
  daysStayed: z.number().int().optional().nullable()
});

export const ExpenseItemInputSchema = z.object({
  title: z.string().min(1),
  amountPaise: z.number().int().positive(),
  assignedUserId: z.string().optional().nullable(),
  assignedGuestId: z.string().optional().nullable()
});

export const CreateExpenseSchema = z.object({
  groupId: z.string().min(1),
  title: z.string().min(1, 'Title is required').max(150),
  description: z.string().optional().nullable(),
  totalAmountPaise: z.number().int().positive('Amount must be greater than 0'),
  currency: z.string().default('INR'),
  fxRate: z.number().positive().default(1.0),
  splitMode: z.enum(SPLIT_MODES).default('EQUAL'),
  category: z.string().default('general'),
  receiptUrl: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  isRecurring: z.boolean().default(false),
  visibilityDate: z.string().datetime().optional().nullable(),
  payers: z.array(PayerInputSchema).min(1, 'At least one payer is required'),
  splits: z.array(SplitInputSchema).min(1, 'At least one participant is required'),
  items: z.array(ExpenseItemInputSchema).optional(),
  cgstPaise: z.number().int().nonnegative().optional(),
  sgstPaise: z.number().int().nonnegative().optional(),
  serviceChargePaise: z.number().int().nonnegative().optional()
});

export const RecordPaymentSchema = z.object({
  groupId: z.string().min(1),
  settlementId: z.string().optional().nullable(),
  fromUserId: z.string().optional().nullable(),
  fromGuestId: z.string().optional().nullable(),
  toUserId: z.string().optional().nullable(),
  toGuestId: z.string().optional().nullable(),
  amountPaise: z.number().int().positive('Payment amount must be positive'),
  method: z.enum(PAYMENT_METHODS).default('UPI'),
  upiTxnId: z.string().optional().nullable(),
  idempotencyKey: z.string().optional()
});

export const ConfirmPaymentSchema = z.object({
  paymentId: z.string().min(1),
  confirmed: z.boolean(),
  disputeReason: z.string().optional()
});

export const FlagExpenseSchema = z.object({
  expenseId: z.string().min(1),
  reason: z.string().min(3, 'Please describe why you are disputing this expense')
});

export const SendNudgeSchema = z.object({
  groupId: z.string().min(1),
  toUserId: z.string().min(1),
  amountPaise: z.number().int().positive(),
  tone: z.enum(NUDGE_TONES).default('FRIENDLY'),
  channel: z.enum(['IN_APP', 'WHATSAPP', 'EMAIL', 'PUSH']).default('IN_APP')
});
