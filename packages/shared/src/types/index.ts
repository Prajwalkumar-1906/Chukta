import { GroupType, SplitMode, MemberRole, PaymentMethod, PaymentStatus, DisputeStatus, NudgeTone } from '../constants.js';

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  avatarUrl?: string | null;
  phone?: string | null;
  upiId?: string | null;
  preferredLanguage: string;
  reliabilityBadge?: string | null;
  isGuestDemo?: boolean;
}

export interface AuthResponse {
  user: UserProfile;
  accessToken: string;
}

export interface GroupSummary {
  id: string;
  name: string;
  description?: string | null;
  type: GroupType;
  baseCurrency: string;
  budgetPaise?: number | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  memberCount: number;
  totalExpensesPaise: number;
  myNetBalancePaise: number;
  isArchived: boolean;
}

export interface GroupMemberItem {
  id: string;
  groupId: string;
  userId?: string | null;
  isGuest: boolean;
  guestName?: string | null;
  guestEmail?: string | null;
  role: MemberRole;
  joinedAt: string;
  user?: UserProfile | null;
}

export interface ExpensePayerItem {
  id?: string;
  userId?: string | null;
  guestMemberId?: string | null;
  amountPaise: number;
  memberName?: string;
}

export interface ExpenseSplitItem {
  id?: string;
  userId?: string | null;
  guestMemberId?: string | null;
  amountPaise: number;
  percentage?: number | null;
  shares?: number | null;
  daysStayed?: number | null;
  memberName?: string;
}

export interface ExpenseItemDetail {
  id?: string;
  title: string;
  amountPaise: number;
  assignedUserId?: string | null;
  assignedGuestId?: string | null;
}

export interface ExpenseFlagItem {
  id: string;
  expenseId: string;
  flaggedById: string;
  reason: string;
  status: DisputeStatus;
  createdAt: string;
  resolvedAt?: string | null;
  flaggedBy?: { fullName: string };
}

export interface ExpenseItem {
  id: string;
  groupId: string;
  title: string;
  description?: string | null;
  totalAmount: number; // in paise
  currency: string;
  fxRate: number;
  splitMode: SplitMode;
  category: string;
  receiptUrl?: string | null;
  location?: string | null;
  isRecurring: boolean;
  isDisputed: boolean;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  payers: ExpensePayerItem[];
  splits: ExpenseSplitItem[];
  items?: ExpenseItemDetail[];
  flags?: ExpenseFlagItem[];
  cgstPaise?: number;
  sgstPaise?: number;
  serviceChargePaise?: number;
  createdBy?: { fullName: string };
}

export interface PaymentItem {
  id: string;
  groupId: string;
  fromUserId?: string | null;
  fromGuestId?: string | null;
  fromName?: string;
  toUserId?: string | null;
  toGuestId?: string | null;
  toName?: string;
  amountPaise: number;
  upiTxnId?: string | null;
  idempotencyKey?: string | null;
  method: PaymentMethod;
  status: PaymentStatus;
  receiverConfirmed: boolean;
  disputed: boolean;
  createdAt: string;
  confirmedAt?: string | null;
}

export interface FriendshipItem {
  id: string;
  friendId: string;
  friendName: string;
  friendEmail: string;
  friendAvatarUrl?: string | null;
  netBalancePaise: number; // >0: friend owes me, <0: I owe friend
}

export interface LoanItem {
  id: string;
  lenderId: string;
  borrowerId: string;
  amountPaise: number;
  currency: string;
  notes?: string | null;
  dueDate?: string | null;
  settled: boolean;
  settledAt?: string | null;
  createdAt: string;
}
