const express = require('express');
const router = express.Router();
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

// In-memory forum topics for runtime persistence (simple, non-DB)
let forumTopics = [
  {
    id: Date.now() - 200000,
    title: 'Coping with Exam Stress',
    description: "I've been feeling really overwhelmed with finals coming up. Anyone have tips?",
    author: 'Anonymous',
    category: 'academic',
    replies: 5,
    views: 23,
    createdAt: new Date(Date.now() - 86400000),
    tags: ['stress', 'exams', 'academic']
  },
  {
    id: Date.now() - 100000,
    title: 'Finding Balance',
    description: 'How do you all balance school, work, and self-care?',
    author: 'Anonymous',
    category: 'self-care',
    replies: 8,
    views: 45,
    createdAt: new Date(Date.now() - 172800000),
    tags: ['balance', 'self-care']
  }
];

// Get all forum posts (kept for compatibility)
router.get('/posts', authenticateToken, async (req, res) => {
  try {
    const { limit = 20, offset = 0, category } = req.query;
    let filtered = forumTopics;
    if (category) filtered = filtered.filter(p => p.category === category);
    res.json({ posts: filtered.slice(parseInt(offset), parseInt(offset) + parseInt(limit)), total: filtered.length, hasMore: parseInt(offset) + parseInt(limit) < filtered.length });
  } catch (error) {
    console.error('Get forum posts error:', error);
    res.status(500).json({ error: 'Failed to fetch forum posts' });
  }
});

// Create new forum post (and topic)
router.post('/posts', authenticateToken, async (req, res) => {
  try {
    const { title, content, category, tags } = req.body;

    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }

    const newPost = {
      id: Date.now(),
      title,
      description: content,
      author: req.user?.userId ? 'Member' : 'Anonymous',
      category: category || 'general',
      replies: 0,
      views: 0,
      createdAt: new Date(),
      tags: tags || []
    };

    // Save in-memory for runtime
    forumTopics.unshift(newPost);

    res.status(201).json({ message: 'Post created successfully', post: newPost });
  } catch (error) {
    console.error('Create forum post error:', error);
    res.status(500).json({ error: 'Failed to create forum post' });
  }
});

// Topics endpoints used by client
router.get('/topics', authenticateToken, async (req, res) => {
  try {
    res.json(forumTopics);
  } catch (error) {
    console.error('Get topics error:', error);
    res.status(500).json({ error: 'Failed to fetch topics' });
  }
});

router.post('/topics', authenticateToken, async (req, res) => {
  try {
    const { title, description, tags } = req.body;
    if (!title || !description) return res.status(400).json({ error: 'Title and description required' });
    const newTopic = { id: Date.now(), title, description, author: 'Member', category: 'general', replies: 0, views: 0, createdAt: new Date(), tags: tags || [] };
    forumTopics.unshift(newTopic);
    res.status(201).json({ message: 'Topic created', topic: newTopic });
  } catch (error) {
    console.error('Create topic error:', error);
    res.status(500).json({ error: 'Failed to create topic' });
  }
});

// Get forum categories
router.get('/categories', authenticateToken, async (req, res) => {
  try {
    const categories = [
      { id: 'academic', name: 'Academic Stress', count: 15 },
      { id: 'relationships', name: 'Relationships', count: 8 },
      { id: 'self-care', name: 'Self-Care', count: 12 },
      { id: 'anxiety', name: 'Anxiety Support', count: 20 },
      { id: 'depression', name: 'Depression Support', count: 10 },
      { id: 'general', name: 'General Discussion', count: 25 }
    ];

    res.json({ categories });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

module.exports = router;

