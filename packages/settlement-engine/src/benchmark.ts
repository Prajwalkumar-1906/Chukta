import { simplifySettlements, MemberInfo, ExpenseInput } from './index.js';

function generateRandomGroup(numMembers: number, numExpenses: number) {
  const members: MemberInfo[] = Array.from({ length: numMembers }, (_, i) => ({
    id: `user_${i + 1}`,
    name: `User ${i + 1}`
  }));

  const expenses: ExpenseInput[] = [];

  for (let e = 0; e < numExpenses; e++) {
    const payerIdx = Math.floor(Math.random() * numMembers);
    const amount = Math.floor(Math.random() * 500000) + 10000; // ₹100 to ₹5000 in paise
    
    // Pick random subset of splitters
    const splitCount = Math.floor(Math.random() * (numMembers - 1)) + 2; // 2 to N
    const shuffled = [...members].sort(() => Math.random() - 0.5);
    const splitters = shuffled.slice(0, splitCount);
    const splitAmount = Math.floor(amount / splitCount);

    expenses.push({
      id: `exp_${e + 1}`,
      description: `Random Expense ${e + 1}`,
      payers: [{ memberId: members[payerIdx].id, amountPaise: splitAmount * splitCount }],
      splits: splitters.map(s => ({ memberId: s.id, amountPaise: splitAmount }))
    });
  }

  return { members, expenses };
}

function runBenchmark(numRuns = 50, memberCounts = [4, 6, 8, 12, 16], expenseCounts = [15, 30, 50]) {
  console.log('================================================================================');
  console.log('                   SETTLEUP SMART SETTLEMENT ENGINE BENCHMARK                  ');
  console.log('================================================================================\n');

  for (const numMembers of memberCounts) {
    for (const numExpenses of expenseCounts) {
      let totalNaiveCount = 0;
      let totalSimplifiedCount = 0;
      let totalPercentReduction = 0;
      let totalTimeMs = 0;

      for (let run = 0; run < numRuns; run++) {
        const { members, expenses } = generateRandomGroup(numMembers, numExpenses);
        
        const start = performance.now();
        const plan = simplifySettlements(members, expenses);
        const end = performance.now();

        totalTimeMs += (end - start);
        totalNaiveCount += plan.naiveTransactionCount;
        totalSimplifiedCount += plan.simplifiedTransactionCount;
        totalPercentReduction += plan.percentReduction;
      }

      const avgNaive = (totalNaiveCount / numRuns).toFixed(1);
      const avgSimplified = (totalSimplifiedCount / numRuns).toFixed(1);
      const avgReduction = (totalPercentReduction / numRuns).toFixed(1);
      const avgTime = (totalTimeMs / numRuns).toFixed(3);

      console.log(`Members: ${numMembers.toString().padStart(2)} | Expenses: ${numExpenses.toString().padStart(2)} | Avg Naive Txns: ${avgNaive.padStart(5)} | Avg Simplified Txns: ${avgSimplified.padStart(4)} | Reduction: ${avgReduction.padStart(5)}% | Avg Time: ${avgTime}ms`);
    }
  }

  console.log('\n================================================================================\n');
}

runBenchmark();
