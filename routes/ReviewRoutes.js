// routes/ReviewRoutes.js
import express from 'express';
import Review from '../models/review.js';

const reviewrouter = express.Router();

// Route to get all reviews
reviewrouter.get('/reviews', async (req, res) => {
  console.log('Received GET request to fetch all reviews');
  try {
    const reviews = await Review.find();
    console.log('Fetched reviews:', reviews);
    res.status(200).json(reviews);
  } catch (error) {
    console.error('Error fetching reviews:', error.message);
    res.status(500).json({ message: 'Error fetching reviews', error: error.message });
  }
});

// Route to post a new review
reviewrouter.post('/reviews', async (req, res) => {
  console.log('Received POST request to create a new review with data:', req.body);
  try {
    const { name, rating, comment } = req.body;
    const newReview = new Review({ name, rating, comment });
    await newReview.save();
    console.log('New review created:', newReview);
    res.status(201).json(newReview);
  } catch (error) {
    console.error('Error creating review:', error.message);
    res.status(500).json({ message: 'Error creating review', error: error.message });
  }
});

export default reviewrouter;
