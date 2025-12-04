import express from "express";
import Product from "../models/Product.js";

const router = express.Router();

// 🧠 SEED ROUTE (must come before "/:id" route)
router.get("/seed", async (req, res) => {
  try {
    const products = [
      {
        name: "Cotton T-Shirt",
        description: "Soft and breathable cotton t-shirt for daily wear.",
        category: "Clothing",
        price: 499,
        image: "https://m.media-amazon.com/images/I/61GZ0Xtq2ML._AC_UY879_.jpg",
      },
      {
        name: "Wooden Dining Table",
        description: "Premium quality wooden table for modern homes.",
        category: "Furniture",
        price: 8999,
        image: "https://m.media-amazon.com/images/I/71bWcY3nEWL._AC_SL1500_.jpg",
      },
      {
        name: "Organic Face Cream",
        description: "Natural face cream for glowing and hydrated skin.",
        category: "Beauty Products",
        price: 799,
        image: "https://m.media-amazon.com/images/I/61BvX1vWg1L._SL1500_.jpg",
      },
      {
        name: "Rice 5kg Pack",
        description: "High-quality basmati rice with rich aroma.",
        category: "Grocery Store",
        price: 499,
        image: "https://m.media-amazon.com/images/I/81oxlYx4WfL._SL1500_.jpg",
      },
      {
        name: "Office Chair",
        description: "Ergonomic chair with lumbar support for long hours.",
        category: "Furniture",
        price: 4999,
        image: "https://m.media-amazon.com/images/I/61NeZ1nQ3bL._SL1500_.jpg",
      },
      {
        name: "Lipstick Combo Pack",
        description: "Matte finish lipsticks with long-lasting color.",
        category: "Beauty Products",
        price: 599,
        image: "https://plus.unsplash.com/premium_photo-1677526496932-1b4bddeee554?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MXx8bGlwc3RpY2t8ZW58MHx8MHx8fDA%3D&auto=format&fit=crop&q=60&w=600",
      },
      {
        name: "Casual Jeans",
        description: "Stretchable denim jeans for all-day comfort.",
        category: "Clothing",
        price: 1299,
        image: "https://m.media-amazon.com/images/I/71b9ZkO8vGL._AC_UY879_.jpg",
      },
      {
        name: "Cooking Oil 1L",
        description: "Refined sunflower oil, healthy and cholesterol-free.",
        category: "Grocery Store",
        price: 199,
        image: "https://m.media-amazon.com/images/I/71U6Un0RKiL._SL1500_.jpg",
      },
    ];

    await Product.deleteMany({});
    const createdProducts = await Product.insertMany(products);

    res.status(201).json({
      message: "Sample products added successfully",
      count: createdProducts.length,
      products: createdProducts,
    });
  } catch (error) {
    res.status(500).json({ message: "Seeding failed", error: error.message });
  }
});

// @route   GET /api/products
// @desc    Get all products with search, filter, and sort
// @access  Public
router.get("/", async (req, res) => {
  try {
    const {
      search,
      category,
      minPrice,
      maxPrice,
      sortBy = "createdAt",
      order = "desc",
      page = 1,
      limit = 12,
    } = req.query;

    const query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { category: { $regex: search, $options: "i" } },
      ];
    }

    if (category) query.category = category;

    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    const sort = {};
    sort[sortBy] = order === "asc" ? 1 : -1;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const products = await Product.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limitNum);

    const total = await Product.countDocuments(query);

    res.json({
      products,
      totalPages: Math.ceil(total / limitNum),
      currentPage: pageNum,
      total,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// @route   GET /api/products/categories
// @desc    Get all categories
// @access  Public
router.get("/categories", async (req, res) => {
  try {
    const categories = await Product.distinct("category");
    res.json(categories);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// @route   GET /api/products/:id
// @desc    Get single product
// @access  Public
router.get("/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product)
      return res.status(404).json({ message: "Product not found" });
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

export default router;
