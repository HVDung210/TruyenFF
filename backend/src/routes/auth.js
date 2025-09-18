const express = require('express');
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middlewares/authMiddleware');

const router = express.Router();

// Public routes
router.post('/register', authController.register);
router.post('/login', authController.login);

// Protected routes (require authentication)
router.get('/profile', authenticateToken, authController.getProfile);
router.put('/profile', authenticateToken, authController.updateProfile);

module.exports = router;
