// ---------------------------------------------------------------------------
// hodi - Sinh firestore.rules từ firestore.rules.template
//
//   npm run rules            # đọc ALLOWED_USER_EMAIL từ .env.local / env
//   npm run rules -- --emu   # emulator: thiếu email thì dùng dev@hodi.test
//
// Rồi deploy:  firebase deploy --only firestore:rules
//
// Vì sao không viết email thẳng vào rules: repo có thể public, còn file sinh ra
// nằm trong .gitignore.
// ---------------------------------------------------------------------------

import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const EMU = process.argv.includes('--emu');
const DEV_EMAIL = 'dev@hodi.test';

function readEnvFile(path) {
  if (!existsSync(path)) return {};
  const out = {};
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) out[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  }
  return out;
}

const env = { ...readEnvFile('.env.local'), ...process.env };
let email = (env.ALLOWED_USER_EMAIL ?? '').trim().toLowerCase();

if (!email && EMU) email = DEV_EMAIL;
if (!email) {
  console.error('ALLOWED_USER_EMAIL is missing. Set it in .env.local (see .env.example).');
  process.exit(1);
}
if (!/^[^\s'"\\@]+@[^\s'"\\@]+$/.test(email)) {
  console.error(`ALLOWED_USER_EMAIL does not look like an email: ${email}`);
  process.exit(1);
}

const template = readFileSync('firestore.rules.template', 'utf8');
writeFileSync('firestore.rules', template.replaceAll('__ALLOWED_USER_EMAIL__', email));
console.log(`firestore.rules written for ${email}`);
