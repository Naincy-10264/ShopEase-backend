import express from 'express';
import Order from '../models/Order.js';
import Cart from '../models/Cart.js';
import Product from '../models/Product.js';
import { protect } from '../middleware/authMiddleware.js';
import { generateInvoicePDF } from '../utils/generateInvoice.js';
import Razorpay from 'razorpay';
import crypto from 'crypto';

const router = express.Router();

// Lazy initialization of Razorpay - only initialize when needed
let razorpay = null;

const getRazorpayInstance = () => {
  if (!razorpay) {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    
    // Check if Razorpay keys are configured
    if (!keyId || !keySecret || 
        keyId === 'your_razorpay_key_id_here' || 
        keySecret === 'your_razorpay_key_secret_here') {
      throw new Error('Razorpay keys are not configured. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in your .env file');
    }
    
    razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });
  }
  return razorpay;
};

// @route   POST /api/orders
// @desc    Create new order
// @access  Private
router.post('/', protect, async (req, res) => {
  try {
    const { shippingAddress, paymentMethod } = req.body;

    const cart = await Cart.findOne({ user: req.user._id }).populate('items.product');

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ message: 'Cart is empty' });
    }

    // Calculate prices
    const itemsPrice = cart.items.reduce(
      (total, item) => total + item.product.price * item.quantity,
      0
    );
    const taxPrice = itemsPrice * 0.18; // 18% GST
    const shippingPrice = itemsPrice > 1000 ? 0 : 50;
    const totalPrice = itemsPrice + taxPrice + shippingPrice;

    // Create order
    const order = await Order.create({
      user: req.user._id,
      orderItems: cart.items.map((item) => ({
        product: item.product._id,
        name: item.product.name,
        image: item.product.image,
        price: item.product.price,
        quantity: item.quantity,
      })),
      shippingAddress,
      paymentMethod,
      itemsPrice,
      taxPrice,
      shippingPrice,
      totalPrice,
    });

    // Update stock
    for (const item of cart.items) {
      await Product.findByIdAndUpdate(item.product._id, {
        $inc: { stock: -item.quantity },
      });
    }

    // Clear cart
    cart.items = [];
    await cart.save();

    // If payment method is Razorpay, create order
    if (paymentMethod === 'razorpay') {
      try {
        const razorpayInstance = getRazorpayInstance();
        const razorpayOrder = await razorpayInstance.orders.create({
          amount: Math.round(totalPrice * 100), // Amount in paise
          currency: 'INR',
          receipt: order._id.toString(),
        });

        res.json({
          order,
          razorpayOrderId: razorpayOrder.id,
          keyId: process.env.RAZORPAY_KEY_ID,
        });
      } catch (error) {
        return res.status(400).json({ 
          message: 'Payment gateway error', 
          error: error.message 
        });
      }
    } else {
      res.status(201).json(order);
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   POST /api/orders/:id/verify
// @desc    Verify Razorpay payment
// @access  Private
router.post('/:id/verify', protect, async (req, res) => {
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Verify signature
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret || keySecret === 'your_razorpay_key_secret_here') {
      return res.status(400).json({ 
        message: 'Razorpay is not configured. Please set RAZORPAY_KEY_SECRET in your .env file' 
      });
    }

    const text = `${razorpayOrderId}|${razorpayPaymentId}`;
    const generatedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(text)
      .digest('hex');

    if (generatedSignature !== razorpaySignature) {
      return res.status(400).json({ message: 'Payment verification failed' });
    }

    // Update order
    order.isPaid = true;
    order.paidAt = Date.now();
    order.paymentResult = {
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    };
    order.status = 'processing';

    await order.save();

    res.json({ message: 'Payment verified', order });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/orders
// @desc    Get user's orders
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id })
      .populate('orderItems.product')
      .sort({ createdAt: -1 });

    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/orders/:id/invoice
// @desc    Generate invoice PDF
// @access  Private
router.get('/:id/invoice', protect, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate('orderItems.product').populate('user', 'name email');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.user._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const pdfBytes = await generateInvoicePDF(order);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=invoice-${order._id}.pdf`);
    res.send(pdfBytes);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/orders/:id
// @desc    Get single order
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate('orderItems.product').populate('user', 'name email');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.user._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    res.json(order);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;

