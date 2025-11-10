# Quick Setup Guide

## Step 1: Install Dependencies

```bash
npm install
```

This will install:
- Express (web server)
- LangChain (RAG framework)
- Google Generative AI packages
- PDF parsing libraries
- Other dependencies

## Step 2: Add Your PDF Files

Copy your 5 PDF files to the `pdfs` folder:
- `privacy.pdf`
- `booking.pdf`
- `chaloindia.pdf`
- `cancellation.pdf`
- `terms.pdf`

## Step 3: Start the Server

```bash
npm start
```

Or for development with auto-reload:
```bash
npm run dev
```

## Step 4: Open the Chatbot

Open your browser and go to:
```
http://localhost:3000/index.html
```

## Troubleshooting

### If PDFs are not loading:
- Check that PDF files are in the `pdfs` folder
- Verify file names match exactly (case-sensitive)
- Check console for error messages

### If embeddings fail:
- The system will automatically fall back to text-based retrieval
- This still works but may be less accurate than vector embeddings

### If you get API errors:
- Verify your Gemini API key is correct in `server.js`
- Check that your API key has proper permissions
- Ensure you have internet connection for API calls

## Testing the RAG System

1. Ask questions about privacy policy
2. Ask about booking procedures
3. Ask about cancellation policies
4. Ask about terms and conditions

The chatbot should retrieve relevant information from your PDFs and provide accurate answers!

