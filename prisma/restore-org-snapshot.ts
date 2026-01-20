import { PrismaClient } from "@prisma/client";
import * as fs from "node:fs";
import * as path from "node:path";
import { webcrypto } from "node:crypto";
import { hashPassword } from "better-auth/crypto";

const prisma = new PrismaClient();

// Ensure WebCrypto exists for better-auth password hashing
const g = globalThis as unknown as { crypto?: unknown };
if (!g.crypto) g.crypto = webcrypto as unknown;

type Snapshot = {
  timestamp: string;
  version: string;
  data: {
    organization: any;
    orgEntityTypes: any[];
    users: any[];
    entities: Array<
      any & {
        variables?: Array<any & { values?: any[] }>;
        values?: any[];
      }
    >;
  };
};

function readSnapshot(filePath: string): Snapshot {
  const abs = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
  const raw = fs.readFileSync(abs, "utf8");
  return JSON.parse(raw) as Snapshot;
}

async function wipeOrg(orgId: string) {
  // order matters (FK constraints)
  await prisma.entityVariableValue.deleteMany({ where: { entityValue: { entity: { orgId } } } });
  await prisma.entityValue.deleteMany({ where: { entity: { orgId } } });
  await prisma.entityVariable.deleteMany({ where: { entity: { orgId } } });
  await prisma.userEntityAssignment.deleteMany({ where: { entity: { orgId } } });
  await prisma.entity.deleteMany({ where: { orgId } });

  await prisma.changeApproval.deleteMany({ where: { changeRequest: { orgId } } });
  await prisma.changeRequest.deleteMany({ where: { orgId } });

  await prisma.userPreference.deleteMany({ where: { user: { orgId } } });
  await prisma.session.deleteMany({ where: { user: { orgId } } });
  await prisma.account.deleteMany({ where: { user: { orgId } } });

  await prisma.user.deleteMany({ where: { orgId } });
  await prisma.orgEntityType.deleteMany({ where: { orgId } });
  await prisma.organization.deleteMany({ where: { id: orgId } });
}

function stripDates<T extends Record<string, any>>(obj: T) {
  const copy: Record<string, any> = { ...obj };
  delete copy.createdAt;
  delete copy.updatedAt;
  delete copy.deletedAt;
  delete copy.password;
  return copy;
}

async function main() {
  const snapshotPath = process.env.SNAPSHOT_FILE;
  if (!snapshotPath) {
    throw new Error("Missing SNAPSHOT_FILE env var (path to snapshot json)");
  }

  const snapshot = readSnapshot(snapshotPath);
  const domain = snapshot.data.organization?.domain ?? process.env.SEED_ORG_DOMAIN ?? "almousa.local";

  // Wipe existing org if present
  const existing = await prisma.organization.findFirst({ where: { domain, deletedAt: null }, select: { id: true } });
  if (existing) {
    console.log(`🧹 Wiping existing org: ${domain} (${existing.id})`);
    await wipeOrg(existing.id);
  }

  const defaultPassword = process.env.SEED_DEFAULT_PASSWORD ?? "password123";
  const passwordHash = await hashPassword(defaultPassword);

  // Recreate org exactly (preserve IDs)
  const orgInput = stripDates(snapshot.data.organization);
  await prisma.organization.create({ data: orgInput as any });

  for (const t of snapshot.data.orgEntityTypes ?? []) {
    const typeInput = stripDates(t);
    await prisma.orgEntityType.create({ data: typeInput as any });
  }

  // Users first
  for (const u of snapshot.data.users ?? []) {
    const userInput = stripDates(u);
    // always reset password on restore (safer and deterministic)
    userInput.hashedPassword = passwordHash;
    await prisma.user.create({ data: userInput as any });

    await prisma.account.create({
      data: {
        userId: userInput.id,
        providerId: "credential",
        accountId: userInput.id,
        password: passwordHash,
      },
    });
  }

  // Entities next
  for (const e of snapshot.data.entities ?? []) {
    const { variables, values, ...entity } = e;
    const entityInput = stripDates(entity);
    await prisma.entity.create({ data: entityInput as any });

    // Variables (no values yet)
    for (const v of variables ?? []) {
      const { values: variableValues, ...variable } = v;
      const variableInput = stripDates(variable);
      await prisma.entityVariable.create({ data: variableInput as any });

      // Variable values require entity values; we will insert them after entity values
      void variableValues;
    }

    // Entity values
    for (const ev of values ?? []) {
      const evInput = stripDates(ev);
      await prisma.entityValue.create({ data: evInput as any });
    }
  }

  // Finally variable values (need entityValueId + entityVariableId)
  for (const e of snapshot.data.entities ?? []) {
    for (const v of e.variables ?? []) {
      for (const vv of v.values ?? []) {
        const vvInput = stripDates(vv);
        await prisma.entityVariableValue.create({ data: vvInput as any });
      }
    }
  }

  console.log(`✅ Restored snapshot for org: ${domain}`);
  console.log(`Password reset to: ${defaultPassword}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
