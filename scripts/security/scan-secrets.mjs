import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const files = execFileSync('git', ['ls-files', '-z'])
  .toString()
  .split('\0')
  .filter(Boolean);

const binaryExtensions = new Set([
  '.gif', '.gz', '.ico', '.jpeg', '.jpg', '.lock', '.pdf', '.png', '.ttf',
  '.webp', '.woff', '.woff2', '.zip',
]);
const placeholderPattern = /(?:change-?me|example|placeholder|redacted|secure[-_ ]random|same[-_ ]as|from[-_ ](?:railway|vercel)|your[_-]|\*{3}|\.\.\.|process\.env|import\.meta\.env|test-token|\/secrets\/|:latest)/i;
const assignmentPattern = /\b(?:[A-Z][A-Z0-9_]*(?:API_KEY|PASSWORD|PRIVATE_KEY|SECRET|TOKEN)|apiKey|clientSecret|password|privateKey)\b\s*[:=]\s*["']?([^\s"'#,]{20,})/;
const knownCredentialPattern = /(?:sk-(?:or-)?[A-Za-z0-9_-]{20,}|r8_[A-Za-z0-9]{20,}|gh[oprsu]_[A-Za-z0-9]{20,}|AIza[0-9A-Za-z_-]{30,})/;
const privateKeyPattern = /-----BEGIN (?:EC |OPENSSH |RSA )?PRIVATE KEY-----/;

const findings = [];

for (const file of files) {
  const extension = file.slice(file.lastIndexOf('.')).toLowerCase();
  if (binaryExtensions.has(extension) || file === 'package-lock.json') continue;

  let contents;
  try {
    contents = readFileSync(file, 'utf8');
  } catch {
    continue;
  }

  for (const [index, line] of contents.split(/\r?\n/).entries()) {
    if (placeholderPattern.test(line)) continue;

    if (privateKeyPattern.test(line)) {
      findings.push({ file, line: index + 1, type: 'private key' });
      continue;
    }

    const knownCredential = line.match(knownCredentialPattern);
    const firebasePublicKey = /(?:NEXT_PUBLIC_|VITE_)?FIREBASE_API_KEY|apiKey/.test(line);
    if (knownCredential && !firebasePublicKey) {
      findings.push({ file, line: index + 1, type: 'credential-like value' });
      continue;
    }

    const assignment = line.match(assignmentPattern);
    if (assignment && !firebasePublicKey && !assignment[1].startsWith('http')) {
      findings.push({ file, line: index + 1, type: 'secret assignment' });
    }
  }
}

if (findings.length > 0) {
  console.error('Potential secrets found. Values are intentionally not displayed:');
  for (const finding of findings) {
    console.error(`- ${finding.file}:${finding.line} (${finding.type})`);
  }
  process.exit(1);
}

console.log(`Secret scan passed (${files.length} tracked files checked).`);
