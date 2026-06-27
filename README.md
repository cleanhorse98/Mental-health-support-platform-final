# Mental Health Support Platform

A comprehensive full-stack web application designed to provide mental health resources, anonymous sharing, and connection with counselors/peer mentors for students, especially engineering students.

## Features

### Core Modules
1. **User Authentication** - Sign up/login for Students & Admins with password management
2. **Resource Hub** - Curated mental health articles, videos, and self-help guides
3. **Anonymous Journaling/Feelings Wall** - Students can write about their mood/experiences anonymously
4. **Peer Support Forum** - Create/join group discussions with community-led moderation
5. **Chat with Counselors** - Private, confidential chat interface with real-time messaging
6. **Mood Tracker Dashboard** - Daily mood logs with visualization and trends
7. **Admin Dashboard** - Manage users, content, and moderate flagged posts

### Enhancements
- Emergency Helpline Integration
- AI-Powered Emotion Detection
- Mindfulness & Meditation Toolkit
- Customizable Self-Care Planner
- Gamification for Positivity
- Offline Access Mode
- Language Localization
- Mood-Based UI Themes
- Event Calendar
- Anonymous Buddy Match

## Tech Stack

- **Frontend**: HTML, CSS, JavaScript (Vanilla)
- **Backend**: Node.js, Express.js
- **Database**: MongoDB with Mongoose ODM
- **Real-time**: Socket.IO
- **Authentication**: JWT, bcryptjs, express-session
- **Security**: Helmet, CORS, Rate limiting
- **Deployment**: Render (recommended)

## Project Structure

```
MentalHealthPlatform(MHP)/
├── models/                 # Database schemas
│   ├── User.js
│   ├── Resource.js
│   ├── Journal.js
│   └── Mood.js
├── routes/                 # API routes
│   ├── auth.js
│   ├── resources.js
│   ├── journal.js
│   ├── forum.js
│   ├── chat.js
│   ├── mood.js
│   └── admin.js
├── public/                 # Frontend files
│   ├── index.html
│   ├── styles.css
│   └── script.js
├── server.js              # Main server file
├── package.json           # Dependencies and scripts
└── README.md             # This file
```

## Installation & Setup

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (local or MongoDB Atlas)
- npm or yarn

### 1. Clone the repository
```bash
git clone <repository-url>
cd MentalHealthPlatform(MHP)
```

### 2. Install dependencies
```bash
npm install
```

### 3. Environment Configuration
Create a `.env` file in the root directory:
```env
# MongoDB Connection
MONGODB_URI=mongodb://localhost:27017/mental-health-platform

# Session Secret
SESSION_SECRET=mental-health-platform-secret-key-change-in-production

# Server Port
PORT=3000

# JWT Secret
JWT_SECRET=your-jwt-secret-key-change-in-production

# Environment
NODE_ENV=development
```

### 4. Database Setup
- For local MongoDB: Ensure MongoDB is running on your system
- For MongoDB Atlas: Replace the MONGODB_URI with your Atlas connection string

### 5. Start the application
```bash
# Development mode (with auto-restart)
npm run dev

# Production mode
npm start
```

The application will be available at `http://localhost:3000`

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update user profile

### Resources
- `GET /api/resources` - Get all published resources
- `GET /api/resources/:id` - Get specific resource
- `POST /api/resources` - Create new resource (admin/counselor)
- `PUT /api/resources/:id` - Update resource
- `DELETE /api/resources/:id` - Delete resource
- `POST /api/resources/:id/like` - Like a resource

### Journal
- `GET /api/journal/public` - Get public journal entries
- `GET /api/journal/my-entries` - Get user's journal entries
- `POST /api/journal` - Create new journal entry
- `POST /api/journal/:id/react` - React to journal entry
- `POST /api/journal/:id/comment` - Comment on journal entry
- `POST /api/journal/:id/flag` - Flag inappropriate content

### Mood Tracking
- `POST /api/mood` - Log new mood entry
- `GET /api/mood/history` - Get mood history
- `GET /api/mood/stats` - Get mood statistics
- `GET /api/mood/today` - Get today's mood

### Admin
- `GET /api/admin/users` - Get all users
- `GET /api/admin/stats` - Get platform statistics
- `GET /api/admin/flagged-entries` - Get flagged content
- `PUT /api/admin/moderate-entry/:id` - Moderate flagged entry

## Usage

### For Students
1. Register/Login to access all features
2. Browse mental health resources in the Resource Hub
3. Share feelings anonymously on the Feelings Wall
4. Track daily moods and view trends
5. Participate in peer support discussions
6. Chat with counselors for private support

### For Admins/Counselors
1. Access admin dashboard for user management
2. Upload and manage mental health resources
3. Moderate flagged content and inappropriate posts
4. View platform analytics and user engagement
5. Provide real-time support through chat

## Security Features

- Password hashing with bcryptjs
- JWT token-based authentication
- Session management with MongoDB store
- CORS protection
- Rate limiting
- Helmet security headers
- Input validation and sanitization

## Deployment

### Render (Recommended)
1. Connect your GitHub repository to Render
2. Set environment variables in Render dashboard
3. Deploy as a Web Service
4. Configure MongoDB Atlas connection

### Other Platforms
The application can be deployed on any Node.js hosting platform:
- Heroku
- Vercel
- DigitalOcean
- AWS

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support and questions:
- Create an issue in the repository
- Contact the development team
- Check the documentation

## Future Enhancements

- Mobile app development
- Advanced AI features
- Integration with external mental health services
- Multi-language support
- Advanced analytics and reporting
- Gamification elements
- Emergency contact integration

---

**Note**: This is a mental health support platform. If you or someone you know is experiencing a mental health crisis, please contact emergency services or a mental health professional immediately. 