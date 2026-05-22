/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';
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
const githubToken = process.env['GH_TOKEN'] || process.env['GITHUB_TOKEN'];
const hasGithubToken = Boolean(githubToken);

if (!hasGithubToken) {
  missingVariables.push('GH_TOKEN or GITHUB_TOKEN');
}

if (missingVariables.length > 0) {
  console.error(`Missing required publish environment variables: ${missingVariables.join(', ')}`);
  process.exit(1);
}

const packageJson = JSON.parse(readFileSync(resolve(rootDir, 'package.json'), 'utf8'));
const releaseTag = `v${packageJson.version}`;

execFileSync('npm', ['run', 'build'], {
  cwd: rootDir,
  stdio: 'inherit',
  env: process.env,
});

execFileSync(
  'npx',
  [
    'electron-builder',
    '--linux',
    'AppImage',
    'deb',
    '--publish',
    'always',
    '-c.publish.provider=github',
    `-c.publish.owner=${process.env['GH_OWNER']}`,
    `-c.publish.repo=${process.env['GH_REPO']}`,
    '-c.publish.releaseType=release',
    '-c.publish.vPrefixedTagName=true',
  ],
  {
    cwd: rootDir,
    stdio: 'inherit',
    env: process.env,
  },
);

const linuxUpdateMetadataPath = resolve(rootDir, 'dist', 'latest-linux.yml');

assertLinuxUpdateMetadataMatchesArtifacts(linuxUpdateMetadataPath);

await ensureGitHubReleaseAsset({
  assetPath: linuxUpdateMetadataPath,
  owner: process.env['GH_OWNER'],
  repo: process.env['GH_REPO'],
  tag: releaseTag,
  token: githubToken,
});

function assertLinuxUpdateMetadataMatchesArtifacts(metadataPath) {
  if (!existsSync(metadataPath)) {
    throw new Error(`Missing required update metadata: ${metadataPath}`);
  }

  const metadata = readFileSync(metadataPath, 'utf8');
  const entries = [...metadata.matchAll(/^\s*-\surl:\s(.+)\n\s+sha512:\s(.+)\n\s+size:\s(\d+)/gm)];

  if (entries.length === 0) {
    throw new Error(`No update files found in ${metadataPath}`);
  }

  for (const entry of entries) {
    const [, fileName, expectedSha512, expectedSize] = entry;
    const artifactPath = resolve(dirname(metadataPath), fileName.trim());

    if (!existsSync(artifactPath)) {
      throw new Error(`Missing update artifact referenced by metadata: ${artifactPath}`);
    }

    const actualSize = statSync(artifactPath).size;
    const actualSha512 = createHash('sha512').update(readFileSync(artifactPath)).digest('base64');

    if (actualSize !== Number(expectedSize) || actualSha512 !== expectedSha512.trim()) {
      throw new Error(`Update metadata does not match artifact: ${artifactPath}`);
    }
  }
}

async function ensureGitHubReleaseAsset({ assetPath, owner, repo, tag, token }) {
  if (!existsSync(assetPath)) {
    throw new Error(`Missing required update metadata: ${assetPath}`);
  }

  const assetName = basename(assetPath);
  const release = await githubRequest(
    `https://api.github.com/repos/${owner}/${repo}/releases/tags/${tag}`,
    { token },
  );

  if (release.assets.some((asset) => asset.name === assetName)) {
    console.log(`GitHub release asset already exists: ${assetName}`);
    return;
  }

  const file = readFileSync(assetPath);
  const uploadUrl = new URL(
    `https://uploads.github.com/repos/${owner}/${repo}/releases/${release.id}/assets`,
  );
  uploadUrl.searchParams.set('name', assetName);

  await githubRequest(uploadUrl, {
    body: file,
    headers: {
      'content-length': String(file.length),
      'content-type': 'text/yaml',
    },
    method: 'POST',
    token,
  });

  console.log(`Uploaded missing GitHub release asset: ${assetName}`);
}

async function githubRequest(url, { body, headers = {}, method = 'GET', token }) {
  const response = await fetch(url, {
    body,
    headers: {
      accept: 'application/vnd.github+json',
      authorization: `Bearer ${token}`,
      'x-github-api-version': '2022-11-28',
      ...headers,
    },
    method,
  });

  if (!response.ok) {
    const responseBody = await response.text();
    throw new Error(`GitHub request failed (${response.status}): ${responseBody}`);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}
