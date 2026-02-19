import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Enable pgvector extension
  await prisma.$executeRaw`CREATE EXTENSION IF NOT EXISTS vector`;
  console.log('pgvector extension enabled');
}

main()
  .then(() => process.exit(0))
  .catch(e => { console.error(e); process.exit(1); });
