/** Reads a fixture only after real-path confinement defeats traversal/symlinks.
 *
 * @example await readConfinedFixture("financial-summary.csv", fixtureRoot)
 */
export async function readConfinedFixture(
  relativePath: string,
  fixtureRoot: URL,
): Promise<Uint8Array> {
  if (
    fixtureRoot.protocol !== "file:" || relativePath.startsWith("/") ||
    relativePath.includes("\\") || relativePath.split("/").includes("..")
  ) {
    throw unsafeFixturePath(relativePath);
  }
  const root = await Deno.realPath(fixtureRoot);
  const resolved = await Deno.realPath(new URL(relativePath, fixtureRoot));
  const prefix = root.endsWith("/") ? root : `${root}/`;
  if (resolved.startsWith(prefix)) return await Deno.readFile(resolved);
  throw unsafeFixturePath(relativePath);
}

function unsafeFixturePath(relativePath: string): Error {
  return new Error(
    `Synthetic fixture path "${relativePath}" is unsafe; expected a relative file confined to the approved fixture root.`,
  );
}
