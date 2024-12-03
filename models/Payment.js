import mongoose from 'mongoose';

const PaymentSchema = new mongoose.Schema({
  userID: {
    type: String, // Change from ObjectId if it's a string
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  paymentMethod: {
    type: String,
    required: true,
  },
  paymentStatus: {
    type: String,
    enum: ['Pending', 'Completed', 'Failed'],
    default: 'Completed',
  },
}, { timestamps: true });

const Payment = mongoose.model('Payment', PaymentSchema);
export default Payment;

