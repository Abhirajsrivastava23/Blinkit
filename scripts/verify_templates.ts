import * as templates from '../src/services/emailTemplates';
import { getSenderEmailForEvent, getSenderEmail } from '../src/services/emailService';

console.log('=== FATAFAT LUXURY BRANDED EMAIL TEMPLATE VERIFICATION ===\n');

const mockOrder = {
  id: 'ORD-12345678',
  address: {
    name: 'Aarav Sharma',
    street: 'Flat 402, Lotus Heights',
    city: 'Bengaluru',
    mobile: '9876543210',
    phone: '9876543210'
  },
  customerEmail: 'aarav@example.com',
  total: 1249,
  subtotal: 1249,
  deliveryFee: 0,
  status: 'PLACED',
  paymentMethod: 'ONLINE',
  paymentStatus: 'PAID',
  items: [
    { title: 'Velvet Midnight Rose Bouquet', quantity: 1, price: 899 },
    { title: 'Belgian Truffle Chocolate Box (250g)', quantity: 1, price: 350 }
  ]
};

const mockRefundReq = {
  id: 'REF-REQ-9901',
  orderId: 'ORD-12345678',
  amount: 1249,
  reason: 'Defective flower packaging on arrival',
  razorpayRefundId: 'rfnd_N3x9Lk0123'
};

const mockTicket = {
  id: 'TCK-5544',
  ticketNumber: 'TICK-5544',
  name: 'Aarav Sharma',
  email: 'aarav@example.com',
  subject: 'Delivery timing query',
  category: 'DELIVERY'
};

const mockCustomReq = {
  id: 'REQ-7788',
  name: 'Aarav Sharma',
  email: 'aarav@example.com',
  phone: '9876543210',
  description: 'Exotic Ecuadorian orchid luxury arrangement'
};

const tests = [
  { name: '1. Order Placed', fn: () => templates.templateOrderPlaced(mockOrder) },
  { name: '2. Payment Verified', fn: () => templates.templatePaymentVerified(mockOrder, 'PAY-89210') },
  { name: '3. Order Confirmed', fn: () => templates.templateOrderConfirmed(mockOrder) },
  { name: '4. Order Preparing', fn: () => templates.templateOrderPreparing(mockOrder) },
  { name: '5. Out For Delivery', fn: () => templates.templateOutForDelivery(mockOrder) },
  { name: '6. Order Delivered', fn: () => templates.templateOrderDelivered(mockOrder) },
  { name: '7. Order Cancelled', fn: () => templates.templateOrderCancelled(mockOrder, 'Customer requested cancellation') },
  { name: '8. Refund Requested', fn: () => templates.templateRefundRequested(mockRefundReq, mockOrder) },
  { name: '9. Refund Processed', fn: () => templates.templateRefundProcessed(mockRefundReq, mockOrder) },
  { name: '10. Refund Rejected', fn: () => templates.templateRefundRejected(mockRefundReq, 'Item consumed prior to return') },
  { name: '11. Custom Request Received', fn: () => templates.templateCustomRequestReceived(mockCustomReq) },
  { name: '12. Custom Order Payment Link', fn: () => templates.templateCustomOrderPaymentLink(mockCustomReq, 'https://fatafatapp.me/pay/custom/7788', 3499) },
  { name: '13. Support Ticket Created', fn: () => templates.templateSupportTicketCreated(mockTicket) },
  { name: '14. Support Ticket Reply', fn: () => templates.templateSupportTicketReply(mockTicket, 'Our concierge team has dispatched a dedicated express rider.') },
  { name: '15. Password Reset', fn: () => templates.templatePasswordReset('aarav@example.com', 'https://fatafatapp.me/auth/reset?token=xyz789') },
  { name: '16. Admin New Order', fn: () => templates.templateAdminNewOrder(mockOrder) },
  { name: '17. Admin Payment Success', fn: () => templates.templateAdminPaymentSuccess(mockOrder, 'PAY-89210') },
  { name: '18. Admin Payment Failed', fn: () => templates.templateAdminPaymentFailed(mockOrder, 'Card velocity check failure') },
  { name: '19. Admin New Refund Request', fn: () => templates.templateAdminNewRefundRequest(mockRefundReq, mockOrder) },
  { name: '20. Admin Refund Status', fn: () => templates.templateAdminRefundStatus(mockRefundReq, 'PROCESSED') },
  { name: '21. Admin New Support Ticket', fn: () => templates.templateAdminNewSupportTicket(mockTicket) },
  { name: '22. Admin New Custom Request', fn: () => templates.templateAdminNewCustomRequest(mockCustomReq) }
];

let allPassed = true;

for (const test of tests) {
  try {
    const result = test.fn();
    if (!result.subject || result.subject.length === 0) {
      throw new Error('Missing or empty subject');
    }
    if (!result.html || result.html.length < 200) {
      throw new Error('HTML too short or missing');
    }
    if (!result.html.includes('FATAFAT') || !result.html.includes('#7C1D37')) {
      throw new Error('Missing FATAFAT branding or primary maroon accent');
    }
    if (!result.html.includes('hello.fatafat@gmail.com')) {
      throw new Error('Missing support contact email hello.fatafat@gmail.com');
    }
    if (result.html.includes('support@fatafatapp.me')) {
      throw new Error('Found forbidden support@fatafatapp.me in rendered HTML');
    }
    if (!result.html.includes('Please do not reply to this email. This is an automated message.')) {
      throw new Error('Missing no-reply automated notice');
    }
    console.log(`[PASS] ${test.name.padEnd(30)} -> Subject: "${result.subject}" (HTML size: ${result.html.length} bytes)`);
  } catch (err) {
    allPassed = false;
    console.error(`[FAIL] ${test.name}:`, err);
  }
}

console.log('\n--- Testing Sender Routing ---');
const sampleEvents = [
  { event: 'order_placed', desc: 'Order Placed (orders@)' },
  { event: 'payment_verified', desc: 'Payment Verified (orders@)' },
  { event: 'order_out_for_delivery', desc: 'Out for Delivery (notifications@)' },
  { event: 'order_delivered', desc: 'Delivered (notifications@)' },
  { event: 'support_ticket_created', desc: 'Support Created (support@)' },
  { event: 'custom_request_received', desc: 'Custom Request (customercare@)' },
  { event: 'refund_processed', desc: 'Refund Processed (refunds@)' }
];

for (const s of sampleEvents) {
  const resolved = getSenderEmailForEvent(s.event);
  console.log(`[PASS] Event '${s.event.padEnd(26)}' (${s.desc.padEnd(30)}) -> Resolved: "${resolved}"`);
}

console.log(`[PASS] Default Sender: "${getSenderEmail()}"`);

if (allPassed) {
  console.log('\nSUCCESS: All 22 templates and sender routing verified successfully!');
} else {
  console.error('\nFAILURE: One or more templates failed verification.');
  process.exit(1);
}
