import { PrismaClient, Role, AccountType } from "@prisma/client";
import argon2 from "argon2";
import { prisma } from "../src/lib/prisma";
import { generateAccountNumber, generateCustomerId } from "../src/lib/money";

async function seed() {
  console.log("🌱 Seeding SecureBank database...");

  const adminPassword = await argon2.hash("Admin@1234", { type: argon2.argon2id });
  const tellerPassword = await argon2.hash("Teller@1234", { type: argon2.argon2id });
  const customerPassword = await argon2.hash("Customer@1234", { type: argon2.argon2id });

  const admin = await prisma.user.upsert({
    where: { email: "admin@securebank.dev" },
    update: {},
    create: {
      fullName: "System Administrator",
      email: "admin@securebank.dev",
      passwordHash: adminPassword,
      role: Role.ADMIN,
      customerId: generateCustomerId(),
    },
  });

  const teller = await prisma.user.upsert({
    where: { email: "teller@securebank.dev" },
    update: {},
    create: {
      fullName: "Jane Teller",
      email: "teller@securebank.dev",
      passwordHash: tellerPassword,
      role: Role.TELLER,
      customerId: generateCustomerId(),
    },
  });

  const customer = await prisma.user.upsert({
    where: { email: "customer@securebank.dev" },
    update: {},
    create: {
      fullName: "Alice Customer",
      email: "customer@securebank.dev",
      passwordHash: customerPassword,
      role: Role.CUSTOMER,
      customerId: generateCustomerId(),
      accounts: {
        create: [
          {
            accountNumber: generateAccountNumber(),
            accountType: AccountType.CHECKING,
            balance: 5000,
          },
          {
            accountNumber: generateAccountNumber(),
            accountType: AccountType.SAVINGS,
            balance: 15000,
          },
        ],
      },
    },
  });

  console.log("✅ Seed complete:");
  console.log(`   Admin   → admin@securebank.dev / Admin@1234`);
  console.log(`   Teller  → teller@securebank.dev / Teller@1234`);
  console.log(`   Customer→ customer@securebank.dev / Customer@1234`);
  console.log(`   Customer ID: ${customer.customerId}`);

  await prisma.$disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
