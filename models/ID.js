import mongoose from 'mongoose';

const IDSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
  },
  value: {
    type: Number,
    required: true,
  },
});

const ID = mongoose.model('ID', IDSchema);
export default ID;
