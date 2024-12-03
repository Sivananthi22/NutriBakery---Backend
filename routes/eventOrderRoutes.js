import express from 'express';
import multer from 'multer';
import EventOrder from '../models/EventOrder.js';
import nodemailer from 'nodemailer';

const eventRouter = express.Router();

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({ storage });

// Route to create event order and send confirmation email
eventRouter.post('/eventorder', upload.fields([
  { name: 'images', maxCount: 5 },
  { name: 'products[image]', maxCount: 5 },
]), async (req, res) => {
  try {
    const { name, email, eventType, instructions, date, products } = req.body;

    const parsedProducts = (typeof products === 'string' ? JSON.parse(products) : products).map((product, index) => {
      const image = req.files['products[image]'] ? req.files['products[image]'][index]?.filename : null;
      return { product: product.product, quantity: product.quantity, image };
    });

    const images = req.files['images']?.map((file) => file.filename) || [];

    const eventOrder = new EventOrder({
      name,
      email,
      eventType,
      instructions,
      date,
      products: parsedProducts,
      images,
      paymentStatus: 'Pending',
      deliveryStatus: 'Not Delivered',
    });

    await eventOrder.save();

    const transporter = nodemailer.createTransport({
      service: 'Gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const message = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Order Confirmation',
      text: `Dear ${name},\n\nYour order has been confirmed for the event on ${date}.`,
    };

    await transporter.sendMail(message);

    res.status(201).json({ message: 'Custom event order saved and email sent successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save event order' });
  }
});

// Route to get all event orders
eventRouter.get('/', async (req, res) => {
  try {
    const eventOrders = await EventOrder.find();
    res.status(200).json(eventOrders);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve event orders' });
  }
});

// Route to update payment status
eventRouter.patch('/:id/payment', async (req, res) => {
  try {
    const { status } = req.body;
    const eventOrder = await EventOrder.findByIdAndUpdate(req.params.id, { paymentStatus: status }, { new: true });
    res.json(eventOrder);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update payment status' });
  }
});

// Route to update delivery status
eventRouter.patch('/:id/delivery', async (req, res) => {
  try {
    const { status } = req.body;
    const eventOrder = await EventOrder.findByIdAndUpdate(req.params.id, { deliveryStatus: status }, { new: true });
    res.json(eventOrder);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update delivery status' });
  }
});

export default eventRouter;
