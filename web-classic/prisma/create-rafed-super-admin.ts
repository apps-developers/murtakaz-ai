import { PrismaClient } from "@prisma/client";
import { auth } from "../src/lib/auth";

const prisma = new PrismaClient();

async function createRafedSuperAdmin() {
  console.log("👤 Creating RAFED Super Admin user...\n");

  try {
    // RAFED domain
    const domain = "rafed.gov.sa";
    const email = "superadmin@rafed.gov.sa";
    const password = "password123";
    const name = "RAFED Super Admin";

    // Find RAFED organization
    const org = await prisma.organization.findFirst({
      where: { domain, deletedAt: null },
    });

    if (!org) {
      console.error("❌ RAFED organization not found. Please seed RAFED data first.");
      console.log("   Run: pnpm db:seed-rafed");
      process.exit(1);
    }

    console.log(`📋 Organization: ${org.name}`);
    console.log(`📧 Email: ${email}`);
    console.log(`👤 Name: ${name}\n`);

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        orgId: org.id,
        email,
        deletedAt: null,
      },
    });

    if (existingUser) {
      console.log("⚠️  User already exists, updating role to SUPER_ADMIN...");
      
      const updated = await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          name,
          role: "SUPER_ADMIN",
          title: "Super Admin",
        },
      });

      console.log("✅ RAFED Super Admin user updated successfully!");
      console.log(`   ID: ${updated.id}`);
      console.log(`   Email: ${updated.email}`);
      console.log(`   Role: ${updated.role}\n`);
    } else {
      // Create user using better-auth API
      const result = await auth.api.signUpEmail({
        body: {
          email,
          password,
          name,
          role: "SUPER_ADMIN",
          orgId: org.id,
        },
      });

      await prisma.user.update({
        where: { id: result.user.id },
        data: {
          title: "Super Admin",
        },
      });

      console.log("✅ RAFED Super Admin user created successfully!");
      console.log(`   ID: ${result.user.id}`);
      console.log(`   Email: ${result.user.email}`);
      console.log(`   Role: ${result.user.role}\n`);
    }

    console.log("🔑 Login credentials:");
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${password}`);
    console.log("\n📍 Access Settings:");
    console.log("   Login → Super Admin → Settings (to toggle AI/Diagrams/Advanced features)");
  } catch (error) {
    console.error("❌ Error creating RAFED super admin:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

createRafedSuperAdmin()
  .then(() => {
    console.log("\n✨ Done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Failed:", error);
    process.exit(1);
  });
