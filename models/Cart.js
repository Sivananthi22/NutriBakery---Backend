import mongoose from 'mongoose';

const cartSchema = new mongoose.Schema({
  userID: { type: String, required: true },
  items: [
    {
      productID: { type: String, ref: 'Product' }, // Refers to productID instead of MongoDB ObjectId
      quantity: { type: Number, required: true },
    },
  ],
  totalAmount: { type: Number, required: true },
});

// Define a virtual field to populate product details based on the productID
cartSchema.virtual('productDetails', {
  ref: 'Product',               // Reference to the Product model
  localField: 'items.productID', // Field in Cart to match
  foreignField: 'productID',     // Field in Product model to match
  justOne: false,                // Expect multiple products (one for each item)
});

// Ensure virtuals are included in JSON and object outputs
cartSchema.set('toObject', { virtuals: true });
cartSchema.set('toJSON', { virtuals: true });

const Cart = mongoose.model('Cart', cartSchema);
export default Cart;
