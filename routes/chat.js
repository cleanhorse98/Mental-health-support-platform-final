const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/chat';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|txt|mp3|wav|mp4|mov/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

// Middleware to check authentication
const authenticateToken = (req, res, next) => {
  const token = req.session.token || req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  const jwt = require('jsonwebtoken');
  jwt.verify(token, process.env.JWT_SECRET || 'mental-health-secret', (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// AI Response Generator
function generateAIResponse(userMessage, userContext = {}) {
  const responses = {
    greeting: [
      "Hello! I'm here to listen and support you. How are you feeling today?",
      "Welcome! I'm glad you reached out. What's on your mind?",
      "Hi there! I'm here to help. What would you like to talk about?"
    ],
    stress: [
      "I understand that stress can be overwhelming. Let's talk about what's causing it and explore some coping strategies.",
      "Stress is a natural response, but it's important to manage it. What specific situations are you finding stressful?",
      "You're not alone in feeling stressed. Let's work together to find healthy ways to cope."
    ],
    anxiety: [
      "Anxiety can feel very intense. Let's take some deep breaths together and talk about what's making you anxious.",
      "I hear you're feeling anxious. Can you tell me more about what's triggering these feelings?",
      "Anxiety is treatable and manageable. Let's explore some techniques that might help you."
    ],
    depression: [
      "I'm sorry you're going through this. Depression can be incredibly difficult, but you're taking an important step by reaching out.",
      "Your feelings are valid. Let's talk about what you're experiencing and explore ways to support your mental health.",
      "Depression can make everything feel overwhelming. Let's break this down and find small steps forward."
    ],
    academic: [
      "Academic pressure can be intense. Let's talk about your specific challenges and find ways to manage the workload.",
      "School stress is very real. What aspects of your academic life are most challenging right now?",
      "It's okay to feel overwhelmed by academic demands. Let's explore some time management and stress reduction techniques."
    ],
    relationship: [
      "Relationships can be complex and challenging. Let's talk about what you're experiencing.",
      "Interpersonal issues can really impact our mental health. What's happening in your relationships?",
      "Relationship difficulties are common and can be very stressful. Let's explore this together."
    ],
    default: [
      "Thank you for sharing that with me. I'm here to listen and support you.",
      "I appreciate you opening up. Let's explore this further together.",
      "That sounds challenging. I'm here to help you work through this."
    ]
  };

  const message = userMessage.toLowerCase();
  let category = 'default';

  if (message.includes('hello') || message.includes('hi') || message.includes('hey')) {
    category = 'greeting';
  } else if (message.includes('stress') || message.includes('stressed') || message.includes('pressure')) {
    category = 'stress';
  } else if (message.includes('anxiety') || message.includes('anxious') || message.includes('worry')) {
    category = 'anxiety';
  } else if (message.includes('depression') || message.includes('sad') || message.includes('hopeless')) {
    category = 'depression';
  } else if (message.includes('exam') || message.includes('study') || message.includes('assignment') || message.includes('school')) {
    category = 'academic';
  } else if (message.includes('friend') || message.includes('relationship') || message.includes('family')) {
    category = 'relationship';
  }

  const categoryResponses = responses[category];
  const randomIndex = Math.floor(Math.random() * categoryResponses.length);
  
  return {
    message: categoryResponses[randomIndex],
    category: category,
    timestamp: new Date(),
    isAI: true
  };
}

// Get chat history
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const { roomId = 'general', limit = 50, offset = 0 } = req.query;
    
    // Simulated chat history with enhanced features
    const messages = [
      {
        id: 1,
        sender: 'counselor',
        senderName: 'Dr. Sarah Johnson',
        senderAvatar: '👩‍⚕️',
        message: 'Hello! How are you feeling today?',
        timestamp: new Date(Date.now() - 3600000),
        type: 'text',
        isAI: false,
        reactions: [],
        isRead: true
      },
      {
        id: 2,
        sender: 'user',
        senderName: req.user.username || 'You',
        senderAvatar: '👤',
        message: 'I\'m feeling a bit stressed about my upcoming exams.',
        timestamp: new Date(Date.now() - 1800000),
        type: 'text',
        isAI: false,
        reactions: [{ type: '❤️', count: 1 }],
        isRead: true
      },
      {
        id: 3,
        sender: 'counselor',
        senderName: 'Dr. Sarah Johnson',
        senderAvatar: '👩‍⚕️',
        message: 'That\'s completely normal. Let\'s talk about some stress management techniques. What specific aspects of your exams are causing the most anxiety?',
        timestamp: new Date(),
        type: 'text',
        isAI: true,
        reactions: [],
        isRead: false
      }
    ];
    
    res.json({ 
      messages: messages.slice(offset, offset + limit),
      total: messages.length,
      hasMore: offset + limit < messages.length
    });
  } catch (error) {
    console.error('Get chat history error:', error);
    res.status(500).json({ error: 'Failed to fetch chat history' });
  }
});

