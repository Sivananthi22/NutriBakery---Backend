import express from 'express';
import Stripe from 'stripe';
import dotenv from 'dotenv';
import Payment from '../models/Payment.js';
import Order from '../models/Order.js';
import axios from 'axios'; // Add this line

// Load .env variables
dotenv.config();

// Initialize Stripe with the secret key from .env
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

const payrouter = express.Router();


// Function to convert currency
const convertCurrency = async (amount, from = 'AUD', to = 'CAD', language = 'en') => {
  try {
    console.log('Attempting to convert currency:', { amount, from, to, language });

    // Call the RapidAPI endpoint
    const response = await axios.get('https://currency-converter5.p.rapidapi.com/currency/convert', {
      params: {
        format: 'json',
        from,
        to,
        amount,
        language,
      },
      headers: {
        'x-rapidapi-host': 'currency-converter5.p.rapidapi.com',
        'x-rapidapi-key': process.env.RAPIDAPI_KEY || 'd179de1ffemsh963d7e6584b6972p1da325jsn47a6f6d73740', // Add fallback key for testing
      },
    });

    // Extract the converted amount
    const convertedAmount = response.data.rates[to].rate_for_amount;
    console.log(`Converted ${amount} ${from} to ${convertedAmount} ${to}`);
    return convertedAmount;
  } catch (error) {
    console.error('Currency conversion failed:', error.response?.data || error.message);
    throw new Error('Unable to convert currency. Please try again.');
  }
};

// Route to create a Stripe Checkout session
payrouter.post('/create-checkout-session', async (req, res) => {
  const { items, totalAmountLKR, success_url, cancel_url, userID } = req.body;

  console.log('Received data:', { items, totalAmountLKR, userID });

  try {
    const totalAmountUSD = await convertCurrency(totalAmountLKR, 'LKR', 'USD');
    console.log('Converted amount (USD):', totalAmountUSD);

    const lineItems = items.map((item) => ({
      price_data: {
        currency: 'usd',
        product_data: { name: item.name },
        unit_amount: Math.round((item.priceLKR / totalAmountLKR) * totalAmountUSD * 100),
      },
      quantity: item.quantity,
    }));

    console.log('Line items:', lineItems);

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url,
      cancel_url,
      metadata: { userID, items: JSON.stringify(items), totalAmountLKR },
    });

    console.log('Checkout session created:', session.id);
    res.status(200).json({ id: session.id });
  } catch (error) {
    console.error('Error creating checkout session:', error.message);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});



// Route to handle successful payments from Stripe (Webhook)
payrouter.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    console.log('Webhook received');
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    console.log('Parsed webhook event:', event.type);

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      console.log('Stripe session:', session);

      const userID = session.metadata.userID; // Extract metadata
      const items = JSON.parse(session.metadata.items);
      const totalAmountLKR = session.metadata.totalAmountLKR;

      console.log('Session metadata:', {
        userID,
        items,
        totalAmountLKR,
      });

      if (!userID) {
        console.error('Error: Missing userID in session metadata.');
        return res.status(400).send('userID is required.');
      }

      // Generate custom order ID
      const generateCustomID = async () => {
        const prefix = 'NBO';
        const latestOrder = await Order.findOne().sort({ createdAt: -1 });
        const nextID = latestOrder
          ? parseInt(latestOrder.orderID.replace(prefix, '')) + 1
          : 1;
        return `${prefix}${String(nextID).padStart(5, '0')}`;
      };

      const customOrderID = await generateCustomID();
      console.log('Generated custom order ID:', customOrderID);

      try {
        // Save the order
        const order = new Order({
          orderID: customOrderID,
          userID,
          totalAmount: totalAmountLKR,
          orderedItems: items,
          paymentMethod: 'Stripe',
        });

        const savedOrder = await order.save();
        console.log('Order saved successfully:', savedOrder);
      } catch (error) {
        console.error('Error saving order:', error.message);
      }

      try {
        // Save the payment
        const payment = new Payment({
          userID,
          amount: totalAmountLKR,
          paymentMethod: 'Stripe',
          paymentStatus: 'Completed',
        });

        const savedPayment = await payment.save();
        console.log('Payment saved successfully:', savedPayment);
      } catch (error) {
        console.error('Error saving payment:', error.message);
      }

      res.status(200).json({ received: true });
    } else {
      console.log('Unsupported event type:', event.type);
      res.status(400).end();
    }
  } catch (error) {
    console.error('Webhook error:', error.message);
    res.status(400).send(`Webhook Error: ${error.message}`);
  }
});




