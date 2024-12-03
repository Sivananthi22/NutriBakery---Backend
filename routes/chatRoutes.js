import express from 'express';
import axios from 'axios';

const chatrouter = express.Router();

// Replace with your OpenAI API key
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
console.log('OpenAI API Key:', process.env.OPENAI_API_KEY);


chatrouter.post('/', async (req, res) => {
    const { query } = req.body;
  
    if (!query) {
      return res.status(400).json({ message: 'Query is required.' });
    }
  
    if (!OPENAI_API_KEY) {
      return res.status(500).json({ message: 'OpenAI API Key is missing.' });
    }
  
    try {
      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: query }],
        },
        {
          headers: {
            Authorization: `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );
  
      const botReply = response.data.choices[0].message.content;
      res.status(200).json({ reply: botReply });
    } catch (error) {
      console.error('Error communicating with OpenAI:', error.response?.data || error.message);
      res.status(500).json({
        message: 'Error communicating with OpenAI.',
        error: error.response?.data || error.message,
      });
    }
  });
  

export default chatrouter;
