# Developer Guide - Chalo India Chatbot

## 📋 Table of Contents
1. [Project Overview](#project-overview)
2. [Getting Started](#getting-started)
3. [Project Structure](#project-structure)
4. [Running the Project](#running-the-project)
5. [Updating the Project](#updating-the-project)
6. [Testing Questions](#testing-questions)
7. [Troubleshooting](#troubleshooting)
8. [API Documentation](#api-documentation)

---

## 🎯 Project Overview

This is a RAG (Retrieval Augmented Generation) powered chatbot for Chalo India flight booking service. It uses:
- **LangChain** for document processing and RAG pipeline
- **Google Gemini AI** for response generation
- **Express.js** for the backend server
- **PDF documents** as knowledge base

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm (Node Package Manager)
- Gemini API Key (already configured in `server.js`)

### Initial Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Create Sample PDF Files**
   ```bash
   npm run create-pdfs
   ```
   This will create 5 sample PDF files in the `pdfs/` folder:
   - `privacy.pdf`
   - `booking.pdf`
   - `chaloindia.pdf`
   - `cancellation.pdf`
   - `terms.pdf`

3. **Start the Server**
   ```bash
   npm start
   ```
   Or for development with auto-reload:
   ```bash
   npm run dev
   ```

4. **Open the Chatbot**
   - Navigate to: `http://localhost:3000/index.html`
   - The chatbot icon will appear in the bottom-right corner

---

## 📁 Project Structure

```
chalo-india-chatbot/
├── frontend/
│   └── index.html              # Chatbot UI (HTML, CSS, JavaScript)
├── pdfs/                       # PDF knowledge base
│   ├── privacy.pdf
│   ├── booking.pdf
│   ├── chaloindia.pdf
│   ├── cancellation.pdf
│   └── terms.pdf
├── server.js                   # Main server with RAG implementation
├── create-sample-pdfs.js       # Script to generate sample PDFs
├── package.json                # Dependencies and scripts
├── README.md                   # General documentation
├── DEVELOPER_GUIDE.md          # This file
└── SETUP.md                    # Quick setup guide
```

---

## 🏃 Running the Project

### Development Mode
```bash
npm run dev
```
- Uses `nodemon` for auto-reload on file changes
- Best for development and testing

### Production Mode
```bash
npm start
```
- Runs the server normally
- Use for production deployment

### Server Endpoints
- **Frontend**: `http://localhost:3000/index.html`
- **API Chat**: `http://localhost:3000/api/chat` (POST)
- **Health Check**: `http://localhost:3000/api/health` (GET)
- **Reload PDFs**: `http://localhost:3000/api/reload` (POST)

---

## 🔄 Updating the Project

### 1. Updating PDF Files

**Replace Sample PDFs with Real Data:**
1. Delete or backup existing PDFs in `pdfs/` folder
2. Copy your real PDF files to `pdfs/` folder with exact names:
   - `privacy.pdf`
   - `booking.pdf`
   - `chaloindia.pdf`
   - `cancellation.pdf`
   - `terms.pdf`
3. Restart the server or call `/api/reload` endpoint

**Or use the reload endpoint:**
```bash
curl -X POST http://localhost:3000/api/reload
```

### 2. Updating Chatbot UI

Edit `frontend/index.html`:
- Modify CSS styles in `<style>` tag
- Update JavaScript behavior in `<script>` tag
- Change chatbot appearance, colors, or layout

### 3. Updating RAG Configuration

Edit `server.js`:

**Change chunk size:**
```javascript
const textSplitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,  // Change this value
    chunkOverlap: 200, // Change this value
});
```

**Change number of retrieved chunks:**
```javascript
retriever = vectorStore.asRetriever({
    k: 4,  // Change this to retrieve more/fewer chunks
    searchType: 'similarity'
});
```

**Modify the prompt template:**
```javascript
const promptTemplate = PromptTemplate.fromTemplate(`
    // Modify the prompt here
`);
```

### 4. Updating API Key

Edit `server.js`:
```javascript
const GEMINI_API_KEY = 'YOUR_NEW_API_KEY_HERE';
```

### 5. Adding New Features

**Add new API endpoints:**
```javascript
app.post('/api/your-endpoint', async (req, res) => {
    // Your code here
});
```

**Add new PDF files:**
1. Add PDF to `pdfs/` folder
2. Update `loadAndProcessPDFs()` function in `server.js`:
```javascript
const pdfFiles = [
    // ... existing files
    { key: 'newfile', filename: 'newfile.pdf' }
];
```

---

## ❓ Testing Questions

Here are example questions you can ask the chatbot right now (with sample PDFs):

### Privacy Policy Questions
- "What information do you collect?"
- "How do you use my personal information?"
- "What is your data security policy?"
- "Do you share my information with third parties?"
- "What are my privacy rights?"

### Booking Questions
- "How do I book a flight?"
- "What cities do you fly to?"
- "What travel classes are available?"
- "What do I need to complete a booking?"
- "What will I receive after booking?"

### Company Information Questions
- "Tell me about Chalo India"
- "What is your mission?"
- "What services do you offer?"
- "Why should I choose Chalo India?"
- "How can I contact you?"

### Cancellation Questions
- "What is your cancellation policy?"
- "How much refund will I get if I cancel?"
- "What are the cancellation timeframes?"
- "How do I cancel my booking?"
- "What happens if I don't show up for my flight?"

### Terms and Conditions Questions
- "What are your booking terms?"
- "What are the payment terms?"
- "What travel documents do I need?"
- "What is your baggage policy?"
- "Can I change my flight?"

### General Questions
- "What routes do you offer?"
- "Tell me about flights between India and Australia"
- "What is included in the booking confirmation?"
- "What are the processing fees for cancellation?"

---

## 🐛 Troubleshooting

### Issue: PDFs not loading
**Solution:**
- Check that PDF files exist in `pdfs/` folder
- Verify file names match exactly (case-sensitive)
- Check console for error messages
- Ensure PDFs are not corrupted

### Issue: RAG not working
**Solution:**
- Check that LangChain dependencies are installed: `npm install`
- Verify Gemini API key is correct
- Check server console for error messages
- System will fallback to text-based retrieval if embeddings fail

### Issue: Server won't start
**Solution:**
- Check if port 3000 is already in use
- Verify all dependencies are installed: `npm install`
- Check Node.js version: `node --version` (should be v16+)
- Review error messages in console

### Issue: Chatbot not responding
**Solution:**
- Check browser console for errors
- Verify server is running: `http://localhost:3000/api/health`
- Check network tab for API call failures
- Ensure CORS is enabled (already configured)

### Issue: Responses are not accurate
**Solution:**
- Update PDF files with more detailed information
- Adjust chunk size in `server.js`
- Increase number of retrieved chunks (k value)
- Improve prompt template for better context

---

## 📡 API Documentation

### POST /api/chat

Send a message to the chatbot.

**Request:**
```json
{
    "message": "What is your cancellation policy?"
}
```

**Response:**
```json
{
    "response": "Our cancellation policy states that..."
}
```

**Error Response:**
```json
{
    "error": "Error message",
    "details": "Detailed error information"
}
```

### GET /api/health

Check server status and RAG system initialization.

**Response:**
```json
{
    "status": "ok",
    "ragInitialized": true,
    "vectorStoreReady": true,
    "retrieverReady": true,
    "chunksLoaded": 25
}
```

### POST /api/reload

Reload PDF documents (useful after updating PDFs).

**Response:**
```json
{
    "message": "PDFs reloaded successfully"
}
```

---

## 🔧 Configuration Options

### Server Port
Edit `server.js`:
```javascript
const PORT = 3000; // Change to your preferred port
```

### Chunk Configuration
```javascript
chunkSize: 1000,      // Size of each text chunk
chunkOverlap: 200,    // Overlap between chunks
```

### Retrieval Configuration
```javascript
k: 4,                 // Number of chunks to retrieve
searchType: 'similarity'  // Search method
```

### LLM Configuration
```javascript
modelName: 'gemini-pro',  // Gemini model to use
temperature: 0.7,         // Creativity level (0-1)
```

---

## 📝 Development Tips

1. **Use Development Mode**: Always use `npm run dev` during development for auto-reload
2. **Check Logs**: Monitor server console for errors and warnings
3. **Test Incrementally**: Test after each change to catch issues early
4. **Update PDFs Carefully**: Ensure PDFs are properly formatted and readable
5. **Version Control**: Use git to track changes (PDFs are excluded in `.gitignore`)

---

## 🚢 Deployment

### For Production:
1. Set `NODE_ENV=production`
2. Use a process manager like PM2
3. Configure environment variables for API keys
4. Set up proper error logging
5. Use HTTPS for secure connections

### Environment Variables (Recommended):
Create a `.env` file:
```
GEMINI_API_KEY=your_api_key_here
PORT=3000
NODE_ENV=production
```

Then update `server.js` to use:
```javascript
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'fallback_key';
```

---

## 📚 Additional Resources

- [LangChain Documentation](https://js.langchain.com/)
- [Google Gemini API Docs](https://ai.google.dev/docs)
- [Express.js Documentation](https://expressjs.com/)
- [PDFKit Documentation](https://pdfkit.org/)

---

## 💡 Next Steps

1. Replace sample PDFs with real documentation
2. Customize the chatbot UI to match your brand
3. Add more features (booking integration, user authentication, etc.)
4. Deploy to a production server
5. Monitor and improve based on user feedback

---

**Happy Coding! 🚀**


