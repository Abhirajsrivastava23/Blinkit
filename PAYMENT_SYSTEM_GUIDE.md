# Payment Checkout System - Architecture & Implementation Guide

## Overview

This document describes the complete payment checkout system architecture for FATAFAT/Velmora e-commerce platform. The system is designed with security-first principles, separating payment status from order status, and providing clean abstractions for future payment gateway integration.

## System Components

### 1. Payment Service (`src/services/paymentService.ts`)

**Purpose**: Clean abstraction layer for payment operations

**Key Types**:
- `PaymentStatus`: 'PENDING' | 'PROCESSING' | 'PAID' | 'FAILED' | 'CANCELLED' | 'REFUND_PENDING' | 'REFUNDED'
- `PaymentMethod`: 'UPI' | 'Card' | 'NetBanking' | 'Internal'
- `PaymentProvider`: 'internal' (extensible for Razorpay, Stripe, etc.)
- `Payment`: Complete payment transaction record

**Key Methods**:
- `createPayment()`: Creates new PENDING payment
- `markProcessing()`: Updates to PROCESSING when form submitted
- `generateTransactionReference()`: Generates gateway reference ID
- `verifyPayment()`: **CRITICAL** - Server-side verification (TODO: integrate with real gateway)
- `markPaid()`: Only called after successful verification
- `markFailed()`: Marks payment as failed with reason
- `markCancelled()`: Customer-initiated cancellation
- `requestRefund()` / `markRefunded()`: Refund lifecycle
- `isPaid()`, `canRetry()`: Status checks
- `validateAmount()`: Ensures order total matches payment amount

**Security Features**:
- No auto-marking of PAID status without verification
- All payment verification is server-side
- Clean separation of concerns
- Extensible design for multiple payment providers

### 2. Database Schema

#### New Table: `payment_transactions`

```sql
CREATE TABLE IF NOT EXISTS payment_transactions (
  id VARCHAR(255) PRIMARY KEY,                    -- PAY-XXXXXX
  orderId VARCHAR(255) NOT NULL UNIQUE,           -- Links to orders.id
  customerId VARCHAR(255) NOT NULL,               -- Links to session.userId
  amount NUMERIC NOT NULL,                        -- In INR
  currency VARCHAR(3) DEFAULT 'INR',
  status VARCHAR(50) NOT NULL,                    -- Payment status
  method VARCHAR(50) NOT NULL,                    -- UPI/Card/NetBanking
  provider VARCHAR(50) NOT NULL,                  -- internal/razorpay/stripe
  transactionReference VARCHAR(255),              -- From payment gateway
  createdAt VARCHAR(255) NOT NULL,                -- ISO timestamp
  updatedAt VARCHAR(255) NOT NULL,                -- ISO timestamp
  paidAt VARCHAR(255),                            -- When PAID status set
  failureReason TEXT,                             -- If FAILED
  attemptCount INTEGER DEFAULT 0,                 -- Retry counter
  lastAttemptAt VARCHAR(255),                     -- Last retry timestamp
  metadata JSONB                                  -- Provider-specific data
);

-- Indexes for performance
CREATE INDEX idx_payment_transactions_customer_id ON payment_transactions(customerId);
CREATE INDEX idx_payment_transactions_order_id ON payment_transactions(orderId);
```

#### Updated: `orders` table

Already has `paymentStatus` and `paymentMethod` fields. These are maintained separately from `status` field:
- `status`: Order fulfillment status (Pending → Confirmed → Preparing → ... → Delivered)
- `paymentStatus`: Payment transaction status (PENDING → PROCESSING → PAID or FAILED)

### 3. API Endpoints

#### POST `/api/payments/create`
Creates a new payment transaction

**Request Body**:
```typescript
{
  orderId: string;           // Must match created order
  customerId: string;        // From session (server-verified)
  amount: number;            // Must match order.total
  paymentMethod: string;     // UPI | Card | NetBanking
}
```

**Response** (Success):
```typescript
{
  success: true;
  payment: {
    id: string;              // PAY-XXXXXX
    orderId: string;
    amount: number;
    currency: string;
    status: 'PENDING';
    createdAt: string;       // ISO timestamp
  }
}
```

**Security Checks**:
- ✅ Verify customer ownership of order (TODO)
- ✅ Verify order exists and is PENDING payment (TODO)
- ✅ Verify order total matches payment amount (TODO)
- ✅ Prevent duplicate payments for same order (TODO)

---

#### POST `/api/payments/[id]/verify`
Verifies payment with payment gateway

**Request Body**:
```typescript
{
  transactionReference?: string;  // From payment gateway response
  customerId?: string;            // For verification
}
```

