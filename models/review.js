// models/Review.js
import mongoose from 'mongoose';

// Define Review schema
const reviewSchema = new mongoose.Schema({
  name: { type: String, required: true },
  rating: { type: Number, required: true },
  comment: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

// Create and export Review model
const Review = mongoose.model('Review', reviewSchema);
export default Review;
