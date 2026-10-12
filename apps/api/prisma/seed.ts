import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const GroupType = { TRIP: 'TRIP', FLATMATES: 'FLATMATES', EVENT: 'EVENT', OFFICE: 'OFFICE', CUSTOM: 'CUSTOM' };
const SplitMode = { EQUAL: 'EQUAL', EXACT: 'EXACT', PERCENTAGE: 'PERCENTAGE', SHARES: 'SHARES', ITEMIZED: 'ITEMIZED', DAYS_STAYED: 'DAYS_STAYED' };
const Role = { ADMIN: 'ADMIN', MEMBER: 'MEMBER' };

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Clear existing data
  await prisma.chatMessage.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.reaction.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.loan.deleteMany();
  await prisma.friendship.deleteMany();
  await prisma.expenseFlag.deleteMany();
  await prisma.fxRate.deleteMany();
  await prisma.pushSubscription.deleteMany();
  await prisma.importJob.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.settlement.deleteMany();
  await prisma.recurringExpense.deleteMany();
  await prisma.expenseItem.deleteMany();
  await prisma.expenseSplit.deleteMany();
  await prisma.expensePayer.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.groupMember.deleteMany();
  await prisma.group.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();

  const defaultPassword = await bcrypt.hash('password123', 10);

  // 1. Create Users
  const usersData = [
    { email: 'rohan@example.com', fullName: 'Rohan Mehta', phone: '+919876543210', upiId: 'rohan@okaxis', preferredLanguage: 'en' },
    { email: 'riya@example.com', fullName: 'Riya Sharma', phone: '+919876543211', upiId: 'riya@okhdfcbank', preferredLanguage: 'hi' },
    { email: 'aman@example.com', fullName: 'Aman Gupta', phone: '+919876543212', upiId: 'aman@paytm', preferredLanguage: 'en' },
    { email: 'priya@example.com', fullName: 'Priya Patel', phone: '+919876543213', upiId: 'priya@ybl', preferredLanguage: 'gu' },
    { email: 'vikram@example.com', fullName: 'Vikram Singh', phone: '+919876543214', upiId: 'vikram@upi', preferredLanguage: 'pa' },
    { email: 'kavya@example.com', fullName: 'Kavya Nair', phone: '+919876543215', upiId: 'kavya@okicici', preferredLanguage: 'ml' },
    { email: 'dev@example.com', fullName: 'Dev Sharma', phone: '+919876543216', upiId: 'dev@ibl', preferredLanguage: 'hi' },
    { email: 'ananya@example.com', fullName: 'Ananya Verma', phone: '+919876543217', upiId: 'ananya@postbank', preferredLanguage: 'bn' },
    { email: 'siddharth@example.com', fullName: 'Siddharth Roy', phone: '+919876543218', upiId: 'siddharth@oksbi', preferredLanguage: 'mr' }
  ];

  const createdUsers: Record<string, any> = {};
  for (const u of usersData) {
    const user = await prisma.user.create({
      data: {
        ...u,
        passwordHash: defaultPassword,
        avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(u.fullName)}`
      }
    });
    createdUsers[u.email] = user;
  }

  console.log(`✅ Created ${Object.keys(createdUsers).length} users.`);

  // ==========================================
  // GROUP 1: Goa Beach Trip 2026 (6 Members)
  // ==========================================
  const goaGroup = await prisma.group.create({
    data: {
      name: 'Goa Beach Trip 2026 🌴',
      description: 'Annual college reunion trip to Baga & Anjuna',
      type: GroupType.TRIP,
      baseCurrency: 'INR',
      budgetPaise: BigInt(30000000), // ₹3,00,000 budget
      createdById: createdUsers['rohan@example.com'].id
    }
  });

  const goaUserEmails = ['rohan@example.com', 'riya@example.com', 'aman@example.com', 'priya@example.com', 'vikram@example.com'];
  const goaMembers: Record<string, any> = {};

  for (const email of goaUserEmails) {
    const gm = await prisma.groupMember.create({
      data: {
        groupId: goaGroup.id,
        userId: createdUsers[email].id,
        role: email === 'rohan@example.com' ? Role.ADMIN : Role.MEMBER
      }
    });
    goaMembers[email] = gm;
  }

  // Add 1 Guest member to Goa Trip
  const snehaGuest = await prisma.groupMember.create({
    data: {
      groupId: goaGroup.id,
      isGuest: true,
      guestName: 'Sneha Rao (Guest)',
      guestEmail: 'sneha.guest@example.com',
      role: Role.MEMBER
    }
  });
  goaMembers['guest_sneha'] = snehaGuest;

  const allGoaMemberIds = [
    createdUsers['rohan@example.com'].id,
    createdUsers['riya@example.com'].id,
    createdUsers['aman@example.com'].id,
    createdUsers['priya@example.com'].id,
    createdUsers['vikram@example.com'].id,
    snehaGuest.id // guest id handled in split
  ];

  // 25+ Expenses for Goa Trip
  const goaExpensesData = [
    { title: 'Villa Booking at Baga', amount: 4500000, payer: 'rohan@example.com', cat: 'accommodation' },
    { title: 'Flight Tickets (Round Trip)', amount: 3600000, payer: 'riya@example.com', cat: 'travel' },
    { title: 'Scooty Rental for 4 days', amount: 720000, payer: 'aman@example.com', cat: 'travel' },
    { title: 'Sunset Dinner at Thalassa', amount: 1240000, payer: 'rohan@example.com', cat: 'food' },
    { title: 'Shacks & Drinks at Curlies', amount: 850000, payer: 'priya@example.com', cat: 'entertainment' },
    { title: 'Water Sports at Calangute', amount: 1500000, payer: 'vikram@example.com', cat: 'activities' },
    { title: 'Casino Night Entry & Tokens', amount: 2400000, payer: 'riya@example.com', cat: 'entertainment' },
    { title: 'Breakfast at Infantaria Bakery', amount: 320000, payer: 'aman@example.com', cat: 'food' },
    { title: 'Fuel for Scooties (Petrol)', amount: 240000, payer: 'guest_sneha', cat: 'travel' },
    { title: 'Sunset Cocktails at Antares', amount: 980000, payer: 'rohan@example.com', cat: 'drinks' },
    { title: 'Seafood Feast at Brittos', amount: 1150000, payer: 'priya@example.com', cat: 'food' },
    { title: 'Villa Grocery & Snacks Stock', amount: 640000, payer: 'vikram@example.com', cat: 'groceries' },
    { title: 'Scuba Diving at Grand Island', amount: 2100000, payer: 'riya@example.com', cat: 'activities' },
    { title: 'Cab to Dabolim Airport', amount: 380000, payer: 'aman@example.com', cat: 'travel' },
    { title: 'Goan Cashews & Souvenirs', amount: 450000, payer: 'rohan@example.com', cat: 'shopping' },
    { title: 'Lunch at Martins Corner', amount: 760000, payer: 'priya@example.com', cat: 'food' },
    { title: 'Sunscreen & Beach Gear', amount: 210000, payer: 'vikram@example.com', cat: 'shopping' },
    { title: 'Club Night at Tito Lane', amount: 1420000, payer: 'riya@example.com', cat: 'nightlife' },
    { title: 'Poolside Smoothies & Shakes', amount: 280000, payer: 'aman@example.com', cat: 'drinks' },
    { title: 'Morning Artisanal Coffee', amount: 190000, payer: 'rohan@example.com', cat: 'food' },
    { title: 'Spice Plantation Guided Tour', amount: 840000, payer: 'priya@example.com', cat: 'sightseeing' },
    { title: 'Midnight Pizza & Burger Order', amount: 360000, payer: 'vikram@example.com', cat: 'food' },
    { title: 'Mandovi River DJ Cruise', amount: 1800000, payer: 'riya@example.com', cat: 'entertainment' },
    { title: 'First Aid & Pharmacy Essentials', amount: 120000, payer: 'aman@example.com', cat: 'medical' },
    { title: 'Farewell Gala Dinner at Fisherman Wharf', amount: 1650000, payer: 'rohan@example.com', cat: 'food' }
  ];

  for (const exp of goaExpensesData) {
    const isPayerGuest = exp.payer === 'guest_sneha';
    const payerUserId = isPayerGuest ? null : createdUsers[exp.payer].id;
    const payerGuestId = isPayerGuest ? snehaGuest.id : null;
    const createdById = isPayerGuest ? createdUsers['rohan@example.com'].id : payerUserId!;

    const expense = await prisma.expense.create({
      data: {
        groupId: goaGroup.id,
        title: exp.title,
        totalAmount: BigInt(exp.amount),
        currency: 'INR',
        splitMode: SplitMode.EQUAL,
        category: exp.cat,
        createdById
      }
    });

    // Payer
    await prisma.expensePayer.create({
      data: {
        expenseId: expense.id,
        userId: payerUserId,
        guestMemberId: payerGuestId,
        amountPaise: BigInt(exp.amount)
      }
    });

    // Splits among 6 members equally
    const splitPaise = Math.floor(exp.amount / 6);
    for (const memId of goaUserEmails) {
      await prisma.expenseSplit.create({
        data: {
          expenseId: expense.id,
          userId: createdUsers[memId].id,
          amountPaise: BigInt(splitPaise)
        }
      });
    }
    await prisma.expenseSplit.create({
      data: {
        expenseId: expense.id,
        guestMemberId: snehaGuest.id,
        amountPaise: BigInt(splitPaise)
      }
    });
  }

  console.log(`✅ Created Goa Trip group with ${goaExpensesData.length} expenses.`);

  // ==========================================
  // GROUP 2: Indiranagar Flat #402 (4 Members)
  // ==========================================
  const flatGroup = await prisma.group.create({
    data: {
      name: 'Indiranagar Flat #402 🏠',
      description: 'Shared flat monthly rent & utilities',
      type: GroupType.FLATMATES,
      baseCurrency: 'INR',
      createdById: createdUsers['aman@example.com'].id
    }
  });

  const flatUserEmails = ['aman@example.com', 'rohan@example.com', 'kavya@example.com', 'dev@example.com'];
  for (const email of flatUserEmails) {
    await prisma.groupMember.create({
      data: {
        groupId: flatGroup.id,
        userId: createdUsers[email].id,
        role: email === 'aman@example.com' ? Role.ADMIN : Role.MEMBER
      }
    });
  }

  const flatExpenses = [
    { title: 'Monthly Flat Rent (Oct 2026)', amount: 6000000, payer: 'aman@example.com', cat: 'rent' },
    { title: 'Airtel Fiber Broadband 1Gbps', amount: 150000, payer: 'rohan@example.com', cat: 'wifi' },
    { title: 'Maid & Cook Monthly Salary', amount: 1200000, payer: 'kavya@example.com', cat: 'services' },
    { title: 'BESCOM Electricity Bill', amount: 480000, payer: 'dev@example.com', cat: 'utilities' },
    { title: 'Weekly Grocery & Vegetables', amount: 820000, payer: 'aman@example.com', cat: 'groceries' },
    { title: 'Netflix & Prime Subscriptions', amount: 99900, payer: 'rohan@example.com', cat: 'entertainment' }
  ];

  for (const exp of flatExpenses) {
    const payerId = createdUsers[exp.payer].id;
    const expense = await prisma.expense.create({
      data: {
        groupId: flatGroup.id,
        title: exp.title,
        totalAmount: BigInt(exp.amount),
        currency: 'INR',
        splitMode: SplitMode.EQUAL,
        category: exp.cat,
        createdById: payerId
      }
    });

    await prisma.expensePayer.create({
      data: {
        expenseId: expense.id,
        userId: payerId,
        amountPaise: BigInt(exp.amount)
      }
    });

    const splitPaise = Math.floor(exp.amount / 4);
    for (const email of flatUserEmails) {
      await prisma.expenseSplit.create({
        data: {
          expenseId: expense.id,
          userId: createdUsers[email].id,
          amountPaise: BigInt(splitPaise)
        }
      });
    }
  }

  console.log(`✅ Created Flatmates group with ${flatExpenses.length} expenses.`);

  // ==========================================
  // GROUP 3: Tech Stack Team Lunch (5 Members)
  // ==========================================
  const officeGroup = await prisma.group.create({
    data: {
      name: 'Tech Stack Team Lunches 🍱',
      description: 'Friday team outings and coffee breaks',
      type: GroupType.OFFICE,
      baseCurrency: 'INR',
      createdById: createdUsers['rohan@example.com'].id
    }
  });

  const officeEmails = ['rohan@example.com', 'riya@example.com', 'aman@example.com', 'ananya@example.com', 'siddharth@example.com'];
  for (const email of officeEmails) {
    await prisma.groupMember.create({
      data: {
        groupId: officeGroup.id,
        userId: createdUsers[email].id,
        role: email === 'rohan@example.com' ? Role.ADMIN : Role.MEMBER
      }
    });
  }

  const officeExpenses = [
    { title: 'Friday Meghana Biryani Feast', amount: 450000, payer: 'rohan@example.com', cat: 'food' },
    { title: 'Evening Chai & Samosa Break', amount: 65000, payer: 'ananya@example.com', cat: 'snacks' },
    { title: 'Farewell Cake & Specialty Coffee', amount: 180000, payer: 'siddharth@example.com', cat: 'dessert' }
  ];

  for (const exp of officeExpenses) {
    const payerId = createdUsers[exp.payer].id;
    const expense = await prisma.expense.create({
      data: {
        groupId: officeGroup.id,
        title: exp.title,
        totalAmount: BigInt(exp.amount),
        currency: 'INR',
        splitMode: SplitMode.EQUAL,
        category: exp.cat,
        createdById: payerId
      }
    });

    await prisma.expensePayer.create({
      data: {
        expenseId: expense.id,
        userId: payerId,
        amountPaise: BigInt(exp.amount)
      }
    });

    const splitPaise = Math.floor(exp.amount / 5);
    for (const email of officeEmails) {
      await prisma.expenseSplit.create({
        data: {
          expenseId: expense.id,
          userId: createdUsers[email].id,
          amountPaise: BigInt(splitPaise)
        }
      });
    }
  }

  console.log(`✅ Created Office group with ${officeExpenses.length} expenses.`);

  // ==========================================
  // 4. Friend Ledger & Personal Loans / IOUs
  // ==========================================
  await prisma.friendship.createMany({
    data: [
      { userId: createdUsers['rohan@example.com'].id, friendId: createdUsers['aman@example.com'].id, status: 'ACCEPTED' },
      { userId: createdUsers['rohan@example.com'].id, friendId: createdUsers['riya@example.com'].id, status: 'ACCEPTED' },
      { userId: createdUsers['aman@example.com'].id, friendId: createdUsers['priya@example.com'].id, status: 'ACCEPTED' }
    ]
  });

  await prisma.loan.create({
    data: {
      lenderId: createdUsers['rohan@example.com'].id,
      borrowerId: createdUsers['aman@example.com'].id,
      amountPaise: BigInt(250000), // ₹2,500
      currency: 'INR',
      notes: 'Weekend music festival pass advance',
      dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000)
    }
  });

  await prisma.loan.create({
    data: {
      lenderId: createdUsers['riya@example.com'].id,
      borrowerId: createdUsers['rohan@example.com'].id,
      amountPaise: BigInt(120000), // ₹1,200
      currency: 'INR',
      notes: 'Bookstore architectural design books',
      dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000)
    }
  });

  // Recurring expense for flatmates
  await prisma.recurringExpense.create({
    data: {
      groupId: flatGroup.id,
      title: 'Indiranagar Flat Monthly Rent',
      amountPaise: BigInt(6000000),
      currency: 'INR',
      category: 'rent',
      schedule: 'MONTHLY',
      nextRunAt: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
      active: true
    }
  });

  // Seed FX rates
  await prisma.fxRate.createMany({
    data: [
      { fromCurrency: 'USD', toCurrency: 'INR', rate: 83.5 },
      { fromCurrency: 'EUR', toCurrency: 'INR', rate: 91.2 },
      { fromCurrency: 'GBP', toCurrency: 'INR', rate: 107.8 }
    ]
  });

  console.log('✅ Created Friendships, Loans, Recurring Expenses, and FX Rates.');
  console.log('🎉 Database seeding complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