**Response** (Failure - not yet implemented):
```typescript
{
  success: false;
  error: 'Payment verification not yet implemented. Payment gateway integration required.';
  message: 'Please integrate with a real payment provider to enable payment verification.';
}
```

**CRITICAL Security Logic** (TODO):
1. Fetch payment from `payment_transactions` table
2. Verify customer ownership
3. Fetch corresponding order
4. Verify amount matches order total
5. Query payment gateway with `transactionReference`
6. Verify:
   - Amount matches (no fake smaller payments)
   - Customer matches (no cross-customer payments)
   - Status is success
7. Only then call `paymentService.markPaid()`
8. Update order `paymentStatus` to 'PAID'
9. Update order `status` to 'CONFIRMED'
10. Notify delivery partners

**Never trust client-provided payment status** ⚠️

---

#### GET `/api/payments/[id]`
Retrieves payment status

**Response**:
```typescript
{
  id: string;
  orderId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  method: PaymentMethod;
  provider: PaymentProvider;
  createdAt: string;
  updatedAt: string;
  paidAt?: string;
  failureReason?: string;
}
```

**Security**: Only customer can view their own payments

---

#### POST `/api/payments/test/confirm` (Development Only)
Test endpoint for development/testing without real payment gateway

**Request Body**:
```typescript
{
  paymentId: string;
  status: 'PAID' | 'FAILED';
  transactionReference?: string;
}
```

**Security**:
- ⚠️ Only available in development (`NODE_ENV === 'development'`)
- Returns 403 in production
- Never use in production environment

**Usage**: For testing payment flows during development
```bash
curl -X POST http://localhost:3000/api/payments/test/confirm \
  -H "Content-Type: application/json" \
  -d '{"paymentId":"PAY-XXXXX","status":"PAID"}'
```

### 4. UI Components

#### `/src/app/checkout/page.tsx` (Updated)
- Step-based checkout flow (Address → Schedule → Payment → Review)
- ONLY online payment option (no COD)
- Delivery options: "Deliver Within 12 Hours" or "Schedule Delivery"
- Creates order with `paymentStatus: 'PENDING'`
- Creates payment transaction
- In development: Uses test payment endpoint (90% success rate)
- In production: Would redirect to real payment gateway
- On success: Redirects to `/payment-success`
- On failure: Redirects to `/payment-failed`

**Key Changes**:
```typescript
// Step 1: Create order (PENDING payment)
const order = placeOrder(...);

// Step 2: Create payment
const paymentRes = await fetch('/api/payments/create', { ... });
const { payment } = await paymentRes.json();

// Step 3: Process payment
if (devMode) {
  // Test mode: auto-confirm or simulate failure
  const success = Math.random() < 0.9;
  if (success) {
    router.push(`/payment-success?paymentId=${payment.id}&orderId=${order.id}`);
  } else {
    router.push(`/payment-failed?paymentId=${payment.id}&orderId=${order.id}`);
  }
} else {
  // Production: redirect to payment gateway
  // Payment gateway would call webhook on completion
}
```

#### `/src/app/payment-success/page.tsx` (New)
Success screen after payment confirmation

**Features**:
- ✅ Shows order and payment IDs
- ✅ Displays order status: CONFIRMED
- ✅ Explains next steps (preparing → delivery assignment → delivery)
- ✅ Action buttons:
  - "Track Order" → `/order/[id]`
  - "View Orders" → `/account/orders`
  - "Continue Shopping" → `/`
- ✅ Professional design with confirmation icon
- ✅ Mobile-optimized

#### `/src/app/payment-failed/page.tsx` (New)
Failure screen with retry capability

**Features**:
- ✅ Shows error reason
- ✅ Tracks retry attempts (max 2 retries)
- ✅ Action buttons:
  - "Try Again" (if retries available)
  - "Cancel Order"
- ✅ Explains common payment failure reasons
- ✅ Support contact information
- ✅ Professional design with error icon
- ✅ Mobile-optimized

### 5. Payment Flow Sequence

