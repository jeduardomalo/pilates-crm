import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";
import { parse } from "csv-parse/sync";

const prisma = new PrismaClient();

type CsvRecord = Record<string, string | undefined>;

async function main() {
  // Clear existing clients and sessions so we can re-import from CSV (order matters for FKs)
  await prisma.scheduledParticipant.deleteMany({});
  await prisma.session.deleteMany({});
  await prisma.client.deleteMany({});

  const csvFilePath = path.join(process.cwd(), "data.csv");
  let fileContent = fs.readFileSync(csvFilePath, "utf-8");
  
  // Remove BOM if present
  if (fileContent.charCodeAt(0) === 0xFEFF) {
    fileContent = fileContent.slice(1);
  }

  const records = parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as CsvRecord[];

  console.log(`Found ${records.length} rows to process.`);

  // 1. Extract unique individual clients
  const uniqueIndividualClients = new Set<string>();
  records.forEach((record: CsvRecord) => {
    const rawClients = record["Client(s)"];
    if (rawClients) {
      const names = rawClients.split(",").map((n: string) => n.trim());
      names.forEach((name: string) => {
        if (name && name.toLowerCase() !== "unknown") {
          uniqueIndividualClients.add(name);
        }
      });
    }
  });

  console.log(`Found ${uniqueIndividualClients.size} unique individual clients.`);

  // 2. Create Clients
  const clientMap = new Map<string, string>(); // Name -> ID

  for (const clientName of uniqueIndividualClients) {
    const email = `${clientName.replace(/[^a-zA-Z0-9]/g, '.').toLowerCase()}@example.com`;
    const client = await prisma.client.create({
      data: {
        name: clientName,
        email: email,
        status: "Active",
        classPackBalance: 0, // Will be updated after processing all sessions
      },
    });
    clientMap.set(clientName, client.id);
  }

  // 3. Process sessions and track class pack balances
  // First, we need to determine final class pack balance for each client
  const clientFinalBalances = new Map<string, number>();
  
  // Process records in chronological order to track balance changes
  const sortedRecords = [...records].sort((a: CsvRecord, b: CsvRecord) => {
    const dateA = parseDate(String(a["Date"] ?? a["\ufeffDate"] ?? ""));
    const dateB = parseDate(String(b["Date"] ?? b["\ufeffDate"] ?? ""));
    return dateA.getTime() - dateB.getTime();
  });

  for (const record of sortedRecords) {
    const rawClients = record["Client(s)"];
    if (!rawClients) continue;

    const names = rawClients.split(",").map((n: string) => n.trim()).filter((n: string) => n && n.toLowerCase() !== "unknown");
    
    for (const name of names) {
      const details = (record["Details"] || "").trim();
      const priceStr = record["Paid Per Person"] || "0";
      const price = parseFloat(priceStr.replace(/[^0-9.-]+/g, ""));
      
      // Check if this is a package purchase (high price + "Class Pack Left" in details)
      const isPackagePurchase = price > 100 && details.toLowerCase().includes("class pack left");
      
      if (isPackagePurchase) {
        // Extract the number from "X - Class Pack Left"
        const match = details.match(/(\d+)\s*-\s*Class Pack Left/i);
        if (match) {
          const packSize = parseInt(match[1]);
          clientFinalBalances.set(name, packSize);
        }
      } else if (details.toLowerCase().includes("class pack left")) {
        // This is a class being used from a pack - extract remaining balance
        const match = details.match(/(\d+)\s*-\s*Class Pack Left/i);
        if (match) {
          const remaining = parseInt(match[1]);
          clientFinalBalances.set(name, remaining);
        }
      }
    }
  }

  // 4. Update client class pack balances
  for (const [clientName, balance] of clientFinalBalances.entries()) {
    const clientId = clientMap.get(clientName);
    if (clientId) {
      await prisma.client.update({
        where: { id: clientId },
        data: { classPackBalance: balance },
      });
    }
  }

  // 5. Create Sessions
  let sessionsCreated = 0;
  let sessionsWithErrors = 0;

  for (const record of records) {
    const rawClients = record["Client(s)"];
    if (!rawClients) continue;

    const names = rawClients.split(",").map((n: string) => n.trim()).filter((n: string) => n && n.toLowerCase() !== "unknown");
    const clientIds = names
      .map((name: string) => clientMap.get(name))
      .filter((id: string | undefined): id is string => !!id);

    if (clientIds.length === 0) continue;

    const dateStr = record["Date"] || record["\ufeffDate"];
    if (!dateStr) {
      sessionsWithErrors++;
      continue;
    }

    const priceStr = record["Paid Per Person"] || "0";
    const statusStr = (record["Paid Status"] || "").trim();
    const details = (record["Details"] || "").trim();
    
    const price = parseFloat(priceStr.replace(/[^0-9.-]+/g, ""));
    
    // Parse date - handle M/D/YYYY format
    let date: Date;
    try {
      const [month, day, year] = dateStr.split("/");
      if (month && day && year) {
        date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      } else {
        date = new Date(dateStr);
      }
      if (isNaN(date.getTime())) {
        sessionsWithErrors++;
        continue;
      }
    } catch (e) {
      sessionsWithErrors++;
      continue;
    }

    // Handle paid status: "Paid" = true, empty or "Unpaid" = false
    const isPaid = statusStr.toLowerCase() === "paid";

    // Determine session type
    let sessionType = (record["Class Type"] || "Single").trim();
    
    // Check if this is a package purchase (high price + "Class Pack Left" in details)
    const isPackagePurchase = price > 100 && details.toLowerCase().includes("class pack left");
    if (isPackagePurchase) {
      sessionType = "Package Purchase";
    }

    try {
      await prisma.session.create({
        data: {
          date: date,
          type: sessionType,
          location: (record["Location"] || "In-Studio").trim(),
          price: isNaN(price) ? 0 : price,
          isPaid: isPaid,
          clients: {
            connect: clientIds.map((id: string) => ({ id }))
          }
        },
      });
      sessionsCreated++;
    } catch (error: unknown) {
      console.error(`Error creating session for ${dateStr}:`, error instanceof Error ? error.message : error);
      sessionsWithErrors++;
    }
  }

  console.log(`\nSummary:`);
  console.log(`- Created ${sessionsCreated} sessions`);
  console.log(`- Errors: ${sessionsWithErrors} sessions`);
  console.log(`- Total clients: ${uniqueIndividualClients.size}`);
  console.log(`- Clients with package balances set: ${clientFinalBalances.size}`);
}

function parseDate(dateStr: string): Date {
  const [month, day, year] = dateStr.split("/");
  if (month && day && year) {
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  }
  return new Date(dateStr);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
