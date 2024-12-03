// import dotenv from 'dotenv';
// import express from 'express';
// import mongoose from 'mongoose';
// import cors from 'cors';
// import path from 'path';
// import { Server } from 'socket.io';
// import http from 'http'; // For creating the HTTP server

// // Import routes
// import userRouter from './routes/UserRoutes.js';
// import productRouter from './routes/ProductRoutes.js';
// import OrderRouter from './routes/OrderRoutes.js';
// import cartRouter from './routes/CartRoutes.js';
// import BlogRouter from './routes/BlogRoutes.js';
// import payRouter from './routes/PaymentRoutes.js';
// import contactRouter from './routes/ContactRoutes.js';
// import reviewRouter from './routes/ReviewRoutes.js';
// import eventRouter from './routes/eventOrderRoutes.js';
// import chatrouter from './routes/chatRoutes.js';

// dotenv.config();

// console.log("Initializing server...");
// console.log("Email User:", process.env.EMAIL_USER);
// console.log("Email Pass:", process.env.EMAIL_PASS);

// const app = express();
// const port = process.env.PORT || 5000;

// // Create HTTP server for Socket.io
// const server = http.createServer(app);
// const io = new Server(server, {
//   cors: {
//     origin: 'http://localhost:3000', // Frontend URL
//     methods: ["GET", "POST"],
//     credentials: true,
//   },
// });

// // Middleware
// app.use(cors({ origin: 'http://localhost:3000', credentials: true }));
// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));

// // Serve static files for uploaded images
// app.use('/uploads', express.static(path.join('uploads')));
// console.log('Serving static files from /uploads');

// // Routes
// app.use('/api/users', userRouter);
// console.log('User routes initialized at /api/users');
// app.use('/api/products', productRouter);
// console.log('Product routes initialized at /api/products');
// app.use('/api/orders', OrderRouter);
// console.log('Order routes initialized at /api/orders');
// app.use('/api/cart', cartRouter);
// console.log('Cart routes initialized at /api/cart');
// app.use('/api/blogs', BlogRouter);
// console.log('Blog routes initialized at /api/blogs');
// app.use('/api/payments', payRouter);
// console.log('Payment routes initialized at /api/payments');
// app.use('/api/contact', contactRouter);
// console.log('Contact routes initialized at /api/contact');
// app.use('/api/review', reviewRouter);
// console.log('Review routes initialized at /api/review');
// app.use('/api/eventorder', eventRouter);
// console.log('Event order routes initialized at /api/eventorder');
// app.use('/api/chat', chatrouter);
// // MongoDB Connection
// mongoose.connect(process.env.MONGO_URI)
//   .then(() => console.log('Connected to MongoDB successfully'))
//   .catch((error) => console.error('Failed to connect to MongoDB:', error));

// // Set up Socket.io
// app.set('socketio', io);
// io.on('connection', (socket) => {
//   console.log('New client connected:', socket.id);

//   // Event handling (if needed)
//   socket.on('disconnect', () => {
//     console.log('Client disconnected:', socket.id);
//   });
// });

// // Start Server with Socket.io
// server.listen(port, () => {
//   console.log(`Server running on http://localhost:${port}`);
// });
import dotenv from 'dotenv';
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import path from 'path';

// Import routes
import userRouter from './routes/UserRoutes.js';
import productRouter from './routes/ProductRoutes.js';
import OrderRouter from './routes/OrderRoutes.js';
import cartRouter from './routes/CartRoutes.js';
import BlogRouter from './routes/BlogRoutes.js';
import payRouter from './routes/PaymentRoutes.js';
import contactRouter from './routes/ContactRoutes.js';
import reviewRouter from './routes/ReviewRoutes.js';
import eventRouter from './routes/eventOrderRoutes.js';
import chatrouter from './routes/chatRoutes.js';

// Initialize dotenv
dotenv.config();

// Create Express application
const app = express();

// Middleware
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000', credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join('uploads')));

// Routes
app.use('/api/users', userRouter);
app.use('/api/products', productRouter);
app.use('/api/orders', OrderRouter);
app.use('/api/cart', cartRouter);
app.use('/api/blogs', BlogRouter);
app.use('/api/payments', payRouter);
app.use('/api/contact', contactRouter);
app.use('/api/review', reviewRouter);
app.use('/api/eventorder', eventRouter);
app.use('/api/chat', chatrouter);

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('Connected to MongoDB successfully'))
  .catch((error) => console.error('Failed to connect to MongoDB:', error));

// Export the app
export default app;
