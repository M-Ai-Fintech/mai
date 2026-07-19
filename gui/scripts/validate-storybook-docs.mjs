import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const componentsDirectory = resolve(import.meta.dirname, "../components");
const mdxFiles = [];

function collectMdxFiles(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && entry.name.startsWith("_")) {
      continue;
    }

    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      collectMdxFiles(path);
    } else if (entry.isFile() && entry.name.endsWith(".mdx")) {
      mdxFiles.push(path);
    }
  }
}

collectMdxFiles(componentsDirectory);

const importPattern = /^import \* as (\w+) from ["'](.+\.stories\.tsx)["'];$/gm;
const errors = [];

for (const mdxPath of mdxFiles) {
  const source = readFileSync(mdxPath, "utf8");
  let match;
  let imports = 0;

  while ((match = importPattern.exec(source)) !== null) {
    imports += 1;
    const [, binding, storyPath] = match;
    const resolvedStoryPath = resolve(mdxPath, "..", storyPath);

    if (!existsSync(resolvedStoryPath)) {
      errors.push(`${mdxPath}: ${storyPath} does not exist`);
    }

    if (!source.includes(`<Meta of={${binding}} />`)) {
      errors.push(`${mdxPath}: ${binding} is not connected to <Meta of={...} />`);
    }
  }

  if (imports === 0) {
    errors.push(`${mdxPath}: no explicit .stories.tsx import found`);
  }
}

if (errors.length > 0) {
  console.error("Storybook MDX validation failed:\n" + errors.join("\n"));
  process.exitCode = 1;
} else {
  console.log(`Validated ${mdxFiles.length} Storybook MDX files.`);
}
