import express from 'express';
import nodemailer from 'nodemailer';
import Contact from '../models/Contact.js';

const contactrouter = express.Router();

// Configure Nodemailer
const transporter = nodemailer.createTransport({
  service: 'Gmail', 
  auth: {
    user: process.env.EMAIL_USER, 
    pass: process.env.EMAIL_PASS, 
  },
});

// Route to handle contact form submission
contactrouter.post('/', async (req, res) => {
  const { name, email, subject, message } = req.body;
  console.log('Received contact form submission:', { name, email, subject, message });

  try {
    // Step 1: Save the contact message in the database
    const newContact = new Contact({ name, email, subject, message });
    await newContact.save();
    console.log('Message saved to database:', newContact);

    // Step 2: Send email notification
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: 'your-recipient-email@example.com',
      subject: `New Contact Form Submission: ${subject}`,
      text: `You have received a new message from ${name} (${email}):\n\n${message}`,
    };

    await transporter.sendMail(mailOptions);
    console.log('Email sent successfully with subject:', subject);

    res.status(201).json({ message: 'Message saved and email sent successfully!' });
  } catch (error) {
    console.error('Error saving message or sending email:', error.message);
    res.status(500).json({ message: 'Failed to save message or send email', error: error.message });
  }
});

// Fetch all contact messages
contactrouter.get('/messages', async (req, res) => {
  console.log('Fetching all contact messages');
  try {
    const messages = await Contact.find().sort({ createdAt: -1 });
    console.log('Messages fetched:', messages);
    res.status(200).json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error.message);
    res.status(500).json({ message: 'Error fetching messages' });
  }
});

// Mark a message as read
contactrouter.patch('/messages/:id/read', async (req, res) => {
  const { id } = req.params;
  console.log(`Marking message as read, ID: ${id}`);
  
  try {
    const updatedMessage = await Contact.findByIdAndUpdate(id, { read: true });
    if (updatedMessage) {
      console.log('Message marked as read:', updatedMessage);
      res.status(200).json({ message: 'Message marked as read' });
    } else {
      console.log('Message not found:', id);
      res.status(404).json({ message: 'Message not found' });
    }
  } catch (error) {
    console.error('Error updating message status:', error.message);
    res.status(500).json({ message: 'Error updating message status' });
  }
});

// Fetch recent contact messages
contactrouter.get('/recent', async (req, res) => {
  console.log('Fetching recent contact messages');
  try {
    // Use the correct model (Contact) to fetch recent messages
    const recentMessages = await Contact.find().sort({ createdAt: -1 }).limit(5); // Fetch the latest 5 messages
    
    if (recentMessages.length === 0) {
      console.log('No recent messages found');
    } else {
      console.log('Recent messages fetched:', recentMessages);
    }

    res.status(200).json(recentMessages);
  } catch (error) {
    console.error('Error fetching recent messages:', error.message); // Log error message
    console.error('Full error:', error); // Log the entire error object
    res.status(500).json({ message: 'Error fetching messages', error: error.message });
  }
});

export default contactrouter;
