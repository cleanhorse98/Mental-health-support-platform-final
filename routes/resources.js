const express = require('express');
const router = express.Router();
const Resource = require('../models/Resource');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

// Middleware to check authentication
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

// Middleware to check if user is admin or counselor
const authenticateAdminOrCounselor = (req, res, next) => {
  const token = req.session.token || req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'mental-health-secret', (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    if (user.role !== 'admin' && user.role !== 'counselor') {
      return res.status(403).json({ error: 'Admin or counselor access required' });
    }
    req.user = user;
    next();
  });
};

// Get all published resources
router.get('/', async (req, res) => {
  try {
    const { limit = 20, offset = 0, category, type, search } = req.query;
    
    const query = { isPublished: true };
    
    if (category) query.category = category;
    if (type) query.type = type;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    const resources = await Resource.find(query)
      .populate('author', 'username firstName lastName')
      .sort({ featured: -1, createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(offset));

    const total = await Resource.countDocuments(query);

    // If there are no published resources in the DB, return a curated seed list
    if ((!resources || resources.length === 0) && total === 0) {
      const seededResources = [
        {
          _id: mongoose.Types.ObjectId(),
          title: 'Mindfulness for Beginners',
          description: 'A short guide to get started with mindfulness and simple breathing exercises.',
          content: 'Learn basic mindfulness techniques including grounding, 4-4-4 breathing, and a 5-minute body scan to reduce stress and anxiety.',
          type: 'guide',
          category: 'mindfulness',
          url: 'https://www.mindful.org/mindfulness-how-to-do-it/',
          thumbnail: '/assets/mindfulness.jpg',
          author: { username: 'Platform', firstName: 'Platform', lastName: 'Team' },
          isPublished: true,
          likes: [],
          views: 0,
          tags: ['mindfulness', 'breathing', 'stress'],
          featured: true,
          createdAt: new Date()
        },
        {
          _id: mongoose.Types.ObjectId(),
          title: 'Managing Exam Stress',
          description: 'Practical tips and study strategies to manage stress during exams.',
          content: 'This article covers time management, realistic planning, and relaxation techniques to improve focus and reduce exam-related anxiety.',
          type: 'article',
          category: 'academic',
          url: 'https://www.apa.org/topics/stress/academic',
          thumbnail: '/assets/exam-stress.jpg',
          author: { username: 'Platform', firstName: 'Platform', lastName: 'Team' },
          isPublished: true,
          likes: [],
          views: 0,
          tags: ['exams', 'study', 'stress-management'],
          featured: false,
          createdAt: new Date()
        },
        {
          _id: mongoose.Types.ObjectId(),
          title: 'Anxiety Relief Audio',
          description: 'A 10-minute guided audio to help calm racing thoughts and promote relaxation.',
          content: 'Downloadable audio with guided breathing and visualization to support acute anxiety episodes.',
          type: 'podcast',
          category: 'anxiety',
          url: 'https://example.com/anxiety-relief-audio.mp3',
          thumbnail: '/assets/anxiety-audio.jpg',
          author: { username: 'Platform', firstName: 'Platform', lastName: 'Team' },
          isPublished: true,
          likes: [],
          views: 0,
          tags: ['anxiety', 'audio', 'guided'],
          featured: false,
          createdAt: new Date()
        }
      ];

      return res.json({ resources: seededResources, total: seededResources.length, hasMore: false });
    }

    res.json({
      resources,
      total,
      hasMore: parseInt(offset) + parseInt(limit) < total
    });
  } catch (error) {
    console.error('Get resources error:', error);
    res.status(500).json({ error: 'Failed to fetch resources' });
  }
});

// Get specific resource
router.get('/:id', async (req, res) => {
  try {
    const resource = await Resource.findById(req.params.id)
      .populate('author', 'username firstName lastName');

    if (!resource) {
      return res.status(404).json({ error: 'Resource not found' });
    }

    // Increment views
    resource.views += 1;
    await resource.save();

    res.json({ resource });
  } catch (error) {
    console.error('Get resource error:', error);
    res.status(500).json({ error: 'Failed to fetch resource' });
  }
});

// Create new resource (admin/counselor only)
router.post('/', authenticateAdminOrCounselor, async (req, res) => {
  try {
    const {
      title,
      description,
      content,
      type,
      category,
      url,
      thumbnail,
      tags,
      isPublished,
      featured
    } = req.body;

    if (!title || !description || !content || !type || !category) {
      return res.status(400).json({
        error: 'Title, description, content, type, and category are required'
      });
    }

    const resource = new Resource({
      title,
      description,
      content,
      type,
      category,
      url,
      thumbnail,
      tags: tags || [],
      author: req.user.userId,
      isPublished: isPublished !== undefined ? isPublished : false,
      featured: featured || false
    });

    await resource.save();

    res.status(201).json({
      message: 'Resource created successfully',
      resource
    });
  } catch (error) {
    console.error('Create resource error:', error);
    res.status(500).json({ error: 'Failed to create resource' });
  }
});

// Update resource (admin/counselor only)
router.put('/:id', authenticateAdminOrCounselor, async (req, res) => {
  try {
    const resource = await Resource.findById(req.params.id);
    
    if (!resource) {
      return res.status(404).json({ error: 'Resource not found' });
    }

    // Check if user is the author or admin
    if (resource.author.toString() !== req.user.userId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'You can only edit your own resources' });
    }

    const {
      title,
      description,
      content,
      type,
      category,
      url,
      thumbnail,
      tags,
      isPublished,
      featured
    } = req.body;

    if (title) resource.title = title;
    if (description) resource.description = description;
    if (content) resource.content = content;
    if (type) resource.type = type;
    if (category) resource.category = category;
    if (url !== undefined) resource.url = url;
    if (thumbnail !== undefined) resource.thumbnail = thumbnail;
    if (tags) resource.tags = tags;
    if (isPublished !== undefined) resource.isPublished = isPublished;
    if (featured !== undefined) resource.featured = featured;

    await resource.save();

    res.json({
      message: 'Resource updated successfully',
      resource
    });
  } catch (error) {
    console.error('Update resource error:', error);
    res.status(500).json({ error: 'Failed to update resource' });
  }
});

