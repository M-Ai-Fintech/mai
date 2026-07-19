import { EntitiesWorkspace } from "@/components/screens/entities/EntitiesWorkspace";

const roles = ["buyer", "seller", "target", "institution"] as const;
const countries = ["BR", "ES", "US"] as const;

export default async function EntitiesPage({ searchParams }: { searchParams: Promise<{ role?: string; search?: string; sector?: string; country?: string }> }) {
  const { role, search, sector, country } = await searchParams;
  const initialRole = roles.find((candidate) => candidate === role) ?? "buyer";
  const initialCountryCode = countries.find((candidate) => candidate === country) ?? "BR";
  return <EntitiesWorkspace initialRole={initialRole} initialSearch={search ?? ""} initialSector={sector ?? ""} initialCountryCode={initialCountryCode} />;
}
