// Temporary script to check database
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkData() {
  try {
    // Count total entities
    const totalEntities = await prisma.entity.count({
      where: { deletedAt: null }
    });
    
    // Count by RAG status
    const entities = await prisma.entity.findMany({
      where: { deletedAt: null },
      include: {
        values: {
          where: { status: { in: ['APPROVED', 'LOCKED'] } },
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { achievementValue: true }
        }
      }
    });
    
    let green = 0, amber = 0, red = 0, noData = 0;
    for (const e of entities) {
      const ach = e.values[0]?.achievementValue;
      if (ach == null) noData++;
      else if (ach >= 80) green++;
      else if (ach >= 60) amber++;
      else red++;
    }
    
    // Count pending approvals
    const pending = await prisma.entityValue.count({
      where: { entity: { deletedAt: null }, status: 'SUBMITTED' }
    });
    
    console.log({
      totalEntities,
      green,
      amber,
      red,
      noData,
      pending,
      withData: entities.filter(e => e.values[0]?.achievementValue != null).length
    });
    
  } catch (e) {
    console.error('Error:', e);
  } finally {
    await prisma.$disconnect();
  }
}

checkData();
