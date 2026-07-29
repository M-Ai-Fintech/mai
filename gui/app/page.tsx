import { redirect } from "next/navigation";

/**
 * Renders the only product-facing route retained during MAI-95.
 *
 * @example <FoundationPage />
 */
export default function FoundationPage() {
  redirect("/home");
}
