import express from 'express';
import mongoose from 'mongoose';
import Order from '../models/Order.js';
import authMiddleware from '../middleware/auth.js';
import Product from '../models/Product.js';

const OrderRouter = express.Router();

// Generate a custom order ID
OrderRouter.get('/custom-id', async (req, res) => {
  const { prefix } = req.query;
  console.log('Custom ID Request Received with prefix:', prefix);

  try {
    if (!prefix) {
      console.log('Prefix is missing');
      return res.status(400).json({ error: 'Prefix is required.' });
    }

    let nextID, customID;
    let isUnique = false;

    while (!isUnique) {
      const latestOrder = await Order.findOne().sort({ createdAt: -1 });
      console.log('Latest Order:', latestOrder);

      nextID = latestOrder ? parseInt(latestOrder.orderID.replace(prefix, '')) + 1 : 1;
      customID = `${prefix}${String(nextID).padStart(6, '0')}`;
      console.log('Generated Custom ID:', customID);

      const existingOrder = await Order.findOne({ orderID: customID });
      if (!existingOrder) {
        isUnique = true; // Ensure it's unique
      }
    }

    res.status(200).json({ customID });
  } catch (error) {
    console.error('Error generating custom ID:', error.message);
    res.status(500).json({ error: 'Failed to generate custom ID.' });
  }
});



OrderRouter.post('/orders-and-payments', authMiddleware, async (req, res) => {
  const { orderID, totalAmount, orderedItems, paymentMethod } = req.body;

  try {
    // Map ordered items to replace productID with MongoDB _id (mongoID)
    const mappedOrderedItems = await Promise.all(
      orderedItems.map(async (item) => {
        const product = await Product.findOne({ productID: item.productID });
        if (!product) {
          throw new Error(`Product with ID ${item.productID} not found.`);
        }
        return {
          productID: product.mongoID, // Use mongoID for backend storage
          quantity: item.quantity,
          customizationOptions: item.customizationOptions || {},
          subscriptionType: item.subscriptionType || 'none',
        };
      })
    );

    // Create a new order
    const order = new Order({
      orderID,
      userID: req.user.userID,
      totalAmount,
      orderedItems: mappedOrderedItems,
      paymentMethod,
    });

    // Save the order to the database
    const savedOrder = await order.save();
    res.status(201).json({ message: 'Order created successfully', order: savedOrder });
  } catch (error) {
    if (error.code === 11000) {
      console.error('Duplicate orderID detected:', orderID);
      return res.status(400).json({
        message: 'Duplicate orderID detected. Please try again.',
        error: error.message,
      });
    }
    console.error('Error saving order:', error.message);
    res.status(500).json({ message: 'Failed to create order.', error: error.message });
  }
});





// Fetch orders with user details and ordered items
OrderRouter.get('/', async (req, res) => {
  try {
    const orders = await Order.find()
      .populate({
        path: 'userID',
        select: 'name address phoneNumber email', // Fetch user details (name, address, phoneNumber, email)
      })
      .populate({
        path: 'orderedItems.productID',
        select: 'productID name price imageUrl', // Fetch product details
      })
      .select('orderID userID totalAmount orderedItems paymentMethod'); // Select relevant fields

    // Transform the response for the frontend
    const transformedOrders = orders.map((order) => ({
      orderID: order.orderID,
      userName: order.userID?.name || 'Unknown',
      userAddress: order.userID?.address || 'Unknown',
      userPhoneNumber: order.userID?.phoneNumber || 'Unknown',
      userEmail: order.userID?.email || 'Unknown',
      totalAmount: order.totalAmount,
      paymentMethod: order.paymentMethod,
      orderedItems: order.orderedItems.map((item) => ({
        productID: item.productID?.productID || 'Unknown',
        name: item.productID?.name || 'Unknown',
        price: item.productID?.price || 0,
        imageUrl: item.productID?.imageUrl || '',
        quantity: item.quantity,
        customizationOptions: item.customizationOptions || {},
        subscriptionType: item.subscriptionType || 'none',
      })),
    }));

    res.status(200).json(transformedOrders);
  } catch (error) {
    console.error('Error fetching orders:', error.message);
    res.status(500).json({ message: 'Error fetching orders.', error: error.message });
  }
});

export default OrderRouter;
