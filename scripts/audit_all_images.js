const fs = require('fs');
const path = require('path');

function getFiles(dir, match) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const full = path.join(dir, file);
    const stat = fs.statSync(full);
    if (stat && stat.isDirectory()) {
      results = results.concat(getFiles(full, match));
    } else if (match.test(file)) {
      results.push(full);
    }
  }
  return results;
}

const srcDir = path.join(__dirname, '..', 'src');
const tsxFiles = getFiles(srcDir, /\.(tsx|ts|json)$/);

console.log(`Auditing ${tsxFiles.length} source files...`);

let rawImgTags = [];
let nextImages = [];
let allExtUrls = new Set();

const urlRegex = /https?:\/\/[^\s"',`)]+/g;

for (const file of tsxFiles) {
  const content = fs.readFileSync(file, 'utf8');
  
  if (file.endsWith('.tsx')) {
    // Check for raw <img without SafeImage
    const lines = content.split('\n');
    lines.forEach((line, idx) => {
      if (line.includes('<img') && !file.endsWith('SafeImage.tsx')) {
        rawImgTags.push({ file: path.relative(srcDir, file), line: idx + 1, content: line.trim() });
      }
      if (line.includes('<Image') && !line.includes('SafeImage')) {
        nextImages.push({ file: path.relative(srcDir, file), line: idx + 1, content: line.trim() });
      }
    });
  }

  const matches = content.match(urlRegex) || [];
  for (const u of matches) {
    if (u.includes('unsplash.com') || u.includes('amazon.com') || u.includes('.jpg') || u.includes('.png') || u.includes('.webp') || u.includes('.svg')) {
      allExtUrls.add(u);
    }
  }
}

console.log('\n--- RAW <img /> TAGS FOUND ---');
rawImgTags.forEach(r => console.log(`${r.file}:${r.line} -> ${r.content}`));

console.log('\n--- NEXT.JS <Image /> TAGS FOUND ---');
nextImages.forEach(r => console.log(`${r.file}:${r.line} -> ${r.content}`));

console.log(`\nFound ${allExtUrls.size} unique image URLs across entire src.`);

// Write URLs to audit file
fs.writeFileSync(path.join(__dirname, 'all_image_urls.json'), JSON.stringify(Array.from(allExtUrls), null, 2));
console.log('Saved all_image_urls.json for batch verification.');
