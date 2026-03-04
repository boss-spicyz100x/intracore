import { drizzle } from "drizzle-orm/bun-sql";
import { companies, employees } from "./schema.postgres";

const COMPANY_ID = "019cb6f6-0779-70b0-8476-587694f7e6aa";
const EMP_001_ID = "019cb6f6-077b-752d-a4d9-62f15e5e5240";
const EMP_002_ID = "019cb6f6-077b-752d-a4d9-66f8e05f09a3";
const EMP_003_ID = "019cb6f6-077b-752d-a4d9-69cfcae5d50e";
const EMP_004_ID = "019cb6f6-077b-752d-a4d9-6ec2aa1e43c5";

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
      employeeNumber: "001",
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
      employeeNumber: "002",
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
      employeeNumber: "003",
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
      employeeNumber: "004",
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
