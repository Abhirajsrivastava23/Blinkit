const fs = require('fs');
const path = require('path');

const targetDir = path.join(__dirname, '../src');

function walk(dir, callback) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      walk(filePath, callback);
    } else if (stat.isFile() && (file.endsWith('.ts') || file.endsWith('.tsx'))) {
      callback(filePath);
    }
  }
}

const replacements = [
  { find: /(?<!await\s+)db\.readTable/g, replace: 'await db.readTable' },
  { find: /(?<!await\s+)db\.writeTable/g, replace: 'await db.writeTable' },
  { find: /(?<!await\s+)db\.readHomepage/g, replace: 'await db.readHomepage' },
  { find: /(?<!await\s+)db\.writeHomepage/g, replace: 'await db.writeHomepage' },
  { find: /(?<!await\s+)createSession/g, replace: 'await createSession' },
  { find: /(?<!await\s+)deleteSession/g, replace: 'await deleteSession' }
];

walk(targetDir, (filePath) => {
  if (filePath.endsWith('db.ts') || filePath.endsWith('auth.ts')) {
    return;
  }
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  let changed = false;

  const newLines = lines.map(line => {
    // Ignore lines that import things
    if (line.trim().startsWith('import ')) {
      return line;
    }
    let newLine = line;
    for (const rep of replacements) {
      newLine = newLine.replace(rep.find, rep.replace);
    }
    if (newLine !== line) {
      changed = true;
    }
    return newLine;
  });

  if (changed) {
    fs.writeFileSync(filePath, newLines.join('\n'), 'utf8');
    console.log(`Updated: ${path.relative(targetDir, filePath)}`);
  }
});
