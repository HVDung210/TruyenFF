const authService = require('../services/authService');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/env');

// Register new user
async function register(req, res) {
  try {
    const { username, email, password } = req.body;

    // Validate input
    if (!username || !email || !password) {
      return res.status(400).json({ 
        error: 'Vui lòng điền đầy đủ thông tin',
        details: 'Username, email và password là bắt buộc'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({ 
        error: 'Mật khẩu phải có ít nhất 6 ký tự' 
      });
    }

    // Check if user already exists
    const existingUser = await authService.findUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({ 
        error: 'Email đã được sử dụng',
        details: 'Vui lòng sử dụng email khác hoặc đăng nhập'
      });
    }

    // Create new user
    const user = await authService.createUser({ username, email, password });
    
    // Generate JWT token
    const token = jwt.sign(
      { userId: user.user_id, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Return user data (without password)
    const { password_hash, ...userWithoutPassword } = user;
    
    res.status(201).json({
      message: 'Đăng ký thành công',
      user: userWithoutPassword,
      token
    });

  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ 
      error: 'Lỗi server khi đăng ký',
      details: error.message 
    });
  }
}

// Login user
async function login(req, res) {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ 
        error: 'Vui lòng điền email và mật khẩu' 
      });
    }

    // Find user and verify password
    const user = await authService.validateUser(email, password);
    if (!user) {
      return res.status(401).json({ 
        error: 'Email hoặc mật khẩu không đúng' 
      });
    }

    // Update last login
    await authService.updateLastLogin(user.user_id);

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.user_id, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Return user data (without password)
    const { password_hash, ...userWithoutPassword } = user;
    
    res.json({
      message: 'Đăng nhập thành công',
      user: userWithoutPassword,
      token
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      error: 'Lỗi server khi đăng nhập',
      details: error.message 
    });
  }
}

// Get current user profile
async function getProfile(req, res) {
  try {
    const userId = req.user.userId;
    const user = await authService.findUserById(userId);
    
    if (!user) {
      return res.status(404).json({ error: 'Không tìm thấy người dùng' });
    }

    // Return user data (without password)
    const { password_hash, ...userWithoutPassword } = user;
    res.json({ user: userWithoutPassword });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ 
      error: 'Lỗi server khi lấy thông tin người dùng',
      details: error.message 
    });
  }
}

// Update user profile
async function updateProfile(req, res) {
  try {
    const userId = req.user.userId;
    const { username, avatar_url } = req.body;

    const updatedUser = await authService.updateUser(userId, { username, avatar_url });
    
    if (!updatedUser) {
      return res.status(404).json({ error: 'Không tìm thấy người dùng' });
    }

    // Return updated user data (without password)
    const { password_hash, ...userWithoutPassword } = updatedUser;
    res.json({
      message: 'Cập nhật thông tin thành công',
      user: userWithoutPassword
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ 
      error: 'Lỗi server khi cập nhật thông tin',
      details: error.message 
    });
  }
}

module.exports = {
  register,
  login,
  getProfile,
  updateProfile
};
