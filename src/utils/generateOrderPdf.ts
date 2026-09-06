import { jsPDF } from 'jspdf';

export interface OrderPdfItem {
  name: string;
  price: number;
  quantity: number;
  image?: string;
  selectedSize?: string;
  selectedType?: string;
  cakeMessage?: string;
  customImage?: string;
  addons?: any[];
  flavour?: string;
  specialInstructions?: string;
  category?: string;
  subtotal?: number;
}

export interface OrderPdfData {
  id: string;
  createdAt?: string;
  updatedAt?: string;
  customerId?: string;
  customerEmail?: string;
  status?: string;
  paymentStatus?: string;
  paymentMethod?: string;
  paymentId?: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
  utr?: string;
  subtotal?: number;
  discount?: number;
  couponCode?: string;
  deliveryFee?: number;
  total: number;
  deliveryOption?: string;
  deliveryTimeSlot?: string;
  scheduledDeliveryAt?: string;
  deliveryLocationName?: string;
  deliveryOtp?: string;
  delivery_otp_verified?: boolean;
  otp_verified_at?: string;
  assignedPartnerName?: string;
  assignedPartnerId?: string;
  refundStatus?: string;
  refundAmount?: number;
  refundReason?: string;
  razorpayRefundId?: string;
  refund?: any;
  address?: {
    name?: string;
    mobile?: string;
    phone?: string;
    house?: string;
    street?: string;
    area?: string;
    city?: string;
    pincode?: string;
    landmark?: string;
  };
  items: OrderPdfItem[];
}

/**
 * Safely fetches an image and converts to base64 Data URL with strict timeout.
 * Never throws — returns null if unreachable or CORS blocked.
 */
async function getBase64Image(url?: string): Promise<{ dataUrl: string; format: 'JPEG' | 'PNG' } | null> {
  if (!url || typeof window === 'undefined') return null;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);
    const res = await fetch(url, { signal: controller.signal, mode: 'cors' }).catch(() => null);
    clearTimeout(timeout);
    if (!res || !res.ok) return null;
    const blob = await res.blob();
    const isPng = blob.type.includes('png');
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        if (result && result.startsWith('data:image')) {
          resolve({ dataUrl: result, format: isPng ? 'PNG' : 'JPEG' });
        } else {
          resolve(null);
        }
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/**
 * Formats a date string into readable Indian Standard Time representation
 */
function formatPdfDate(isoStr?: string): string {
  if (!isoStr) return 'N/A';
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return isoStr;
    return d.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  } catch {
    return isoStr;
  }
}

/**
 * Generates and triggers download of a professional FATAFAT-branded PDF Invoice / Order Document.
 */
