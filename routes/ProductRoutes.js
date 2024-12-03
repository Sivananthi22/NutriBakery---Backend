import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import Product from '../models/Product.js'; // Ensure this is the correct path
import { generateUniqueID } from '../utils/idHelper.js'; // Import the helper

const productRouter = express.Router();

// Ensure the uploads directory exists
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
  console.log('Created "uploads" directory');
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // Ensure this folder exists at the root level
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); // Avoid file name collisions
  },
});

// File type validation for images
const fileFilter = (req, file, cb) => {
  const filetypes = /jpeg|jpg|png/;
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = filetypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    console.log('Invalid file type:', file.mimetype);
    cb(new Error('Only images are allowed!')); // File not valid
  }
};

const upload = multer({
  storage,
  fileFilter,
});

// POST route for uploading a product
productRouter.post('/', upload.single('image'), async (req, res) => {
  console.log('Received POST request to create a new product with data:', req.body);
  try {
    const { name, price, stock, description, category } = req.body;
    const imageUrl = req.file ? `http://localhost:5000/uploads/${req.file.filename}` : null;

    const status = stock > 0 ? 'Active' : 'Out of Stock';

    if (!name || !price || !stock || !description || !category || !imageUrl) {
      console.log('Missing required fields or image');
      return res.status(400).json({ message: 'All fields are required, including an image' });
    }

    // Generate a unique product ID before creating the product
    const productID = await generateUniqueID('NBP'); // Generate unique product ID
    console.log('Generated Product ID:', productID); // Log the generated productID

    const newProduct = new Product({
      productID, // Use generated product ID
      name,
      price,
      stock,
      status,
      description,
      category,
      imageUrl,
    });

    await newProduct.save();
    console.log('Product uploaded successfully:', newProduct);
    res.status(201).json({ message: 'Product uploaded successfully!', product: newProduct });
  } catch (error) {
    console.error('Error uploading product:', error.message);
    res.status(500).json({ message: 'Error uploading product', error: error.message });
  }
});

// PUT route for updating a product with image upload and all fields dynamically changeable
productRouter.put('/:id', upload.single('image'), async (req, res) => {
  console.log('Received PUT request to update product with ID:', req.params.id);
  try {
    const product = await Product.findOne({ productID: req.params.id }); // Changed from findById to findOne using productID
    if (!product) {
      console.log('Product not found');
      return res.status(404).json({ message: 'Product not found' });
    }

    const { name, price, stock, description, category } = req.body;

    // Update fields dynamically
    if (name) product.name = name;
    if (price) product.price = price;
    if (stock) product.stock = stock;
    if (description) product.description = description;
    if (category) product.category = category;

    // Update image if a new image file is uploaded
    if (req.file) {
      product.imageUrl = `http://localhost:5000/uploads/${req.file.filename}`;
      console.log('Image updated:', product.imageUrl);
    }

    // Update status based on stock value
    product.status = stock > 0 ? 'Active' : 'Out of Stock';
    console.log('Product status updated:', product.status);

    // Save the updated product to the database
    const updatedProduct = await product.save();
    console.log('Product updated successfully:', updatedProduct);
    res.json({
      message: 'Product updated successfully!',
      product: updatedProduct,
    });
  } catch (error) {
    console.error('Error updating product:', error.message);
    res.status(400).json({ message: 'Error updating product', error: error.message });
  }
});

// GET route to fetch products by category with case-insensitive matching
productRouter.get('/category/:category', async (req, res) => {
  console.log('Received GET request to fetch products by category:', req.params.category);

  try {
    const category = req.params.category.trim();
    console.log('Trimmed and normalized category:', category);

    // Use case-insensitive search with exact match
    const products = await Product.find({ category: { $regex: `^${category}$`, $options: 'i' } });
    console.log('Products fetched from the database:', products);

    if (products.length === 0) {
      console.log('No products found for category:', category);
    }

    res.json(products);
  } catch (error) {
    console.error('Error fetching products by category:', error.message);
    res.status(500).json({ message: 'Error fetching products by category', error: error.message });
  }
});

