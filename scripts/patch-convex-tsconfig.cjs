const fs = require('fs');
const path = require('path');

const convexTsconfigPath = path.join(process.cwd(), 'node_modules', 'convex', 'tsconfig.json');

function stripJsonComments(input) {
  return input
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
}

function main() {
  if (!fs.existsSync(convexTsconfigPath)) {
    console.log('[patch-convex-tsconfig] Skipped: node_modules/convex/tsconfig.json not found');
    return;
  }

  const raw = fs.readFileSync(convexTsconfigPath, 'utf8');
  let parsed;
  try {
    parsed = JSON.parse(stripJsonComments(raw));
  } catch (error) {
    console.warn('[patch-convex-tsconfig] Skipped: invalid JSON', error);
    return;
  }

  if (!parsed || typeof parsed !== 'object') {
    console.warn('[patch-convex-tsconfig] Skipped: unexpected file shape');
    return;
  }

  if (!parsed.compilerOptions || typeof parsed.compilerOptions !== 'object') {
    parsed.compilerOptions = {};
  }

  let changed = false;
  if (parsed.compilerOptions.moduleResolution === 'node' || parsed.compilerOptions.moduleResolution === 'node10') {
    parsed.compilerOptions.moduleResolution = 'bundler';
    changed = true;
  }
  if (Object.prototype.hasOwnProperty.call(parsed.compilerOptions, 'ignoreDeprecations')) {
    delete parsed.compilerOptions.ignoreDeprecations;
    changed = true;
  }

  if (!changed) {
    console.log('[patch-convex-tsconfig] Already patched');
    return;
  }

  fs.writeFileSync(convexTsconfigPath, `${JSON.stringify(parsed, null, 2)}\n`, 'utf8');
  console.log('[patch-convex-tsconfig] Applied moduleResolution patch');
}

main();