export async function generateOrderPdf(order: OrderPdfData): Promise<boolean> {
  try {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = 210;
    const pageHeight = 297;
    const margin = 14;
    const contentWidth = pageWidth - margin * 2;
    let y = margin;

    // --- 1. BRAND HEADER ---
    // Burgundy top accent banner
    doc.setFillColor(128, 0, 32); // #800020 Brand Burgundy
    doc.rect(0, 0, pageWidth, 8, 'F');

    y = 16;

    // Brand Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(128, 0, 32);
    doc.text('FATAFAT', margin, y);

    // Tagline / Brand Subtitle
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(110, 110, 110);
    doc.text('Celebrate. Gift. Indulge. Fatafat.', margin, y + 4.5);

    // Right Side: Order Number & Date
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(30, 30, 30);
    doc.text(`TAX INVOICE / ORDER SUMMARY`, pageWidth - margin, y - 1, { align: 'right' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(128, 0, 32);
    doc.text(`Order #${order.id}`, pageWidth - margin, y + 4, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(`Date: ${formatPdfDate(order.createdAt)}`, pageWidth - margin, y + 8.5, { align: 'right' });

    y += 15;

    // Divider Line
    doc.setDrawColor(225, 225, 225);
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageWidth - margin, y);

    y += 5;

    // --- 2. ORDER META & STATUS BAR ---
    doc.setFillColor(250, 249, 246);
    doc.roundedRect(margin, y, contentWidth, 14, 2, 2, 'F');
    doc.setDrawColor(230, 230, 230);
    doc.roundedRect(margin, y, contentWidth, 14, 2, 2, 'D');

    const colW = contentWidth / 4;
    
    // Status
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(130, 130, 130);
    doc.text('FULFILLMENT STATUS', margin + 4, y + 4.5);
    doc.setFontSize(8.5);
    doc.setTextColor(30, 30, 30);
    const statusText = String(order.status || 'Pending').toUpperCase();
    doc.text(statusText, margin + 4, y + 10);

    // Payment Status
    doc.setFontSize(7);
    doc.setTextColor(130, 130, 130);
    doc.text('PAYMENT STATUS', margin + colW + 4, y + 4.5);
    doc.setFontSize(8.5);
    const payStatus = String(order.paymentStatus || 'PENDING').toUpperCase();
    if (payStatus === 'PAID') {
      doc.setTextColor(20, 120, 50);
      doc.text('PAID (CAPTURED)', margin + colW + 4, y + 10);
    } else {
      doc.setTextColor(180, 100, 20);
      doc.text(payStatus, margin + colW + 4, y + 10);
    }

    // Delivery Mode
    doc.setFontSize(7);
    doc.setTextColor(130, 130, 130);
    doc.text('DELIVERY MODE', margin + colW * 2 + 4, y + 4.5);
    doc.setFontSize(8.5);
    doc.setTextColor(30, 30, 30);
    const delMode = order.deliveryOption === 'Scheduled' ? `Scheduled: ${order.deliveryTimeSlot || ''}` : 'ASAP (30-45 Mins)';
    doc.text(delMode.length > 22 ? delMode.slice(0, 20) + '...' : delMode, margin + colW * 2 + 4, y + 10);

    // Delivery OTP / Verification
    doc.setFontSize(7);
    doc.setTextColor(130, 130, 130);
    doc.text('DELIVERY OTP', margin + colW * 3 + 4, y + 4.5);
    doc.setFontSize(8.5);
    if (order.delivery_otp_verified) {
      doc.setTextColor(20, 120, 50);
      doc.text(`VERIFIED (${order.deliveryOtp || 'OTP'})`, margin + colW * 3 + 4, y + 10);
    } else {
      doc.setTextColor(128, 0, 32);
      doc.text(order.deliveryOtp || 'N/A', margin + colW * 3 + 4, y + 10);
    }

    y += 18;

    // --- 3. CUSTOMER & SHIPPING DETAILS SECTION ---
    const boxWidth = (contentWidth - 6) / 2;
    const boxHeight = 36;

    // Left Box: Customer Details
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(220, 220, 220);
    doc.roundedRect(margin, y, boxWidth, boxHeight, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(128, 0, 32);
    doc.text('CUSTOMER INFORMATION', margin + 4, y + 6);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(40, 40, 40);
    const custName = order.address?.name || 'Customer';
    doc.text(custName, margin + 4, y + 12);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(80, 80, 80);
    const mobile = order.address?.mobile || order.address?.phone || 'N/A';
    doc.text(`Phone: ${mobile}`, margin + 4, y + 18);
    
    const email = order.customerEmail || 'N/A';
    doc.text(`Email: ${email.length > 28 ? email.slice(0, 26) + '...' : email}`, margin + 4, y + 24);

    const custId = order.customerId ? `ID: ${order.customerId.slice(0, 22)}` : '';
    if (custId) {
      doc.setFontSize(7);
      doc.setTextColor(120, 120, 120);
      doc.text(custId, margin + 4, y + 30);
    }

    // Right Box: Shipping Coordinates
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(margin + boxWidth + 6, y, boxWidth, boxHeight, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(128, 0, 32);
    doc.text('SHIPPING & DELIVERY ADDRESS', margin + boxWidth + 10, y + 6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(50, 50, 50);

    const addrLines: string[] = [];
    if (order.address?.house || order.address?.street) {
      addrLines.push([order.address.house, order.address.street].filter(Boolean).join(', '));
    }
    if (order.address?.area) {
      addrLines.push(order.address.area);
    }
    const cityPin = [order.address?.city, order.address?.pincode].filter(Boolean).join(' - ');
    if (cityPin) addrLines.push(cityPin);
    if (order.address?.landmark) addrLines.push(`Landmark: ${order.address.landmark}`);

    let addrY = y + 12;
    for (const line of addrLines.slice(0, 4)) {
      doc.text(line.length > 36 ? line.slice(0, 34) + '...' : line, margin + boxWidth + 10, addrY);
      addrY += 5;
    }

    y += boxHeight + 6;

    // --- 4. ORDERED ITEMS TABLE ---
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(128, 0, 32);
    doc.text('ORDERED ITEMS & CUSTOMISATIONS', margin, y);

    y += 3.5;

    // Table Header
    doc.setFillColor(128, 0, 32);
    doc.rect(margin, y, contentWidth, 7, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);
    doc.text('ITEM DETAILS & CUSTOMISATION', margin + 4, y + 4.8);
    doc.text('QTY', margin + contentWidth - 45, y + 4.8, { align: 'center' });
    doc.text('UNIT PRICE', margin + contentWidth - 25, y + 4.8, { align: 'right' });
    doc.text('SUBTOTAL', margin + contentWidth - 4, y + 4.8, { align: 'right' });

    y += 7;

    // Table Rows
    const items = Array.isArray(order.items) && order.items.length > 0 ? order.items : [];
    
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const qty = Number(it.quantity || 1);
      const price = Number(it.price || 0);
      const itemSubtotal = qty * price;

      // Determine height required for this item's customisations
      const customLines: string[] = [];
      if (it.selectedSize) customLines.push(`• Variant / Size: ${it.selectedSize}`);
      if (it.selectedType) customLines.push(`• Type: ${it.selectedType}`);
      if (it.flavour) customLines.push(`• Flavour: ${it.flavour}`);
      if (it.cakeMessage) customLines.push(`• Cake Message: "${it.cakeMessage}"`);
      if (it.customImage) customLines.push(`• Custom Uploaded Photo / Graphic Included`);
      if (it.addons && Array.isArray(it.addons) && it.addons.length > 0) {
        const addonNames = it.addons.map((a: any) => (typeof a === 'string' ? a : a.name || a.title)).filter(Boolean);
        if (addonNames.length > 0) customLines.push(`• Add-ons: ${addonNames.join(', ')}`);
      }
      if (it.specialInstructions) customLines.push(`• Note: ${it.specialInstructions}`);

      const rowHeight = Math.max(12, 7 + customLines.length * 4.5);

      // Check page overflow
      if (y + rowHeight > pageHeight - 45) {
        doc.addPage();
        y = margin;
      }

      // Zebra background
      if (i % 2 === 0) {
        doc.setFillColor(252, 251, 249);
        doc.rect(margin, y, contentWidth, rowHeight, 'F');
      }

      doc.setDrawColor(235, 235, 235);
      doc.setLineWidth(0.3);
      doc.line(margin, y + rowHeight, margin + contentWidth, y + rowHeight);

      // Item Name
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(30, 30, 30);
      doc.text(it.name || 'Product', margin + 4, y + 5);

      // Custom Details
      let customY = y + 9.5;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(90, 90, 90);
      for (const cLine of customLines) {
        if (cLine.includes('Cake Message:')) {
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(128, 0, 32);
        } else {
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(90, 90, 90);
        }
        doc.text(cLine.length > 70 ? cLine.slice(0, 68) + '...' : cLine, margin + 6, customY);
        customY += 4.2;
      }

      // Quantity
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(40, 40, 40);
      doc.text(String(qty), margin + contentWidth - 45, y + 5.5, { align: 'center' });

      // Unit Price
      doc.setFont('helvetica', 'normal');
      doc.text(`INR ${price.toLocaleString('en-IN')}`, margin + contentWidth - 25, y + 5.5, { align: 'right' });

      // Item Subtotal
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 30, 30);
      doc.text(`INR ${itemSubtotal.toLocaleString('en-IN')}`, margin + contentWidth - 4, y + 5.5, { align: 'right' });

      y += rowHeight;
    }

    y += 5;

    // --- 5. FINANCIAL BREAKDOWN & PAYMENT INFO ---
    if (y + 50 > pageHeight - 20) {
      doc.addPage();
      y = margin;
    }

    const summaryColW = contentWidth / 2;

    // Left Column: Payment & Razorpay Audit
    doc.setFillColor(250, 249, 246);
    doc.roundedRect(margin, y, summaryColW - 4, 38, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(128, 0, 32);
    doc.text('PAYMENT & TRANSACTION AUDIT', margin + 4, y + 6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(70, 70, 70);

    const rzpPayId = order.razorpayPaymentId || order.paymentId || 'N/A';
    doc.text(`Razorpay Payment ID: ${rzpPayId.length > 24 ? rzpPayId.slice(0, 22) + '...' : rzpPayId}`, margin + 4, y + 12);

    const rzpOrdId = order.razorpayOrderId || 'N/A';
    doc.text(`Razorpay Order ID: ${rzpOrdId.length > 24 ? rzpOrdId.slice(0, 22) + '...' : rzpOrdId}`, margin + 4, y + 18);

    doc.text(`Method: ${order.paymentMethod || 'Razorpay Online'}`, margin + 4, y + 24);

    if (order.assignedPartnerName) {
      doc.text(`Delivery Courier: ${order.assignedPartnerName}`, margin + 4, y + 30);
    } else {
      doc.text(`Fulfillment: Handled via FATAFAT Quick Logistics`, margin + 4, y + 30);
    }

    // If Refund details exist, show small note
    if (order.refundStatus || (order.refund && order.refund.status)) {
      const rStatus = order.refundStatus || order.refund?.status;
      const rAmt = order.refundAmount || order.refund?.amount || 0;
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(180, 50, 20);
      doc.text(`Refund: ${rStatus} (INR ${rAmt})`, margin + 4, y + 35);
    }

    // Right Column: Price Summary Box
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(220, 220, 220);
    doc.roundedRect(margin + summaryColW + 2, y, summaryColW - 2, 38, 2, 2, 'FD');

    const sumX = margin + summaryColW + 6;
    const sumValX = margin + contentWidth - 4;
    let sumY = y + 6.5;

    // Subtotal
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(90, 90, 90);
    doc.text('Items Subtotal:', sumX, sumY);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(40, 40, 40);
    doc.text(`INR ${Number(order.subtotal || order.total || 0).toLocaleString('en-IN')}`, sumValX, sumY, { align: 'right' });

    sumY += 6;

    // Discount
    if (order.discount && Number(order.discount) > 0) {
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(20, 120, 50);
      doc.text(`Discount (${order.couponCode || 'Promo'}):`, sumX, sumY);
      doc.setFont('helvetica', 'bold');
      doc.text(`- INR ${Number(order.discount).toLocaleString('en-IN')}`, sumValX, sumY, { align: 'right' });
      sumY += 6;
    }

    // Delivery Fee
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(90, 90, 90);
    doc.text('Courier Delivery:', sumX, sumY);
    doc.setFont('helvetica', 'bold');
    if (order.deliveryFee && Number(order.deliveryFee) > 0) {
      doc.setTextColor(40, 40, 40);
      doc.text(`INR ${Number(order.deliveryFee).toLocaleString('en-IN')}`, sumValX, sumY, { align: 'right' });
    } else {
      doc.setTextColor(20, 120, 50);
      doc.text('FREE', sumValX, sumY, { align: 'right' });
    }

    sumY += 7;

    // Grand Total Divider & Line
    doc.setDrawColor(128, 0, 32);
    doc.setLineWidth(0.4);
    doc.line(sumX, sumY - 2, sumValX, sumY - 2);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(128, 0, 32);
    doc.text('GRAND TOTAL:', sumX, sumY + 3);
    doc.setFontSize(10.5);
    doc.text(`INR ${Number(order.total || 0).toLocaleString('en-IN')}`, sumValX, sumY + 3, { align: 'right' });

    // --- 6. FOOTER NOTE ---
    const footerY = pageHeight - 14;
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.3);
    doc.line(margin, footerY - 4, pageWidth - margin, footerY - 4);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(128, 0, 32);
    doc.text('FATAFAT COMMERCE', margin, footerY);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(120, 120, 120);
    doc.text('This is an authentic computer-generated invoice. For support or queries, contact support@fatafatapp.me', margin, footerY + 3.5);

    doc.text(`Page 1 of 1 • Generated on ${new Date().toLocaleDateString('en-IN')}`, pageWidth - margin, footerY, { align: 'right' });

    // Trigger download
    const cleanOrderId = String(order.id).replace(/[^a-zA-Z0-9_-]/g, '');
    doc.save(`FATAFAT_Order_${cleanOrderId}.pdf`);
    return true;
  } catch (error) {
    console.error('Error generating Order PDF:', error);
    return false;
  }
}
