/**
 * FATAFAT Premium Transactional Email Templates
 * 
 * Luxury, responsive, brand-consistent HTML templates engineered for 
 * universal rendering across Gmail (Desktop/Mobile), Outlook, Apple Mail, and mobile clients.
 * 
 * Palette:
 * - Brand Velvet Maroon: #7C1D37
 * - Brand Deep Maroon: #541021
 * - Warm Gold / Champagne: #B45309
 * - Background Canvas: #FBFBFA (Warm Porcelain)
 * - Card Background: #FFFFFF
 * - Border Tint: #EAE6E1
 * - Primary Text: #1E293B
 * - Secondary Text: #475569
 */

export interface EmailTemplateResult {
  subject: string;
  html: string;
}

const BRAND_MAROON = '#7C1D37';
const BRAND_DEEP_MAROON = '#541021';
const BRAND_GOLD = '#B45309';
const BG_CANVAS = '#FBFBFA';
const CARD_BG = '#FFFFFF';
const BORDER_COLOR = '#EAE6E1';
const TEXT_DARK = '#1E293B';
const TEXT_MUTED = '#64748B';

/**
 * Base Email Wrapper with Responsive Header, Content Area, and Luxury Footer
 */
export function renderEmailLayout({
  title,
  preheader,
  headerBadge,
  childrenHtml,
  callToAction
}: {
  title: string;
  preheader?: string;
  headerBadge?: { text: string; bg: string; color: string; border?: string };
  childrenHtml: string;
  callToAction?: { text: string; url: string };
}): string {
  const ctaBlock = callToAction ? `
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 28px; margin-bottom: 24px;">
      <tr>
        <td align="center">
          <table border="0" cellpadding="0" cellspacing="0">
            <tr>
              <td align="center" style="border-radius: 50px; background-color: ${BRAND_MAROON};">
                <a href="${callToAction.url}" target="_blank" style="display: inline-block; padding: 14px 36px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 13px; font-weight: 700; color: #FFFFFF; text-decoration: none; border-radius: 50px; text-transform: uppercase; letter-spacing: 0.8px; border: 1px solid ${BRAND_DEEP_MAROON};">
                  ${callToAction.text} &rarr;
                </a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  ` : '';

  const badgeHtml = headerBadge ? `
    <div style="display: inline-block; padding: 4px 12px; border-radius: 20px; background-color: ${headerBadge.bg}; color: ${headerBadge.color}; border: 1px solid ${headerBadge.border || 'transparent'}; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px;">
      ${headerBadge.text}
    </div>
  ` : '';

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${title}</title>
  <style type="text/css">
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
    body { margin: 0; padding: 0; width: 100% !important; background-color: ${BG_CANVAS}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    @media screen and (max-width: 600px) {
      .container-table { width: 100% !important; border-radius: 0 !important; }
      .mobile-padding { padding-left: 20px !important; padding-right: 20px !important; }
      .mobile-stack { display: block !important; width: 100% !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: ${BG_CANVAS}; color: ${TEXT_DARK};">
  ${preheader ? `<div style="display: none; font-size: 1px; color: ${BG_CANVAS}; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden;">${preheader}</div>` : ''}

  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: ${BG_CANVAS}; padding: 36px 12px 48px 12px;">
    <tr>
      <td align="center">
        
        <!-- Main Card Container -->
        <table border="0" cellpadding="0" cellspacing="0" width="580" class="container-table" style="max-width: 580px; width: 100%; background-color: ${CARD_BG}; border-radius: 16px; overflow: hidden; border: 1px solid ${BORDER_COLOR}; box-shadow: 0 4px 20px rgba(0,0,0,0.03);">
          
          <!-- Top Brand Accent Stripe -->
          <tr>
            <td style="height: 4px; background-color: ${BRAND_MAROON}; font-size: 1px; line-height: 1px;">&nbsp;</td>
          </tr>

          <!-- Brand Header -->
          <tr>
            <td style="background-color: #FFFFFF; padding: 28px 32px 20px 32px; text-align: center; border-bottom: 1px solid #F1EFEA;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center">
                    <span style="font-family: 'Playfair Display', Georgia, 'Times New Roman', serif; font-size: 26px; font-weight: 900; letter-spacing: 3px; color: ${BRAND_MAROON}; text-transform: uppercase;">FATAFAT</span>
                    <div style="font-size: 9px; color: ${BRAND_GOLD}; letter-spacing: 2.5px; text-transform: uppercase; margin-top: 4px; font-weight: 700;">FRESH CELEBRATIONS &bull; DELIVERED FAST</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Notification Title Section -->
          <tr>
            <td style="padding: 32px 32px 16px 32px;" class="mobile-padding">
              ${badgeHtml}
              <h1 style="margin: 0 0 6px 0; font-family: 'Playfair Display', Georgia, serif; font-size: 22px; font-weight: 800; color: ${TEXT_DARK}; line-height: 1.3;">
                ${title}
              </h1>
            </td>
          </tr>

          <!-- Dynamic Content Body -->
          <tr>
            <td style="padding: 0 32px 24px 32px; font-size: 14px; line-height: 1.6; color: #475569;" class="mobile-padding">
              ${childrenHtml}
              ${ctaBlock}
            </td>
          </tr>

          <!-- Security & Support Box -->
          <tr>
            <td style="padding: 0 32px 28px 32px;" class="mobile-padding">
              <div style="background-color: #F8F9FA; border-radius: 12px; padding: 14px 18px; border: 1px solid #ECEAE5; border-left: 4px solid ${BRAND_MAROON}; font-size: 12px; color: ${TEXT_MUTED}; line-height: 1.5;">
                <strong style="color: ${TEXT_DARK}; font-weight: 700;">Need assistance?</strong> Contact us at <a href="mailto:hello.fatafat@gmail.com" style="color: ${BRAND_MAROON}; text-decoration: none; font-weight: 700;">hello.fatafat@gmail.com</a>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #FAF9F7; padding: 24px 32px; text-align: center; border-top: 1px solid #ECEAE5; font-size: 11px; color: #94A3B8; line-height: 1.6;" class="mobile-padding">
              <div style="font-weight: 700; color: #64748B; margin-bottom: 4px; letter-spacing: 0.5px;">FATAFAT &mdash; Handcrafted Freshness Delivered</div>
              <div>Nawabganj &bull; Unnao &bull; Chandigarh University &bull; Express Hubs</div>
              <div style="margin-top: 8px;">&copy; ${new Date().getFullYear()} FATAFAT App. All rights reserved. &bull; <a href="https://www.fatafatapp.me" style="color: #64748B; text-decoration: underline; font-weight: 600;">fatafatapp.me</a></div>
              <div style="margin-top: 8px; font-size: 11px; color: #64748B; font-weight: 500;">Please do not reply to this email. This is an automated message.</div>
              <div style="margin-top: 4px; font-size: 10px; color: #94A3B8;">Security reminder: FATAFAT staff will never request your PIN or passwords.</div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Renders an itemized table for order products
 */
export function renderOrderItemsTable(items: any[]): string {
  if (!items || items.length === 0) return '';
  const rows = items.map((item: any) => {
    const name = item.name || item.title || 'Product';
    const qty = Number(item.quantity || 1);
    const price = Number(item.price || 0);
    const subtotal = Number(item.subtotal || price * qty);
    const variantInfo = [item.selectedSize, item.selectedType, item.flavour].filter(Boolean).join(' &bull; ');
    const customMsg = item.cakeMessage ? `<div style="font-size: 11px; color: #B45309; margin-top: 3px; font-style: italic;">Note on cake: "${item.cakeMessage}"</div>` : '';

    return `
      <tr style="border-bottom: 1px solid #F1EFEA;">
        <td style="padding: 12px 0; vertical-align: top;">
          <div style="font-weight: 700; color: ${TEXT_DARK}; font-size: 13px;">${name} <span style="font-weight: 600; color: ${TEXT_MUTED};">&times; ${qty}</span></div>
          ${variantInfo ? `<div style="font-size: 11px; color: ${TEXT_MUTED}; margin-top: 2px;">${variantInfo}</div>` : ''}
          ${customMsg}
        </td>
        <td style="padding: 12px 0; text-align: right; vertical-align: top; font-weight: 700; color: ${TEXT_DARK}; font-size: 13px;">
          &#8377;${subtotal.toLocaleString('en-IN')}
        </td>
      </tr>
    `;
  }).join('');

  return `
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 16px; margin-bottom: 16px;">
      <thead>
        <tr style="border-bottom: 2px solid ${BORDER_COLOR};">
          <th align="left" style="padding-bottom: 8px; font-size: 11px; text-transform: uppercase; color: ${TEXT_MUTED}; font-weight: 700; letter-spacing: 0.5px;">Item Details</th>
          <th align="right" style="padding-bottom: 8px; font-size: 11px; text-transform: uppercase; color: ${TEXT_MUTED}; font-weight: 700; letter-spacing: 0.5px;">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  `;
}

/**
 * Renders price breakdown
 */
export function renderPriceBreakdown({
  subtotal,
  deliveryFee,
  discount,
  total
}: {
  subtotal: number;
  deliveryFee: number;
  discount?: number;
  total: number;
}): string {
  return `
    <div style="background-color: #FAF9F7; border-radius: 10px; padding: 14px 16px; border: 1px solid #ECEAE5; margin-top: 14px;">
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="font-size: 13px; color: #475569;">
        <tr>
          <td style="padding: 3px 0;">Item Subtotal</td>
          <td align="right" style="padding: 3px 0; font-weight: 600; color: ${TEXT_DARK};">&#8377;${subtotal.toLocaleString('en-IN')}</td>
        </tr>
        <tr>
          <td style="padding: 3px 0;">Delivery Fee</td>
          <td align="right" style="padding: 3px 0; font-weight: 600;">${deliveryFee === 0 ? '<span style="color: #16A34A; font-weight: 700;">FREE</span>' : `&#8377;${deliveryFee}`}</td>
        </tr>
        ${discount && discount > 0 ? `
        <tr>
          <td style="padding: 3px 0; color: #16A34A;">Special Discount</td>
          <td align="right" style="padding: 3px 0; font-weight: 700; color: #16A34A;">-&#8377;${discount.toLocaleString('en-IN')}</td>
        </tr>
        ` : ''}
        <tr style="border-top: 1px solid #E2DFD8;">
          <td style="padding: 10px 0 2px 0; font-weight: 800; color: ${TEXT_DARK}; font-size: 14px;">Total Amount</td>
          <td align="right" style="padding: 10px 0 2px 0; font-weight: 800; color: ${BRAND_MAROON}; font-size: 16px;">&#8377;${total.toLocaleString('en-IN')}</td>
        </tr>
      </table>
    </div>
  `;
}

/* ==========================================================================
   CUSTOMER EMAIL TEMPLATES (1 to 15)
   ========================================================================== */

// 1. Order Placed
export function templateOrderPlaced(order: any): EmailTemplateResult {
  const orderId = String(order.id).replace(/^#+/, '');
  const customerName = order.address?.name || 'Valued Customer';
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.fatafatapp.me';
  const total = Number(order.total ?? order.totalAmount ?? 0);
  const subtotal = Number(order.subtotal ?? total);

  const content = `
    <p style="margin: 0 0 12px 0;">Dear <strong>${customerName}</strong>,</p>
    <p style="margin: 0 0 16px 0;">Thank you for your order with <strong>FATAFAT</strong>! Your celebration order <strong>#${orderId}</strong> has been successfully placed and forwarded to our kitchen.</p>
    
    <div style="background-color: #FFF5F7; border: 1px solid #FCD4DC; border-radius: 10px; padding: 14px 18px; margin: 18px 0;">
      <div style="font-size: 11px; color: ${BRAND_MAROON}; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">ESTIMATED DELIVERY</div>
      <div style="font-size: 16px; font-weight: 800; color: ${BRAND_MAROON}; margin-top: 2px;">Delivery within 24 hours</div>
    </div>

    ${renderOrderItemsTable(order.items || [])}
    ${renderPriceBreakdown({
      subtotal,
      deliveryFee: Number(order.deliveryFee || 0),
      discount: Number(order.discount || 0),
      total
    })}

    <div style="margin-top: 18px; font-size: 12px; color: ${TEXT_MUTED}; line-height: 1.5;">
      <strong>Delivery Destination:</strong> ${order.address?.street || ''}, ${order.address?.city || ''} &bull; Ph: ${order.address?.mobile || order.address?.phone || ''}
    </div>
  `;

  return {
    subject: `Order Placed: #${orderId} - FATAFAT`,
    html: renderEmailLayout({
      title: `Order #${orderId} Placed Successfully!`,
      preheader: `We've received your order #${orderId} and are getting ready to deliver fresh celebrations.`,
      headerBadge: { text: 'Order Placed', bg: '#FEF3C7', color: '#92400E', border: '#FDE68A' },
      childrenHtml: content,
      callToAction: { text: 'Track Live Order', url: `${appUrl}/orders/${orderId}` }
    })
  };
}

// 2. Payment Successfully Verified
export function templatePaymentVerified(order: any, paymentId?: string): EmailTemplateResult {
  const orderId = String(order.id).replace(/^#+/, '');
  const customerName = order.address?.name || 'Valued Customer';
  const payRef = paymentId || order.razorpayPaymentId || order.paymentId || 'Verified';
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.fatafatapp.me';
  const total = Number(order.total ?? order.totalAmount ?? 0);

  const content = `
    <p style="margin: 0 0 12px 0;">Dear <strong>${customerName}</strong>,</p>
    <p style="margin: 0 0 16px 0;">Your payment for order <strong>#${orderId}</strong> has been <strong>successfully verified and confirmed</strong> via Razorpay.</p>

    <div style="background-color: #ECFDF5; border: 1px solid #A7F3D0; border-radius: 10px; padding: 16px 18px; margin: 18px 0;">
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="font-size: 13px; color: #065F46;">
        <tr>
          <td><strong>Payment Status:</strong></td>
          <td align="right" style="color: #16A34A; font-weight: 700;">PAID &amp; VERIFIED &#10004;</td>
        </tr>
        <tr>
          <td style="padding-top: 6px;"><strong>Transaction ID:</strong></td>
          <td align="right" style="padding-top: 6px; font-family: monospace; font-weight: 600;">${payRef}</td>
        </tr>
        <tr>
          <td style="padding-top: 6px;"><strong>Amount Paid:</strong></td>
          <td align="right" style="padding-top: 6px; font-weight: 800; font-size: 15px; color: ${BRAND_MAROON};">&#8377;${total.toLocaleString('en-IN')}</td>
        </tr>
      </table>
    </div>

    <p style="font-size: 13px; color: #475569;">Our master bakers and team are now prioritizing your order in the kitchen. Freshness and timely delivery are guaranteed.</p>
  `;

  return {
    subject: `Payment Confirmed: Order #${orderId} (₹${total}) - FATAFAT`,
    html: renderEmailLayout({
      title: `Payment Verified for #${orderId}`,
      preheader: `Your payment of ₹${total} has been confirmed. Kitchen prep has started!`,
      headerBadge: { text: 'Payment Verified', bg: '#D1FAE5', color: '#065F46', border: '#A7F3D0' },
      childrenHtml: content,
      callToAction: { text: 'View Order Status', url: `${appUrl}/orders/${orderId}` }
    })
  };
}

// 3. Order Confirmed
export function templateOrderConfirmed(order: any): EmailTemplateResult {
  const orderId = String(order.id).replace(/^#+/, '');
  const customerName = order.address?.name || 'Valued Customer';
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.fatafatapp.me';

  const content = `
    <p style="margin: 0 0 12px 0;">Dear <strong>${customerName}</strong>,</p>
    <p style="margin: 0 0 16px 0;">Great news! Your order <strong>#${orderId}</strong> has been <strong>confirmed by our store team</strong> and entered the preparation queue.</p>
    
    <div style="background-color: #FAF9F7; border-radius: 10px; padding: 14px 18px; border: 1px solid #ECEAE5; margin: 18px 0;">
      <div style="font-size: 13px; color: ${TEXT_DARK}; line-height: 1.5;">
        <strong>Delivery Location:</strong> ${order.deliveryLocationName || 'Nawabganj Hub'}<br>
        <strong>Address:</strong> ${order.address?.street || ''}, ${order.address?.city || ''}
      </div>
    </div>

    ${renderOrderItemsTable(order.items || [])}
  `;

  return {
    subject: `Order Confirmed: #${orderId} - FATAFAT`,
    html: renderEmailLayout({
      title: `Order #${orderId} Confirmed`,
      preheader: `Your order is confirmed and scheduled for fresh preparation.`,
      headerBadge: { text: 'Confirmed', bg: '#E0E7FF', color: '#3730A3', border: '#C7D2FE' },
      childrenHtml: content,
      callToAction: { text: 'Track Live Order', url: `${appUrl}/orders/${orderId}` }
    })
  };
}

// 4. Order Preparing
export function templateOrderPreparing(order: any): EmailTemplateResult {
  const orderId = String(order.id).replace(/^#+/, '');
  const customerName = order.address?.name || 'Valued Customer';
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.fatafatapp.me';

  const content = `
    <p style="margin: 0 0 12px 0;">Dear <strong>${customerName}</strong>,</p>
    <p style="margin: 0 0 16px 0;">Our artisan chefs and bakers are currently <strong>handcrafting and preparing your order</strong> with fresh ingredients.</p>

    <div style="text-align: center; padding: 22px 18px; background-color: #FFFDF7; border: 1px solid #FEF3C7; border-radius: 12px; margin: 18px 0;">
      <div style="font-size: 26px; margin-bottom: 6px;">&#127856;</div>
      <div style="font-weight: 800; color: #92400E; font-size: 15px; font-family: 'Playfair Display', Georgia, serif;">Freshness In The Works!</div>
      <div style="font-size: 12px; color: #B45309; margin-top: 4px;">Baking, quality checks, and temperature-controlled packaging in progress.</div>
    </div>
  `;

  return {
    subject: `Baking & Preparing: Order #${orderId} - FATAFAT`,
    html: renderEmailLayout({
      title: `Order #${orderId} is Being Prepared`,
      preheader: `Your items are freshly being crafted in our kitchen right now.`,
      headerBadge: { text: 'Kitchen Preparing', bg: '#FEF3C7', color: '#92400E', border: '#FDE68A' },
      childrenHtml: content,
      callToAction: { text: 'Live Kitchen Tracker', url: `${appUrl}/orders/${orderId}` }
    })
  };
}

// 5. Out for Delivery
export function templateOutForDelivery(order: any): EmailTemplateResult {
  const orderId = String(order.id).replace(/^#+/, '');
  const customerName = order.address?.name || 'Valued Customer';
  const partnerName = order.assignedPartnerName || 'Your FATAFAT Rider';
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.fatafatapp.me';

  const content = `
    <p style="margin: 0 0 12px 0;">Dear <strong>${customerName}</strong>,</p>
    <p style="margin: 0 0 16px 0;">Your order <strong>#${orderId}</strong> has been picked up and is <strong>Out for Delivery</strong>!</p>

    <div style="background-color: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 10px; padding: 16px 18px; margin: 18px 0;">
      <div style="font-size: 13px; color: #166534; line-height: 1.5;">
        <strong>Delivery Partner:</strong> ${partnerName}<br>
        <strong>Delivery Address:</strong> ${order.address?.street || ''}, ${order.address?.city || ''}
      </div>
    </div>

    <p style="font-size: 13px; color: #475569;">Your rider will arrive shortly. Please ensure your contact phone (${order.address?.mobile || order.address?.phone || 'registered number'}) is reachable.</p>
    <p style="font-size: 12px; color: #94A3B8;"><em>Note: For your security, your delivery verification code is accessible directly on your live tracking screen.</em></p>
  `;

  return {
    subject: `Out for Delivery: Order #${orderId} is on the way! - FATAFAT`,
    html: renderEmailLayout({
      title: `Order #${orderId} is Out for Delivery`,
      preheader: `${partnerName} is on the way with your fresh order!`,
      headerBadge: { text: 'Out For Delivery', bg: '#DCFCE7', color: '#166534', border: '#BBF7D0' },
      childrenHtml: content,
      callToAction: { text: 'Track Rider Live', url: `${appUrl}/orders/${orderId}` }
    })
  };
}

// 6. Order Delivered
export function templateOrderDelivered(order: any): EmailTemplateResult {
  const orderId = String(order.id).replace(/^#+/, '');
  const customerName = order.address?.name || 'Valued Customer';
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.fatafatapp.me';

  const content = `
    <p style="margin: 0 0 12px 0;">Dear <strong>${customerName}</strong>,</p>
    <p style="margin: 0 0 16px 0;">Your order <strong>#${orderId}</strong> has been <strong>successfully delivered</strong>! We hope it brings joy and celebration to your day.</p>

    <div style="text-align: center; padding: 22px 18px; background-color: #FAF9F7; border: 1px solid #ECEAE5; border-radius: 12px; margin: 18px 0;">
      <div style="font-size: 26px; margin-bottom: 6px;">&#10024;&#127881;&#10024;</div>
      <div style="font-weight: 800; color: ${BRAND_MAROON}; font-size: 16px; font-family: 'Playfair Display', Georgia, serif;">Thank you for celebrating with FATAFAT!</div>
      <div style="font-size: 12px; color: ${TEXT_MUTED}; margin-top: 4px;">We would love to know your experience.</div>
    </div>

    <p style="font-size: 13px; color: #475569;">If you have any feedback or if anything was not up to our highest standards, please reach out within 2 hours of delivery for immediate assistance.</p>
  `;

  return {
    subject: `Delivered: Order #${orderId} - Enjoy your celebration! - FATAFAT`,
    html: renderEmailLayout({
      title: `Order #${orderId} Delivered!`,
      preheader: `Your order #${orderId} has been delivered. Thank you for choosing FATAFAT!`,
      headerBadge: { text: 'Delivered', bg: '#D1FAE5', color: '#065F46', border: '#A7F3D0' },
      childrenHtml: content,
      callToAction: { text: 'Rate Your Order', url: `${appUrl}/orders/${orderId}` }
    })
  };
}

// 7. Order Cancelled
export function templateOrderCancelled(order: any, reason?: string): EmailTemplateResult {
  const orderId = String(order.id).replace(/^#+/, '');
  const customerName = order.address?.name || 'Valued Customer';
  const cancelReason = reason || order.cancellationReason || 'Requested by customer / administrative adjustment';
  const isPaid = String(order.paymentStatus || '').toUpperCase() === 'PAID';
  const total = Number(order.total ?? order.totalAmount ?? 0);

  const content = `
    <p style="margin: 0 0 12px 0;">Dear <strong>${customerName}</strong>,</p>
    <p style="margin: 0 0 16px 0;">This email confirms that your order <strong>#${orderId}</strong> has been <strong>cancelled</strong>.</p>

    <div style="background-color: #FEF2F2; border: 1px solid #FECACA; border-radius: 10px; padding: 14px 18px; margin: 18px 0;">
      <div style="font-size: 11px; color: #991B1B; font-weight: 700; text-transform: uppercase;">Reason for Cancellation</div>
      <div style="font-size: 13px; color: #B91C1C; margin-top: 2px;">${cancelReason}</div>
    </div>

    ${isPaid ? `
      <div style="background-color: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 10px; padding: 14px 18px; margin: 18px 0;">
        <div style="font-size: 11px; color: #166534; font-weight: 700; text-transform: uppercase;">Refund Information</div>
        <div style="font-size: 13px; color: #15803D; margin-top: 2px;">Since your payment of &#8377;${total} was completed, our team has initiated your refund. It will reflect in your source account within 3-7 business days.</div>
      </div>
    ` : ''}

    <p style="font-size: 13px; color: #475569;">If this cancellation was in error or if you have questions, please contact our support team right away.</p>
  `;

  return {
    subject: `Order Cancelled: #${orderId} - FATAFAT`,
    html: renderEmailLayout({
      title: `Order #${orderId} Cancelled`,
      preheader: `Confirmation of cancellation for order #${orderId}.`,
      headerBadge: { text: 'Cancelled', bg: '#FEE2E2', color: '#991B1B', border: '#FECACA' },
      childrenHtml: content
    })
  };
}

// 8. Refund Requested
export function templateRefundRequested(refundReq: any, order?: any): EmailTemplateResult {
  const orderId = String(refundReq.orderId).replace(/^#+/, '');
  const reqId = refundReq.id || 'Pending';
  const amount = Number(refundReq.amount || order?.total || order?.totalAmount || 0);

  const content = `
    <p style="margin: 0 0 12px 0;">Dear Valued Customer,</p>
    <p style="margin: 0 0 16px 0;">We have received your refund request for order <strong>#${orderId}</strong>.</p>

    <div style="background-color: #FFFDF5; border: 1px solid #FEF08A; border-radius: 10px; padding: 16px 18px; margin: 18px 0;">
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="font-size: 13px; color: #854D0E;">
        <tr>
          <td><strong>Request Reference:</strong></td>
          <td align="right" style="font-family: monospace; font-weight: 600;">${reqId}</td>
        </tr>
        <tr>
          <td style="padding-top: 6px;"><strong>Order ID:</strong></td>
          <td align="right">#${orderId}</td>
        </tr>
        <tr>
          <td style="padding-top: 6px;"><strong>Refund Amount:</strong></td>
          <td align="right" style="font-weight: 800; color: ${BRAND_MAROON}; font-size: 15px;">&#8377;${amount.toLocaleString('en-IN')}</td>
        </tr>
        <tr>
          <td style="padding-top: 6px;"><strong>Reason:</strong></td>
          <td align="right">${refundReq.reason}</td>
        </tr>
      </table>
    </div>

    <p style="font-size: 13px; color: #475569;">Our claims audit team is reviewing your request according to our store refund policies. You will receive an email update within <strong>24 hours</strong>.</p>
  `;

  return {
    subject: `Refund Request Received: Order #${orderId} (₹${amount}) - FATAFAT`,
    html: renderEmailLayout({
      title: `Refund Request Acknowledged`,
      preheader: `We've received your refund request for Order #${orderId}.`,
      headerBadge: { text: 'Under Review', bg: '#FEF3C7', color: '#92400E', border: '#FDE68A' },
      childrenHtml: content
    })
  };
}

// 9. Refund Approved / Processed
export function templateRefundProcessed(refundReq: any, order?: any): EmailTemplateResult {
  const orderId = String(refundReq.orderId).replace(/^#+/, '');
  const amount = Number(refundReq.amount || order?.total || order?.totalAmount || 0);
  const refundId = refundReq.razorpayRefundId || 'Processed via Razorpay';

  const content = `
    <p style="margin: 0 0 12px 0;">Dear Valued Customer,</p>
    <p style="margin: 0 0 16px 0;">Your refund request for order <strong>#${orderId}</strong> has been <strong>approved and processed</strong>.</p>

    <div style="background-color: #ECFDF5; border: 1px solid #A7F3D0; border-radius: 10px; padding: 16px 18px; margin: 18px 0;">
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="font-size: 13px; color: #065F46;">
        <tr>
          <td><strong>Refund Status:</strong></td>
          <td align="right" style="color: #16A34A; font-weight: 700;">APPROVED &amp; EXECUTED &#10004;</td>
        </tr>
        <tr>
          <td style="padding-top: 6px;"><strong>Refunded Amount:</strong></td>
          <td align="right" style="font-weight: 800; font-size: 16px; color: ${BRAND_MAROON};">&#8377;${amount.toLocaleString('en-IN')}</td>
        </tr>
        <tr>
          <td style="padding-top: 6px;"><strong>Gateway Reference:</strong></td>
          <td align="right" style="font-family: monospace; font-weight: 600;">${refundId}</td>
        </tr>
      </table>
    </div>

    <p style="font-size: 13px; color: #475569;">The funds have been released back to your original payment method (Bank/UPI/Card). Depending on your bank, it typically reflects within <strong>3 to 7 business days</strong>.</p>
  `;

  return {
    subject: `Refund Approved: ₹${amount} Processed for Order #${orderId} - FATAFAT`,
    html: renderEmailLayout({
      title: `Refund Approved &amp; Processed`,
      preheader: `Your refund of ₹${amount} for Order #${orderId} has been processed via Razorpay.`,
      headerBadge: { text: 'Refunded', bg: '#D1FAE5', color: '#065F46', border: '#A7F3D0' },
      childrenHtml: content
    })
  };
}

// 10. Refund Rejected
export function templateRefundRejected(refundReq: any, reason?: string): EmailTemplateResult {
  const orderId = String(refundReq.orderId).replace(/^#+/, '');
  const adminReason = reason || refundReq.adminReason || 'Request does not meet cancellation/refund criteria.';

  const content = `
    <p style="margin: 0 0 12px 0;">Dear Valued Customer,</p>
    <p style="margin: 0 0 16px 0;">We are writing to update you regarding your refund request for order <strong>#${orderId}</strong>.</p>

    <div style="background-color: #FEF2F2; border: 1px solid #FECACA; border-radius: 10px; padding: 16px 18px; margin: 18px 0;">
      <div style="font-size: 11px; color: #991B1B; font-weight: 700; text-transform: uppercase;">Review Outcome</div>
      <div style="font-size: 14px; font-weight: 800; color: #B91C1C; margin-top: 2px;">Refund Request Not Approved</div>
      <div style="font-size: 13px; color: #475569; margin-top: 8px; border-top: 1px dashed #FCA5A5; padding-top: 8px;">
        <strong>Reason:</strong> ${adminReason}
      </div>
    </div>

    <p style="font-size: 13px; color: #475569;">If you believe this decision was made in error or have additional photo proofs to submit, please contact us at <a href="mailto:hello.fatafat@gmail.com" style="color: ${BRAND_MAROON}; font-weight: 600; text-decoration: none;">hello.fatafat@gmail.com</a> or open a support ticket.</p>
  `;

  return {
    subject: `Update on Refund Request: Order #${orderId} - FATAFAT`,
    html: renderEmailLayout({
      title: `Refund Request Review Update`,
      preheader: `Update regarding your refund request for Order #${orderId}.`,
      headerBadge: { text: 'Request Closed', bg: '#FEE2E2', color: '#991B1B', border: '#FECACA' },
      childrenHtml: content
    })
  };
}

// 11. Customisation Request Received
export function templateCustomRequestReceived(customReq: any): EmailTemplateResult {
  const customerName = customReq.customerName || 'Valued Customer';
  const productName = customReq.productName || 'Personalised Cake / Gift';

  const content = `
    <p style="margin: 0 0 12px 0;">Dear <strong>${customerName}</strong>,</p>
    <p style="margin: 0 0 16px 0;">Thank you for submitting your customisation request with FATAFAT! We have received your specifications for <strong>${productName}</strong>.</p>

    <div style="background-color: #FFF9F5; border: 1px solid #FFEDD5; border-radius: 10px; padding: 16px 18px; margin: 18px 0;">
      <div style="font-size: 11px; color: #C2410C; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Request Details</div>
      <div style="font-size: 13px; color: ${TEXT_DARK}; margin-top: 6px; line-height: 1.6;">
        <strong>Item:</strong> ${productName}<br>
        <strong>Quantity:</strong> ${customReq.quantity || 1}<br>
        ${customReq.flavour ? `<strong>Flavour:</strong> ${customReq.flavour}<br>` : ''}
        ${customReq.personalisationMessage ? `<strong>Personalisation Note:</strong> "${customReq.personalisationMessage}"<br>` : ''}
        ${customReq.preferredDeliveryDate ? `<strong>Target Delivery:</strong> ${customReq.preferredDeliveryDate} (${customReq.preferredDeliveryTime || 'Standard Slot'})<br>` : ''}
      </div>
    </div>

    <p style="font-size: 13px; color: #475569;">Our executive chefs are reviewing kitchen capacity and ingredient sourcing. We will send you an availability confirmation and quote payment link shortly!</p>
  `;

  return {
    subject: `Custom Request Received: ${productName} - FATAFAT`,
    html: renderEmailLayout({
      title: `Custom Request Received`,
      preheader: `We've received your customisation request and are preparing a quote for you.`,
      headerBadge: { text: 'Under Review', bg: '#FFEDD5', color: '#9A3412', border: '#FED7AA' },
      childrenHtml: content
    })
  };
}

// 12. Custom Order Payment Link
export function templateCustomOrderPaymentLink(customReq: any, paymentLinkUrl: string, amount: number): EmailTemplateResult {
  const customerName = customReq.customerName || 'Valued Customer';
  const productName = customReq.productName || 'Custom Cake / Celebration Order';

  const content = `
    <p style="margin: 0 0 12px 0;">Dear <strong>${customerName}</strong>,</p>
    <p style="margin: 0 0 16px 0;">Good news! Your custom order for <strong>${productName}</strong> has been reviewed and accepted by our kitchen.</p>

    <div style="background-color: #FFF5F7; border: 1px solid #FCD4DC; border-radius: 12px; padding: 20px; margin: 18px 0; text-align: center;">
      <div style="font-size: 11px; color: ${BRAND_MAROON}; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Quoted Total Amount</div>
      <div style="font-size: 26px; font-weight: 900; color: ${BRAND_MAROON}; margin: 6px 0; font-family: 'Playfair Display', Georgia, serif;">&#8377;${Number(amount).toLocaleString('en-IN')}</div>
      <div style="font-size: 12px; color: #9F1239;">Includes handcrafted customization and safe delivery.</div>
    </div>

    <p style="font-size: 13px; color: #475569;">To confirm your booking and commence custom baking/crafting, please complete your payment using the secure payment button below:</p>
  `;

  return {
    subject: `Quote Ready: Pay ₹${amount} for Your Custom Order (${productName}) - FATAFAT`,
    html: renderEmailLayout({
      title: `Your Custom Order Quote is Ready!`,
      preheader: `Complete your payment of ₹${amount} to begin handcrafted preparation.`,
      headerBadge: { text: 'Payment Required', bg: '#FCE7F3', color: '#9D174D', border: '#FBCFE8' },
      childrenHtml: content,
      callToAction: { text: `Pay ₹${amount} Now`, url: paymentLinkUrl }
    })
  };
}

// 13. Support Ticket Created
export function templateSupportTicketCreated(ticket: any): EmailTemplateResult {
  const ticketNumber = ticket.ticketNumber || 'TICK-SUPPORT';
  const customerName = ticket.name || 'Valued Customer';

  const content = `
    <p style="margin: 0 0 12px 0;">Dear <strong>${customerName}</strong>,</p>
    <p style="margin: 0 0 16px 0;">Your support request has been logged successfully. Your support ticket number is <strong>${ticketNumber}</strong>.</p>

    <div style="background-color: #FAF9F7; border: 1px solid #ECEAE5; border-radius: 10px; padding: 16px 18px; margin: 18px 0;">
      <div style="font-size: 13px; color: ${TEXT_DARK}; line-height: 1.5;">
        <strong>Category:</strong> ${ticket.category || 'General Inquiry'}<br>
        ${ticket.orderId ? `<strong>Associated Order:</strong> #${String(ticket.orderId).replace(/^#+/, '')}<br>` : ''}
        <strong>Your Message:</strong> "${ticket.message}"
      </div>
    </div>

    <p style="font-size: 13px; color: #475569;">A customer care executive is reviewing your issue and will respond via email or in-app notification within <strong>2 to 4 hours</strong>.</p>
  `;

  return {
    subject: `Support Ticket Created: ${ticketNumber} - FATAFAT`,
    html: renderEmailLayout({
      title: `Support Ticket Logged: ${ticketNumber}`,
      preheader: `We've received your support request and our team is on it.`,
      headerBadge: { text: 'Support Ticket', bg: '#E2E8F0', color: '#334155', border: '#CBD5E1' },
      childrenHtml: content
    })
  };
}

// 14. Support Ticket Reply
export function templateSupportTicketReply(ticket: any, adminReply: string): EmailTemplateResult {
  const ticketNumber = ticket.ticketNumber || 'TICK-SUPPORT';
  const customerName = ticket.name || 'Valued Customer';

  const content = `
    <p style="margin: 0 0 12px 0;">Dear <strong>${customerName}</strong>,</p>
    <p style="margin: 0 0 16px 0;">Our customer operations team has responded to your support ticket <strong>${ticketNumber}</strong>.</p>

    <div style="background-color: #F0FDF4; border-left: 4px solid #16A34A; border-radius: 10px; padding: 16px 18px; margin: 18px 0; border: 1px solid #DCFCE7;">
      <div style="font-size: 11px; color: #166534; font-weight: 700; text-transform: uppercase;">Official FATAFAT Support Response</div>
      <div style="font-size: 14px; color: ${TEXT_DARK}; margin-top: 6px; line-height: 1.6; white-space: pre-line;">
        ${adminReply}
      </div>
    </div>

    <div style="font-size: 12px; color: ${TEXT_MUTED}; margin-top: 12px;">
      <strong>Ticket Status:</strong> ${ticket.status || 'In Progress'} &bull; Category: ${ticket.category}
    </div>
  `;

  return {
    subject: `Support Response for Ticket ${ticketNumber} - FATAFAT`,
    html: renderEmailLayout({
      title: `Reply to Support Ticket ${ticketNumber}`,
      preheader: `Our customer support team has replied to ticket ${ticketNumber}.`,
      headerBadge: { text: 'Support Reply', bg: '#DCFCE7', color: '#166534', border: '#BBF7D0' },
      childrenHtml: content
    })
  };
}

// 15. Password Reset
export function templatePasswordReset(email: string, resetUrl: string): EmailTemplateResult {
  const content = `
    <p style="margin: 0 0 12px 0;">Hello,</p>
    <p style="margin: 0 0 16px 0;">We received a request to reset the password for your FATAFAT account (<strong>${email}</strong>).</p>

    <div style="background-color: #FFF5F7; border: 1px solid #FCD4DC; border-radius: 10px; padding: 14px 18px; margin: 18px 0;">
      <div style="font-size: 13px; color: #9F1239;">
        For your account security, this link is valid for <strong>30 minutes</strong> and can only be used once.
      </div>
    </div>

    <p style="font-size: 13px; color: #475569;">If you did not request a password reset, please ignore this email. Your password will remain unchanged.</p>
  `;

  return {
    subject: `Password Reset Request - FATAFAT`,
    html: renderEmailLayout({
      title: `Reset Your FATAFAT Password`,
      preheader: `Click the link inside to safely reset your FATAFAT account password.`,
      headerBadge: { text: 'Security', bg: '#FEE2E2', color: '#991B1B', border: '#FECACA' },
      childrenHtml: content,
      callToAction: { text: 'Reset Password', url: resetUrl }
    })
  };
}

/* ==========================================================================
   ADMIN EMAIL ALERTS (1 to 7)
   ========================================================================== */

// Admin 1. New Order
export function templateAdminNewOrder(order: any): EmailTemplateResult {
  const orderId = String(order.id).replace(/^#+/, '');
  const total = Number(order.total ?? order.totalAmount ?? 0);
  const items = order.items || [];
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.fatafatapp.me';

  const content = `
    <p style="margin: 0 0 12px 0;"><strong>🚨 New Store Order Received!</strong></p>
    <div style="background-color: #FAF9F7; border: 1px solid #ECEAE5; border-radius: 10px; padding: 16px 18px; margin: 14px 0; font-size: 13px; line-height: 1.6;">
      <strong>Order ID:</strong> #${orderId}<br>
      <strong>Customer:</strong> ${order.address?.name || 'Customer'} (${order.customerEmail || 'No Email'})<br>
      <strong>Phone:</strong> ${order.address?.mobile || order.address?.phone || 'N/A'}<br>
      <strong>Total Value:</strong> &#8377;${total.toLocaleString('en-IN')}<br>
      <strong>Delivery Hub:</strong> ${order.deliveryLocationName || 'Nawabganj Hub'}<br>
      <strong>Slot:</strong> ${order.deliveryOption || 'Standard'} (${order.deliveryTimeSlot || order.eta || 'Delivery within 24 hours'})
    </div>
    ${renderOrderItemsTable(items)}
  `;

  return {
    subject: `[ADMIN ALERT] New Order #${orderId} (₹${total}) - FATAFAT`,
    html: renderEmailLayout({
      title: `[ADMIN] New Order #${orderId}`,
      preheader: `New order #${orderId} of ₹${total} received.`,
      headerBadge: { text: 'Admin Alert', bg: '#FEF3C7', color: '#92400E', border: '#FDE68A' },
      childrenHtml: content,
      callToAction: { text: 'Open Admin Console', url: `${appUrl}/admin/orders/${orderId}` }
    })
  };
}

// Admin 2. Successful Payment
export function templateAdminPaymentSuccess(order: any, paymentId: string): EmailTemplateResult {
  const orderId = String(order.id).replace(/^#+/, '');
  const total = Number(order.total ?? order.totalAmount ?? 0);

  const content = `
    <p style="margin: 0 0 12px 0;"><strong>✅ Razorpay Payment Captured Successfully</strong></p>
    <div style="background-color: #ECFDF5; border: 1px solid #A7F3D0; border-radius: 10px; padding: 16px 18px; margin: 14px 0; font-size: 13px; line-height: 1.6;">
      <strong>Order ID:</strong> #${orderId}<br>
      <strong>Razorpay Payment ID:</strong> ${paymentId}<br>
      <strong>Amount Captured:</strong> &#8377;${total.toLocaleString('en-IN')}<br>
      <strong>Customer:</strong> ${order.customerEmail || order.customerId || 'Customer'}<br>
      <strong>Method:</strong> ${order.paymentMethod || 'Razorpay Online'}
    </div>
  `;

  return {
    subject: `[ADMIN] Payment Captured: ₹${total} for Order #${orderId}`,
    html: renderEmailLayout({
      title: `[ADMIN] Payment Verified for #${orderId}`,
      preheader: `Payment of ₹${total} captured via Razorpay for Order #${orderId}.`,
      headerBadge: { text: 'Payment Success', bg: '#D1FAE5', color: '#065F46', border: '#A7F3D0' },
      childrenHtml: content
    })
  };
}

// Admin 3. Payment Failure
export function templateAdminPaymentFailed(order: any, errorReason: string, paymentId?: string): EmailTemplateResult {
  const orderId = String(order.id).replace(/^#+/, '');
  const total = Number(order.total ?? order.totalAmount ?? 0);

  const content = `
    <p style="margin: 0 0 12px 0;"><strong>⚠️ Razorpay Payment Failed / Dropped</strong></p>
    <div style="background-color: #FEF2F2; border: 1px solid #FECACA; border-radius: 10px; padding: 16px 18px; margin: 14px 0; font-size: 13px; line-height: 1.6;">
      <strong>Order ID:</strong> #${orderId}<br>
      <strong>Payment ID Attempt:</strong> ${paymentId || 'Checkout Drop'}<br>
      <strong>Cart Value:</strong> &#8377;${total.toLocaleString('en-IN')}<br>
      <strong>Customer Contact:</strong> ${order.address?.mobile || order.address?.phone || order.customerEmail || 'N/A'}<br>
      <strong>Error Reason:</strong> <span style="color: #B91C1C; font-weight: 600;">${errorReason}</span>
    </div>
    <p style="font-size: 12px; color: #64748B;">You may reach out to assist the customer with an alternate UPI link.</p>
  `;

  return {
    subject: `[ADMIN ALERT] Payment Failed for Order #${orderId} (₹${total})`,
    html: renderEmailLayout({
      title: `[ADMIN] Payment Failed: #${orderId}`,
      preheader: `Payment attempt failed for Order #${orderId}.`,
      headerBadge: { text: 'Payment Failed', bg: '#FEE2E2', color: '#991B1B', border: '#FECACA' },
      childrenHtml: content
    })
  };
}

// Admin 4. New Refund Request
export function templateAdminNewRefundRequest(refundReq: any, order?: any): EmailTemplateResult {
  const orderId = String(refundReq.orderId).replace(/^#+/, '');
  const amount = Number(refundReq.amount || order?.total || order?.totalAmount || 0);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.fatafatapp.me';

  const content = `
    <p style="margin: 0 0 12px 0;"><strong>🚨 New Customer Refund Request Submitted</strong></p>
    <div style="background-color: #FFFDF5; border: 1px solid #FEF08A; border-radius: 10px; padding: 16px 18px; margin: 14px 0; font-size: 13px; line-height: 1.6;">
      <strong>Refund ID:</strong> ${refundReq.id}<br>
      <strong>Order ID:</strong> #${orderId}<br>
      <strong>Amount Claimed:</strong> &#8377;${amount.toLocaleString('en-IN')}<br>
      <strong>Customer:</strong> ${refundReq.customerEmail || refundReq.customerId}<br>
      <strong>Reason Stated:</strong> "${refundReq.reason}"
    </div>
  `;

  return {
    subject: `[ADMIN ALERT] Refund Requested: Order #${orderId} (₹${amount})`,
    html: renderEmailLayout({
      title: `[ADMIN] Refund Request for #${orderId}`,
      preheader: `Customer requested refund of ₹${amount} for Order #${orderId}.`,
      headerBadge: { text: 'Refund Request', bg: '#FEF3C7', color: '#92400E', border: '#FDE68A' },
      childrenHtml: content,
      callToAction: { text: 'Review in Admin Console', url: `${appUrl}/admin/returns` }
    })
  };
}

// Admin 5. Refund Processed / Failed
export function templateAdminRefundStatus(refundReq: any, status: 'PROCESSED' | 'FAILED', error?: string): EmailTemplateResult {
  const orderId = String(refundReq.orderId).replace(/^#+/, '');
  const amount = Number(refundReq.amount || 0);

  const isSuccess = status === 'PROCESSED';
  const content = `
    <p style="margin: 0 0 12px 0;"><strong>${isSuccess ? '✅ Razorpay Refund Processed' : '❌ Razorpay Refund Gateway Execution Failed'}</strong></p>
    <div style="background-color: ${isSuccess ? '#ECFDF5' : '#FEF2F2'}; border: 1px solid ${isSuccess ? '#A7F3D0' : '#FECACA'}; border-radius: 10px; padding: 16px 18px; margin: 14px 0; font-size: 13px; line-height: 1.6;">
      <strong>Order ID:</strong> #${orderId}<br>
      <strong>Refund ID:</strong> ${refundReq.id}<br>
      <strong>Amount:</strong> &#8377;${amount.toLocaleString('en-IN')}<br>
      ${isSuccess ? `<strong>Razorpay Refund ID:</strong> ${refundReq.razorpayRefundId}` : `<strong>Error:</strong> ${error || 'Unknown gateway error'}`}
    </div>
  `;

  return {
    subject: `[ADMIN] Refund ${status}: Order #${orderId} (₹${amount})`,
    html: renderEmailLayout({
      title: `[ADMIN] Refund ${status}: #${orderId}`,
      preheader: `Refund ${status} for Order #${orderId}.`,
      headerBadge: { text: status, bg: isSuccess ? '#D1FAE5' : '#FEE2E2', color: isSuccess ? '#065F46' : '#991B1B', border: isSuccess ? '#A7F3D0' : '#FECACA' },
      childrenHtml: content
    })
  };
}

// Admin 6. New Support Ticket
export function templateAdminNewSupportTicket(ticket: any): EmailTemplateResult {
  const ticketNumber = ticket.ticketNumber || 'TICK-SUPPORT';
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.fatafatapp.me';

  const content = `
    <p style="margin: 0 0 12px 0;"><strong>📩 New Support Ticket Filed</strong></p>
    <div style="background-color: #FAF9F7; border: 1px solid #ECEAE5; border-radius: 10px; padding: 16px 18px; margin: 14px 0; font-size: 13px; line-height: 1.6;">
      <strong>Ticket Number:</strong> ${ticketNumber}<br>
      <strong>Customer:</strong> ${ticket.name} (${ticket.email}) &bull; Ph: ${ticket.phone}<br>
      <strong>Category:</strong> ${ticket.category}<br>
      ${ticket.orderId ? `<strong>Order Ref:</strong> #${ticket.orderId}<br>` : ''}
      <strong>Message:</strong> "${ticket.message}"
    </div>
  `;

  return {
    subject: `[ADMIN SUPPORT] New Ticket: ${ticketNumber} (${ticket.category})`,
    html: renderEmailLayout({
      title: `[ADMIN] Support Ticket ${ticketNumber}`,
      preheader: `New support ticket from ${ticket.name}.`,
      headerBadge: { text: 'New Support Ticket', bg: '#E0E7FF', color: '#3730A3', border: '#C7D2FE' },
      childrenHtml: content,
      callToAction: { text: 'Open Support Console', url: `${appUrl}/admin/support` }
    })
  };
}

// Admin 7. New Custom Request
export function templateAdminNewCustomRequest(customReq: any): EmailTemplateResult {
  const reqId = customReq.id || 'Custom Request';
  const productName = customReq.productName || 'Personalised Cake / Item';
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.fatafatapp.me';

  const content = `
    <p style="margin: 0 0 12px 0;"><strong>🎂 New Custom Cake / Personalisation Request</strong></p>
    <div style="background-color: #FFF9F5; border: 1px solid #FED7AA; border-radius: 10px; padding: 16px 18px; margin: 14px 0; font-size: 13px; line-height: 1.6;">
      <strong>Request ID:</strong> ${reqId}<br>
      <strong>Customer:</strong> ${customReq.customerName} (${customReq.email}) &bull; Mobile: ${customReq.mobile}<br>
      <strong>Product:</strong> ${productName}<br>
      <strong>Quantity:</strong> ${customReq.quantity || 1}<br>
      ${customReq.flavour ? `<strong>Flavour:</strong> ${customReq.flavour}<br>` : ''}
      ${customReq.personalisationMessage ? `<strong>Personalisation Note:</strong> "${customReq.personalisationMessage}"<br>` : ''}
      ${customReq.preferredDeliveryDate ? `<strong>Target Date:</strong> ${customReq.preferredDeliveryDate} (${customReq.preferredDeliveryTime || 'Standard Slot'})<br>` : ''}
      ${customReq.budget ? `<strong>Customer Budget:</strong> ₹${customReq.budget}<br>` : ''}
    </div>
  `;

  return {
    subject: `[ADMIN ALERT] Custom Request: ${productName} (${customReq.customerName})`,
    html: renderEmailLayout({
      title: `[ADMIN] Customisation Request`,
      preheader: `New custom order request from ${customReq.customerName}.`,
      headerBadge: { text: 'Custom Request', bg: '#FFEDD5', color: '#9A3412', border: '#FED7AA' },
      childrenHtml: content,
      callToAction: { text: 'Review & Send Quote', url: `${appUrl}/admin/custom-requests` }
    })
  };
}
