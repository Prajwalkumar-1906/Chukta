import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  simplifySettlements,
  calculateNetBalances,
  solveOptimal,
  solveGreedy,
  MemberInfo,
  ExpenseInput
} from './index.js';

describe('Smart Settlement Engine', () => {
  it('handles empty group / zero balances trivially', () => {
    const members: MemberInfo[] = [
      { id: 'm1', name: 'Aman' },
      { id: 'm2', name: 'Riya' }
    ];
    const expenses: ExpenseInput[] = [];

    const plan = simplifySettlements(members, expenses);
    expect(plan.modeUsed).toBe('TRIVIAL');
    expect(plan.transfers.length).toBe(0);
    expect(plan.simplifiedTransactionCount).toBe(0);
  });

  it('correctly simplifies 3-person cycle (A owes B, B owes C, C owes A)', () => {
    const members: MemberInfo[] = [
      { id: 'm1', name: 'Aman' },
      { id: 'm2', name: 'Riya' },
      { id: 'm3', name: 'Rohan' }
    ];

    // Aman pays 300 for dinner split with Riya
    // Riya pays 300 for lunch split with Rohan
    // Rohan pays 300 for cab split with Aman
    const expenses: ExpenseInput[] = [
      {
        id: 'e1',
        description: 'Dinner',
        payers: [{ memberId: 'm1', amountPaise: 30000 }],
        splits: [{ memberId: 'm1', amountPaise: 15000 }, { memberId: 'm2', amountPaise: 15000 }]
      },
      {
        id: 'e2',
        description: 'Lunch',
        payers: [{ memberId: 'm2', amountPaise: 30000 }],
        splits: [{ memberId: 'm2', amountPaise: 15000 }, { memberId: 'm3', amountPaise: 15000 }]
      },
      {
        id: 'e3',
        description: 'Cab',
        payers: [{ memberId: 'm3', amountPaise: 30000 }],
        splits: [{ memberId: 'm3', amountPaise: 15000 }, { memberId: 'm1', amountPaise: 15000 }]
      }
    ];

    const plan = simplifySettlements(members, expenses);
    // Everyone paid 300 total and owes 300 total -> Net balances should all be 0!
    expect(plan.transfers.length).toBe(0);
    expect(plan.simplifiedTransactionCount).toBe(0);
  });

  it('correctly simplifies simple 2-person debt', () => {
    const members: MemberInfo[] = [
      { id: 'm1', name: 'Aman' },
      { id: 'm2', name: 'Riya' }
    ];

    // Aman pays 1000 INR for dinner split equally
    const expenses: ExpenseInput[] = [
      {
        id: 'e1',
        description: 'Dinner',
        payers: [{ memberId: 'm1', amountPaise: 100000 }],
        splits: [{ memberId: 'm1', amountPaise: 50000 }, { memberId: 'm2', amountPaise: 50000 }]
      }
    ];

    const plan = simplifySettlements(members, expenses);
    expect(plan.transfers.length).toBe(1);
    expect(plan.transfers[0].from).toBe('m2');
    expect(plan.transfers[0].to).toBe('m1');
    expect(plan.transfers[0].amountPaise).toBe(50000);
  });

  describe('Property-Based Testing (fast-check)', () => {
    it('invariant 1: Net balances sum to 0 for any valid expense configuration', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 2, max: 10 }),
          fc.array(
            fc.record({
              amount: fc.integer({ min: 100, max: 100000 }),
              payerIdx: fc.integer({ min: 0, max: 9 }),
              splitCount: fc.integer({ min: 1, max: 10 })
            }),
            { minLength: 1, maxLength: 20 }
          ),
          (numMembers, rawExpenses) => {
            const members: MemberInfo[] = Array.from({ length: numMembers }, (_, i) => ({
              id: `m${i}`,
              name: `Member ${i}`
            }));

            const expenses: ExpenseInput[] = rawExpenses.map((re, idx) => {
              const payerId = `m${re.payerIdx % numMembers}`;
              const numSplitters = Math.min(numMembers, (re.splitCount % numMembers) + 1);
              const perSplit = Math.floor(re.amount / numSplitters);

              const splits = Array.from({ length: numSplitters }, (_, i) => ({
                memberId: `m${i}`,
                amountPaise: perSplit
              }));

              return {
                id: `exp_${idx}`,
                description: `Expense ${idx}`,
                payers: [{ memberId: payerId, amountPaise: perSplit * numSplitters }],
                splits
              };
            });

            const balances = calculateNetBalances(members, expenses);
            let totalSum = 0;
            for (const b of balances.values()) {
              totalSum += b;
            }
            expect(totalSum).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('invariant 2: Applying the generated plan zeroes out everyone balance', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 2, max: 8 }),
          fc.array(
            fc.record({
              amount: fc.integer({ min: 100, max: 50000 }),
              payerIdx: fc.integer({ min: 0, max: 7 })
            }),
            { minLength: 1, maxLength: 10 }
          ),
          (numMembers, rawExpenses) => {
            const members: MemberInfo[] = Array.from({ length: numMembers }, (_, i) => ({
              id: `m${i}`,
              name: `Member ${i}`
            }));

            const expenses: ExpenseInput[] = rawExpenses.map((re, idx) => {
              const payerId = `m${re.payerIdx % numMembers}`;
              const totalAmount = re.amount * numMembers;
              const splits = members.map(m => ({ memberId: m.id, amountPaise: re.amount }));

              return {
                id: `exp_${idx}`,
                description: `Expense ${idx}`,
                payers: [{ memberId: payerId, amountPaise: totalAmount }],
                splits
              };
            });

            const plan = simplifySettlements(members, expenses);

            // Verify starting balances
            const balancesMap = calculateNetBalances(members, expenses);

            // Apply transfers
            for (const t of plan.transfers) {
              balancesMap.set(t.from, (balancesMap.get(t.from) || 0) + t.amountPaise);
              balancesMap.set(t.to, (balancesMap.get(t.to) || 0) - t.amountPaise);
            }

            // Everyone should be 0
            for (const b of balancesMap.values()) {
              expect(b).toBe(0);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('invariant 3: Number of transfers is strictly <= (N - 1) where N is non-zero members', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 2, max: 12 }),
          fc.array(
            fc.record({
              amount: fc.integer({ min: 100, max: 100000 }),
              payerIdx: fc.integer({ min: 0, max: 11 })
            }),
            { minLength: 1, maxLength: 15 }
          ),
          (numMembers, rawExpenses) => {
            const members: MemberInfo[] = Array.from({ length: numMembers }, (_, i) => ({
              id: `m${i}`,
              name: `Member ${i}`
            }));

            const expenses: ExpenseInput[] = rawExpenses.map((re, idx) => {
              const payerId = `m${re.payerIdx % numMembers}`;
              return {
                id: `exp_${idx}`,
                description: `Expense ${idx}`,
                payers: [{ memberId: payerId, amountPaise: re.amount }],
                splits: members.map(m => ({ memberId: m.id, amountPaise: Math.floor(re.amount / numMembers) }))
              };
            });

            const plan = simplifySettlements(members, expenses);
            const nonZeroCount = plan.memberBalances.filter(b => b.netBalancePaise !== 0).length;
            const maxAllowed = nonZeroCount > 0 ? nonZeroCount - 1 : 0;
            expect(plan.transfers.length).toBeLessThanOrEqual(maxAllowed);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