// GET route to fetch specialties
productRouter.get('/specialties', async (req, res) => {
  console.log('Received GET request to fetch specialties');
  try {
    const specialties = await Product.find({ isSpecialty: true });
    if (!specialties.length) {
      console.log('No specialties found');
      return res.status(404).json({ message: 'No specialties found' });
    }
    console.log('Fetched specialties:', specialties);
    res.json(specialties);
  } catch (error) {
    console.error('Error fetching specialties:', error.message);
    res.status(500).json({ message: 'Error fetching specialties', error: error.message });
  }
});

// GET route to fetch all products
productRouter.get('/', async (req, res) => {
  console.log('Received GET request to fetch all products');
  try {
    const products = await Product.find();
    console.log('Fetched products:', products);
    res.json(products);
  } catch (error) {
    console.error('Error fetching products:', error.message);
    res.status(500).json({ message: 'Error fetching products', error: error.message });
  }
});

// GET route to fetch a single product by productID
productRouter.get('/:id', async (req, res) => {
  console.log('Received GET request to fetch product by productID:', req.params.id);
  try {
    const product = await Product.findOne({ productID: req.params.id });
    if (!product) {
      console.log('Product not found');
      return res.status(404).json({ message: 'Product not found' });
    }
    console.log('Fetched product:', product);
    res.json(product);
  } catch (error) {
    console.error('Error fetching product:', error.message);
    res.status(500).json({ message: 'Error fetching product', error: error.message });
  }
});

// DELETE route to delete a product by productID
productRouter.delete('/:id', async (req, res) => {
  console.log('Received DELETE request to delete product by productID:', req.params.id);
  try {
    const product = await Product.findOneAndDelete({ productID: req.params.id });
    if (!product) {
      console.log('Product not found');
      return res.status(404).json({ message: 'Product not found' });
    }
    console.log('Product deleted successfully');
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Error deleting product:', error.message);
    res.status(500).json({ message: 'Error deleting product', error: error.message });
  }
});


// PUT route to toggle specialty status
productRouter.put('/:id/specialty', async (req, res) => {
  console.log('Received PUT request to toggle specialty for product ID:', req.params.id);
  try {
    const product = await Product.findById(req.params.id); // Corrected: findById
    if (!product) {
      console.log('Product not found');
      return res.status(404).json({ message: 'Product not found' });
    }

    // Toggle the isSpecialty field
    product.isSpecialty = !product.isSpecialty;
    const updatedProduct = await product.save();

    console.log('Product specialty status toggled:', updatedProduct);
    res.json({ message: 'Product updated successfully', product: updatedProduct });
  } catch (error) {
    console.error('Error toggling specialty:', error.message);
    res.status(500).json({ message: 'Error toggling specialty', error: error.message });
  }
});

// PUT route to update product stock
productRouter.put('/:id/update-stock', async (req, res) => {
  console.log('Received request to update stock for product ID:', req.params.id);

  try {
    const product = await Product.findById(req.params.id); // Corrected: findById
    if (!product) {
      console.log('Product not found');
      return res.status(404).json({ message: 'Product not found' });
    }

    const { stock } = req.body;

    if (stock === undefined || stock === null) {
      console.log('Stock value is required');
      return res.status(400).json({ message: 'Stock value is required' });
    }

    product.stock = stock;
    product.status = stock > 0 ? 'Active' : 'Out of Stock';
    const updatedProduct = await product.save();

    console.log('Product stock updated:', updatedProduct);
    res.json({ message: 'Product stock updated successfully', product: updatedProduct });
  } catch (error) {
    console.error('Error updating stock:', error.message);
    res.status(500).json({ message: 'Error updating stock', error: error.message });
  }
});


export default productRouter;
