import { jsPDF } from 'jspdf';

export interface OrderPdfItem {
  id?: string;
  productId?: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  selectedSize?: string;
  size?: string;
  weight?: string;
  variant?: string;
  selectedType?: string;
  type?: string;
  eggless?: string;
  dietary?: string;
  cakeMessage?: string;
  message?: string;
  inscription?: string;
  customMessage?: string;
  text?: string;
  customImage?: string;
  customImageUrl?: string;
  uploadedImageUrl?: string;
  photoUrl?: string;
  uploadedImage?: string;
  addons?: any[];
  addOns?: any[];
  selectedAddOns?: any[];
  flavour?: string;
  flavor?: string;
  specialInstructions?: string;
  instructions?: string;
  note?: string;
  customisation?: any;
  category?: string;
  unit?: string;
  subtotal?: number;
}

export interface OrderPdfData {
  id: string;
  createdAt?: string;
  updatedAt?: string;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
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
    email?: string;
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
 * Safely fetches an image and converts to base64 Data URL with strict timeout and fallbacks.
 * Never throws — returns null if unreachable, CORS-blocked, or timed out.
 */
async function getBase64Image(url?: string): Promise<{ dataUrl: string; format: 'JPEG' | 'PNG' } | null> {
  if (!url || typeof window === 'undefined') return null;

  // If already base64 Data URL
  if (url.startsWith('data:image/')) {
    const isPng = url.startsWith('data:image/png');
    return { dataUrl: url, format: isPng ? 'PNG' : 'JPEG' };
  }

  // Method 1: Image element + Canvas (handles browser-cached and same-origin/CORS images)
  try {
    const canvasPromise = new Promise<{ dataUrl: string; format: 'JPEG' | 'PNG' } | null>((resolve) => {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      const timer = setTimeout(() => {
        resolve(null);
      }, 2500);

      img.onload = () => {
        clearTimeout(timer);
        try {
          const canvas = document.createElement('canvas');
          const maxDim = 240;
          let w = img.naturalWidth || img.width || 100;
          let h = img.naturalHeight || img.height || 100;
          if (w > maxDim || h > maxDim) {
            if (w > h) {
              h = Math.round((h * maxDim) / w);
              w = maxDim;
            } else {
              w = Math.round((w * maxDim) / h);
              h = maxDim;
            }
          }
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, w, h);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
            resolve({ dataUrl, format: 'JPEG' });
          } else {
            resolve(null);
          }
        } catch {
          resolve(null);
        }
      };

      img.onerror = () => {
        clearTimeout(timer);
        resolve(null);
      };

      img.src = url;
    });