// Delete resource (admin/counselor only)
router.delete('/:id', authenticateAdminOrCounselor, async (req, res) => {
  try {
    const resource = await Resource.findById(req.params.id);
    
    if (!resource) {
      return res.status(404).json({ error: 'Resource not found' });
    }

    // Check if user is the author or admin
    if (resource.author.toString() !== req.user.userId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'You can only delete your own resources' });
    }

    await Resource.findByIdAndDelete(req.params.id);

    res.json({ message: 'Resource deleted successfully' });
  } catch (error) {
    console.error('Delete resource error:', error);
    res.status(500).json({ error: 'Failed to delete resource' });
  }
});

// Like a resource
router.post('/:id/like', authenticateToken, async (req, res) => {
  try {
    const resource = await Resource.findById(req.params.id);
    
    if (!resource) {
      return res.status(404).json({ error: 'Resource not found' });
    }

    // Check if user already liked
    const existingLike = resource.likes.find(
      like => like.userId.toString() === req.user.userId.toString()
    );

    if (existingLike) {
      // Unlike
      resource.likes = resource.likes.filter(
        like => like.userId.toString() !== req.user.userId.toString()
      );
      await resource.save();
      return res.json({ message: 'Resource unliked', liked: false, likes: resource.likes.length });
    } else {
      // Like
      resource.likes.push({
        userId: req.user.userId,
        createdAt: new Date()
      });
      await resource.save();
      return res.json({ message: 'Resource liked', liked: true, likes: resource.likes.length });
    }
  } catch (error) {
    console.error('Like resource error:', error);
    res.status(500).json({ error: 'Failed to like resource' });
  }
});

module.exports = router;

