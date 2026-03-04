/**
 * Import data from Book1.csv (no header).
 * Columns: date, client(s), count, type, location, price, status
 * Example: 1/27/25,Monette Mishan,1,Single,Home Visit,$250.00 ,Paid
 */
import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";
import { parse } from "csv-parse/sync";

const prisma = new PrismaClient();

function parseDate(dateStr: string): Date {
  const parts = dateStr.trim().split("/");
  if (parts.length !== 3) return new Date(dateStr);
  const [month, day, year] = parts.map((p) => parseInt(p, 10));
  const fullYear = year < 100 ? 2000 + year : year;
  return new Date(fullYear, month - 1, day);
}

function parsePrice(priceStr: string): number {
  const cleaned = priceStr.replace(/[$,]/g, "").trim();
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

function getClientNames(clientCell: string, count: number): string[] {
  const s = (clientCell || "").trim();
  if (!s) return [];
  if (count === 2) {
    return s.split(",").map((n) => n.trim()).filter(Boolean);
  }
  return [s];
}

async function main() {
  const csvPath = process.argv[2] || path.join(process.cwd(), "Book1.csv");
  if (!fs.existsSync(csvPath)) {
    console.error("File not found:", csvPath);
    console.error("Usage: npx ts-node prisma/import-book1.ts [path/to/Book1.csv]");
    process.exit(1);
  }

  let content = fs.readFileSync(csvPath, "utf-8");
  if (content.charCodeAt(0) === 0xfeff) content = content.slice(1);

  const rows = parse(content, {
    columns: false,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
  }) as string[][];

  console.log(`Read ${rows.length} rows from ${csvPath}`);

  // Infer columns: date, client(s), count, type, location, price, status
  const records: { date: string; clients: string; count: number; type: string; location: string; price: string; status: string }[] = [];
  for (const row of rows) {
    if (row.length < 6) continue;
    const [date, clients, countStr, type, location, price, status] = row;
    const count = parseInt(String(countStr || "1"), 10) || 1;
    records.push({
      date: String(date ?? "").trim(),
      clients: String(clients ?? "").trim(),
      count,
      type: String(type ?? "Single").trim(),
      location: String(location ?? "In-Studio").trim(),
      price: String(price ?? "0").trim(),
      status: String(status ?? "Paid").trim(),
    });
  }

  const uniqueNames = new Set<string>();
  for (const r of records) {
    const names = getClientNames(r.clients, r.count);
    names.forEach((n) => uniqueNames.add(n));
  }

  console.log(`Unique client names: ${uniqueNames.size}`);

  await prisma.scheduledParticipant.deleteMany({});
  await prisma.session.deleteMany({});
  await prisma.client.deleteMany({});

  const nameToId = new Map<string, string>();

  for (const name of uniqueNames) {
    const client = await prisma.client.create({
      data: {
        name,
        email: null,
        status: "Active",
        classPackBalance: 0,
      },
    });
    nameToId.set(name, client.id);
  }

  console.log(`Created ${nameToId.size} clients. Creating sessions...`);

  const toCreate: { date: Date; type: string; location: string; price: number; isPaid: boolean; clientIds: string[] }[] = [];
  let skipped = 0;

  for (const r of records) {
    if (!r.date) {
      skipped++;
      continue;
    }
    const names = getClientNames(r.clients, r.count);
    const clientIds = names.map((n) => nameToId.get(n)).filter(Boolean) as string[];
    if (clientIds.length === 0) {
      skipped++;
      continue;
    }
    toCreate.push({
      date: parseDate(r.date),
      type: r.type || "Single",
      location: r.location || "In-Studio",
      price: parsePrice(r.price),
      isPaid: r.status.toLowerCase() === "paid",
      clientIds,
    });
  }

  await prisma.$transaction(
    async (tx) => {
      for (const s of toCreate) {
        await tx.session.create({
          data: {
            date: s.date,
            type: s.type,
            location: s.location,
            price: s.price,
            isPaid: s.isPaid,
            clients: { connect: s.clientIds.map((id) => ({ id })) },
          },
        });
      }
    },
    { timeout: 120_000 }
  );

  console.log(`\nDone. Created ${toCreate.length} sessions, skipped ${skipped} rows.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
