import { db } from '../src/data/db';
import { generateOrderPdf } from '../src/utils/generateOrderPdf';

async function runTests() {
  console.log('=== FATAFAT ADMIN ORDER DETAILS & PDF VERIFICATION TEST ===\n');

  // 1. Prepare Mock/Test Order with 100% customisation and tracking fields
  const testOrderId = `TEST_ORDER_${Date.now()}`;
  const testOrderPayload = {
    id: testOrderId,
    customerName: 'Priya Sharma',
    customerPhone: '+91 98765 43210',
    customerEmail: 'priya.sharma@example.com',
    customerId: 'CUST-883921',
    address: {
      name: 'Priya Sharma',
      mobile: '+91 98765 43210',
      house: 'Flat 402, Royal Residency',
      street: 'Civil Lines Road',
      area: 'Near Gandhi Stadium',
      landmark: 'Opposite State Bank',
      city: 'Unnao',
      pincode: '209801'
    },
    items: [
      {
        productId: 'cake-belgian-truffle-101',
        id: 'cake-belgian-truffle-101',
        name: 'Dutch Truffle Luxury Chocolate Cake',
        price: 899,
        quantity: 2,
        image: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=500&auto=format&fit=crop&q=60',
        category: 'Cakes',
        unit: '1 Cake',
        selectedSize: '1.0 kg',
        selectedType: 'Eggless',
        flavour: 'Dutch Chocolate Truffle',
        cakeMessage: 'Happy 25th Anniversary Mom & Dad!',
        customImage: 'https://images.unsplash.com/photo-1513151233558-d860c5398176?w=500&auto=format&fit=crop&q=60',
        addons: [
          { name: 'Sparkling Candle', price: 50 },
          { name: 'Celebration Birthday Tag', price: 30 },
          'Golden Knife Set'
        ],
        specialInstructions: 'Please make sure delivery is before 7 PM and write message in dark chocolate font.',
        subtotal: 1798
      },
      {
        productId: 'flower-rose-bouquet-202',
        id: 'flower-rose-bouquet-202',
        name: 'Velvet Romance 12 Red Roses Bouquet',
        price: 599,
        quantity: 1,
        image: 'https://images.unsplash.com/photo-1561181286-d3fee7d55364?w=500&auto=format&fit=crop&q=60',
        category: 'Flowers',
        selectedSize: 'Standard (12 Stems)',
        selectedType: 'Fresh Cut',
        addons: ['Greeting Card (Love)'],
        specialInstructions: 'Add pink ribbon wrapping.',
        subtotal: 599
      }
    ],
    subtotal: 2397,
    discount: 200,
    couponCode: 'FATAFAT200',
    deliveryFee: 0,
    total: 2197,
    paymentStatus: 'PAID',
    paymentMethod: 'Razorpay UPI',
    razorpayPaymentId: 'pay_P893ks91Zlk402',
    razorpayOrderId: 'order_Rz9182kdm4011',
    status: 'Preparing',
    deliveryOtp: '7492',
    delivery_otp_verified: false,
    otpFailedAttempts: 0,
    deliveryLocationName: 'Unnao Central Hub',
    deliveryOption: 'ASAP',
    createdAt: new Date().toISOString()
  };

  console.log('1. Testing Order Normalization & Database Storage...');
  const createdOrder: any = await db.createOrder(testOrderPayload);
  console.log(`✓ Order successfully created in DB with ID: ${createdOrder.id}`);

  console.log('\n2. Retrieving Order from DB...');
  const retrievedOrder: any = await db.getOrderById(createdOrder.id as string);

  if (!retrievedOrder) {
    throw new Error(`Failed to retrieve order ${createdOrder.id} from database.`);
  }
  console.log(`✓ Order retrieved: ID=${retrievedOrder.id}, Total=₹${retrievedOrder.total}`);

  console.log('\n3. Verifying Preservation of Custom Fields & Customisation:');
  const firstItem = retrievedOrder.items[0];
  
  const checks = [
    { name: 'Customer Name', pass: retrievedOrder.address?.name === 'Priya Sharma' || retrievedOrder.customerName === 'Priya Sharma', val: retrievedOrder.address?.name },
    { name: 'Customer Mobile', pass: retrievedOrder.address?.mobile === '+91 98765 43210', val: retrievedOrder.address?.mobile },
    { name: 'Address Details', pass: (retrievedOrder.address?.house?.includes('Flat 402')) && (retrievedOrder.address?.landmark?.includes('State Bank')), val: retrievedOrder.address?.house },
    { name: 'Product Name', pass: firstItem.name.includes('Dutch Truffle'), val: firstItem.name },
    { name: 'Selected Size/Weight', pass: firstItem.selectedSize === '1.0 kg', val: firstItem.selectedSize },
    { name: 'Selected Type', pass: firstItem.selectedType === 'Eggless', val: firstItem.selectedType },
    { name: 'Flavour', pass: firstItem.flavour === 'Dutch Chocolate Truffle', val: firstItem.flavour },
    { name: 'Cake Message / Inscription', pass: firstItem.cakeMessage === 'Happy 25th Anniversary Mom & Dad!', val: firstItem.cakeMessage },
    { name: 'Customer Uploaded Custom Image', pass: !!firstItem.customImage && firstItem.customImage.includes('unsplash'), val: firstItem.customImage },
    { name: 'Add-ons Array', pass: Array.isArray(firstItem.addons) && firstItem.addons.length === 3, val: JSON.stringify(firstItem.addons) },
    { name: 'Special Instructions', pass: firstItem.specialInstructions?.includes('delivery is before 7 PM'), val: firstItem.specialInstructions },
    { name: 'Razorpay Payment ID', pass: retrievedOrder.razorpayPaymentId === 'pay_P893ks91Zlk402', val: retrievedOrder.razorpayPaymentId },
    { name: 'Razorpay Order ID', pass: retrievedOrder.razorpayOrderId === 'order_Rz9182kdm4011', val: retrievedOrder.razorpayOrderId },
    { name: 'Discount & Coupon Code', pass: retrievedOrder.discount === 200 && retrievedOrder.couponCode === 'FATAFAT200', val: `₹${retrievedOrder.discount} (${retrievedOrder.couponCode})` },
    { name: 'Grand Total', pass: retrievedOrder.total === 2197, val: `₹${retrievedOrder.total}` },
    { name: 'Delivery OTP', pass: retrievedOrder.deliveryOtp === '7492', val: retrievedOrder.deliveryOtp }
  ];

  let allPassed = true;
  for (const c of checks) {
    if (c.pass) {
      console.log(`  ✓ PASS: ${c.name} -> "${c.val}"`);
    } else {
      console.error(`  ✗ FAIL: ${c.name} -> Expected value missing or corrupted! Found: "${c.val}"`);
      allPassed = false;
    }
  }

  if (!allPassed) {
    throw new Error('Order field preservation checks failed!');
  }

  console.log('\n4. Testing PDF Generator Data Flow...');
  try {
    const pdfSuccess = await generateOrderPdf(retrievedOrder);
    console.log(`✓ generateOrderPdf executed successfully (Return: ${pdfSuccess})`);
  } catch (pdfErr) {
    console.error('✗ PDF Generation Error:', pdfErr);
    throw pdfErr;
  }

  console.log('\n=== ALL ADMIN ORDER DETAILS & PDF TESTS PASSED SUCCESSFULLY! ===');
}

runTests().catch((err) => {
  console.error('Test Execution Error:', err);
  process.exit(1);
});