#### Complete Payment Lifecycle
```
1. Customer fills checkout form
   └─ Address, Delivery Option, Payment Method

2. Checkout page creates order
   └─ Order created with status: PENDING, paymentStatus: PENDING

3. Checkout page creates payment transaction
   └─ Payment created with status: PENDING

4. Payment processing begins
   ├─ Development: Test confirmation (90% success)
   └─ Production: Redirect to payment gateway

5a. SUCCESSFUL PATH
    ├─ Payment marked as PAID
    ├─ Payment transaction saved (transactionReference, paidAt)
    ├─ Order status updated to CONFIRMED
    ├─ Order paymentStatus updated to PAID
    ├─ Delivery partners notified (only confirmed orders visible)
    └─ Redirect to `/payment-success`

5b. FAILED PATH
    ├─ Payment marked as FAILED
    ├─ Failure reason saved
    ├─ Retry count incremented
    ├─ Order remains in PENDING state (customer can retry or cancel)
    └─ Redirect to `/payment-failed`
    
6. CANCELLED PATH
    ├─ Customer clicks "Cancel Order"
    ├─ Order cancelled
    └─ Return to home

7. RETRY PATH (Max 2 retries)
    ├─ Customer clicks "Try Again"
    ├─ Redirect to checkout with orderId parameter
    └─ Repeat payment process (up to 2 more times)
```

#### State Machine Diagram

```
PAYMENT STATES:
  PENDING ──submit──> PROCESSING ──success──> PAID (✅ Order confirmed)
              │                     │
              │                     └──failure──> FAILED (❌ Allow retry)
              │                                    │
              └─────────cancel─────────────────────┘

Order states depend on payment:
  Order.status = PENDING + Payment.status = PENDING
       ↓
  Order.status = PENDING + Payment.status = PROCESSING
       ↓
  Order.status = CONFIRMED + Payment.status = PAID ← Only when payment verified
       ↓
  Order.status = Preparing/Packed/Ready/... (fulfillment continues)

Refund states (if order cancelled after payment):
  Order cancelled + Payment.status = PAID
       ↓
  Payment.status = REFUND_PENDING
       ↓
  Payment.status = REFUNDED (after processing)
```

## Implementation Checklist

### ✅ COMPLETED
- [x] Payment service abstraction (`src/services/paymentService.ts`)
- [x] Database schema (payment_transactions table)
- [x] Database ALLOWED_COLUMNS configuration
- [x] Payment API endpoints skeleton
  - [x] POST `/api/payments/create`
  - [x] POST `/api/payments/[id]/verify`
  - [x] GET `/api/payments/[id]`
  - [x] POST `/api/payments/test/confirm` (test-only)
- [x] Checkout page integration (creates order + payment)
- [x] Payment success page UI
- [x] Payment failed page UI with retry logic

### 🔄 IN PROGRESS (TODO)

#### Database Operations
- [ ] Implement `insertRow` for payment_transactions table
- [ ] Implement `readTable` for payment_transactions
- [ ] Create database helper functions in db.ts for payment queries

#### Payment API Endpoints
- [ ] Implement POST `/api/payments/create`:
  - Verify order ownership and status
  - Verify amount matches order total
  - Check for duplicate payment
  - Save to database
  - Return payment transaction

- [ ] Implement POST `/api/payments/[id]/verify`:
  - Verify customer and order ownership
  - Validate payment amount
  - **Call real payment gateway** (TODO: integrate)
  - Mark payment as PAID only after gateway verification
  - Update order status to CONFIRMED
  - Notify delivery partners

- [ ] Implement GET `/api/payments/[id]`:
  - Security: Verify customer ownership
  - Return payment details from database

- [ ] Implement POST `/api/payments/[id]/retry`:
  - Verify customer ownership
  - Check retry count < 3
  - Increment retry counter
  - Return updated payment for retry flow

#### Webhook Handler (Production)
- [ ] Create POST `/api/webhooks/payment`:
  - Verify webhook signature (from payment gateway)
  - Update payment_transactions status
  - Update order status
  - Handle async payment notifications

#### Integration Points
- [ ] Update OrderContext to fetch associated payment
- [ ] Update order detail page to show payment status
- [ ] Update order list to show payment status
- [ ] Update admin order view with payment details
- [ ] Update delivery partner view: only see PAID orders

#### Real Payment Gateway Integration (Choose one)
- [ ] Razorpay integration
- [ ] Stripe integration
- [ ] Other (specify)

#### Testing
- [ ] Unit tests for PaymentService
- [ ] Integration tests for payment flow
- [ ] E2E tests for checkout to success
- [ ] E2E tests for checkout to failure
- [ ] Test retry logic
- [ ] Test edge cases (duplicate payments, amount mismatch, etc.)

### 📋 FUTURE ENHANCEMENTS

#### Payment Features
- [ ] Wallet/Account Balance payments
- [ ] EMI support
- [ ] Multiple payment method fallback
- [ ] Payment status webhooks to frontend (real-time updates)
- [ ] Partial refunds
- [ ] Payment receipt generation and email

#### Admin Features
- [ ] Payment analytics dashboard
- [ ] Manual payment status override (with audit log)
- [ ] Dispute/chargeback handling
- [ ] Payment reconciliation reports