// Send message
router.post('/send', authenticateToken, async (req, res) => {
  try {
    const { message, roomId = 'general', type = 'text', replyTo = null } = req.body;
    
    if (!message && type === 'text') {
      return res.status(400).json({ error: 'Message content is required' });
    }
    
    const newMessage = {
      id: Date.now(),
      sender: 'user',
      senderName: req.user.username || 'You',
      senderAvatar: '👤',
      message,
      timestamp: new Date(),
      type,
      isAI: false,
      reactions: [],
      isRead: false,
      replyTo
    };
    
    // Generate AI response
    const aiResponse = generateAIResponse(message, { userId: req.user.id, username: req.user.username });
    const counselorMessage = {
      id: Date.now() + 1,
      sender: 'counselor',
      senderName: 'Dr. Sarah Johnson',
      senderAvatar: '👩‍⚕️',
      message: aiResponse.message,
      timestamp: new Date(Date.now() + 1000),
      type: 'text',
      isAI: true,
      reactions: [],
      isRead: false
    };
    
    res.json({
      message: 'Message sent successfully',
      userMessage: newMessage,
      aiResponse: counselorMessage
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Upload file
router.post('/upload', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const fileInfo = {
      id: Date.now(),
      originalName: req.file.originalname,
      filename: req.file.filename,
      path: req.file.path,
      size: req.file.size,
      mimetype: req.file.mimetype,
      type: req.file.mimetype.startsWith('image/') ? 'image' : 
            req.file.mimetype.startsWith('audio/') ? 'audio' : 
            req.file.mimetype.startsWith('video/') ? 'video' : 'document'
    };
    
    res.json({
      message: 'File uploaded successfully',
      file: fileInfo
    });
  } catch (error) {
    console.error('File upload error:', error);
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

// Get available counselors
router.get('/counselors', authenticateToken, async (req, res) => {
  try {
    const counselors = [
      {
        id: 1,
        name: 'Dr. Sarah Johnson',
        avatar: '👩‍⚕️',
        specialty: 'Anxiety & Stress Management',
        status: 'online',
        rating: 4.9,
        experience: '8 years',
        languages: ['English', 'Spanish']
      },
      {
        id: 2,
        name: 'Dr. Michael Chen',
        avatar: '👨‍⚕️',
        specialty: 'Depression & Mood Disorders',
        status: 'online',
        rating: 4.8,
        experience: '12 years',
        languages: ['English', 'Mandarin']
      },
      {
        id: 3,
        name: 'Dr. Emily Rodriguez',
        avatar: '👩‍⚕️',
        specialty: 'Academic Stress & Career Counseling',
        status: 'away',
        rating: 4.7,
        experience: '6 years',
        languages: ['English', 'Portuguese']
      }
    ];
    
    res.json({ counselors });
  } catch (error) {
    console.error('Get counselors error:', error);
    res.status(500).json({ error: 'Failed to fetch counselors' });
  }
});

// Get chat rooms
router.get('/rooms', authenticateToken, async (req, res) => {
  try {
    const rooms = [
      {
        id: 'general',
        name: 'General Support',
        description: 'General mental health support and discussions',
        participants: 15,
        lastMessage: 'How are you feeling today?',
        lastMessageTime: new Date(Date.now() - 300000),
        unreadCount: 0
      },
      {
        id: 'anxiety-support',
        name: 'Anxiety Support Group',
        description: 'Support group for anxiety and stress management',
        participants: 8,
        lastMessage: 'Remember to practice deep breathing',
        lastMessageTime: new Date(Date.now() - 600000),
        unreadCount: 2
      },
      {
        id: 'academic-stress',
        name: 'Academic Stress Support',
        description: 'Support for students dealing with academic pressure',
        participants: 12,
        lastMessage: 'Exam season can be tough',
        lastMessageTime: new Date(Date.now() - 900000),
        unreadCount: 1
      }
    ];
    
    res.json({ rooms });
  } catch (error) {
    console.error('Get rooms error:', error);
    res.status(500).json({ error: 'Failed to fetch rooms' });
  }
});

// Mark messages as read
router.post('/read', authenticateToken, async (req, res) => {
  try {
    const { messageIds, roomId } = req.body;
    
    // In a real implementation, you would update the database
    // For now, we'll just return success
    
    res.json({ message: 'Messages marked as read' });
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({ error: 'Failed to mark messages as read' });
  }
});

// Add reaction to message
router.post('/reaction', authenticateToken, async (req, res) => {
  try {
    const { messageId, reaction } = req.body;
    
    // In a real implementation, you would update the database
    // For now, we'll just return success
    
    res.json({ message: 'Reaction added successfully' });
  } catch (error) {
    console.error('Add reaction error:', error);
    res.status(500).json({ error: 'Failed to add reaction' });
  }
});

// Search messages
router.get('/search', authenticateToken, async (req, res) => {
  try {
    const { query, roomId, limit = 20 } = req.query;
    
    if (!query) {
      return res.status(400).json({ error: 'Search query is required' });
    }
    
    // Simulated search results
    const searchResults = [
      {
        id: 1,
        sender: 'user',
        message: 'I was feeling stressed about exams',
        timestamp: new Date(Date.now() - 86400000),
        roomId: roomId || 'general'
      }
    ];
    
    res.json({ results: searchResults });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Failed to search messages' });
  }
});

module.exports = router; 