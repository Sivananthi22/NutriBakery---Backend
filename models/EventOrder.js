import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  product: { type: String, required: true },
  quantity: { type: Number, required: true },
  image: { type: String }, // URL to image or filename if storing on server
});

const eventOrderSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },  // For order confirmation email
  eventType: { type: String, required: true },
  products: [productSchema],  // List of products with quantity and optional image
  instructions: { type: String },
  date: { type: Date, required: true },
  images: [String],  // Array of image URLs or filenames for main event images
}, {
  timestamps: true  // Automatically adds createdAt and updatedAt fields
});

export default mongoose.model('EventOrder', eventOrderSchema);
