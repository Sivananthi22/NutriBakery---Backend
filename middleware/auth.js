import jwt from 'jsonwebtoken';

// Auth middleware to verify JWT and attach user information to the request object
const authMiddleware = (req, res, next) => {
  // Get the Authorization header from the request
  const authHeader = req.headers.authorization;

  // Check if the Authorization header exists and is in the correct format "Bearer <token>"
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized: Missing or incorrect Authorization header' });
  }

  // Extract the token from the Authorization header
  const token = authHeader.split(' ')[1]; // Token is the second part after "Bearer"

  try {
    // Verify the token using the secret from the environment variables
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Log the decoded payload to confirm userID is present and inspect the decoded token
    console.log('Decoded token:', decoded);

    // Check if the decoded token contains a userID
    if (!decoded.userID) {
      return res.status(401).json({ message: 'Unauthorized: Missing userID in token' });
    }

    // Attach the decoded user data to the request object for use in the next middleware or route handler
    req.user = decoded;

    // Move to the next middleware or route handler
    next();
  } catch (error) {
    // If token verification fails, log the error and respond with an unauthorized status
    console.error('Token verification failed:', error);
    return res.status(401).json({ message: 'Unauthorized: Invalid or expired token', error: error.message });
  }
};

export default authMiddleware;
