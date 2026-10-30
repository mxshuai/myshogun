/**
 * Guardrail: AWS Lambda nodejs20 + Handler index.handler expects CommonJS.
 * Fails if esbuild output looks like ESM or package.json uses --format=esm.
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const BUILD_SCRIPTS = ["build:lambda", "build:lambda:schedule"];
const BUNDLES = [
  { label: "publish", path: "infra/dist/publish/index.js" },
  { label: "schedule", path: "infra/dist/schedule/index.js" },
];

function fail(msg) {
  console.error(`verify:lambda-bundle: ${msg}`);
  process.exit(1);
}

function assertCjsBuildScripts(pkg) {
  for (const name of BUILD_SCRIPTS) {
    const cmd = pkg.scripts?.[name];
    if (!cmd || typeof cmd !== "string") {
      fail(`package.json missing script "${name}"`);
    }
    if (cmd.includes("--format=esm")) {
      fail(
        `"${name}" uses --format=esm. Lambda deploy requires --format=cjs (see .cursor/rules/lambda-cjs.mdc).`,
      );
    }
    if (!cmd.includes("--format=cjs")) {
      fail(`"${name}" must include --format=cjs`);
    }
  }
}

function assertCjsBundle(label, relPath) {
  const abs = join(root, relPath);
  if (!existsSync(abs)) {
    console.warn(
      `verify:lambda-bundle: skip ${label} (${relPath} not built yet)`,
    );
    return;
  }

  const text = readFileSync(abs, "utf8");
  const head = text.slice(0, 800);

  if (/^\s*import\s/m.test(head)) {
    fail(
      `${label}: ${relPath} starts with ESM "import". Rebuild with --format=cjs.`,
    );
  }

  if (!/\bmodule\.exports\b/.test(text)) {
    fail(
      `${label}: ${relPath} has no module.exports. Lambda index.handler will not load.`,
    );
  }

  if (
    /\bexport\s+async\s+function\s+handler\b/.test(text) &&
    !/\bmodule\.exports\b/.test(text.slice(0, 2000))
  ) {
    fail(`${label}: ${relPath} looks like ESM handler export.`);
  }

  console.log(`verify:lambda-bundle: OK ${relPath}`);
}

const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
assertCjsBuildScripts(pkg);

for (const b of BUNDLES) {
  assertCjsBundle(b.label, b.path);
}

console.log("verify:lambda-bundle: all checks passed");
