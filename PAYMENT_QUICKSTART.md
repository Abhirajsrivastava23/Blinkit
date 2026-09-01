# Payment System - Developer Quick Start

## What's Been Implemented ✅

### 1. Payment Service Layer
- **File**: `src/services/paymentService.ts`
- **What**: Clean, provider-agnostic payment service abstraction
- **Methods**: Create, verify, mark paid/failed/cancelled/refunded
- **Status**: Ready to use

### 2. Database Schema  
- **New Table**: `payment_transactions`
- **Schema**: Includes all necessary fields for payment tracking
- **Indexes**: Performance indexes on customerId and orderId
- **Status**: Defined (needs DB migration)

### 3. Payment API Endpoints (Skeleton)
All endpoints are created with proper request/response contracts:

- `POST /api/payments/create` - Creates payment transaction
- `GET /api/payments/[id]` - Retrieves payment status  
- `POST /api/payments/[id]/verify` - Verifies with gateway
- `POST /api/payments/test/confirm` - Development testing only

**Status**: Skeleton complete, database integration needed

### 4. UI Components

#### Checkout Page (`src/app/checkout/page.tsx`)
- ✅ Steps: Address → Schedule → Payment → Review
- ✅ Online-only payment (no COD)
- ✅ Creates order in PENDING state
- ✅ Creates payment transaction
- ✅ Integrates with payment flow
- ✅ Redirects to success/failure pages

#### Payment Success Page (`src/app/payment-success/page.tsx`)
- ✅ Shows order confirmation
- ✅ Displays payment details
- ✅ Action buttons (Track, View Orders, Continue Shopping)
- ✅ Professional design with animations
- ✅ Mobile responsive

#### Payment Failed Page (`src/app/payment-failed/page.tsx`)
- ✅ Shows error details
- ✅ Retry logic (max 2 retries)
- ✅ Cancel order option
- ✅ Common failure reasons explained
- ✅ Support contact info
- ✅ Mobile responsive

**Status**: Ready for use

---

## Quick Start - Local Development

### 1. Enable Test Mode
```bash
# .env.local
PAYMENT_TEST_MODE=true
NODE_ENV=development
```

### 2. Test Payment Flow

Start the app:
```bash
npm run dev
```

Navigate to checkout:
1. Go to `/checkout`
2. Fill out form (all sections)
3. Click "Place Order"
4. Payment automatically processes with 90% success rate
5. Redirected to `/payment-success` or `/payment-failed`

### 3. Manual Testing

**Test Success**:
```bash
curl -X POST http://localhost:3000/api/payments/test/confirm \
  -H "Content-Type: application/json" \
  -d '{
    "paymentId": "PAY-abc123",
    "status": "PAID",
    "transactionReference": "TXN-xyz789"
  }'
```

**Test Failure**:
```bash
curl -X POST http://localhost:3000/api/payments/test/confirm \
  -H "Content-Type: application/json" \
  -d '{
    "paymentId": "PAY-abc123",
    "status": "FAILED"
  }'
```

---

## Next Steps - Implementation Order

### PHASE 1: Database Integration (2-3 hours)
Priority: **HIGH** - Blocks everything else

1. **Add Payment CRUD to db.ts**
   ```typescript
   // In readTable() function:
   case 'payments':
     return pool.query('SELECT * FROM payment_transactions');
   
   // In writeTable() function:
   case 'payments':
     return bulkInsert(client, 'payment_transactions', data);
   ```

2. **Implement Payment Queries**
   ```typescript
   async getPaymentByOrderId(orderId: string)
   async getPaymentById(paymentId: string)
   async createPaymentTransaction(payment: Payment)
   async updatePaymentStatus(paymentId: string, status: PaymentStatus)
   ```

3. **Test**:
   ```bash
   npm run seed  # Create tables
   npm run dev   # Start dev server
   ```

### PHASE 2: Complete Payment APIs (3-4 hours)
Priority: **HIGH** - Core functionality

1. **POST /api/payments/create**
   - ✅ Validate order ownership
   - ✅ Verify amount matches order.total
   - ✅ Save payment to DB
   - ✅ Return payment with ID

2. **POST /api/payments/[id]/verify**
   - ✅ Validate customer/order ownership
   - ⚠️ Call payment gateway (TODO: choose provider)
   - ✅ Update payment status to PAID/FAILED
   - ✅ Update order status to CONFIRMED (if paid)
   - ✅ Notify delivery partners

3. **GET /api/payments/[id]**
   - ✅ Validate customer ownership
   - ✅ Return payment details from DB

### PHASE 3: Order Integration (2-3 hours)
Priority: **MEDIUM** - Better UX

1. **Update OrderContext**:
   ```typescript
   // Add to order object:
   payment?: {
     id: string;
     status: PaymentStatus;
     method: PaymentMethod;
     paidAt?: string;
   };
   ```

2. **Order Detail Pages**:
   - Show payment status in order tracking
   - Display payment method used
   - Show payment date if completed

3. **Order List Page**:
   - Add payment status badge
   - Filter by payment status

4. **Delivery Partner View**:
   - Only show orders with payment status = 'PAID'
   - Display payment confirmation status

### PHASE 4: Real Payment Gateway (4-6 hours)
Priority: **CRITICAL for production** 

Choose ONE:

**Option A: Razorpay (Recommended for India)**
```bash
npm install razorpay
```

Setup:
1. Create Razorpay account
2. Get API keys (production & test)
3. Implement in `/api/payments/verify`
4. Set up webhook handler at `/api/webhooks/razorpay`

