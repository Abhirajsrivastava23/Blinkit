import * as fs from 'fs';
import * as path from 'path';

interface AuditResult {
  category: string;
  target: string;
  status: 'PASS' | 'FAIL';
  details: string;
}

const results: AuditResult[] = [];

function checkFileForForbiddenStrings(filePath: string, forbiddenPatterns: { pattern: RegExp; desc: string }[]) {
  if (!fs.existsSync(filePath)) {
    results.push({
      category: 'File Audit',
      target: filePath,
      status: 'FAIL',
      details: 'File does not exist'
    });
    return;
  }

  const content = fs.readFileSync(filePath, 'utf8');
  let hasError = false;
  const violations: string[] = [];

  for (const { pattern, desc } of forbiddenPatterns) {
    const matches = content.match(pattern);
    if (matches) {
      hasError = true;
      violations.push(`${desc} (matched: ${matches.slice(0, 3).join(', ')})`);
    }
  }

  results.push({
    category: 'Source File Audit',
    target: path.relative(process.cwd(), filePath),
    status: hasError ? 'FAIL' : 'PASS',
    details: hasError ? `Found: ${violations.join('; ')}` : 'Clean. Standardized content verified.'
  });
}

function runAudit() {
  console.log('================================================================');
  console.log('       FATAFAT CUSTOMER-FACING CONTENT CONSISTENCY AUDIT        ');
  console.log('================================================================\n');

  const forbiddenDelivery = [
    { pattern: /within\s+12\s+hours/i, desc: 'Old "Within 12 hours" claim' },
    { pattern: /12\s*hours/i, desc: '12 hours reference' },
    { pattern: /dispatch\s+within\s+minutes/i, desc: 'Old "dispatch within minutes" claim' },
    { pattern: /delivered\s+in\s+minutes/i, desc: 'Old "delivered in minutes" claim' },
    { pattern: /vm\s+logistics/i, desc: 'Old "VM Logistics" brand reference' },
    { pattern: /concierge@fatafat\.com/i, desc: 'Old concierge@fatafat.com email' },
    { pattern: /support@fatafatapp\.me/i, desc: 'Old support@fatafatapp.me email' },
  ];

  // Specific customer-facing pages
  const filesToAudit = [
    'src/app/page.tsx',
    'src/app/about/page.tsx',
    'src/app/contact/page.tsx',
    'src/app/delivery/page.tsx',
    'src/app/faq/page.tsx',
    'src/app/help/page.tsx',
    'src/app/shipping-policy/page.tsx',
    'src/app/refund-policy/page.tsx',
    'src/app/return-policy/page.tsx',
    'src/app/cancellation-policy/page.tsx',
    'src/app/cakes/page.tsx',
    'src/app/pastries/page.tsx',
    'src/app/chocolate-cakes/page.tsx',
    'src/app/birthday-cakes/page.tsx',
    'src/app/desserts/page.tsx',
    'src/app/chocolates/page.tsx',
    'src/app/flowers/page.tsx',
    'src/app/gifts/page.tsx',
    'src/app/product/[id]/page.tsx',
    'src/app/checkout/page.tsx',
    'src/app/order-success/page.tsx',
    'src/app/order/[id]/page.tsx',
    'src/app/order/[id]/payment/page.tsx',
    'src/app/account/orders/page.tsx',
    'src/app/account/orders/[id]/page.tsx',
    'src/app/track-order/page.tsx',
    'src/app/track/[id]/page.tsx',
    'src/app/personalisation/page.tsx',
    'src/app/personalization/page.tsx',
    'src/components/Footer.tsx',
    'src/components/ProductCard.tsx',
    'src/components/QuickViewModal.tsx',
    'src/components/ProductForm.tsx',
    'src/utils/generateOrderPdf.ts',
    'src/services/emailTemplates.ts',
    'src/services/emailService.ts',
  ];

  for (const relPath of filesToAudit) {
    const fullPath = path.join(process.cwd(), relPath);
    if (fs.existsSync(fullPath)) {
      checkFileForForbiddenStrings(fullPath, forbiddenDelivery);
    }
  }

  // Check required positive strings
  const positiveChecks = [
    {
      file: 'src/app/shipping-policy/page.tsx',
      required: ['delivery within 24 hours', 'hello.fatafat@gmail.com'],
      name: 'Shipping Policy Content'
    },
    {
      file: 'src/app/delivery/page.tsx',
      required: ['within 24 hours', 'FATAFAT Logistics'],
      name: 'Delivery Page Content'
    },
    {
      file: 'src/app/contact/page.tsx',
      required: ['hello.fatafat@gmail.com'],
      name: 'Contact Page Email'
    },
    {
      file: 'src/app/about/page.tsx',
      required: ['within 24 hours', 'hello.fatafat@gmail.com'],
      name: 'About Page Content'
    },
    {
      file: 'src/app/faq/page.tsx',
      required: ['within 24 hours'],
      name: 'FAQ Page Content'
    },
    {
      file: 'src/components/Footer.tsx',
      required: ['hello.fatafat@gmail.com'],
      name: 'Footer Support Email'
    },
    {
      file: 'src/components/ProductCard.tsx',
      required: ['Within 24 hours'],
      name: 'ProductCard Default ETA'
    },
    {
      file: 'src/app/product/[id]/page.tsx',
      required: ['Within 24 hours'],
      name: 'Product Detail Page ETA'
    },
    {
      file: 'src/app/checkout/page.tsx',
      required: ['Within 24 hours'],
      name: 'Checkout Delivery ETA'
    },
    {
      file: 'src/app/order-success/page.tsx',
      required: ['Within 24 hours'],
      name: 'Order Success ETA'
    },
    {
      file: 'src/utils/generateOrderPdf.ts',
      required: ['Within 24 hours', 'hello.fatafat@gmail.com'],
      name: 'Invoice PDF Generator'
    },
    {
      file: 'src/services/emailTemplates.ts',
      required: ['hello.fatafat@gmail.com', 'Within 24 hours'],
      name: 'Email Templates'
    }
  ];

  for (const check of positiveChecks) {
    const fullPath = path.join(process.cwd(), check.file);
    if (!fs.existsSync(fullPath)) {
      results.push({
        category: 'Standard Verification',
        target: check.name,
        status: 'FAIL',
        details: `File ${check.file} does not exist`
      });
      continue;
    }
    const content = fs.readFileSync(fullPath, 'utf8');
    const missing = check.required.filter(req => !content.toLowerCase().includes(req.toLowerCase()));
    results.push({
      category: 'Standard Verification',
      target: check.name,
      status: missing.length === 0 ? 'PASS' : 'FAIL',
      details: missing.length === 0 ? `All required tokens found (${check.required.join(', ')})` : `Missing tokens: ${missing.join(', ')}`
    });
  }

  // Print Table
  console.log('| Category | Target | Status | Details |');
  console.log('| :--- | :--- | :---: | :--- |');
  let passCount = 0;
  let failCount = 0;

  for (const res of results) {
    if (res.status === 'PASS') passCount++;
    else failCount++;
    console.log(`| ${res.category} | ${res.target} | **${res.status}** | ${res.details} |`);
  }

  console.log(`\nAudit Summary: Total Checked = ${results.length}, PASSED = ${passCount}, FAILED = ${failCount}`);
  if (failCount > 0) {
    console.error(`AUDIT FAILED: ${failCount} violations detected.`);
    process.exit(1);
  } else {
    console.log('AUDIT PASSED: 100% compliant with standard delivery & support messaging.');
  }
}

runAudit();