    const canvasResult = await canvasPromise;
    if (canvasResult) return canvasResult;
  } catch {
    // Fallback to fetch
  }

  // Method 2: Fetch API
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
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
 * Formats a date string into clean readable Indian Standard Time representation
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
 * Generates and triggers download of an official FATAFAT-branded PDF Invoice / Order Document.
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
    const margin = 12;
    const contentWidth = pageWidth - margin * 2;
    let y = margin;

    // --- Pre-fetch all product & custom images concurrently with safe timeouts ---
    const rawItems = Array.isArray(order.items) && order.items.length > 0 ? order.items : [];
    
    // Resolve all image URLs
    const imagePromises = rawItems.map(async (it) => {
      const prodImgUrl = it.image || (it as any).imageUrl || (it as any).product?.image;
      const customImgUrl = it.customImage || it.customImageUrl || it.uploadedImageUrl || it.photoUrl || it.uploadedImage;
      
      const [prodImg, customImg] = await Promise.all([
        getBase64Image(prodImgUrl),
        getBase64Image(customImgUrl)
      ]);
      return { prodImg, customImg };
    });

    const itemImages = await Promise.all(imagePromises);

    // Helper for header rendering on new pages
    const renderPageHeader = (pageNum: number) => {
      // Burgundy top accent banner
      doc.setFillColor(128, 0, 32); // #800020 Brand Burgundy
      doc.rect(0, 0, pageWidth, 6, 'F');

      // Golden accent stripe
      doc.setFillColor(212, 175, 55); // #D4AF37 Brand Gold
      doc.rect(0, 6, pageWidth, 1.2, 'F');

      if (pageNum > 1) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(128, 0, 32);
        doc.text(`FATAFAT • Order #${order.id} (Continued)`, margin, 14);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(120, 120, 120);
        doc.text(`Page ${pageNum}`, pageWidth - margin, 14, { align: 'right' });

        doc.setDrawColor(230, 230, 230);
        doc.setLineWidth(0.3);
        doc.line(margin, 17, pageWidth - margin, 17);
      }
    };

    // --- 1. FIRST PAGE BRAND HEADER ---
    renderPageHeader(1);

    y = 15;

    // Brand Title / Logotype
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(128, 0, 32);
    doc.text('FATAFAT', margin, y);

    // Tagline / Brand Subtitle
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(212, 175, 55); // Gold
    doc.text('CELEBRATE. GIFT. INDULGE. FATAFAT.', margin, y + 4.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 100, 100);
    doc.text('Fast Local Commerce & Celebrations • Unnao Hub', margin, y + 8.5);

    // Right Side: Tax Invoice Title & Order Meta
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(30, 30, 30);
    doc.text('OFFICIAL TAX INVOICE', pageWidth - margin, y - 1, { align: 'right' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(128, 0, 32);
    doc.text(`Order #${order.id}`, pageWidth - margin, y + 4, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(90, 90, 90);
    doc.text(`Placed: ${formatPdfDate(order.createdAt)}`, pageWidth - margin, y + 8.5, { align: 'right' });

    y += 14;

    // Divider Line
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.4);
    doc.line(margin, y, pageWidth - margin, y);

    y += 4;

    // --- 2. ORDER META & STATUS BAR ---
    doc.setFillColor(250, 249, 246);
    doc.roundedRect(margin, y, contentWidth, 13, 2, 2, 'F');
    doc.setDrawColor(225, 225, 225);
    doc.roundedRect(margin, y, contentWidth, 13, 2, 2, 'D');

    const colW = contentWidth / 4;
    
    // Status
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(130, 130, 130);
    doc.text('FULFILLMENT STATUS', margin + 3.5, y + 4.2);
    doc.setFontSize(8);
    doc.setTextColor(30, 30, 30);
    const statusText = String(order.status || 'Pending').toUpperCase();
    doc.text(statusText, margin + 3.5, y + 9.5);

    // Payment Status
    doc.setFontSize(6.5);
    doc.setTextColor(130, 130, 130);
    doc.text('PAYMENT STATUS', margin + colW + 3.5, y + 4.2);
    doc.setFontSize(8);
    const payStatus = String(order.paymentStatus || 'PENDING').toUpperCase();
    if (payStatus === 'PAID' || payStatus === 'COMPLETED') {
      doc.setTextColor(16, 128, 60);
      doc.text('✓ PAID (VERIFIED)', margin + colW + 3.5, y + 9.5);
    } else if (payStatus === 'REJECTED') {
      doc.setTextColor(200, 30, 30);
      doc.text('✕ REJECTED', margin + colW + 3.5, y + 9.5);
    } else {
      doc.setTextColor(180, 100, 20);
      doc.text(payStatus, margin + colW + 3.5, y + 9.5);
    }

    // Delivery Mode & Slot
    doc.setFontSize(6.5);
    doc.setTextColor(130, 130, 130);
    doc.text('DELIVERY TYPE', margin + colW * 2 + 3.5, y + 4.2);
    doc.setFontSize(8);
    doc.setTextColor(30, 30, 30);
    const delMode = order.deliveryOption === 'Scheduled' 
      ? `Slot: ${order.deliveryTimeSlot || 'Scheduled'}` 
      : 'ASAP (30-45 Mins)';
    doc.text(delMode.length > 22 ? delMode.slice(0, 20) + '...' : delMode, margin + colW * 2 + 3.5, y + 9.5);

    // Delivery OTP / Verification
    doc.setFontSize(6.5);
    doc.setTextColor(130, 130, 130);
    doc.text('DELIVERY OTP', margin + colW * 3 + 3.5, y + 4.2);
    doc.setFontSize(8);
    if (order.delivery_otp_verified) {
      doc.setTextColor(16, 128, 60);
      doc.text(`✓ VERIFIED (${order.deliveryOtp || 'CODE'})`, margin + colW * 3 + 3.5, y + 9.5);
    } else {
      doc.setTextColor(128, 0, 32);
      doc.text(order.deliveryOtp ? `OTP: ${order.deliveryOtp}` : 'Awaiting OTP', margin + colW * 3 + 3.5, y + 9.5);
    }

    y += 16.5;

    // --- 3. CUSTOMER & SHIPPING DETAILS SECTION ---
    const boxWidth = (contentWidth - 5) / 2;
    const boxHeight = 33;

    // Left Box: Customer Details
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(220, 220, 220);
    doc.roundedRect(margin, y, boxWidth, boxHeight, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(128, 0, 32);
    doc.text('CUSTOMER INFORMATION', margin + 3.5, y + 5.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(40, 40, 40);
    const custName = order.address?.name || order.customerName || 'Customer';
    doc.text(custName, margin + 3.5, y + 11);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(70, 70, 70);
    const mobile = order.address?.mobile || order.address?.phone || order.customerPhone || 'N/A';
    doc.text(`Mobile: ${mobile}`, margin + 3.5, y + 16.5);
    
    const email = order.customerEmail || order.address?.email || 'N/A';
    doc.text(`Email: ${email.length > 30 ? email.slice(0, 28) + '...' : email}`, margin + 3.5, y + 22);

    const custId = order.customerId ? `Customer ID: ${order.customerId.slice(0, 22)}` : '';
    if (custId) {
      doc.setFontSize(6.5);
      doc.setTextColor(120, 120, 120);
      doc.text(custId, margin + 3.5, y + 28);
    }

    // Right Box: Shipping Coordinates
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(margin + boxWidth + 5, y, boxWidth, boxHeight, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(128, 0, 32);
    doc.text('DELIVERY ADDRESS & COORDINATES', margin + boxWidth + 8.5, y + 5.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
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
    if (order.deliveryLocationName) addrLines.push(`Zone: ${order.deliveryLocationName}`);

    let addrY = y + 11;
    for (const line of addrLines.slice(0, 4)) {
      doc.text(line.length > 38 ? line.slice(0, 36) + '...' : line, margin + boxWidth + 8.5, addrY);
      addrY += 4.5;
    }

    y += boxHeight + 6;

    // --- 4. ORDERED ITEMS & CUSTOMISATIONS TABLE ---
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(128, 0, 32);
    doc.text('ORDERED ITEMS, VARIANTS & CUSTOMISATIONS', margin, y);

    y += 3;

    // Table Header
    doc.setFillColor(128, 0, 32);
    doc.rect(margin, y, contentWidth, 6.5, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(255, 255, 255);
    doc.text('PRODUCT / CUSTOM SNAPSHOT', margin + 3.5, y + 4.5);
    doc.text('VARIANT / TYPE', margin + contentWidth - 72, y + 4.5);
    doc.text('QTY', margin + contentWidth - 42, y + 4.5, { align: 'center' });
    doc.text('UNIT PRICE', margin + contentWidth - 24, y + 4.5, { align: 'right' });
    doc.text('AMOUNT', margin + contentWidth - 3.5, y + 4.5, { align: 'right' });

    y += 6.5;

    let currentPage = 1;

    // Table Rows
    for (let i = 0; i < rawItems.length; i++) {
      const it = rawItems[i];
      const { prodImg, customImg } = itemImages[i] || {};

      const qty = Number(it.quantity || 1);
      const price = Number(it.price || 0);
      const itemSubtotal = Number(it.subtotal || (qty * price));

      // Extract all customisation details safely
      const itemName = String(it.name || (it as any).title || 'Celebration Product').trim();
      const itemSize = it.selectedSize || it.size || it.weight || it.variant;
      const itemType = it.selectedType || it.type || it.eggless || it.dietary;
      const itemFlavour = it.flavour || it.flavor;
      const cakeMessage = it.cakeMessage || it.message || it.text || it.inscription || it.customMessage;
      const specialInstructions = it.specialInstructions || it.instructions || it.note;
      
      const rawAddons = it.addons || it.addOns || it.selectedAddOns;
      const addons = Array.isArray(rawAddons) ? rawAddons : (rawAddons ? [rawAddons] : []);

      // Calculate dynamic row height
      let customLineCount = 0;
      if (cakeMessage) customLineCount += 1.3;
      if (customImg || it.customImage || it.customImageUrl) customLineCount += 1.2;
      if (addons.length > 0) customLineCount += 1;
      if (specialInstructions) customLineCount += 1;

      const hasThumbnails = !!(prodImg || customImg);
      const baseRowHeight = hasThumbnails ? 17 : 12;
      const rowHeight = Math.max(baseRowHeight, 9 + customLineCount * 4.2);

      // Check page overflow
      if (y + rowHeight > pageHeight - 50) {
        doc.addPage();
        currentPage++;
        renderPageHeader(currentPage);
        y = 22;

        // Re-render table header on next page
        doc.setFillColor(128, 0, 32);
        doc.rect(margin, y, contentWidth, 6, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(255, 255, 255);
        doc.text('PRODUCT / CUSTOM SNAPSHOT (CONT.)', margin + 3.5, y + 4.2);
        doc.text('VARIANT / TYPE', margin + contentWidth - 72, y + 4.2);
        doc.text('QTY', margin + contentWidth - 42, y + 4.2, { align: 'center' });
        doc.text('UNIT PRICE', margin + contentWidth - 24, y + 4.2, { align: 'right' });
        doc.text('AMOUNT', margin + contentWidth - 3.5, y + 4.2, { align: 'right' });
        y += 6;
      }

      // Zebra background
      if (i % 2 === 0) {
        doc.setFillColor(252, 251, 249);
        doc.rect(margin, y, contentWidth, rowHeight, 'F');
      }

      doc.setDrawColor(235, 235, 235);
      doc.setLineWidth(0.3);
      doc.line(margin, y + rowHeight, margin + contentWidth, y + rowHeight);

      // 1. Draw Product Thumbnail if available
      let contentLeftX = margin + 3.5;
      const imgBoxSize = 12;
      if (prodImg?.dataUrl) {
        try {
          doc.addImage(prodImg.dataUrl, prodImg.format, margin + 2.5, y + 2.5, imgBoxSize, imgBoxSize);
          doc.setDrawColor(220, 220, 220);
          doc.rect(margin + 2.5, y + 2.5, imgBoxSize, imgBoxSize, 'D');
          contentLeftX = margin + 2.5 + imgBoxSize + 3;
        } catch {
          // If addImage fails, gracefully fallback to text only
          contentLeftX = margin + 3.5;
        }
      }

      // 2. Product Name & SKU
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(30, 30, 30);
      const displayName = itemName.length > 40 ? itemName.slice(0, 38) + '...' : itemName;
      doc.text(displayName, contentLeftX, y + 4.5);

      let detailY = y + 8.5;

      // 3. Custom Cake Inscription
      if (cakeMessage) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.8);
        doc.setTextColor(128, 0, 32);
        const msgText = `✍️ Inscription: "${cakeMessage}"`;
        doc.text(msgText.length > 55 ? msgText.slice(0, 53) + '...' : msgText, contentLeftX, detailY);
        detailY += 3.8;
      }

      // 4. Customer Uploaded Custom Photo Indicator / Thumbnail
      if (customImg?.dataUrl) {
        try {
          doc.addImage(customImg.dataUrl, customImg.format, contentLeftX, detailY - 2.5, 7, 7);
          doc.setDrawColor(212, 175, 55);
          doc.rect(contentLeftX, detailY - 2.5, 7, 7, 'D');
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(6.5);
          doc.setTextColor(140, 80, 10);
          doc.text('📸 Custom Photo Attached', contentLeftX + 9, detailY + 2);
          detailY += 5.5;
        } catch {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(6.5);
          doc.setTextColor(140, 80, 10);
          doc.text('📸 Customer Custom Photo Included', contentLeftX, detailY);
          detailY += 3.8;
        }
      } else if (it.customImage || it.customImageUrl || it.uploadedImageUrl) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.5);
        doc.setTextColor(140, 80, 10);
        doc.text('📸 Custom Photo Uploaded by Customer', contentLeftX, detailY);
        detailY += 3.8;
      }

      // 5. Add-ons
      if (addons.length > 0) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.5);
        doc.setTextColor(70, 70, 70);
        const addonNames = addons.map((a: any) => {
          if (typeof a === 'string') return a;
          const name = a.name || a.title || 'Addon';
          return a.price ? `${name} (+₹${a.price})` : name;
        }).filter(Boolean);
        const addonStr = `🎁 Add-ons: ${addonNames.join(', ')}`;
        doc.text(addonStr.length > 55 ? addonStr.slice(0, 53) + '...' : addonStr, contentLeftX, detailY);
        detailY += 3.8;
      }

      // 6. Special Instructions
      if (specialInstructions) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.5);
        doc.setTextColor(100, 100, 100);
        const noteStr = `📝 Note: ${specialInstructions}`;
        doc.text(noteStr.length > 55 ? noteStr.slice(0, 53) + '...' : noteStr, contentLeftX, detailY);
      }

      // Column 2: Variant / Type / Flavour
      let specY = y + 4.5;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(60, 60, 60);

      if (itemSize) {
        doc.text(`⚖️ ${itemSize}`, margin + contentWidth - 72, specY);
        specY += 3.6;
      }
      if (itemType) {
        const isEggless = String(itemType).toLowerCase().includes('eggless');
        doc.setTextColor(isEggless ? 16 : 140, isEggless ? 128 : 80, isEggless ? 60 : 20);
        doc.text(String(itemType), margin + contentWidth - 72, specY);
        specY += 3.6;
      }
      if (itemFlavour) {
        doc.setTextColor(90, 90, 90);
        doc.setFont('helvetica', 'normal');
        const flavText = `${itemFlavour}`;
        doc.text(flavText.length > 18 ? flavText.slice(0, 16) + '..' : flavText, margin + contentWidth - 72, specY);
      }

      // Column 3: Quantity
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(40, 40, 40);
      doc.text(String(qty), margin + contentWidth - 42, y + 5, { align: 'center' });

      // Column 4: Unit Price
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(60, 60, 60);
      doc.text(`INR ${price.toLocaleString('en-IN')}`, margin + contentWidth - 24, y + 5, { align: 'right' });

      // Column 5: Amount
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(30, 30, 30);
      doc.text(`INR ${itemSubtotal.toLocaleString('en-IN')}`, margin + contentWidth - 3.5, y + 5, { align: 'right' });

      y += rowHeight;
    }

    y += 4;

    // --- 5. FINANCIAL BREAKDOWN & PAYMENT INFO ---
    if (y + 44 > pageHeight - 16) {
      doc.addPage();
      currentPage++;
      renderPageHeader(currentPage);
      y = 22;
    }

    const summaryColW = (contentWidth - 4) / 2;
    const summaryBoxHeight = 36;

    // Left Column: Payment & Razorpay Audit
    doc.setFillColor(250, 249, 246);
    doc.setDrawColor(225, 225, 225);
    doc.roundedRect(margin, y, summaryColW, summaryBoxHeight, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(128, 0, 32);
    doc.text('PAYMENT & TRANSACTION AUDIT', margin + 3.5, y + 5.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(70, 70, 70);

    const rzpPayId = order.razorpayPaymentId || order.paymentId || 'N/A';
    doc.text(`Razorpay Payment ID: ${rzpPayId.length > 24 ? rzpPayId.slice(0, 22) + '...' : rzpPayId}`, margin + 3.5, y + 11);

    const rzpOrdId = order.razorpayOrderId || 'N/A';
    doc.text(`Razorpay Order ID: ${rzpOrdId.length > 24 ? rzpOrdId.slice(0, 22) + '...' : rzpOrdId}`, margin + 3.5, y + 16.5);

    doc.text(`Payment Gateway: ${order.paymentMethod || 'Razorpay Online'}`, margin + 3.5, y + 22);

    if (order.assignedPartnerName) {
      doc.text(`Logistics Partner: ${order.assignedPartnerName}`, margin + 3.5, y + 27.5);
    } else {
      doc.text(`Fulfillment: Dispatched via FATAFAT Quick Logistics`, margin + 3.5, y + 27.5);
    }

    // Refund information note if applicable
    if (order.refundStatus || (order.refund && order.refund.status)) {
      const rStatus = String(order.refundStatus || order.refund?.status).toUpperCase();
      const rAmt = Number(order.refundAmount || order.refund?.amount || 0);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(180, 40, 20);
      doc.text(`Refund: ${rStatus} (INR ${rAmt})`, margin + 3.5, y + 32.5);
    }

    // Right Column: Price Summary Box
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(220, 220, 220);
    doc.roundedRect(margin + summaryColW + 4, y, summaryColW, summaryBoxHeight, 2, 2, 'FD');

    const sumX = margin + summaryColW + 7.5;
    const sumValX = margin + contentWidth - 3.5;
    let sumY = y + 6;

    // Subtotal
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(80, 80, 80);
    doc.text('Items Subtotal:', sumX, sumY);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(40, 40, 40);
    doc.text(`INR ${Number(order.subtotal || order.total || 0).toLocaleString('en-IN')}`, sumValX, sumY, { align: 'right' });

    sumY += 5.5;

    // Discount
    if (order.discount && Number(order.discount) > 0) {
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(16, 128, 60);
      doc.text(`Coupon Discount (${order.couponCode || 'PROMO'}):`, sumX, sumY);
      doc.setFont('helvetica', 'bold');
      doc.text(`- INR ${Number(order.discount).toLocaleString('en-IN')}`, sumValX, sumY, { align: 'right' });
      sumY += 5.5;
    }

    // Delivery Fee
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
    doc.text('Courier Dispatch:', sumX, sumY);
    doc.setFont('helvetica', 'bold');
    if (order.deliveryFee && Number(order.deliveryFee) > 0) {
      doc.setTextColor(40, 40, 40);
      doc.text(`INR ${Number(order.deliveryFee).toLocaleString('en-IN')}`, sumValX, sumY, { align: 'right' });
    } else {
      doc.setTextColor(16, 128, 60);
      doc.text('FREE', sumValX, sumY, { align: 'right' });
    }

    sumY += 6.5;

    // Grand Total Divider & Box
    doc.setFillColor(128, 0, 32);
    doc.roundedRect(sumX - 2, sumY - 2.5, summaryColW - 7, 9.5, 1.5, 1.5, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(255, 255, 255);
    doc.text('GRAND TOTAL:', sumX + 1.5, sumY + 3.5);
    doc.setFontSize(9.5);
    doc.text(`INR ${Number(order.total || 0).toLocaleString('en-IN')}`, sumValX - 2, sumY + 3.5, { align: 'right' });

    // --- 6. FOOTER NOTE ---
    const footerY = pageHeight - 11;
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.3);
    doc.line(margin, footerY - 3, pageWidth - margin, footerY - 3);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(128, 0, 32);
    doc.text('FATAFAT COMMERCE', margin, footerY);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(120, 120, 120);
    doc.text('Official computer-generated tax invoice. For queries, contact support@fatafatapp.me', margin, footerY + 3.2);

    doc.text(`Generated on ${new Date().toLocaleDateString('en-IN')}`, pageWidth - margin, footerY + 1.5, { align: 'right' });

    // Trigger download
    const cleanOrderId = String(order.id).replace(/[^a-zA-Z0-9_-]/g, '');
    doc.save(`FATAFAT_Order_${cleanOrderId}.pdf`);
    return true;
  } catch (error) {
    console.error('Error generating Order PDF:', error);
    return false;
  }
}
