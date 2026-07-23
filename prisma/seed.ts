import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import bcrypt from "bcrypt";

const connectionString = process.env.DATABASE_URL!;

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const seedUsers = [
  { email: "alice@example.com", name: "Alice", password: "password" },
  { email: "bob@example.com", name: "Bob", password: "password" },
  { email: "carol@example.com", name: "Carol", password: "password" },
  { email: "dave@example.com", name: "Dave", password: "password" },
];

async function main() {
  for (const u of seedUsers) {
    const passwordHash = await bcrypt.hash(u.password, 10);
    await prisma.user.upsert({
      where: { email: u.email },
      update: { name: u.name, passwordHash },
      create: {
        email: u.email,
        name: u.name,
        passwordHash,
      },
    });
    console.log(`Seeded user: ${u.email}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
