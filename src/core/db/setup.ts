import { Client } from "pg";

export async function setupDatabase() {
  const dbUrl = Deno.env.get("DATABASE_URL") ||
    "postgresql://postgres:postgres@localhost:5432/mai";
  const client = new Client(dbUrl);

  try {
    await client.connect();
    console.log("Connected to PostgreSQL.");

    // Read schema.sql
    const schemaPath = new URL("./schema.sql", import.meta.url).pathname;
    const schema = await Deno.readTextFile(schemaPath);

    console.log("Applying schema...");
    // Em Deno postgres/pg, multiplas queries podem ser rodadas separando por ;, no pg client do Node tbm.
    await client.query(schema);
    console.log("Schema applied successfully.");

    console.log("Seeding reference data...");
    // Seed phases
    await client.query(`
            INSERT INTO phase (name, stage_order, description) VALUES 
            ('Sourcing & KYB', 1, 'Initial sourcing and screening'),
            ('NDA & Initial DD', 2, 'Non-disclosure and preliminary diligence'),
            ('Valuation & LOI', 3, 'Valuation modeling and Letter of Intent'),
            ('Deep Due Diligence', 4, 'Comprehensive legal and financial DD'),
            ('Negotiation', 5, 'Final negotiations'),
            ('Closing', 6, 'Deal closing')
            ON CONFLICT (name) DO NOTHING;
        `);

    // Seed phase_status
    await client.query(`
            INSERT INTO phase_status (name) VALUES 
            ('Pending'), ('In Progress'), ('Completed')
            ON CONFLICT (name) DO NOTHING;
        `);

    // Seed transaction_type
    await client.query(`
            INSERT INTO transaction_type (name) VALUES 
            ('Merger'), ('Acquisition'), ('Joint Venture')
            ON CONFLICT (name) DO NOTHING;
        `);

    // Seed transaction_strategy
    await client.query(`
            INSERT INTO transaction_strategy (name) VALUES 
            ('Horizontal Integration'), ('Vertical Integration'), ('Diversification')
            ON CONFLICT (name) DO NOTHING;
        `);

    // Seed transaction_status
    await client.query(`
            INSERT INTO transaction_status (name) VALUES 
            ('Active'), ('On Hold'), ('Completed'), ('Cancelled')
            ON CONFLICT (name) DO NOTHING;
        `);

    // Seed advisor_type
    await client.query(`
            INSERT INTO advisor_type (name) VALUES 
            ('Financial'), ('Legal'), ('Technical'), ('Strategic')
            ON CONFLICT (name) DO NOTHING;
        `);

    // Seed advisor_side
    await client.query(`
            INSERT INTO advisor_side (name) VALUES 
            ('Buy-side'), ('Sell-side'), ('Neutral')
            ON CONFLICT (name) DO NOTHING;
        `);

    console.log("Seeding completed successfully.");
  } catch (e: any) {
    console.error(
      "Database setup failed or database is inaccessible:",
      e.message,
    );
    // Fallback for tests or local env without db running
    console.warn("Continuing gracefully...");
  } finally {
    await client.end().catch(() => {});
  }
}

if (import.meta.main) {
  await setupDatabase();
}