payrouter.post('/cod', async (req, res) => {
  const { totalAmount, orderedItems, userDetails } = req.body;

  if (!userDetails || !userDetails._id) {
    console.error('User details missing in COD request.');
    return res.status(400).json({ message: 'User details are required.' });
  }

  try {
    console.log('Processing COD order for user:', userDetails._id);

    // Generate a custom order ID
    const generateCustomID = async () => {
      const prefix = 'NBO';
      const latestOrder = await Order.findOne().sort({ createdAt: -1 });
      const nextID = latestOrder
        ? parseInt(latestOrder.orderID.replace(prefix, '')) + 1
        : 1;
      return `${prefix}${String(nextID).padStart(5, '0')}`;
    };

    const customOrderID = await generateCustomID();
    console.log('Generated Custom Order ID:', customOrderID);

    // Save the order
    const newOrder = new Order({
      orderID: customOrderID,
      userID: userDetails._id,
      totalAmount,
      orderedItems,
      paymentMethod: 'Cash on Delivery',
    });
    const savedOrder = await newOrder.save();
    console.log('Order saved:', savedOrder);

    // Save the payment record
    const newPayment = new Payment({
      userID: userDetails._id,
      amount: totalAmount,
      paymentMethod: 'Cash on Delivery',
      paymentStatus: 'Pending', // Pending because payment is collected upon delivery
    });
    const savedPayment = await newPayment.save();
    console.log('Payment saved:', savedPayment);

    res.status(201).json({ message: 'Order and payment saved successfully for COD.', order: savedOrder });
  } catch (error) {
    console.error('Error processing COD order:', error.message);
    res.status(500).json({ message: 'Failed to process COD order.', error: error.message });
  }
});




// Route to fetch all payment records (Admin)
payrouter.get('/payments', async (req, res) => {
  console.log('Fetching all payments');
  try {
    const payments = await Payment.find().populate('userID', 'name email');
    console.log('Payments fetched:', payments);
    res.status(200).json(payments);
  } catch (error) {
    console.error('Error fetching payments:', error.message);
    res.status(500).json({ message: 'Error fetching payments', error });
  }
});

// Route to fetch a specific payment by ID (Admin or for user history)
payrouter.get('/payments/:id', async (req, res) => {
  const { id } = req.params;
  console.log('Fetching payment with ID:', id);
  try {
    const payment = await Payment.findById(id).populate('userID', 'name email');
    if (!payment) {
      console.log('Payment not found');
      return res.status(404).json({ message: 'Payment not found' });
    }
    console.log('Payment fetched:', payment);
    res.status(200).json(payment);
  } catch (error) {
    console.error('Error fetching payment:', error.message);
    res.status(500).json({ message: 'Error fetching payment', error });
  }
});

// Route to create a Stripe checkout session
payrouter.post('/create-checkout-session', async (req, res) => {
  console.log('Creating checkout session with items:', req.body.items);
  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: req.body.items,
      mode: 'payment',
      success_url: 'http://localhost:3000/success',
      cancel_url: 'http://localhost:3000/cancel',
    });

    console.log('Checkout session created:', session.id);
    res.status(200).json({ id: session.id });
  } catch (error) {
    console.error('Error creating checkout session:', error.message);
    res.status(500).json({ message: 'Error creating checkout session', error: error.message });
  }
});

// Route to create an order and payment record
payrouter.post('/orders-and-payments', async (req, res) => {
  const { totalAmount, userDetails, orderedItems, paymentMethod } = req.body;

  const userID = userDetails?._id;
  if (!userID) {
    console.error('userID is missing in request body:', req.body);
    return res.status(400).json({ message: 'userID is required in userDetails' });
  }

  console.log('Creating order and payment with details:', req.body);
  try {
    const newOrder = new Order({
      userID,
      totalAmount,
      userDetails,
      orderedItems,
      paymentMethod,
    });

    await newOrder.save();
    console.log('Order saved:', newOrder);

    const newPayment = new Payment({
      userID,
      amount: totalAmount,
      paymentMethod,
      paymentStatus: 'Pending',
    });

    await newPayment.save();
    console.log('Payment saved:', newPayment);

    res.status(201).json({ message: 'Order and payment saved successfully.' });
  } catch (error) {
    console.error('Error saving order and payment:', error.message);
    res.status(500).json({ message: 'Error saving order and payment', error: error.message });
  }
});

// Route to get total revenue
payrouter.get('/total-revenue', async (req, res) => {
  console.log('Calculating total revenue');
  try {
    const totalRevenue = await Payment.aggregate([
      { $match: { paymentStatus: 'Completed' } }, // Filter by completed payments
      { $group: { _id: null, total: { $sum: '$amount' } } }, // Sum all completed payments
    ]);
    console.log('Total revenue calculated:', totalRevenue[0]?.total || 0);
    res.status(200).json({ total: totalRevenue[0]?.total || 0 });
  } catch (error) {
    console.error('Error fetching total revenue:', error.message);
    res.status(500).json({ message: 'Error fetching total revenue', error: error.message });
  }
});

// Update payment status (Admin or Payment Manager)
payrouter.patch('/:paymentId/status', async (req, res) => {
  const { paymentId } = req.params;
  const { status } = req.body;

  console.log('Updating payment status for ID:', paymentId, 'to status:', status);
  try {
    const payment = await Payment.findByIdAndUpdate(paymentId, { paymentStatus: status }, { new: true });
    if (!payment) {
      console.log('Payment not found');
      return res.status(404).json({ message: 'Payment not found' });
    }

    console.log('Payment status updated:', payment);
    res.status(200).json(payment);
  } catch (error) {
    console.error('Error updating payment status:', error.message);
    res.status(500).json({ message: 'Error updating payment status', error: error.message });
  }
});

export default payrouter;
