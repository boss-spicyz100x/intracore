import { drizzle } from "drizzle-orm/bun-sql";
import { companies, employees } from "./schema.postgres";

const COMPANY_ID = "019694e0-1b80-7000-8000-000000000001";
const EMP_001_ID = "019694e0-1b80-7000-8000-000000000002";
const EMP_002_ID = "019694e0-1b80-7000-8000-000000000003";
const EMP_003_ID = "019694e0-1b80-7000-8000-000000000004";
const EMP_004_ID = "019694e0-1b80-7000-8000-000000000005";

const db = drizzle({
  connection: process.env.DATABASE_URL!,
  schema: { companies, employees },
} as any);

const now = new Date().toISOString();

await db
  .insert(companies)
  .values({
    id: COMPANY_ID,
    slug: "HDX",
    name: "100x",
    description: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  })
  .onConflictDoNothing();

await db
  .insert(employees)
  .values([
    {
      id: EMP_001_ID,
      employeeNumber: 1,
      fullName: "Nutchanon Phongeon",
      email: "earth@100x.fi",
      phoneNumber: "+66620260001",
      department: "IT",
      role: "Manager",
      preferredLanguage: "th-TH",
      companyId: COMPANY_ID,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    },
    {
      id: EMP_002_ID,
      employeeNumber: 2,
      fullName: "Supachai Kheawjuy",
      email: "boss.spicyz@100x.fi",
      phoneNumber: "+66620260002",
      department: "IT",
      role: "Engineer",
      preferredLanguage: "th-TH",
      companyId: COMPANY_ID,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    },
    {
      id: EMP_003_ID,
      employeeNumber: 3,
      fullName: "Patchanee Srisuk",
      email: "patchanee@100x.fi",
      phoneNumber: "+66620260003",
      department: "FACILITIES",
      role: "Engineer",
      preferredLanguage: "en-US",
      companyId: COMPANY_ID,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    },
    {
      id: EMP_004_ID,
      employeeNumber: 4,
      fullName: "Thanakorn Wongsa",
      email: "thanakorn@100x.fi",
      phoneNumber: "+66620260004",
      department: "IT",
      role: "Engineer",
      preferredLanguage: "en-US",
      companyId: COMPANY_ID,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    },
  ])
  .onConflictDoNothing();

console.log("Seed complete.");
