import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  productID: { type: String, unique: true, required: true }, // Custom product ID for external use
  mongoID: { type: mongoose.Schema.Types.ObjectId, default: () => new mongoose.Types.ObjectId(), unique: true }, // MongoDB ObjectId for internal use
  name: { type: String, required: true },
  description: { type: String, required: true },
  price: { type: Number, required: true },
  category: { type: String, required: true },
  stock: { type: Number, required: true },
  imageUrl: { type: String, required: true },
  status: { type: String, default: 'Pending' },
  isSpecialty: { type: Boolean, default: false },
});

// Create indexes to improve query performance for productID and mongoID
productSchema.index({ productID: 1 });
productSchema.index({ mongoID: 1 });

// Ensure productID is unique and primary for external references
productSchema.set('toObject', { virtuals: true });
productSchema.set('toJSON', { virtuals: true });

// Use mongoID for internal references if needed
productSchema.virtual('id').get(function () {
  return this.mongoID;
});

const Product = mongoose.model('Product', productSchema);
export default Product;
