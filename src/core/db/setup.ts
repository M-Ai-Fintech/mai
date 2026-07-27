import { Client } from "pg";
import { describeError } from "../../shared/errors.ts";

const REFERENCE_SEEDS = [
  // Seed phases.
  `INSERT INTO phase (name, stage_order, description) VALUES
    ('Sourcing & KYB', 1, 'Initial sourcing and screening'),
    ('NDA & Initial DD', 2, 'Non-disclosure and preliminary diligence'),
    ('Valuation & LOI', 3, 'Valuation modeling and Letter of Intent'),
    ('Deep Due Diligence', 4, 'Comprehensive legal and financial DD'),
    ('Negotiation', 5, 'Final negotiations'),
    ('Closing', 6, 'Deal closing')
    ON CONFLICT (name) DO NOTHING;`,
  // Seed phase statuses.
  `INSERT INTO phase_status (name) VALUES
    ('Pending'), ('In Progress'), ('Completed')
    ON CONFLICT (name) DO NOTHING;`,
  // Seed transaction types.
  `INSERT INTO transaction_type (name) VALUES
    ('Merger'), ('Acquisition'), ('Joint Venture')
    ON CONFLICT (name) DO NOTHING;`,
  // Seed transaction strategies.
  `INSERT INTO transaction_strategy (name) VALUES
    ('Horizontal Integration'), ('Vertical Integration'), ('Diversification')
    ON CONFLICT (name) DO NOTHING;`,
  // Seed transaction statuses.
  `INSERT INTO transaction_status (name) VALUES
    ('Active'), ('On Hold'), ('Completed'), ('Cancelled')
    ON CONFLICT (name) DO NOTHING;`,
  // Seed advisor types.
  `INSERT INTO advisor_type (name) VALUES
    ('Financial'), ('Legal'), ('Technical'), ('Strategic')
    ON CONFLICT (name) DO NOTHING;`,
  // Seed advisor sides.
  `INSERT INTO advisor_side (name) VALUES
    ('Buy-side'), ('Sell-side'), ('Neutral')
    ON CONFLICT (name) DO NOTHING;`,
] as const;

export async function setupDatabase(): Promise<void> {
  const dbUrl = Deno.env.get("DATABASE_URL") ||
    "postgresql://postgres:postgres@localhost:5432/mai";
  const client = new Client(dbUrl);
  try {
    await initializeDatabase(client);
  } catch (error: unknown) {
    reportSetupFailure(error);
  } finally {
    await client.end().catch(() => {});
  }
}

async function initializeDatabase(client: Client): Promise<void> {
  await client.connect();
  console.log("Connected to PostgreSQL.");
  await applySchema(client);
  await seedReferenceData(client);
}

async function applySchema(client: Client): Promise<void> {
  // The pg client accepts the schema's semicolon-separated statements.
  const schemaPath = new URL("./schema.sql", import.meta.url).pathname;
  const schema = await Deno.readTextFile(schemaPath);
  console.log("Applying schema...");
  await client.query(schema);
  console.log("Schema applied successfully.");
}

async function seedReferenceData(client: Client): Promise<void> {
  console.log("Seeding reference data...");
  for (const statement of REFERENCE_SEEDS) await client.query(statement);
  console.log("Seeding completed successfully.");
}

function reportSetupFailure(error: unknown): void {
  console.error(
    "Database setup failed or database is inaccessible:",
    describeError(error),
  );
  // Tests and local environments are allowed to continue without PostgreSQL.
  console.warn("Continuing gracefully...");
}

if (import.meta.main) {
  await setupDatabase();
}
