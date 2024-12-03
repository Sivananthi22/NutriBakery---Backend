import express from 'express';
import Cart from '../models/Cart.js';
import Product from '../models/Product.js';
import authMiddleware from '../middleware/auth.js';

const Cartrouter = express.Router();

// POST route to add items to the cart
Cartrouter.post('/', authMiddleware, async (req, res) => {
  const { productID, quantity, customizationOptions } = req.body;
  const userID = req.user.userID;

  if (!userID || !productID) {
    return res.status(400).json({ message: 'User ID and Product ID are required' });
  }

  try {
    let cart = await Cart.findOne({ userID });
    if (!cart) {
      cart = new Cart({
        userID,
        items: [{ productID, quantity: quantity || 1, customizationOptions: customizationOptions || {} }]
      });
    } else {
      const existingProductIndex = cart.items.findIndex(item => item.productID === productID);
      if (existingProductIndex > -1) {
        cart.items[existingProductIndex].quantity += quantity || 1;
        cart.items[existingProductIndex].customizationOptions = customizationOptions || {};
      } else {
        cart.items.push({ productID, quantity: quantity || 1, customizationOptions: customizationOptions || {} });
      }
    }

    cart.totalAmount = await calculateTotalAmount(cart.items);
    await cart.save();
    res.status(201).json({ message: 'Product added to cart', cart });
  } catch (error) {
    console.error('Error adding product to cart:', error);
    res.status(500).json({ message: 'Error adding product to cart' });
  }
});

// GET route to fetch cart items for the authenticated user
Cartrouter.get('/', authMiddleware, async (req, res) => {
  try {
    const userID = req.user.userID;
    console.log(`Fetching cart for user: ${userID}`);

    const cart = await Cart.findOne({ userID });

    if (!cart || cart.items.length === 0) {
      return res.status(404).json({ message: 'Cart is empty' });
    }

    console.log('Cart details before processing items:', cart.items);

    const cartItems = await Promise.all(
      cart.items.map(async (item) => {
        console.log('Processing item:', item);

        if (!item.productID) {
          console.error(`Missing productID for item: ${JSON.stringify(item)}`);
          return null;
        }

        // Fetch product details using productID
        const product = await Product.findOne({ productID: item.productID }, 'productID name price imageUrl');
        
        if (!product) {
          console.error(`Product with productID ${item.productID} not found`);
          return null;
        }

        console.log(`Fetched product details: ${JSON.stringify(product)}`);

        return {
          productID: product.productID,  // Unique product ID for external use
          name: product.name,
          price: product.price,           // Unit price of the product
          imageUrl: product.imageUrl,
          quantity: item.quantity,        // Quantity of the product in the cart
          totalPrice: item.quantity * product.price, // Total price for this product in the cart
        };
      })
    );

    console.log('Cart items after processing:', cartItems);

    const filteredCartItems = cartItems.filter(item => item !== null);
    res.status(200).json({ cartItems: filteredCartItems });
  } catch (error) {
    console.error('Error fetching cart:', error);
    res.status(500).json({ message: 'Error fetching cart' });
  }
});






// Helper function to calculate total amount
const calculateTotalAmount = async (items) => {
  let total = 0;
  for (const item of items) {
    const product = await Product.findOne({ productID: item.productID });
    if (product) {
      total += product.price * item.quantity;
    }
  }
  return total;
};


// Assuming your file is `routes/Cartroutes.js`
Cartrouter.put('/updateQuantity', authMiddleware, async (req, res) => {
  const { productID, quantity } = req.body;
  const userID = req.user.userID;

  try {
    let cart = await Cart.findOne({ userID });
    if (!cart) {
      return res.status(404).json({ message: 'Cart not found' });
    }

    const productIndex = cart.items.findIndex(item => item.productID === productID);
    if (productIndex > -1) {
      cart.items[productIndex].quantity = quantity;
    } else {
      return res.status(404).json({ message: 'Product not found in cart' });
    }

    cart.totalAmount = await calculateTotalAmount(cart.items);
    await cart.save();
    res.status(200).json({ message: 'Quantity updated', cart });
  } catch (error) {
    console.error('Error updating quantity:', error);
    res.status(500).json({ message: 'Error updating quantity' });
  }
});


