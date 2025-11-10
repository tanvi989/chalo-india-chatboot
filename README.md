# Chalo India Flight Booking Chatbot

An intelligent AI-powered chatbot for Chalo India flight booking service, featuring RAG (Retrieval-Augmented Generation), flight booking system, special deals management, and comprehensive admin panel.

## 🚀 Features

- 🤖 **AI-Powered Chatbot** - Uses Google Gemini API for intelligent conversations
- 🔍 **RAG (Retrieval-Augmented Generation)** - LangChain integration for document-based Q&A
- 📄 **PDF Knowledge Base** - Answers questions from privacy, booking, cancellation, terms, and company documents
- ✈️ **Flight Booking System** - Complete multi-step booking flow for India-Australia routes
- 💰 **Special Deals System** - Search, view, and book exclusive flight deals with automatic stock management
- 📊 **Admin Dashboard** - Full CRUD operations for managing bookings and deals
- 📚 **Documentation** - Comprehensive user and developer guides
- 🎨 **Modern UI** - Beautiful, responsive chat interface with smooth animations

## 📋 Table of Contents

- [Quick Start](#quick-start)
- [Project Structure](#project-structure)
- [Features Overview](#features-overview)
- [API Endpoints](#api-endpoints)
- [Documentation](#documentation)
- [Technologies Used](#technologies-used)
- [Configuration](#configuration)
- [Deployment](#deployment)

## 🏃 Quick Start

### Prerequisites

- Node.js (v14 or higher)
- npm (Node Package Manager)
- Google Gemini API Key

### Installation

1. **Clone or navigate to the project directory:**
   ```bash
   cd chalo-india-chatboot
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Add PDF files to `pdfs/` folder:**
   - `privacy.pdf` - Privacy policy
   - `booking.pdf` - Booking information
   - `chaloindia.pdf` - Company information
   - `cancellation.pdf` - Cancellation policy
   - `terms.pdf` - Terms and conditions

   > **Note:** You can use the `create-sample-pdfs.js` script to generate sample PDFs:
   ```bash
   npm run create-pdfs
   ```

4. **Configure API Key:**
   - Open `server.js`
   - Replace `GEMINI_API_KEY` with your actual Google Gemini API key

5. **Start the server:**
   ```bash
   npm start
   ```

6. **Access the chatbot:**
   - Open your browser: `http://localhost:3000/index.html`
   - Click the orange chat icon in the bottom-right corner

## 📁 Project Structure

```
chalo-india-chatboot/
├── frontend/
│   ├── index.html              # Main chatbot UI
│   ├── user-guide.html         # User documentation
│   ├── developer-guide.html    # Developer documentation
│   └── admin/
│       └── index.html          # Admin dashboard
├── pdfs/                       # PDF documents for RAG
│   ├── privacy.pdf
│   ├── booking.pdf
│   ├── chaloindia.pdf
│   ├── cancellation.pdf
│   └── terms.pdf
├── deals/
│   └── deals.json              # Flight deals data
├── bookings/                   # Saved bookings
│   ├── booking-*.json          # Individual booking files
│   └── bookings.txt            # Booking log
├── server.js                   # Express server & API
├── package.json                # Dependencies
├── create-sample-pdfs.js       # PDF generation script
├── README.md                   # This file
├── SETUP.md                    # Setup instructions
├── DEVELOPER_GUIDE.md          # Developer documentation
├── BOOKING_GUIDE.md            # Booking guide
├── DEALS_GUIDE.md              # Deals usage guide
└── QUESTIONS_THAT_WORK.md      # Supported questions
```

## ✨ Features Overview

### 1. AI Chatbot with RAG

- **Document-Based Q&A**: Answers questions using information from PDF documents
- **General Knowledge**: Uses Gemini AI for questions not in documents
- **Smart Retrieval**: Keyword-based and semantic search for relevant information
- **Fallback Mechanism**: Gracefully handles API quota limits

### 2. Flight Booking System

- **Multi-Step Flow**: Guided booking process collecting:
  - Personal information (name, email, mobile, passport)
  - Travel details (route, dates, passengers, class)
- **Route Selection**: Choose from 10 cities in India and 10 cities in Australia
- **One-way & Return**: Support for both trip types
- **Data Persistence**: All bookings saved to JSON files

### 3. Special Deals System

- **Deal Search**: Search by route, month, price, or combined criteria
- **Deal Booking**: Book flights using Deal IDs with automatic route setting
- **Stock Management**: Automatic stock reduction when deals are booked
- **Real-time Updates**: Stock updates immediately in `deals.json`

### 4. Admin Panel

- **View Bookings**: See all bookings with search functionality
- **Manage Deals**: View, add, edit, and delete flight deals
- **Statistics Dashboard**: Total bookings, deals, active deals, and revenue
- **CRUD Operations**: Full create, read, update, delete for deals

## 🔌 API Endpoints

### Chat Endpoints

- `POST /api/chat` - Send message to chatbot
  ```json
  {
    "message": "user message",
    "sessionId": "optional-session-id"
  }
  ```

- `GET /api/health` - Server health check
- `POST /api/reload` - Reload PDFs and deals (development)
- `GET /api/deals?q=query` - Search for deals

### Admin Endpoints

- `GET /api/admin/bookings` - Get all bookings
- `GET /api/admin/deals` - Get all deals
- `POST /api/admin/deals` - Add new deal
- `DELETE /api/admin/deals/:id` - Delete deal
- `PUT /api/admin/deals/:id` - Update deal

## 📚 Documentation

### User Documentation

- **User Guide**: `http://localhost:3000/user-guide.html`
  - Complete guide for end users
  - Step-by-step booking instructions
  - How to use deals
  - FAQ and troubleshooting

- **Booking Guide**: `BOOKING_GUIDE.md`
  - Detailed booking flow
  - Field requirements
  - Examples

- **Deals Guide**: `DEALS_GUIDE.md`
  - How to search deals
  - Booking with Deal IDs
  - Stock management

### Developer Documentation

- **Developer Guide**: `http://localhost:3000/developer-guide.html`
  - Architecture overview
  - API documentation
  - RAG implementation
  - Code structure
  - Deployment guide

- **Setup Guide**: `SETUP.md`
  - Quick setup instructions
  - Configuration details

## 🛠 Technologies Used

### Frontend
- **HTML5** - Structure
- **CSS3** - Styling with gradients and animations
- **JavaScript (Vanilla)** - Client-side logic

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **CORS** - Cross-origin resource sharing

### AI & ML
- **Google Gemini API** - Language model
- **LangChain** - RAG framework
- **@langchain/google-genai** - Gemini integration
- **@langchain/community** - Community integrations
- **MemoryVectorStore** - Vector storage

### Data Processing
- **pdf-parse** - PDF text extraction
- **pdfkit** - PDF generation

## ⚙️ Configuration

### Environment Variables

Currently, the API key is hardcoded in `server.js`. For production, use environment variables:

```javascript
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'your-api-key';
```

### API Key Setup

1. Get your Google Gemini API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Update `server.js` with your API key:
   ```javascript
   const GEMINI_API_KEY = 'your-api-key-here';
   ```

### PDF Files

Place your PDF files in the `pdfs/` directory:
- `privacy.pdf`
- `booking.pdf`
- `chaloindia.pdf`
- `cancellation.pdf`
- `terms.pdf`

## 🚢 Deployment

### Development

```bash
npm start
```

### Production Considerations

1. **Database**: Replace file-based storage with database (MongoDB, PostgreSQL)
2. **Session Management**: Use Redis or database for sessions
3. **Authentication**: Add authentication for admin panel
4. **Environment Variables**: Use `.env` file for sensitive data
5. **HTTPS**: Enable SSL/TLS certificates
6. **Rate Limiting**: Implement API rate limiting
7. **Logging**: Set up proper logging system
8. **Monitoring**: Add application monitoring

## 📖 How RAG Works

1. **Document Loading**: PDFs are loaded and converted to text
2. **Chunking**: Documents split into 1000-char chunks with 200-char overlap
3. **Embedding**: Chunks converted to vectors using Google embeddings
4. **Storage**: Vectors stored in MemoryVectorStore
5. **Retrieval**: Relevant chunks retrieved based on query similarity
6. **Generation**: Context + query sent to Gemini for response

### Fallback Mechanism

If embeddings quota is exceeded:
- Falls back to text-based keyword matching
- Uses direct LLM invocation for general knowledge
- Provides helpful responses even without document context

## 🎯 Usage Examples

### Booking a Flight

```
User: book
Bot: Step 1: What is your full name?
User: John Doe
Bot: Step 2: What is your email address?
...
```

### Viewing Deals

```
User: deals
Bot: Shows all available deals with IDs, routes, prices, and stock
```

### Booking with Deal ID

```
User: book deal id 1
Bot: Great! I'll help you book Deal ID 1...
     Route is automatically set from deal
     Step 1: What is your full name?
```

### Asking Questions

```
User: what is your cancellation policy?
Bot: [Answers from PDF documents using RAG]

User: tell me about chalo india
Bot: [Company information from documents]
```

## 🔐 Admin Panel

Access: `http://localhost:3000/admin`

### Features:
- **View All Bookings**: See booking history with details
- **Manage Deals**: Add, edit, delete flight deals
- **Statistics**: View totals and revenue
- **Search**: Filter bookings and deals

## 📝 Available Commands

### Booking
- `book` - Start flight booking
- `book flight` - Start flight booking
- `book deal id X` - Book specific deal

### Deals
- `deals` - Show all deals
- `show deals` - Show all deals
- `lowest fare deals` - Show cheapest deals
- `deals from [city] to [city]` - Search by route
- `deals in [month]` - Search by month

### Information
- `help` - Show help
- `terms` - Terms and conditions
- `contact` - Contact support
- `cancel` - Cancellation policy
- `what is chalo india` - Company info

## 🐛 Troubleshooting

### Server Not Starting
- Check if port 3000 is available
- Verify Node.js version (v14+)
- Check `npm install` completed successfully

### PDF Errors
- Ensure PDFs are valid and readable
- Check file paths in `pdfs/` directory
- Regenerate PDFs using `create-sample-pdfs.js`

### API Quota Exceeded
- System automatically falls back to text-based retrieval
- Chatbot still works but may be slower
- Consider upgrading API plan

### Bookings Not Loading
- Check `bookings/` directory exists
- Verify booking JSON files are valid
- Check server logs for errors

## 📄 License

This project is proprietary software for Chalo India.

## 👥 Support

For support and questions:
- Email: support@chaloindia.com
- Check documentation: `user-guide.html` or `developer-guide.html`
- Review guides: `BOOKING_GUIDE.md`, `DEALS_GUIDE.md`

## 🎉 Acknowledgments

- Google Gemini API for AI capabilities
- LangChain for RAG framework
- Express.js community

---

**Version**: 1.0  
**Last Updated**: November 2025  
**Status**: Production Ready
