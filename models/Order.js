import mongoose from 'mongoose';

const OrderSchema = new mongoose.Schema({
  orderID: {
    type: String,
    unique: true,
    required: true,
  },
  userID: {
    type: String, // Custom user ID
    required: true,
  },
  totalAmount: {
    type: Number,
    required: true,
  },
  orderedItems: [
    {
      productID: { type: String, required: true }, // Change to String
      quantity: { type: Number, required: true },
      customizationOptions: { type: Object, default: {} },
      subscriptionType: { type: String, default: 'none' },
    },
  ],
  paymentMethod: {
    type: String,
    enum: ['Stripe', 'Cash on Delivery'],
    required: true,
  },
});

const Order = mongoose.model('Order', OrderSchema);
export default Order;


