import { existsSync, readFileSync, statSync } from 'node:fs';
import { join, normalize } from 'node:path';

const distDir = join(process.cwd(), 'dist');
const manifestPath = join(distDir, 'manifest.json');

function fail(message) {
  console.error(`Build validation failed: ${message}`);
  process.exit(1);
}

if (!existsSync(distDir) || !statSync(distDir).isDirectory()) {
  fail('dist directory is missing. Run the build first.');
}

if (!existsSync(manifestPath)) {
  fail('dist/manifest.json was not generated.');
}

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));

if (manifest.manifest_version !== 3) {
  fail(`expected manifest_version=3, received ${manifest.manifest_version}`);
}

const fileReferences = new Set();

if (manifest.background?.service_worker) {
  fileReferences.add(manifest.background.service_worker);
}

if (manifest.side_panel?.default_path) {
  fileReferences.add(manifest.side_panel.default_path);
}

if (manifest.action?.default_icon) {
  for (const iconPath of Object.values(manifest.action.default_icon)) {
    fileReferences.add(iconPath);
  }
}

if (manifest.icons) {
  for (const iconPath of Object.values(manifest.icons)) {
    fileReferences.add(iconPath);
  }
}

if (Array.isArray(manifest.content_scripts)) {
  for (const script of manifest.content_scripts) {
    for (const jsFile of script.js ?? []) {
      fileReferences.add(jsFile);
    }
    for (const cssFile of script.css ?? []) {
      fileReferences.add(cssFile);
    }
  }
}

for (const ref of fileReferences) {
  if (typeof ref !== 'string' || ref.length === 0) {
    fail('manifest contains an empty file reference.');
  }

  if (/^https?:\/\//i.test(ref)) {
    fail(`remote reference is not allowed in packaged extension: ${ref}`);
  }

  const targetPath = join(distDir, normalize(ref));
  if (!existsSync(targetPath)) {
    fail(`missing built asset referenced by manifest: ${ref}`);
  }
}

console.log('Extension build validation passed.');
