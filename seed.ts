// prisma/seed.ts
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const STAGES = [
  { id: 1, name: 'New',             probability: 0.10, sortOrder: 1 },
  { id: 2, name: 'Under Review',    probability: 0.20, sortOrder: 2 },
  { id: 3, name: 'LOI Submitted',   probability: 0.35, sortOrder: 3 },
  { id: 4, name: 'LOI Accepted',    probability: 0.50, sortOrder: 4 },
  { id: 5, name: 'Due Diligence',   probability: 0.65, sortOrder: 5 },
  { id: 6, name: 'Under Contract',  probability: 0.80, sortOrder: 6 },
  { id: 7, name: 'Closed',          probability: 1.00, sortOrder: 7 },
  { id: 8, name: 'Lost / Dead',     probability: 0.00, sortOrder: 8 },
]

async function main() {
  console.log('Seeding pipeline stages...')
  for (const stage of STAGES) {
    await prisma.pipelineStage.upsert({
      where: { id: stage.id },
      update: stage,
      create: stage,
    })
  }

  console.log('Creating admin user...')
  const hash = await bcrypt.hash('admin123', 12)
  await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      name: 'Admin User',
      email: 'admin@example.com',
      passwordHash: hash,
      role: 'ADMIN',
    },
  })

  console.log('Seed complete.')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
