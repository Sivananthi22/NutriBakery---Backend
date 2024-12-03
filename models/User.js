import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  userID: { type: String, unique: true, required: true },
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  address: { type: String },
  phoneNumber: { type: String, required: true }, // Ensure phone number is required
});

const User = mongoose.model('User', userSchema);
export default User;
