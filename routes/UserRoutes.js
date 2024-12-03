import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import authMiddleware from '../middleware/auth.js';
import mongoose from 'mongoose';
import crypto from 'crypto';
import nodemailer from 'nodemailer';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

router.post('/signup', async (req, res) => {
  const { username, email, password, phoneNumber } = req.body; // Destructure phoneNumber

  try {
    console.log('Signup request body:', req.body);

    // Check if user already exists with the same email
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log('User already exists with email:', email);
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    // Generate custom userID based on the existing users count
    const userCount = await User.countDocuments();
    const newuserID = `NBU_${String(userCount + 1).padStart(3, '0')}`; // NBU_001, NBU_002, etc.
    console.log('Generated new user ID:', newuserID);

    // Hash the password before saving
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create the new user
    const user = new User({
      username,
      email,
      password: hashedPassword,
      phoneNumber, // Add phoneNumber to the user object
      role: 'user',
      userID: newuserID,
    });

    await user.save();

    console.log('User created successfully:', user.username);
    res.status(201).json({ message: 'User created successfully', username: user.username, userID: user.userID });
  } catch (error) {
    console.error('Error creating user:', error.message);
    res.status(500).json({ message: 'Error creating user', error: error.message });
  }
});


// Login Route
router.post('/login', async (req, res) => {
  console.log('Login request body:', req.body);  // Log the incoming login request
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      console.log('User not found with email:', email);
      return res.status(400).json({ message: 'User not found' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log('Invalid credentials for email:', email);
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { userID: user.userID, role: user.role, username: user.username },  // Change `userID` to `userID`
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    
    

    console.log('Login successful for user:', user.username);
    console.log('Returning userID:', user.userID);  // Log the userID that will be sent in the response
    res.json({ token, role: user.role, username: user.username, userID: user.userID }); // Ensure userID is returned
  } catch (error) {
    console.error('Server error during login:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
});


// Password Reset (Forgot Password)
router.post('/forgot-password', async (req, res) => {
  console.log('Forgot password request body:', req.body);
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      console.log('User not found for password reset with email:', email);
      return res.status(404).json({ message: 'User not found' });
    }

    const resetToken = crypto.randomBytes(20).toString('hex');
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 3600000;
    await user.save();

    console.log('Password reset token generated for user:', user.username);

    const transporter = nodemailer.createTransport({
      service: 'Gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    const mailOptions = {
      to: user.email,
      from: process.env.EMAIL_USER,
      subject: 'Password Reset',
      text: `Please use the following token to reset your password: ${resetToken}`
    };

    await transporter.sendMail(mailOptions);
    console.log('Password reset email sent to:', user.email);

    res.json({ message: 'Password reset email sent' });
  } catch (error) {
    console.error('Error sending reset email:', error.message);
    res.status(500).json({ message: 'Error sending reset email', error: error.message });
  }
});

// Reset Password Route
router.post('/reset-password', async (req, res) => {
  console.log('Reset password request body:', req.body);
  const { resetToken, newPassword } = req.body;

  try {
    const user = await User.findOne({
      resetPasswordToken: resetToken,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      console.log('Invalid or expired reset token:', resetToken);
      return res.status(400).json({ message: 'Invalid or expired token' });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    console.log('Password reset successfully for user:', user.username);
    res.json({ message: 'Password has been reset successfully' });
  } catch (error) {
    console.error('Error resetting password:', error.message);
    res.status(500).json({ message: 'Error resetting password', error: error.message });
  }
});

// Promote User to Admin
router.post('/promote', async (req, res) => {
  console.log('Promote request body:', req.body);
  const { username } = req.body;

  try {
    const user = await User.findOneAndUpdate(
      { username },
      { $set: { role: 'admin' } },
      { new: true }
    );

    if (user) {
      console.log(`User ${username} promoted to admin`);
      res.status(200).json({ message: `User ${username} is now an admin.` });
    } else {
      console.log(`User ${username} not found for promotion`);
      res.status(404).json({ message: `User ${username} not found.` });
    }
  } catch (error) {
    console.error('Error promoting user to admin:', error.message);
    res.status(500).json({ message: 'Error promoting user to admin', error: error.message });
  }
});

// Get all users with pagination
router.get('/', async (req, res) => {
  const { userID } = req.query;

  if (userID) {
    const user = await User.findOne({ userID });
    if (user) {
      return res.json({ exists: true });
    } else {
      return res.json({ exists: false });
    }
  }

  // Fetch users with pagination
  const page = parseInt(req.query.page) || 1;
  const limit = 8;
  try {
    const users = await User.find()
      .skip((page - 1) * limit)
      .limit(limit);

    const totalUsers = await User.countDocuments();
    res.json({
      users,
      totalPages: Math.ceil(totalUsers / limit),
      currentPage: page
    });
  } catch (error) {
    console.error('Error fetching users:', error.message);
    res.status(500).json({ message: 'Error fetching users', error: error.message });
  }
});


// Update User route (backend)
router.put('/:id', async (req, res) => {
  const { userID, username, email, role, address, phoneNumber } = req.body;

  // Check if the userID already exists and is not the current user's ID
  const userWithSameID = await User.findOne({ userID });
  if (userWithSameID && userWithSameID._id.toString() !== req.params.id) {
    return res.status(400).json({ message: 'userID already exists' });
  }

  try {
    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      { userID, username, email, role, address, phoneNumber },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ message: 'User updated successfully', user: updatedUser });
  } catch (error) {
    console.error('Error updating user:', error.message);
    res.status(500).json({ message: 'Error updating user', error: error.message });
  }
});



// Route to get the authenticated user's details
router.get('/me', authMiddleware, async (req, res) => {
  console.log('Fetching user details for userID:', req.user.userID);
  try {
    // Use the custom userID field instead of _id
    const user = await User.findOne({ userID: req.user.userID }).select('-password');
    if (!user) {
      console.log('User not found for /me route');
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    console.error('Server error on /me route:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
});



// Route to update user's delivery address and phone number
router.put('/updateAddress', authMiddleware, async (req, res) => {
  try {
    const { address, phoneNumber } = req.body;
    const userID = req.user.userID;

    if (!address || !phoneNumber) {
      return res.status(400).json({ message: 'Address and phone number are required' });
    }

    const user = await User.findOneAndUpdate(
      { userID },
      { address, phoneNumber },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({ message: 'User details updated successfully', user });
  } catch (error) {
    console.error('Error updating user details:', error.message);
    res.status(500).json({ message: 'Error updating user details', error: error.message });
  }
});


// Define the route to get the total user count
router.get('/count', async (req, res) => {
  console.log('Fetching total user count');
  try {
    const userCount = await User.countDocuments();
    res.status(200).json({ count: userCount });
    console.log('Total user count:', userCount);
  } catch (error) {
    console.error('Error fetching user count:', error.message);
    res.status(500).json({ message: 'Error fetching user count', error: error.message });
  }
});

// Route to update all user IDs - restrict this to admin access
router.post('/update-user-ids', async (req, res) => {
  try {
    // Check if the request is authorized (e.g., check if the user is an admin)
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden: Admins only' });
    }

    const users = await User.find().sort({ createdAt: 1 });
    for (let i = 0; i < users.length; i++) {
      const userID = `NBU_${(i + 1).toString().padStart(3, '0')}`;
      await User.updateOne({ _id: users[i]._id }, { userID: userID });
    }

    console.log('User IDs updated successfully');
    res.status(200).json({ message: 'User IDs updated successfully' });
  } catch (error) {
    console.error('Error updating user IDs:', error);
    res.status(500).json({ message: 'Error updating user IDs', error: error.message });
  }
});

export default router;
