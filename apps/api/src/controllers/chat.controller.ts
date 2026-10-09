import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma.js';
import { AuthRequest } from '../middleware/auth.js';
import { env } from '../config/env.js';
import { simplifySettlements, MemberInfo, ExpenseInput } from '@settleup/settlement-engine';

const chatSchema = z.object({
  groupId: z.string(),
  message: z.string().min(1),
  language: z.string().default('en')
});

export async function processChat(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const { groupId, message, language } = chatSchema.parse(req.body);

    const membership = await prisma.groupMember.findFirst({
      where: { groupId, userId }
    });

    if (!membership) {
      return res.status(403).json({ error: 'Access denied to this group.' });
    }

    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: {
        members: { include: { user: { select: { id: true, fullName: true, upiId: true } } } },
        expenses: { include: { payers: true, splits: true } },
        payments: { where: { status: 'CONFIRMED' } }
      }
    });

    if (!group) {
      return res.status(404).json({ error: 'Group not found.' });
    }

    // Save user message to database
    await prisma.chatMessage.create({
      data: {
        groupId,
        userId,
        role: 'user',
        content: message
      }
    });

    // Check engine calculation
    const engineMembers: MemberInfo[] = group.members.map(m => ({
      id: m.isGuest ? m.id : m.userId!,
      name: m.isGuest ? (m.guestName || 'Guest') : (m.user?.fullName || 'User')
    }));

    const engineExpenses: ExpenseInput[] = group.expenses.map(exp => ({
      id: exp.id,
      description: exp.title,
      currency: exp.currency,
      payers: exp.payers.map(p => ({ memberId: p.userId || p.guestMemberId!, amountPaise: Number(p.amountPaise) })),
      splits: exp.splits.map(s => ({ memberId: s.userId || s.guestMemberId!, amountPaise: Number(s.amountPaise) }))
    }));

    const existingPayments = group.payments.map(p => ({
      fromMemberId: p.fromUserId || p.fromGuestId!,
      toMemberId: p.toUserId || p.toGuestId!,
      amountPaise: Number(p.amountPaise)
    }));

    const plan = simplifySettlements(engineMembers, engineExpenses, existingPayments);

    // Current user balance & transfers
    const userBalance = plan.memberBalances.find(b => b.memberId === userId);
    const netPaise = userBalance?.netBalancePaise || 0;

    let responseText = '';
    let toolAction: any = null;

    const lowerMsg = message.toLowerCase();

    // Intent / Function rule-based fallback if no Gemini key or fast match
    if (lowerMsg.includes('owe') || lowerMsg.includes('balance') || lowerMsg.includes('kitna') || lowerMsg.includes('baki')) {
      if (netPaise > 0) {
        responseText = `You are owed ₹${(netPaise / 100).toLocaleString('en-IN')} net in "${group.name}". 🎉\n`;
      } else if (netPaise < 0) {
        responseText = `You owe ₹${(Math.abs(netPaise) / 100).toLocaleString('en-IN')} net in "${group.name}". 💡\n`;
      } else {
        responseText = `You are completely all square! Net balance is ₹0 in "${group.name}". ✨\n`;
      }

      if (plan.transfers.length > 0) {
        responseText += `\n**Simplified Settlement Plan (${plan.percentReduction}% reduced):**\n`;
        plan.transfers.forEach(t => {
          responseText += `• ${t.fromName} → ${t.toName}: ₹${(t.amountPaise / 100).toLocaleString('en-IN')}\n`;
        });
      }
      toolAction = { action: 'get_balances', netPaise };
    } else if (lowerMsg.includes('nudge') || lowerMsg.includes('remind') || lowerMsg.includes('yaad')) {
      responseText = `I can send a polite nudge reminder via WhatsApp or in-app notification to group members with pending balances! Which tone would you prefer: Friendly, Funny, or Formal?`;
      toolAction = { action: 'send_nudge' };
    } else if (lowerMsg.includes('upi') || lowerMsg.includes('pay') || lowerMsg.includes('gpay') || lowerMsg.includes('qr')) {
      const myDebts = plan.transfers.filter(t => t.from === userId);
      if (myDebts.length > 0) {
        const d = myDebts[0];
        const recipient = group.members.find(m => (m.userId === d.to || m.id === d.to));
        const upiId = recipient?.user?.upiId || 'payee@upi';
        const amount = d.amountPaise / 100;
        const upiLink = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(d.toName)}&am=${amount}&cu=INR&tn=${encodeURIComponent(`SettleUp payment for ${group.name}`)}`;

        responseText = `Here is your instant payment link to settle up with **${d.toName}** for **₹${amount.toLocaleString('en-IN')}**:\n\n[Pay via GPay / PhonePe / Paytm / BHIM](${upiLink})`;
        toolAction = { action: 'generate_upi_link', upiLink, upiId, amount };
      } else {
        responseText = `You don't have any pending payments to make in "${group.name}"! You are all clear. 🎉`;
      }
    } else if (lowerMsg.includes('how') || lowerMsg.includes('simplif') || lowerMsg.includes('engine') || lowerMsg.includes('work')) {
      responseText = `**How the Smart Settlement Engine works:**\n\n1. **Net Balance Calculation**: Computes exact paid minus owed amounts per member.\n2. **Bitmask DP Optimization**: Finds non-overlapping zero-sum subsets so sub-groups can settle internally without passing money through third parties.\n3. **Minimizes Transactions**: Reduces up to 90%+ of total payment hops (at most N-1 transfers for N members).\n4. **100% Invariant Checked**: Total money before and after simplification equals exact zero.`;
      toolAction = { action: 'explain_settlement' };
    } else {
      responseText = `I'm your SettleUp Assistant for "${group.name}"! I can help you check balances, parse new expenses in natural language, explain settlement calculations, or generate UPI payment links. Try asking: "Who owes me money?" or "Generate my UPI payment link".`;
      toolAction = { action: 'summarize_group' };
    }

    // Save assistant reply
    await prisma.chatMessage.create({
      data: {
        groupId,
        userId,
        role: 'assistant',
        content: responseText,
        metadata: JSON.stringify(toolAction)
      }
    });

    res.json({
      reply: responseText,
      toolAction
    });
  } catch (err) {
    next(err);
  }
}