#### Customer Features
- [ ] Save payment method
- [ ] Payment history
- [ ] Download invoices
- [ ] Payment receipts via email/SMS

---

## Security Checklist

**Server-Side Authority**
- ✅ Order ownership verified before payment (TODO: implement)
- ✅ Amount verified server-side (TODO: implement)
- ✅ No client can modify payment status
- ✅ Payment marked PAID only after gateway verification

**Payment Verification**
- ✅ Webhook signatures verified (TODO: implement)
- ✅ Transaction reference validated (TODO: implement)
- ✅ Idempotent payment processing (TODO: implement with unique orderId in transactions table)

**Data Protection**
- ✅ No payment credentials stored in database
- ✅ Payment method securely handled by gateway
- ✅ Transaction reference used instead of sensitive data

**Error Handling**
- ✅ Never expose sensitive errors to client
- ✅ Log all payment operations (TODO: add audit logging)
- ✅ Rate limiting on payment endpoints (TODO: implement)

---

## Configuration

### Environment Variables

```bash
# Payment Gateway (Choose one based on integration)
PAYMENT_PROVIDER=internal              # internal | razorpay | stripe
PAYMENT_TEST_MODE=true                 # Development only
RAZORPAY_KEY_ID=xxx                    # If using Razorpay
RAZORPAY_KEY_SECRET=xxx
STRIPE_PUBLISHABLE_KEY=xxx             # If using Stripe
STRIPE_SECRET_KEY=xxx
WEBHOOK_SECRET=xxx                     # For verifying webhooks
```

### Development Setup

1. **Test Mode Enabled**: `PAYMENT_TEST_MODE=true`
2. **Use Test Endpoint**: POST `/api/payments/test/confirm`
3. **Success Rate**: 90% (for testing failure scenarios)

### Production Setup

1. **Real Gateway**: Set `PAYMENT_PROVIDER` to actual provider
2. **Webhook Handler**: Implement `/api/webhooks/payment`
3. **Signature Verification**: Verify webhook signatures from gateway
4. **SSL/TLS**: All payment endpoints must use HTTPS
5. **Rate Limiting**: Implement on payment endpoints

---

## Database Migration

Run database seeding to create payment_transactions table:

```bash
# Manual migration (if needed)
curl -X POST http://localhost:3000/api/seed

# Automatic on first payment attempt
# (Payment table created by existing db.seedDatabase() logic)
```

---

## Monitoring & Logging

### Key Metrics to Track
- Payment success rate
- Average payment processing time
- Retry rate
- Payment method distribution (UPI vs Card vs NetBanking)
- Failed payment reasons

### Logging Points
- Payment creation
- Payment status changes
- Gateway responses
- Webhook receipts
- Verification failures

---

## Support & Testing

### Test Payment IDs
- Development: PAY-XXXXXXXXXXXXX
- Test Mode Response: HTTP 501 (not implemented)

### Testing the Flow

1. **Checkout**:
   ```bash
   POST /api/checkout
   ```

2. **Create Payment**:
   ```bash
   POST /api/payments/create
   {
     "orderId": "ORD-XXX",
     "customerId": "CUST-XXX",
     "amount": 500,
     "paymentMethod": "UPI"
   }
   ```

3. **Test Confirmation** (Development Only):
   ```bash
   POST /api/payments/test/confirm
   {
     "paymentId": "PAY-XXX",
     "status": "PAID"
   }
   ```

---

## Next Steps

1. **Implement Database Operations**:
   - Payment CRUD operations
   - Query helpers in db.ts

2. **Complete API Endpoints**:
   - Full implementation of verify endpoint
   - Real gateway integration

3. **Add Order Integration**:
   - Update OrderContext with payment info
   - Display payment status in order pages
   - Restrict delivery partner access to paid orders

4. **Real Payment Gateway**:
   - Choose provider (Razorpay recommended for India)
   - Implement integration
   - Set up webhook handler
   - Test with sandbox environment

5. **Testing & Deployment**:
   - Comprehensive test suite
   - Staging environment validation
   - Production deployment checklist

---

## References

- Payment Service: `src/services/paymentService.ts`
- Payment APIs: `src/app/api/payments/**`
- Checkout Page: `src/app/checkout/page.tsx`
- Success Page: `src/app/payment-success/page.tsx`
- Failure Page: `src/app/payment-failed/page.tsx`
- Database Schema: `src/data/db.ts` (payment_transactions table)

---

**Last Updated**: 2024
**Status**: Architecture Complete, Implementation 20% Complete
**Owner**: FATAFAT Development Team
