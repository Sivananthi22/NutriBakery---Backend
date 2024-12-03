import express from 'express';
import Blog from '../models/blog.js';
import mongoose from 'mongoose';
import multer from 'multer';
import path from 'path';

const BlogRouter = express.Router();

// Set up multer for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, './uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

// Serve uploaded images statically
BlogRouter.use('/uploads', express.static('uploads'));

// Get all blogs
BlogRouter.get('/', async (req, res) => {
  console.log('Request to fetch all blogs received');
  try {
    const blogs = await Blog.find();
    console.log('Fetched blogs:', blogs);
    res.status(200).json(blogs);
  } catch (error) {
    console.error('Error fetching blogs:', error);
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
});

// Get a single blog by ID
BlogRouter.get('/:id', async (req, res) => {
  console.log('Request to fetch blog by ID:', req.params.id);

  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    console.log('Invalid blog ID format:', req.params.id);
    return res.status(400).json({ message: 'Invalid blog ID' });
  }

  try {
    const blog = await Blog.findById(req.params.id);
    if (blog) {
      console.log('Blog found:', blog);
      res.status(200).json(blog);
    } else {
      console.log('Blog not found for ID:', req.params.id);
      res.status(404).json({ message: 'Blog post not found' });
    }
  } catch (error) {
    console.error('Error fetching the blog post:', error);
    res.status(500).json({ message: 'Error fetching the blog post', error: error.message });
  }
});

// Post a new blog with image upload
BlogRouter.post('/', upload.single('image'), async (req, res) => {
  const { title, excerpt, content } = req.body;
  const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

  console.log('Request to post a new blog');
  console.log('Title:', title);
  console.log('Excerpt:', excerpt);
  console.log('Content:', content);
  console.log('Image URL:', imageUrl);

  if (!title || !excerpt || !content) {
    console.log('Validation failed: missing title, excerpt, or content');
    return res.status(400).json({ message: 'Title, excerpt, and content are required' });
  }

  const blog = new Blog({ title, excerpt, content, imageUrl });

  try {
    const newBlog = await blog.save();
    console.log('New blog created successfully:', newBlog);
    res.status(201).json(newBlog);
  } catch (error) {
    console.error('Error posting a new blog:', error);
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
});

export default BlogRouter;