Cartrouter.put('/updateSubscription', authMiddleware, async (req, res) => {
  const { productID, subscriptionType, deliveryDay } = req.body;
  const userID = req.user.userID; // Make sure this matches how you decode the user ID from the token

  try {
    let cart = await Cart.findOne({ userID });
    if (!cart) {
      return res.status(404).json({ message: 'Cart not found' });
    }

    const productIndex = cart.items.findIndex(item => item.productID.toString() === productID);
    if (productIndex > -1) {
      cart.items[productIndex].subscriptionType = subscriptionType;
      cart.items[productIndex].deliveryDay = deliveryDay;
    } else {
      return res.status(404).json({ message: 'Product not found in cart' });
    }

    await cart.save();
    res.status(200).json({ message: 'Subscription updated', cart });
  } catch (error) {
    console.error('Error updating subscription:', error);
    res.status(500).json({ message: 'Error updating subscription' });
  }
});

Cartrouter.delete('/:productID', authMiddleware, async (req, res) => {
  const { productID } = req.params;
  const userID = req.user.userID;

  try {
    let cart = await Cart.findOne({ userID });
    if (!cart) {
      return res.status(404).json({ message: 'Cart not found' });
    }

    const productIndex = cart.items.findIndex(item => item.productID === productID);  // Compare productID as string
    if (productIndex > -1) {
      cart.items.splice(productIndex, 1); // Remove the product from the cart
      await cart.save();
      return res.status(200).json({ message: 'Product removed from cart', cart });
    } else {
      return res.status(404).json({ message: 'Product not found in cart' });
    }
  } catch (error) {
    console.error('Error removing product from cart:', error);
    return res.status(500).json({ message: 'Error removing product from cart' });
  }
});

// POST route to handle cart cleanup and stock reduction after successful payment
// POST route to handle cart cleanup and stock reduction after successful payment
Cartrouter.post('/after-payment', authMiddleware, async (req, res) => {
  const { orderedItems } = req.body; // List of purchased items with productID and quantity
  const userID = req.user.userID;

  console.log('Processing after-payment for user:', userID);
  console.log('Ordered items:', orderedItems);

  try {
    // Find the cart for the current user
    let cart = await Cart.findOne({ userID });

    if (!cart) {
      console.log('Cart not found for user:', userID);
      return res.status(404).json({ message: 'Cart not found' });
    }

    // Remove purchased items from the cart
    orderedItems.forEach((item) => {
      const productIndex = cart.items.findIndex(
        (cartItem) => cartItem.productID.toString() === item.productID
      );
      if (productIndex > -1) {
        console.log('Removing product from cart:', item.productID);
        cart.items.splice(productIndex, 1); // Remove the item from the cart
      } else {
        console.log(`Product ${item.productID} not found in cart for user ${userID}`);
      }
    });

    // Save the updated cart
    await cart.save();
    console.log('Cart updated after payment:', cart);

    // Update product stock in the database
    for (const item of orderedItems) {
      const product = await Product.findOne({ productID: item.productID });
      if (product) {
        console.log(`Reducing stock for product ${item.productID} by ${item.quantity}`);
        product.stock = Math.max(0, product.stock - item.quantity); // Ensure stock doesn't go below zero
        await product.save();
        console.log(`Updated stock for product ${item.productID}:`, product.stock);
      } else {
        console.log(`Product with ID ${item.productID} not found.`);
      }
    }

    console.log('Cart cleanup and stock reduction completed successfully');
    res.status(200).json({ message: 'Cart and stock updated after payment' });
  } catch (error) {
    console.error('Error updating cart and stock after payment:', error.message);
    res.status(500).json({ message: 'Error updating cart and stock after payment', error: error.message });
  }
});


export default Cartrouter;
