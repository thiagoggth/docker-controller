import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import dotenv from 'dotenv';

const rootDir = resolve(import.meta.dirname, '..');
const envFiles = ['.env', '.env.local'];

for (const envFile of envFiles) {
  const envPath = resolve(rootDir, envFile);
  if (existsSync(envPath)) {
    dotenv.config({ path: envPath, override: true });
  }
}

const requiredVariables = ['GH_OWNER', 'GH_REPO'];
const missingVariables = requiredVariables.filter((name) => !process.env[name]);
const hasGithubToken = Boolean(process.env['GH_TOKEN'] || process.env['GITHUB_TOKEN']);

if (!hasGithubToken) {
  missingVariables.push('GH_TOKEN or GITHUB_TOKEN');
}

if (missingVariables.length > 0) {
  console.error(`Missing required publish environment variables: ${missingVariables.join(', ')}`);
  process.exit(1);
}

execFileSync('npm', ['run', 'build'], {
  cwd: rootDir,
  stdio: 'inherit',
  env: process.env,
});

execFileSync('npx', ['electron-builder', '--publish', 'always'], {
  cwd: rootDir,
  stdio: 'inherit',
  env: process.env,
});
