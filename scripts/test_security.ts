import { checkRateLimit, sanitizeInput, sanitizeObject, isSuspiciousInput, validateEmail, validatePhone, validateOrderId, validatePositiveNumber } from '../src/lib/security';

function runSecurityTests() {
  console.log('========================================================');
  console.log('🛡️ TESTING FATAFAT PRODUCTION SECURITY HARDENING');
  console.log('========================================================\n');

  // 1. Test Input Sanitization
  console.log('1. Testing Input Sanitization:');
  const dirtyXSS = '<script>alert("hacked")</script>Delicious Truffle Cake';
  const cleanXSS = sanitizeInput(dirtyXSS);
  if (cleanXSS.includes('<script>') || cleanXSS.includes('</script>')) {
    throw new Error('XSS Sanitization failed! <script> tag was not stripped.');
  }
  console.log(`   ✅ XSS tag stripped: "${dirtyXSS}" -> "${cleanXSS}"`);

  const dirtyPath = '../../etc/passwd/some-photo.jpg';
  const cleanPath = sanitizeInput(dirtyPath);
  if (cleanPath.includes('..')) {
    throw new Error('Path traversal sanitization failed! ".." was not stripped.');
  }
  console.log(`   ✅ Path traversal stripped: "${dirtyPath}" -> "${cleanPath}"`);

  const dirtyNull = 'malicious%00payload\x00data';
  const cleanNull = sanitizeInput(dirtyNull);
  if (cleanNull.includes('\x00')) {
    throw new Error('Null byte sanitization failed!');
  }
  console.log(`   ✅ Null bytes stripped: "${cleanNull}"`);

  // 2. Test WAF Malicious Pattern Detector
  console.log('\n2. Testing WAF Malicious Pattern Detection:');
  const scriptCheck = isSuspiciousInput('/api/search?q=<script>alert(1)</script>');
  if (!scriptCheck.suspicious) throw new Error('WAF failed to detect XSS in query!');
  console.log('   ✅ WAF caught XSS query correctly.');

  const traversalCheck = isSuspiciousInput('/api/products/../../../secret.env');
  if (!traversalCheck.suspicious) throw new Error('WAF failed to detect path traversal!');
  console.log('   ✅ WAF caught path traversal correctly.');

  const nullByteCheck = isSuspiciousInput('/api/payments/verify?id=pay_123%00admin');
  if (!nullByteCheck.suspicious) throw new Error('WAF failed to detect null byte injection!');
  console.log('   ✅ WAF caught null byte injection correctly.');

  const legitimateCheck = isSuspiciousInput('/api/products?search=Chocolate%20Truffle%20Cake&category=cakes');
  if (legitimateCheck.suspicious) throw new Error('WAF falsely flagged legitimate product query!');
  console.log('   ✅ WAF allowed clean product search query.');

  // 3. Test Rate Limiter (Token Bucket / Sliding Window)
  console.log('\n3. Testing Tiered Rate Limiting:');
  const testIp = '198.51.100.42';

  // Auth rate limit is 12 requests / window
  for (let i = 1; i <= 12; i++) {
    const res = checkRateLimit(testIp, 'auth');
    if (!res.allowed) throw new Error(`Auth request ${i} was unexpectedly blocked!`);
  }
  console.log('   ✅ 12 consecutive auth requests allowed within limit.');

  // 13th request should be blocked with 429 status
  const blockedRes = checkRateLimit(testIp, 'auth');
  if (blockedRes.allowed) throw new Error('13th auth request was not blocked!');
  console.log(`   ✅ 13th auth request successfully blocked with 429 (Retry-After: ${blockedRes.retryAfterSeconds}s).`);

  // 4. Test Validators
  console.log('\n4. Testing Data Validators:');
  if (!validateEmail('customer@fatafat.com') || validateEmail('invalid-email-string')) {
    throw new Error('Email validation failed!');
  }
  console.log('   ✅ Email validator verified.');

  if (!validatePhone('9876543210') || !validatePhone('+91 9876543210') || validatePhone('12345')) {
    throw new Error('Phone validation failed!');
  }
  console.log('   ✅ Phone validator verified.');

  if (!validateOrderId('FT-2026-9812') || !validateOrderId('ord_abc123') || validateOrderId('')) {
    throw new Error('Order ID validator failed!');
  }
  console.log('   ✅ Order ID validator verified.');

  if (!validatePositiveNumber(1349) || validatePositiveNumber(-50) || validatePositiveNumber('abc')) {
    throw new Error('Positive number validator failed!');
  }
  console.log('   ✅ Price & Amount validator verified.');

  console.log('\n========================================================');
  console.log('🎉 ALL PRODUCTION SECURITY AUDIT TESTS PASSED (100% OK)');
  console.log('========================================================\n');
}

runSecurityTests();
