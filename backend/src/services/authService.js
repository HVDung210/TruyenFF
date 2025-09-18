const { PrismaClient } = require('../generated/prisma');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

// Find user by email
async function findUserByEmail(email) {
  try {
    return await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });
  } catch (error) {
    console.error('Error finding user by email:', error);
    throw error;
  }
}

// Find user by ID
async function findUserById(userId) {
  try {
    return await prisma.user.findUnique({
      where: { user_id: userId }
    });
  } catch (error) {
    console.error('Error finding user by ID:', error);
    throw error;
  }
}

// Create new user
async function createUser({ username, email, password }) {
  try {
    // Hash password
    const saltRounds = 12;
    const password_hash = await bcrypt.hash(password, saltRounds);

    // Create user in database
    const user = await prisma.user.create({
      data: {
        username,
        email: email.toLowerCase(),
        password_hash,
        auth_provider: 'local',
        role: 'user',
        is_active: true
      }
    });

    return user;
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
}

// Validate user credentials
async function validateUser(email, password) {
  try {
    const user = await findUserByEmail(email);
    
    if (!user) {
      return null;
    }

    // Check if user is active
    if (!user.is_active) {
      return null;
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    
    if (!isValidPassword) {
      return null;
    }

    return user;
  } catch (error) {
    console.error('Error validating user:', error);
    throw error;
  }
}

// Update user last login
async function updateLastLogin(userId) {
  try {
    return await prisma.user.update({
      where: { user_id: userId },
      data: { last_login: new Date() }
    });
  } catch (error) {
    console.error('Error updating last login:', error);
    throw error;
  }
}

// Update user profile
async function updateUser(userId, updateData) {
  try {
    const { username, avatar_url } = updateData;
    const updateFields = {};

    if (username !== undefined) {
      updateFields.username = username;
    }
    if (avatar_url !== undefined) {
      updateFields.avatar_url = avatar_url;
    }

    if (Object.keys(updateFields).length === 0) {
      return await findUserById(userId);
    }

    return await prisma.user.update({
      where: { user_id: userId },
      data: updateFields
    });
  } catch (error) {
    console.error('Error updating user:', error);
    throw error;
  }
}

// Change password
async function changePassword(userId, currentPassword, newPassword) {
  try {
    const user = await findUserById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isValidPassword) {
      throw new Error('Current password is incorrect');
    }

    // Hash new password
    const saltRounds = 12;
    const password_hash = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    return await prisma.user.update({
      where: { user_id: userId },
      data: { password_hash }
    });
  } catch (error) {
    console.error('Error changing password:', error);
    throw error;
  }
}

// Deactivate user account
async function deactivateUser(userId) {
  try {
    return await prisma.user.update({
      where: { user_id: userId },
      data: { is_active: false }
    });
  } catch (error) {
    console.error('Error deactivating user:', error);
    throw error;
  }
}

module.exports = {
  findUserByEmail,
  findUserById,
  createUser,
  validateUser,
  updateLastLogin,
  updateUser,
  changePassword,
  deactivateUser
};
