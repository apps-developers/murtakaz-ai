import { PrismaClient } from "@prisma/client";
import * as fs from "node:fs";
import * as path from "node:path";

const prisma = new PrismaClient();

function nowTimestamp() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}`;
}

function safeFilenamePart(input: string) {
  return String(input).trim().toLowerCase().replace(/[^a-z0-9]+/g, "_");
}

async function main() {
  const domain = process.env.SEED_ORG_DOMAIN ?? "almousa.local";
  const org = await prisma.organization.findFirst({
    where: { domain, deletedAt: null },
  });

  if (!org) {
    throw new Error(`Organization not found for domain: ${domain}`);
  }

  const orgEntityTypes = await prisma.orgEntityType.findMany({
    where: { orgId: org.id },
    orderBy: [{ sortOrder: "asc" }, { code: "asc" }],
  });

  const users = await prisma.user.findMany({
    where: { orgId: org.id, deletedAt: null },
    orderBy: [{ createdAt: "asc" }, { email: "asc" }],
  });

  const entities = await prisma.entity.findMany({
    where: { orgId: org.id, deletedAt: null },
    orderBy: [{ createdAt: "asc" }, { key: "asc" }],
    include: {
      variables: {
        include: {
          values: true,
        },
        orderBy: [{ code: "asc" }],
      },
      values: {
        orderBy: [{ createdAt: "asc" }],
      },
    },
  });

  const snapshot = {
    timestamp: nowTimestamp(),
    version: "2.0",
    data: {
      organization: org,
      orgEntityTypes,
      users: users.map((u) => ({
        ...u,
        hashedPassword: null,
        password: "[REDACTED]",
      })),
      entities,
    },
  };

  const outDir = path.join(process.cwd(), "data", "backups");
  fs.mkdirSync(outDir, { recursive: true });

  const fileName = process.env.SNAPSHOT_OUT_FILE
    ? path.basename(process.env.SNAPSHOT_OUT_FILE)
    : `seed_snapshot_${safeFilenamePart(domain)}_${snapshot.timestamp}.json`;

  const outPath = process.env.SNAPSHOT_OUT_FILE
    ? path.isAbsolute(process.env.SNAPSHOT_OUT_FILE)
      ? process.env.SNAPSHOT_OUT_FILE
      : path.join(process.cwd(), process.env.SNAPSHOT_OUT_FILE)
    : path.join(outDir, fileName);

  fs.writeFileSync(outPath, JSON.stringify(snapshot, null, 2) + "\n", "utf8");

  console.log(`✅ Snapshot exported: ${outPath}`);
  console.log(`Org: ${org.domain} (${org.id})`);
  console.log(`Entities: ${entities.length}`);
  console.log(`Users: ${users.length}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
