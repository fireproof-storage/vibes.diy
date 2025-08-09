// Fetch LLMS text assets defined in app/llms/*.json and write them to app/llms/{name}.txt
// Usage: pnpm fetch-llms-text
// Notes:
// - Overwrites existing .txt files
// - Exits with non-zero code on any error

import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function readJsonFile(filePath) {
  const raw = await fs.readFile(filePath, 'utf8');
  try {
    return JSON.parse(raw);
  } catch (err) {
    throw new Error(`Failed to parse JSON: ${filePath} -> ${(err && err.message) || err}`);
  }
}

async function fetchText(url) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} fetching ${url}`);
  }
  return await res.text();
}

async function main() {
  const repoRoot = path.resolve(__dirname, '..');
  const llmsDir = path.join(repoRoot, 'app', 'llms');

  const entries = await fs.readdir(llmsDir, { withFileTypes: true });
  const jsonFiles = entries
    .filter((e) => e.isFile() && e.name.endsWith('.json'))
    .map((e) => path.join(llmsDir, e.name));

  if (jsonFiles.length === 0) {
    console.warn('No JSON files found in app/llms. Nothing to do.');
    return;
  }

  const tasks = jsonFiles.map(async (jsonPath) => {
    const cfg = await readJsonFile(jsonPath);
    const name = cfg?.name;
    const url = cfg?.llmsTxtUrl;

    if (!name || typeof name !== 'string') {
      throw new Error(`Missing or invalid 'name' in ${path.relative(repoRoot, jsonPath)}`);
    }

    if (!url || typeof url !== 'string') {
      throw new Error(`Missing or invalid 'llmsTxtUrl' in ${path.relative(repoRoot, jsonPath)}`);
    }

    const text = await fetchText(url);
    const outPath = path.join(llmsDir, `${name}.txt`);
    await fs.writeFile(outPath, text, 'utf8');
    return { name, outPath };
  });

  const results = await Promise.all(tasks);
  for (const r of results) {
    const rel = path.relative(repoRoot, r.outPath);
    console.log(`Wrote ${rel}`);
  }
}

main().catch((err) => {
  console.error('[fetch-llms-text] Failed:', err?.stack || err);
  process.exitCode = 1;
});
