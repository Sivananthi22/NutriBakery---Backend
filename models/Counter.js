import mongoose from 'mongoose';

const counterSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true }, // Identifier for the counter
  value: { type: Number, default: 0 }, // The current highest ID value
});

const Counter = mongoose.model('Counter', counterSchema);

export default Counter;