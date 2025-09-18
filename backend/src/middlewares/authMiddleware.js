const jwt = require('jsonwebtoken');
const authService = require('../services/authService');
const { JWT_SECRET } = require('../config/env');

// JWT Authentication Middleware
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ 
        error: 'Access token is required',
        details: 'Please provide a valid authentication token'
      });
    }

    // Verify JWT token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Check if user still exists and is active
    const user = await authService.findUserById(decoded.userId);
    if (!user || !user.is_active) {
      return res.status(401).json({ 
        error: 'Invalid token',
        details: 'User not found or account is deactivated'
      });
    }

    // Add user info to request object
    req.user = {
      userId: decoded.userId,
      email: decoded.email
    };

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        error: 'Invalid token',
        details: 'Token is malformed or invalid'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Token expired',
        details: 'Please login again'
      });
    }

    return res.status(500).json({ 
      error: 'Authentication error',
      details: 'Internal server error during authentication'
    });
  }
};

// Optional authentication middleware (doesn't fail if no token)
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      req.user = null;
      return next();
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await authService.findUserById(decoded.userId);
    
    if (user && user.is_active) {
      req.user = {
        userId: decoded.userId,
        email: decoded.email
      };
    } else {
      req.user = null;
    }

    next();
  } catch (error) {
    // If token is invalid, just continue without user
    req.user = null;
    next();
  }
};

module.exports = {
  authenticateToken,
  optionalAuth
};
