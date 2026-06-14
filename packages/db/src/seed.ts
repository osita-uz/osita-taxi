import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const CITIES = [
  { name: "Toshkent", slug: "toshkent" },
  { name: "Samarqand", slug: "samarqand" },
  { name: "Buxoro", slug: "buxoro" },
  { name: "Namangan", slug: "namangan" },
  { name: "Andijon", slug: "andijon" },
  { name: "Farg'ona", slug: "fargona" },
  { name: "Qarshi", slug: "qarshi" },
  { name: "Termiz", slug: "termiz" },
  { name: "Nukus", slug: "nukus" },
  { name: "Urganch", slug: "urganch" },
  { name: "Jizzax", slug: "jizzax" },
  { name: "Navoiy", slug: "navoiy" },
  { name: "Sirdaryo", slug: "sirdaryo" },
  { name: "Guliston", slug: "guliston" },
  { name: "Muborak", slug: "muborak" },
];

async function main() {
  console.log("Seeding cities...");

  for (const city of CITIES) {
    await prisma.city.upsert({
      where: { slug: city.slug },
      update: {},
      create: city,
    });
  }

  const cities = await prisma.city.findMany({ orderBy: { id: "asc" } });
  console.log(`Created ${cities.length} cities`);

  console.log("Seeding routes (bidirectional)...");
  let routeCount = 0;

  for (let i = 0; i < cities.length; i++) {
    for (let j = 0; j < cities.length; j++) {
      if (i === j) continue;
      await prisma.route.upsert({
        where: {
          fromCityId_toCityId: {
            fromCityId: cities[i].id,
            toCityId: cities[j].id,
          },
        },
        update: {},
        create: {
          fromCityId: cities[i].id,
          toCityId: cities[j].id,
        },
      });
      routeCount++;
    }
  }

  console.log(`Created ${routeCount} routes`);
  console.log("Seed completed.");
}

main()
  .catch(console.error)
  .finally(() => pool.end());
