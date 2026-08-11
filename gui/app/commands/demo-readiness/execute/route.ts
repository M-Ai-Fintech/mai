import { cookies } from "next/headers";
import { forwardDemoHumanCommand } from "@/lib/adapters/demo-readiness/server-command";

const fetchTransport = {
  dispatch: (request: Request): Promise<Response> => fetch(request),
};

export async function POST(request: Request): Promise<Response> {
  const session = (await cookies()).get("mai_session")?.value;
  return await forwardDemoHumanCommand(
    request,
    session,
    process.env,
    fetchTransport,
  );
}