**Option B: Stripe**
```bash
npm install @stripe/stripe-js
```

Setup:
1. Create Stripe account
2. Get publishable & secret keys
3. Implement checkout session
4. Set up webhook handler at `/api/webhooks/stripe`

**Option C: Other**
- Follow provider's Next.js integration docs
- Implement verify endpoint
- Create webhook handler

### PHASE 5: Testing & Hardening (3-4 hours)
Priority: **CRITICAL for production**

1. **Unit Tests**
   - PaymentService methods
   - Payment status transitions
   - Validation logic

2. **Integration Tests**
   - Full checkout to payment flow
   - Success/failure scenarios
   - Retry logic

3. **Security Review**
   - Check all ownership validations
   - Verify no payment details in logs
   - Confirm webhook signature verification
   - Test amount tampering

4. **E2E Tests**
   - Guest checkout to payment
   - Multiple payment methods
   - Retry scenarios

---

## Payment Gateway Integration Example (Razorpay)

### 1. Install
```bash
npm install razorpay
```

### 2. Environment Setup
```bash
# .env.local
RAZORPAY_KEY_ID=rzp_test_XXXXX
RAZORPAY_KEY_SECRET=XXXXXXX
```

### 3. Update Verify Endpoint

```typescript
// src/app/api/payments/[id]/verify/route.ts

import Razorpay from 'razorpay';
import crypto from 'crypto';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

export async function POST(request: Request, { params }) {
  const { id: paymentId } = await params;
  const body = await request.json();
  const { razorpayPaymentId, razorpayOrderId, razorpaySignature } = body;

  // Verify signature
  const hmac = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest('hex');

  if (hmac !== razorpaySignature) {
    return Response.json(
      { error: 'Invalid signature' },
      { status: 400 }
    );
  }

  // Get payment from DB
  const payment = await db.query(
    'SELECT * FROM payment_transactions WHERE id = $1',
    [paymentId]
  );

  // Fetch Razorpay payment to verify
  const razorpayPayment = await razorpay.payments.fetch(razorpayPaymentId);

  if (razorpayPayment.status === 'captured' && razorpayPayment.amount === payment.amount * 100) {
    // Mark as paid
    await db.query(
      'UPDATE payment_transactions SET status = $1, transactionReference = $2, paidAt = $3 WHERE id = $4',
      ['PAID', razorpayPaymentId, new Date().toISOString(), paymentId]
    );

    // Update order
    await db.query(
      'UPDATE orders SET paymentStatus = $1, status = $2 WHERE id = $3',
      ['PAID', 'CONFIRMED', payment.orderId]
    );

    return Response.json({ success: true, status: 'PAID' });
  }

  return Response.json(
    { error: 'Payment not captured' },
    { status: 400 }
  );
}
```

### 4. Update Checkout to Use Razorpay

```typescript
// In checkout page
const handlePayment = async () => {
  // Create order on backend
  const orderRes = await fetch('/api/orders', {
    method: 'POST',
    body: JSON.stringify({...})
  });
  const { order } = await orderRes.json();

  // Create payment in DB
  const paymentRes = await fetch('/api/payments/create', {...});
  const { payment } = await paymentRes.json();

  // Open Razorpay checkout
  const options = {
    key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
    amount: payment.amount * 100, // In paise
    currency: 'INR',
    order_id: order.id,
    handler: async (response) => {
      // Verify on backend
      const verifyRes = await fetch(`/api/payments/${payment.id}/verify`, {
        method: 'POST',
        body: JSON.stringify(response)
      });
      
      if (verifyRes.ok) {
        router.push(`/payment-success?paymentId=${payment.id}&orderId=${order.id}`);
      }
    }
  };

  const razorpay = new window.Razorpay(options);
  razorpay.open();
};
```

---

## Troubleshooting

### Payment Not Appearing in DB
- Check if table exists: `SELECT * FROM payment_transactions LIMIT 1;`
- Run seed: `npm run seed` (or POST `/api/seed`)
- Check db.ts for readTable case for 'payments'

### Test Endpoint Returns 501
- Normal! Actual gateway integration needed
- Use `/api/payments/test/confirm` for testing instead

### Order Not Updating to CONFIRMED
- Check payment_transactions table for PAID status
- Verify webhook is being called (if using real gateway)
- Check order update logic in verify endpoint

### Missing Payment Import Errors
- Verify file exists: `src/services/paymentService.ts`
- Check TypeScript paths in `tsconfig.json`
- Use `@/services/paymentService` import path

---

## Documentation Files

- **Architecture**: `PAYMENT_SYSTEM_GUIDE.md` (this file's parent)
- **API Reference**: See PAYMENT_SYSTEM_GUIDE.md endpoints section
- **Database**: PAYMENT_SYSTEM_GUIDE.md schema section
- **Security**: PAYMENT_SYSTEM_GUIDE.md security checklist

---

## Support Checklist

- [ ] Database tables created
- [ ] Payment APIs implemented
- [ ] Order integration complete
- [ ] Payment gateway chosen and integrated
- [ ] Webhook handler implemented
- [ ] All tests passing
- [ ] Security review done
- [ ] Production deployment checklist complete

---

**Questions? Issues?**
- Check PAYMENT_SYSTEM_GUIDE.md for detailed architecture
- Review existing API patterns in src/app/api/orders/
- Look at OrderContext for similar patterns in src/context/OrderContext.tsx
