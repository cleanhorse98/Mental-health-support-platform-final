const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const router = express.Router();

// Middleware to check if user is authenticated
const authenticateToken = (req, res, next) => {
  const token = req.session.token || req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'mental-health-secret', (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Register new user
router.post('/register', async (req, res) => {
  try {
    const {
      username,
      email,
      password,
      firstName,
      lastName,
      studentId,
      department,
      year,
      role = 'student'
    } = req.body;

    // Normalize numeric year values (some clients send 1..5) to the schema enum strings
    let normalizedYear = year;
    try {
      const yearStr = String(year);
      const yearMap = { '1': '1st', '2': '2nd', '3': '3rd', '4': '4th', '5': 'Graduate' };
      if (yearMap[yearStr]) {
        normalizedYear = yearMap[yearStr];
      }
    } catch (e) {
      // keep original value if any unexpected error
      normalizedYear = year;
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { username }, { studentId }]
    });

    if (existingUser) {
      return res.status(400).json({
        error: 'User with this email, username, or student ID already exists'
      });
    }

    // Create new user
    const user = new User({
      username,
      email,
      password,
      firstName,
      lastName,
      studentId,
      department,
      year: normalizedYear,
      role
    });

    console.log('Creating new user:', { username, email, firstName, lastName, studentId });
    await user.save();
    console.log('User saved successfully:', { userId: user._id, username: user.username, email: user.email });

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET || 'mental-health-secret',
      { expiresIn: '24h' }
    );

    // Store token in session
    req.session.token = token;
    req.session.userId = user._id;

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        studentId: user.studentId,
        department: user.department,
        year: user.year
      },
      token
    });
  } catch (error) {
    console.error('Registration error:', error);
    // Return more detailed error messages
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({ error: `${field} already exists` });
    }
    res.status(500).json({ error: error.message || 'Registration failed' });
  }
});

// Login user
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log('Login attempt for email:', email);

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      console.log('User not found for email:', email);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    console.log('User found:', { username: user.username, email: user.email, isActive: user.isActive });

    // Check if user is active
    if (!user.isActive) {
      console.log('User account is deactivated:', email);
      return res.status(401).json({ error: 'Account is deactivated' });
    }

    // Verify password
    console.log('Comparing password for user:', email);
    const isValidPassword = await user.comparePassword(password);
    console.log('Password comparison result:', isValidPassword);
    
    if (!isValidPassword) {
      console.log('Invalid password for user:', email);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET || 'mental-health-secret',
      { expiresIn: '24h' }
    );

    // Store token in session
    req.session.token = token;
    req.session.userId = user._id;

    console.log('Login successful for user:', email);
    res.json({
      message: 'Login successful',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        studentId: user.studentId,
        department: user.department,
        year: user.year,
        preferences: user.preferences
      },
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Logout user
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed' });
    }
    res.json({ message: 'Logout successful' });
  });
});

// Get current user profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ user });
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Update user profile
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      department,
      year,
      emergencyContact,
      preferences
    } = req.body;

    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update fields
    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (department) user.department = department;
    if (year) user.year = year;
    if (emergencyContact) user.emergencyContact = emergencyContact;
    if (preferences) user.preferences = { ...user.preferences, ...preferences };

    await user.save();

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        studentId: user.studentId,
        department: user.department,
        year: user.year,
        emergencyContact: user.emergencyContact,
        preferences: user.preferences
      }
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Change password
router.put('/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify current password
    const isValidPassword = await user.comparePassword(currentPassword);
    if (!isValidPassword) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Password change error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// Check authentication status
router.get('/check-auth', (req, res) => {
  const token = req.session.token || req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ authenticated: false });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'mental-health-secret', (err, user) => {
    if (err) {
      return res.status(401).json({ authenticated: false });
    }
    res.json({ authenticated: true, user });
  });
});

// Debug endpoint - list all users (remove in production)
router.get('/debug/users', async (req, res) => {
  try {
    const users = await User.find({}).select('email username firstName lastName createdAt');
    res.json({ count: users.length, users });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Debug endpoint - clear all users (remove in production)
router.post('/debug/clear', async (req, res) => {
  try {
    await User.deleteMany({});
    res.json({ message: 'All users cleared' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Test password hashing endpoint
router.post('/debug/test-password', async (req, res) => {
  try {
    const { password } = req.body;
    const testUser = new User({
      username: 'test-temp-user-' + Date.now(),
      email: 'test-temp-' + Date.now() + '@example.com',
      password,
      firstName: 'Test',
      lastName: 'User'
    });
    
    await testUser.save();
    
    // Retrieve and test comparison
    const savedUser = await User.findById(testUser._id);
    const isMatch = await savedUser.comparePassword(password);
    
    // Clean up
    await User.deleteOne({ _id: testUser._id });
    
    res.json({
      success: true,
      passwordMatches: isMatch,
      storedHash: savedUser.password.substring(0, 20) + '...'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router; 