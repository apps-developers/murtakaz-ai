import { PrismaClient, Role } from "@prisma/client";
import { hashPassword } from "better-auth/crypto";
import { webcrypto } from "node:crypto";

const prisma = new PrismaClient();

// Ensure crypto is available globally for better-auth
const g = globalThis as unknown as { crypto?: unknown };
if (!g.crypto) g.crypto = webcrypto as unknown;

async function createRafedAdmin() {
  const email = "admin@rafed.gov.sa";
  const password = "password123";
  const domain = "rafed.gov.sa";

  console.log(`👤 Creating RAFED Admin user: ${email}...\n`);

  try {
    // Find RAFED organization
    const org = await prisma.organization.findFirst({
      where: { domain, deletedAt: null },
    });

    if (!org) {
      console.error(`❌ Organization with domain ${domain} not found!`);
      process.exit(1);
    }

    console.log(`📋 Organization: ${org.name} (${org.id})\n`);

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: { orgId: org.id, email, deletedAt: null },
      include: { accounts: true },
    });

    const passwordHash = await hashPassword(password);

    if (existingUser) {
      console.log("⚠️  User exists, updating password...");
      
      await prisma.user.update({
        where: { id: existingUser.id },
        data: { hashedPassword: passwordHash },
      });

      const account = existingUser.accounts.find((a) => a.providerId === "credential");
      if (account) {
        await prisma.account.update({
          where: { id: account.id },
          data: { password: passwordHash },
        });
      } else {
        await prisma.account.create({
          data: {
            userId: existingUser.id,
            providerId: "credential",
            accountId: existingUser.id,
            password: passwordHash,
          },
        });
      }

      console.log("✅ Admin user password updated!");
    } else {
      // Create new user
      const user = await prisma.user.create({
        data: {
          orgId: org.id,
          email,
          name: "RAFED Administrator",
          role: Role.ADMIN,
          title: "System Administrator",
          emailVerified: true,
          hashedPassword: passwordHash,
        },
      });

      await prisma.account.create({
        data: {
          userId: user.id,
          providerId: "credential",
          accountId: user.id,
          password: passwordHash,
        },
      });

      console.log(`✅ Admin user created!`);
      console.log(`   ID: ${user.id}`);
    }

    console.log(`\n🔑 Login credentials:`);
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${password}`);
    console.log(`\n📍 Login at: http://localhost:3000/ar/auth/login`);

  } catch (error) {
    console.error("❌ Error:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

createRafedAdmin()
  .then(() => {
    console.log("\n✨ Done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Failed:", error);
    process.exit(1);
  });
