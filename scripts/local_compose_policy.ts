/** Rejects local Compose bindings that expose a service beyond loopback. */
export function assertLoopbackPublishedPorts(compose: string): void {
  const lines = compose.split(/\r?\n/);
  let portsIndent: number | undefined;
  for (const line of lines) {
    if (line.trim().length === 0 || line.trim().startsWith("#")) continue;
    const indent = line.search(/\S/);
    if (/^\s*ports:\s*$/.test(line)) {
      portsIndent = indent;
      continue;
    }
    if (portsIndent === undefined) continue;
    if (indent <= portsIndent) {
      portsIndent = undefined;
      continue;
    }
    const match = /^\s*-\s*["']?([^"']+)["']?\s*$/.exec(line);
    if (!match || !match[1].includes(":")) continue;
    const binding = match[1];
    if (!binding.startsWith("127.0.0.1:")) {
      throw new Error(
        `Local Compose port binding "${binding}" is not loopback-only; expected an explicit 127.0.0.1 host address.`,
      );
    }
    if (/^(?:0\.0\.0\.0|::|\[::\]):/.test(binding)) {
      throw new Error(
        `Local Compose port binding "${binding}" is unrestricted; expected loopback-only exposure.`,
      );
    }
  }
}

export async function assertLocalComposeFiles(): Promise<void> {
  for (const path of ["docker-compose.yml", "infra/local/docker-compose.yml"]) {
    assertLoopbackPublishedPorts(await Deno.readTextFile(path));
  }
}

if (import.meta.main) await assertLocalComposeFiles();
