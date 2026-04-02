import { PrismaClient } from "@prisma/client";
import { hashPassword } from "better-auth/crypto";
import { webcrypto } from "node:crypto";

const prisma = new PrismaClient();

// Ensure crypto is available globally for better-auth
const g = globalThis as unknown as { crypto?: unknown };
if (!g.crypto) g.crypto = webcrypto as unknown;

async function fixAdminPassword() {
  const email = "admin@rafed.gov.sa";
  const password = "password123";

  console.log(`🔧 Fixing password for ${email}...\n`);

  try {
    // Find the user
    const user = await prisma.user.findFirst({
      where: { email, deletedAt: null },
      include: { accounts: true },
    });

    if (!user) {
      console.error(`❌ User ${email} not found!`);
      console.log("   Run the seed script first to create the user.");
      process.exit(1);
    }

    console.log(`✅ Found user: ${user.name} (${user.id})`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Org: ${user.orgId}\n`);

    // Hash password using better-auth's hashPassword
    const passwordHash = await hashPassword(password);
    console.log(`🔑 Generated new password hash`);

    // Update user's hashedPassword field
    await prisma.user.update({
      where: { id: user.id },
      data: { hashedPassword: passwordHash },
    });
    console.log(`✅ Updated user.hashedPassword`);

    // Update or create account record
    const account = user.accounts.find((a) => a.providerId === "credential");
    if (account) {
      await prisma.account.update({
        where: { id: account.id },
        data: { password: passwordHash },
      });
      console.log(`✅ Updated account password`);
    } else {
      await prisma.account.create({
        data: {
          userId: user.id,
          providerId: "credential",
          accountId: user.id,
          password: passwordHash,
        },
      });
      console.log(`✅ Created credential account`);
    }

    console.log(`\n🎉 Password fix complete!`);
    console.log(`\n🔑 Login credentials:`);
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${password}`);
    console.log(`\n📍 Try logging in at: http://localhost:3000/ar/auth/login`);

  } catch (error) {
    console.error("❌ Error fixing password:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

fixAdminPassword()
  .then(() => {
    console.log("\n✨ Done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Failed:", error);
    process.exit(1);
  });
