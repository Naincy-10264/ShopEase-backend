import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

export const generateInvoicePDF = async (order) => {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]); // A4 size
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const { width, height } = page.getSize();
  let yPosition = height - 50;

  // Header
  page.drawText('ShopEase Invoice', {
    x: 50,
    y: yPosition,
    size: 24,
    font: boldFont,
    color: rgb(0, 0, 0),
  });

  yPosition -= 40;

  // Invoice Details
  page.drawText(`Invoice #: ${order._id.toString()}`, {
    x: 50,
    y: yPosition,
    size: 12,
    font: font,
  });

  yPosition -= 20;
  page.drawText(`Date: ${new Date(order.createdAt).toLocaleDateString()}`, {
    x: 50,
    y: yPosition,
    size: 12,
    font: font,
  });

  yPosition -= 40;

  // Shipping Address
  page.drawText('Shipping Address:', {
    x: 50,
    y: yPosition,
    size: 14,
    font: boldFont,
  });

  yPosition -= 20;
  const address = order.shippingAddress;
  page.drawText(
    `${address.street}, ${address.city}, ${address.state} ${address.zipCode}, ${address.country}`,
    {
      x: 50,
      y: yPosition,
      size: 10,
      font: font,
    }
  );

  yPosition -= 40;

  // Order Items Table Header
  page.drawText('Items', {
    x: 50,
    y: yPosition,
    size: 12,
    font: boldFont,
  });
  page.drawText('Quantity', {
    x: 250,
    y: yPosition,
    size: 12,
    font: boldFont,
  });
  page.drawText('Price', {
    x: 350,
    y: yPosition,
    size: 12,
    font: boldFont,
  });
  page.drawText('Total', {
    x: 450,
    y: yPosition,
    size: 12,
    font: boldFont,
  });

  yPosition -= 20;
  page.drawLine({
    start: { x: 50, y: yPosition },
    end: { x: 545, y: yPosition },
    thickness: 1,
    color: rgb(0, 0, 0),
  });

  yPosition -= 20;

  // Order Items
  for (const item of order.orderItems) {
    if (yPosition < 100) {
      // Add new page if needed
      const newPage = pdfDoc.addPage([595, 842]);
      yPosition = 800;
    }

    page.drawText(item.name, {
      x: 50,
      y: yPosition,
      size: 10,
      font: font,
    });
    page.drawText(item.quantity.toString(), {
      x: 250,
      y: yPosition,
      size: 10,
      font: font,
    });
    page.drawText(`₹${item.price.toFixed(2)}`, {
      x: 350,
      y: yPosition,
      size: 10,
      font: font,
    });
    page.drawText(`₹${(item.price * item.quantity).toFixed(2)}`, {
      x: 450,
      y: yPosition,
      size: 10,
      font: font,
    });

    yPosition -= 20;
  }

  yPosition -= 20;
  page.drawLine({
    start: { x: 50, y: yPosition },
    end: { x: 545, y: yPosition },
    thickness: 1,
    color: rgb(0, 0, 0),
  });

  yPosition -= 30;

  // Totals
  page.drawText(`Items Price: ₹${order.itemsPrice.toFixed(2)}`, {
    x: 350,
    y: yPosition,
    size: 10,
    font: font,
  });

  yPosition -= 20;
  page.drawText(`Tax (18%): ₹${order.taxPrice.toFixed(2)}`, {
    x: 350,
    y: yPosition,
    size: 10,
    font: font,
  });

  yPosition -= 20;
  page.drawText(`Shipping: ₹${order.shippingPrice.toFixed(2)}`, {
    x: 350,
    y: yPosition,
    size: 10,
    font: font,
  });

  yPosition -= 20;
  page.drawText(`Total: ₹${order.totalPrice.toFixed(2)}`, {
    x: 350,
    y: yPosition,
    size: 14,
    font: boldFont,
  });

  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
};

