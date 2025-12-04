import express from 'express';
import Product from '../models/Product.js';
import Order from '../models/Order.js';
import { protect, admin } from '../middleware/authMiddleware.js';
import { body, validationResult } from 'express-validator';

const router = express.Router();

// Apply admin middleware to all routes
router.use(protect);
router.use(admin);

// @route   GET /api/admin/products
// @desc    Get all products (admin)
// @access  Private/Admin
router.get('/products', async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   POST /api/admin/products
// @desc    Create product
// @access  Private/Admin
router.post(
  '/products',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('description').notEmpty().withMessage('Description is required'),
    body('price').isNumeric().withMessage('Price must be a number'),
    body('category').trim().notEmpty().withMessage('Category is required'),
    body('stock').isNumeric().withMessage('Stock must be a number'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const product = await Product.create(req.body);
      res.status(201).json(product);
    } catch (error) {
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }
);

// @route   PUT /api/admin/products/:id
// @desc    Update product
// @access  Private/Admin
router.put('/products/:id', async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json(product);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   DELETE /api/admin/products/:id
// @desc    Delete product
// @access  Private/Admin
router.delete('/products/:id', async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json({ message: 'Product deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/admin/orders
// @desc    Get all orders
// @access  Private/Admin
router.get('/orders', async (req, res) => {
  try {
    const orders = await Order.find()
      .populate('user', 'name email')
      .populate('orderItems.product')
      .sort({ createdAt: -1 });

    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   PUT /api/admin/orders/:id/status
// @desc    Update order status
// @access  Private/Admin
router.put('/orders/:id/status', async (req, res) => {
  try {
    const { status } = req.body;

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    order.status = status;

    if (status === 'delivered') {
      order.isDelivered = true;
      order.deliveredAt = Date.now();
    }

    await order.save();

    res.json(order);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/admin/stats
// @desc    Get admin stats
// @access  Private/Admin
router.get('/stats', async (req, res) => {
  try {
    const totalProducts = await Product.countDocuments();
    const totalOrders = await Order.countDocuments();
    const totalRevenue = await Order.aggregate([
      { $match: { isPaid: true } },
      { $group: { _id: null, total: { $sum: '$totalPrice' } } },
    ]);

    const pendingOrders = await Order.countDocuments({ status: 'pending' });
    const processingOrders = await Order.countDocuments({ status: 'processing' });

    res.json({
      totalProducts,
      totalOrders,
      totalRevenue: totalRevenue[0]?.total || 0,
      pendingOrders,
      processingOrders,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;

