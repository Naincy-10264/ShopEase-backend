import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide a product name'],
    trim: true,
  },
  description: {
    type: String,
    required: [true, 'Please provide a product description'],
  },
  price: {
    type: Number,
    required: [true, 'Please provide a product price'],
    min: 0,
  },
  image: {
    type: String,
    required: [true, 'Please provide a product image'],
  },
  category: {
    type: String,
    required: [true, 'Please provide a product category'],
    trim: true,
  },
  stock: {
    type: Number,
    required: [true, 'Please provide stock quantity'],
    min: 0,
    default: 0,
  },
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5,
  },
  numReviews: {
    type: Number,
    default: 0,
  },
  brand: {
    type: String,
    trim: true,
  },
}, {
  timestamps: true,
});

const Product = mongoose.model('Product', productSchema);

export default Product;

