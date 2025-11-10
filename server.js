const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');
const pdf = require('pdf-parse');

// LangChain imports
const { ChatGoogleGenerativeAI } = require('@langchain/google-genai');
const { RecursiveCharacterTextSplitter } = require('langchain/text_splitter');
const { Document } = require('@langchain/core/documents');
const { RunnablePassthrough, RunnableSequence } = require('@langchain/core/runnables');
const { StringOutputParser } = require('@langchain/core/output_parsers');
const { PromptTemplate } = require('@langchain/core/prompts');

// Try to import embeddings - use alternative if Google embeddings not available
let GoogleGenerativeAIEmbeddings;
let MemoryVectorStore;
try {
    GoogleGenerativeAIEmbeddings = require('@langchain/google-genai').GoogleGenerativeAIEmbeddings;
    MemoryVectorStore = require('langchain/vectorstores/memory').MemoryVectorStore;
} catch (error) {
    console.warn('Warning: Could not load Google embeddings, using alternative approach');
}

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('frontend'));

// Admin panel route
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'admin', 'index.html'));
});

// Gemini API Configuration
// API Key: AIzaSyBh-Nci8gAhlfvySJy6s6Dg58LUJmcF6Hg
// Project: projects/204982138599
const GEMINI_API_KEY = 'AIzaSyBh-Nci8gAhlfvySJy6s6Dg58LUJmcF6Hg';

// Initialize LangChain components
let vectorStore = null;
let retriever = null;
let llm = null;
let ragChain = null;
let documentChunks = [];

// Function to extract text from PDF
async function extractTextFromPDF(filePath) {
    try {
        const dataBuffer = await fs.readFile(filePath);
        const data = await pdf(dataBuffer);
        return data.text;
    } catch (error) {
        console.error(`Error reading PDF ${filePath}:`, error);
        return '';
    }
}

// Simple cosine similarity function for fallback
function cosineSimilarity(vecA, vecB) {
    if (vecA.length !== vecB.length) return 0;
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
    }
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Simple embedding using Google API (fallback if LangChain embeddings don't work)
async function getEmbedding(text) {
    try {
        const { GoogleGenerativeAI } = require('@google/generative-ai');
        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        // Note: Gemini doesn't have a direct embedding API, so we'll use a workaround
        // For production, consider using a dedicated embedding model
        return null; // Will trigger fallback
    } catch (error) {
        return null;
    }
}

// Load and process PDFs with LangChain
async function loadAndProcessPDFs() {
    const pdfFiles = [
        { key: 'privacy', filename: 'privacy.pdf' },
        { key: 'booking', filename: 'booking.pdf' },
        { key: 'chaloindia', filename: 'chaloindia.pdf' },
        { key: 'cancellation', filename: 'cancellation.pdf' },
        { key: 'terms', filename: 'terms.pdf' }
    ];

    console.log('Loading and processing PDF files with LangChain...');
    
    const documents = [];
    const pdfsDir = path.join(__dirname, 'pdfs');

    for (const pdfFile of pdfFiles) {
        const filePath = path.join(pdfsDir, pdfFile.filename);
        try {
            const text = await extractTextFromPDF(filePath);
            if (text && text.trim().length > 0) {
                // Create document with metadata
                documents.push(new Document({
                    pageContent: text,
                    metadata: { 
                        source: pdfFile.filename,
                        type: pdfFile.key,
                        title: pdfFile.filename.replace('.pdf', '').replace(/\b\w/g, l => l.toUpperCase())
                    }
                }));
                console.log(`✓ Loaded ${pdfFile.filename} (${text.length} characters)`);
            } else {
                console.log(`⚠ ${pdfFile.filename} is empty or could not be read`);
            }
        } catch (error) {
            console.error(`✗ Failed to load ${pdfFile.filename}:`, error.message);
        }
    }

    if (documents.length === 0) {
        console.log('⚠ No PDF documents loaded. Chatbot will work with limited knowledge.');
        // Create a dummy document to prevent errors
        documents.push(new Document({
            pageContent: 'Chalo India is a flight booking service between India and Australia. We offer flights between major cities in India and Australia. For booking, cancellation, privacy, and terms information, please refer to our documentation.',
            metadata: { source: 'default', type: 'general' }
        }));
    }

    // Split documents into chunks
    console.log('Splitting documents into chunks...');
    const textSplitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1000,
        chunkOverlap: 200,
        separators: ['\n\n', '\n', '. ', ' ', '']
    });

    const splitDocs = await textSplitter.splitDocuments(documents);
    documentChunks = splitDocs;
    console.log(`✓ Created ${splitDocs.length} document chunks`);

    // Initialize embeddings and vector store
    // Use text-based retrieval by default to avoid embedding quota issues
    console.log('Using text-based retrieval (keyword matching)...');
    retriever = {
        getRelevantDocuments: async (query) => {
            // Enhanced keyword-based retrieval with better scoring
            const queryLower = query.toLowerCase();
            const queryWords = queryLower.split(/\s+/).filter(word => word.length > 2); // Filter out short words
            
            const scoredDocs = splitDocs.map(doc => {
                const content = doc.pageContent.toLowerCase();
                let score = 0;
                
                // Exact phrase matching (higher weight)
                if (content.includes(queryLower)) {
                    score += 10;
                }
                
                // Individual word matching
                queryWords.forEach(word => {
                    const matches = (content.match(new RegExp(word, 'g')) || []).length;
                    score += matches * 2; // Weight word matches
                    
                    // Bonus for word at start of sentence or in title
                    if (content.includes(word + ' ') || content.includes(' ' + word + ' ')) {
                        score += 1;
                    }
                });
                
                // Metadata matching bonus
                if (doc.metadata.title && doc.metadata.title.toLowerCase().includes(queryLower)) {
                    score += 5;
                }
                
                return { doc, score };
            });
            
            // Return top 4 most relevant documents, or all if score > 0
            const relevant = scoredDocs
                .filter(item => item.score > 0)
                .sort((a, b) => b.score - a.score)
                .slice(0, 4)
                .map(item => item.doc);
            
            // If no matches, return first 2 documents as fallback
            return relevant.length > 0 ? relevant : splitDocs.slice(0, 2);
        }
    };
    
    // Try to use embeddings if available (optional, for better results)
    try {
        if (GoogleGenerativeAIEmbeddings && MemoryVectorStore) {
            console.log('Attempting to initialize embeddings (optional, will fallback if quota exceeded)...');
            const embeddings = new GoogleGenerativeAIEmbeddings({
                modelName: 'models/embedding-001',
                apiKey: GEMINI_API_KEY,
            });

            vectorStore = await MemoryVectorStore.fromDocuments(splitDocs, embeddings);
            const vectorRetriever = vectorStore.asRetriever({
                k: 4,
                searchType: 'similarity'
            });
            
            // Use vector retriever if successful
            retriever = vectorRetriever;
            console.log('✓ Vector store created successfully (using embeddings)');
        }
    } catch (error) {
        console.log('⚠ Embeddings not available (quota or API issue), using text-based retrieval');
        console.log('   This is fine - text-based retrieval works well for most queries');
    }

    // Initialize LLM
    console.log('Initializing Gemini LLM...');
    llm = new ChatGoogleGenerativeAI({
        modelName: 'gemini-pro',
        temperature: 0.7,
        apiKey: GEMINI_API_KEY,
    });

    // Create RAG prompt template
    const promptTemplate = PromptTemplate.fromTemplate(`
You are a helpful and friendly customer service chatbot for Chalo India, a flight booking service specializing in flights between India and Australia.

You can answer questions in two ways:
1. If relevant information is in the context below, use it to provide accurate answers
2. If the question is not in the context, use your general knowledge to provide helpful answers about flight booking, travel, or Chalo India services

IMPORTANT: You can answer general questions about flight booking, booking processes, travel, etc. even if not in the context. Be helpful and informative.

Context from documentation (if available):
{context}

User Question: {question}

Provide a clear, concise, and helpful answer. Format your response in HTML where appropriate for better readability (use <br> for line breaks, <strong> for emphasis, etc.). Be professional, friendly, and conversational.

If the user asks about booking a flight, explain the process even if not in the context. If they ask general travel questions, provide helpful information.

Answer:`);

    // Create RAG chain
    const formatDocs = (docs) => {
        return docs.map((doc, i) => {
            return `[Document ${i + 1} - ${doc.metadata.title || doc.metadata.source}]\n${doc.pageContent}`;
        }).join('\n\n---\n\n');
    };

    ragChain = RunnableSequence.from([
        {
            context: async (input) => {
                const docs = await retriever.getRelevantDocuments(input);
                return formatDocs(docs);
            },
            question: new RunnablePassthrough(),
        },
        promptTemplate,
        llm,
        new StringOutputParser(),
    ]);

    console.log('✓ RAG chain initialized successfully\n');
}

// Create PDFs directory if it doesn't exist
async function ensurePDFsDirectory() {
    const pdfsDir = path.join(__dirname, 'pdfs');
    try {
        await fs.access(pdfsDir);
    } catch {
        await fs.mkdir(pdfsDir, { recursive: true });
        console.log('Created pdfs directory. Please add your PDF files there.');
    }
}

// Booking state storage (in-memory, could be moved to database)
const bookingSessions = new Map();

// City data
const cities = {
    india: [
        { id: 1, name: 'Delhi', code: 'DEL' },
        { id: 2, name: 'Mumbai', code: 'BOM' },
        { id: 3, name: 'Bangalore', code: 'BLR' },
        { id: 4, name: 'Chennai', code: 'MAA' },
        { id: 5, name: 'Kolkata', code: 'CCU' },
        { id: 6, name: 'Hyderabad', code: 'HYD' },
        { id: 7, name: 'Ahmedabad', code: 'AMD' },
        { id: 8, name: 'Pune', code: 'PNQ' },
        { id: 9, name: 'Goa', code: 'GOI' },
        { id: 10, name: 'Jaipur', code: 'JAI' }
    ],
    australia: [
        { id: 1, name: 'Melbourne', code: 'MEL' },
        { id: 2, name: 'Sydney', code: 'SYD' },
        { id: 3, name: 'Adelaide', code: 'ADL' },
        { id: 4, name: 'Brisbane', code: 'BNE' },
        { id: 5, name: 'Perth', code: 'PER' },
        { id: 6, name: 'Canberra', code: 'CBR' },
        { id: 7, name: 'Darwin', code: 'DRW' },
        { id: 8, name: 'Hobart', code: 'HBA' },
        { id: 9, name: 'Gold Coast', code: 'OOL' },
        { id: 10, name: 'Cairns', code: 'CNS' }
    ]
};

// Load deals data
let dealsData = [];
async function loadDeals() {
    try {
        const dealsFile = path.join(__dirname, 'deals', 'deals.json');
        const data = await fs.readFile(dealsFile, 'utf8');
        dealsData = JSON.parse(data);
        console.log(`✓ Loaded ${dealsData.length} deals`);
    } catch (error) {
        console.log('⚠ No deals file found or error loading deals:', error.message);
        dealsData = [];
    }
}

// Search deals based on query
function searchDeals(query) {
    const lowerQuery = query.toLowerCase();
    const results = [];
    
    // Parse route from query (e.g., "melbourne to delhi", "delhi to melbourne")
    let fromCity = '';
    let toCity = '';
    const cityMap = {
        'delhi': 'DEL', 'mumbai': 'BOM', 'bangalore': 'BLR', 'chennai': 'MAA',
        'kolkata': 'CCU', 'hyderabad': 'HYD', 'ahmedabad': 'AMD', 'pune': 'PNQ',
        'goa': 'GOI', 'jaipur': 'JAI',
        'melbourne': 'MEL', 'sydney': 'SYD', 'adelaide': 'ADL', 'brisbane': 'BNE',
        'perth': 'PER', 'canberra': 'CBR', 'darwin': 'DRW', 'hobart': 'HBA',
        'gold coast': 'OOL', 'cairns': 'CNS'
    };
    
    // Extract month from query
    const months = {
        'january': '01', 'february': '02', 'march': '03', 'april': '04',
        'may': '05', 'june': '06', 'july': '07', 'august': '08',
        'september': '09', 'october': '10', 'november': '11', 'december': '12'
    };
    let targetMonth = null;
    for (const [month, num] of Object.entries(months)) {
        if (lowerQuery.includes(month)) {
            targetMonth = num;
            break;
        }
    }
    
    // Extract route - handle "from X to Y" or "X to Y" patterns
    const toPattern = /\bto\b|\bfrom\b/;
    const hasToFrom = toPattern.test(lowerQuery);
    
    if (hasToFrom) {
        // Split by "to" or "from"
        const parts = lowerQuery.split(/\bto\b|\bfrom\b/);
        for (const part of parts) {
            for (const [cityName, code] of Object.entries(cityMap)) {
                if (part.trim().includes(cityName)) {
                    if (!fromCity) {
                        fromCity = code;
                    } else if (!toCity && code !== fromCity) {
                        toCity = code;
                    }
                }
            }
        }
    } else {
        // No "to/from", just find cities mentioned
        for (const [cityName, code] of Object.entries(cityMap)) {
            if (lowerQuery.includes(cityName)) {
                if (!fromCity) {
                    fromCity = code;
                } else if (!toCity && code !== fromCity) {
                    toCity = code;
                }
            }
        }
    }
    
    // Filter deals
    for (const deal of dealsData) {
        let match = false;
        let score = 0;
        
        // Route matching
        if (fromCity && toCity) {
            const routeParts = deal.route.split('-');
            if ((routeParts[0] === fromCity && routeParts[1] === toCity) ||
                (routeParts[0] === toCity && routeParts[1] === fromCity)) {
                match = true;
                score += 10;
            }
        } else if (fromCity || toCity) {
            if (deal.route.includes(fromCity || toCity)) {
                match = true;
                score += 5;
            }
        } else {
            match = true; // Show all if no specific route
        }
        
        // Month matching
        if (targetMonth && match) {
            const dealMonth = deal.dep_date.split('-')[1];
            if (dealMonth === targetMonth) {
                score += 5;
            } else {
                match = false; // Must match month if specified
            }
        }
        
        // Lowest fare query
        if (lowerQuery.includes('lowest') || lowerQuery.includes('cheapest') || lowerQuery.includes('best price')) {
            score += 1; // Will sort by price
        }
        
        if (match && deal.current_stock > 0) {
            results.push({ ...deal, matchScore: score });
        }
    }
    
    // Sort by score and price
    results.sort((a, b) => {
        if (lowerQuery.includes('lowest') || lowerQuery.includes('cheapest')) {
            return a.aud_fare - b.aud_fare;
        }
        return b.matchScore - a.matchScore;
    });
    
    return results.slice(0, 10); // Return top 10
}

// Update deal stock when booked
async function updateDealStock(dealId, quantity = 1) {
    try {
        const deal = dealsData.find(d => d.auto_id === parseInt(dealId));
        if (deal && deal.current_stock >= quantity) {
            const oldStock = deal.current_stock;
            deal.current_stock -= quantity;
            
            // Save updated deals back to file
            const dealsFile = path.join(__dirname, 'deals', 'deals.json');
            await fs.writeFile(dealsFile, JSON.stringify(dealsData, null, 2));
            console.log(`✓ Updated deal ${dealId}: stock reduced from ${oldStock} to ${deal.current_stock}`);
            return true;
        } else if (deal) {
            console.log(`⚠ Deal ${dealId} has insufficient stock (${deal.current_stock} available, ${quantity} requested)`);
            return false;
        } else {
            console.log(`⚠ Deal ${dealId} not found`);
            return false;
        }
    } catch (error) {
        console.error('Error updating deal stock:', error);
        return false;
    }
}

// Save booking to file
async function saveBooking(bookingData) {
    const bookingsDir = path.join(__dirname, 'bookings');
    try {
        await fs.access(bookingsDir);
    } catch {
        await fs.mkdir(bookingsDir, { recursive: true });
    }
    
    // If deal ID is specified, update stock BEFORE saving
    if (bookingData.dealId) {
        const passengers = parseInt(bookingData.passengers) || 1;
        const stockUpdated = await updateDealStock(bookingData.dealId, passengers);
        bookingData.dealStockUpdated = stockUpdated;
        if (!stockUpdated) {
            console.log(`⚠ Warning: Could not update stock for deal ${bookingData.dealId}`);
        }
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `booking-${timestamp}.json`;
    const filepath = path.join(bookingsDir, filename);
    
    await fs.writeFile(filepath, JSON.stringify(bookingData, null, 2));
    console.log(`Booking saved to ${filepath}`);
    
    // Also append to a text file
    const textFile = path.join(bookingsDir, 'bookings.txt');
    const textEntry = `
========================================
Booking Date: ${new Date().toLocaleString()}
========================================
Name: ${bookingData.name}
Email: ${bookingData.email}
Mobile: ${bookingData.mobile}
Passport: ${bookingData.passport}
${bookingData.dealId ? `Deal ID: ${bookingData.dealId}` : ''}
From: ${bookingData.fromCountry} - ${bookingData.fromCity}
To: ${bookingData.toCountry} - ${bookingData.toCity}
Departure Date: ${bookingData.departureDate}
Return Date: ${bookingData.returnDate || 'N/A'}
Passengers: ${bookingData.passengers}
Travel Class: ${bookingData.travelClass}
Status: ${bookingData.status}
========================================

`;
    await fs.appendFile(textFile, textEntry);
    
    return { filename, filepath };
}

// Handle booking flow steps
async function handleBookingStep(req, res, sessionId, booking, userMessage, lowerMessage) {
    try {
        switch(booking.step) {
            case 'name':
                booking.name = userMessage;
                booking.step = 'email';
                bookingSessions.set(sessionId, booking);
                return res.json({
                    response: `Thanks ${booking.name}!<br><br><strong>Step 2:</strong> What is your email address?`,
                    bookingStep: 'email'
                });
                
            case 'email':
                if (userMessage.includes('@') && userMessage.includes('.')) {
                    booking.email = userMessage;
                    booking.step = 'mobile';
                    bookingSessions.set(sessionId, booking);
                    return res.json({
                        response: `Got it!<br><br><strong>Step 3:</strong> What is your mobile number? (with country code)`,
                        bookingStep: 'mobile'
                    });
                } else {
                    return res.json({
                        response: 'Please enter a valid email address (e.g., name@example.com)',
                        bookingStep: 'email'
                    });
                }
                
            case 'mobile':
                booking.mobile = userMessage;
                booking.step = 'passport';
                bookingSessions.set(sessionId, booking);
                return res.json({
                    response: `Perfect!<br><br><strong>Step 4:</strong> What is your passport number?`,
                    bookingStep: 'passport'
                });
                
            case 'passport':
                if (userMessage.length >= 5) {
                    booking.passport = userMessage;
                    // If booking with deal, skip route selection
                    if (booking.dealId && booking.dealInfo) {
                        booking.step = 'departureDate';
                        bookingSessions.set(sessionId, booking);
                        return res.json({
                            response: `Great!<br><br>Route is already set from the deal: <strong>${booking.fromCity} → ${booking.toCity}</strong><br><br><strong>Step 5:</strong> What is your departure date?<br>Please enter date in DD/MM/YYYY format (e.g., 25/12/2024)`,
                            bookingStep: 'departureDate'
                        });
                    } else {
                        booking.step = 'fromCountry';
                        bookingSessions.set(sessionId, booking);
                        return res.json({
                            response: `Great!<br><br><strong>Step 5:</strong> Where are you traveling from?<br>Please type "India" or "Australia"`,
                            bookingStep: 'fromCountry'
                        });
                    }
                } else {
                    return res.json({
                        response: 'Please enter a valid passport number (at least 5 characters)',
                        bookingStep: 'passport'
                    });
                }
                
            case 'fromCountry':
                if (lowerMessage === 'india' || lowerMessage === 'australia') {
                    booking.fromCountry = lowerMessage;
                    booking.step = 'fromCity';
                    bookingSessions.set(sessionId, booking);
                    const countryCities = cities[lowerMessage];
                    let cityList = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:10px 0;">';
                    countryCities.forEach(city => {
                        cityList += `<div style="padding:8px;border:1px solid #ddd;border-radius:4px;cursor:pointer;" onclick="selectCity('${city.id}', '${city.name}')">${city.id}. ${city.name} (${city.code})</div>`;
                    });
                    cityList += '</div>';
                    return res.json({
                        response: `Select your departure city from ${lowerMessage.charAt(0).toUpperCase() + lowerMessage.slice(1)}:<br><br>${cityList}<br>Type the city number (1-10) or city name`,
                        bookingStep: 'fromCity',
                        cities: countryCities
                    });
                } else {
                    return res.json({
                        response: 'Please type "India" or "Australia"',
                        bookingStep: 'fromCountry'
                    });
                }
                
            case 'fromCity':
                const fromCountryCities = cities[booking.fromCountry];
                const fromCityMatch = fromCountryCities.find(c => 
                    c.id.toString() === userMessage || 
                    c.name.toLowerCase() === lowerMessage ||
                    c.code.toLowerCase() === lowerMessage
                );
                if (fromCityMatch) {
                    booking.fromCity = fromCityMatch.name;
                    booking.step = 'toCountry';
                    bookingSessions.set(sessionId, booking);
                    const toCountry = booking.fromCountry === 'india' ? 'australia' : 'india';
                    return res.json({
                        response: `Selected: ${fromCityMatch.name}<br><br><strong>Step 6:</strong> Where are you traveling to?<br>Please type "${toCountry.charAt(0).toUpperCase() + toCountry.slice(1)}"`,
                        bookingStep: 'toCountry'
                    });
                } else {
                    return res.json({
                        response: 'Please select a valid city. Type the city number (1-10) or city name',
                        bookingStep: 'fromCity',
                        cities: fromCountryCities
                    });
                }
                
            case 'toCountry':
                const expectedToCountry = booking.fromCountry === 'india' ? 'australia' : 'india';
                if (lowerMessage === expectedToCountry) {
                    booking.toCountry = lowerMessage;
                    booking.step = 'toCity';
                    bookingSessions.set(sessionId, booking);
                    const toCountryCities = cities[lowerMessage];
                    let cityList = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:10px 0;">';
                    toCountryCities.forEach(city => {
                        cityList += `<div style="padding:8px;border:1px solid #ddd;border-radius:4px;cursor:pointer;">${city.id}. ${city.name} (${city.code})</div>`;
                    });
                    cityList += '</div>';
                    return res.json({
                        response: `Select your destination city in ${lowerMessage.charAt(0).toUpperCase() + lowerMessage.slice(1)}:<br><br>${cityList}<br>Type the city number (1-10) or city name`,
                        bookingStep: 'toCity',
                        cities: toCountryCities
                    });
                } else {
                    return res.json({
                        response: `Please type "${expectedToCountry.charAt(0).toUpperCase() + expectedToCountry.slice(1)}" (we only fly between India and Australia)`,
                        bookingStep: 'toCountry'
                    });
                }
                
            case 'toCity':
                const toCountryCities = cities[booking.toCountry];
                const toCityMatch = toCountryCities.find(c => 
                    c.id.toString() === userMessage || 
                    c.name.toLowerCase() === lowerMessage ||
                    c.code.toLowerCase() === lowerMessage
                );
                if (toCityMatch) {
                    booking.toCity = toCityMatch.name;
                    booking.step = 'departureDate';
                    bookingSessions.set(sessionId, booking);
                    return res.json({
                        response: `Selected: ${toCityMatch.name}<br><br><strong>Step 7:</strong> What is your departure date?<br>Please enter in format: DD/MM/YYYY (e.g., 25/12/2024)`,
                        bookingStep: 'departureDate'
                    });
                } else {
                    return res.json({
                        response: 'Please select a valid city. Type the city number (1-10) or city name',
                        bookingStep: 'toCity',
                        cities: toCountryCities
                    });
                }
                
            case 'departureDate':
                if (/^\d{2}\/\d{2}\/\d{4}$/.test(userMessage)) {
                    booking.departureDate = userMessage;
                    booking.step = 'returnDate';
                    bookingSessions.set(sessionId, booking);
                    return res.json({
                        response: `Departure date: ${userMessage}<br><br><strong>Step 8:</strong> Is this a return trip?<br>Type "yes" for return trip or "no" for one-way`,
                        bookingStep: 'returnDate'
                    });
                } else {
                    return res.json({
                        response: 'Please enter date in DD/MM/YYYY format (e.g., 25/12/2024)',
                        bookingStep: 'departureDate'
                    });
                }
                
            case 'returnDate':
                if (lowerMessage === 'yes' || lowerMessage === 'return') {
                    booking.step = 'returnDateInput';
                    bookingSessions.set(sessionId, booking);
                    return res.json({
                        response: `Great!<br><br><strong>Step 9:</strong> What is your return date?<br>Please enter in format: DD/MM/YYYY (e.g., 05/01/2025)`,
                        bookingStep: 'returnDateInput'
                    });
                } else if (lowerMessage === 'no' || lowerMessage === 'one-way' || lowerMessage === 'one way') {
                    booking.returnDate = '';
                    booking.step = 'passengers';
                    bookingSessions.set(sessionId, booking);
                    return res.json({
                        response: `One-way trip confirmed!<br><br><strong>Step 9:</strong> How many passengers will be traveling? (1-9)`,
                        bookingStep: 'passengers'
                    });
                } else {
                    return res.json({
                        response: 'Please type "yes" for return trip or "no" for one-way',
                        bookingStep: 'returnDate'
                    });
                }
                
            case 'returnDateInput':
                if (/^\d{2}\/\d{2}\/\d{4}$/.test(userMessage)) {
                    booking.returnDate = userMessage;
                    booking.step = 'passengers';
                    bookingSessions.set(sessionId, booking);
                    return res.json({
                        response: `Return date: ${userMessage}<br><br><strong>Step 10:</strong> How many passengers will be traveling? (1-9)`,
                        bookingStep: 'passengers'
                    });
                } else {
                    return res.json({
                        response: 'Please enter date in DD/MM/YYYY format (e.g., 05/01/2025)',
                        bookingStep: 'returnDateInput'
                    });
                }
                
            case 'passengers':
                const passengerCount = parseInt(userMessage);
                if (!isNaN(passengerCount) && passengerCount > 0 && passengerCount < 10) {
                    booking.passengers = passengerCount.toString();
                    booking.step = 'travelClass';
                    bookingSessions.set(sessionId, booking);
                    return res.json({
                        response: `${passengerCount} passenger(s)<br><br><strong>Step 11:</strong> What travel class would you prefer?<br>Type "Economy", "Business", or "First"`,
                        bookingStep: 'travelClass'
                    });
                } else {
                    return res.json({
                        response: 'Please enter a valid number of passengers (1-9)',
                        bookingStep: 'passengers'
                    });
                }
                
            case 'travelClass':
                const validClasses = ['economy', 'business', 'first'];
                if (validClasses.includes(lowerMessage)) {
                    booking.travelClass = lowerMessage.charAt(0).toUpperCase() + lowerMessage.slice(1);
                    booking.step = 'confirm';
                    bookingSessions.set(sessionId, booking);
                    let summary = `
<strong>📋 Booking Summary:</strong><br><br>`;
                    if (booking.dealId && booking.dealInfo) {
                        summary += `<strong>💰 Deal ID:</strong> ${booking.dealId}<br>
<strong>Deal Price:</strong> AUD $${booking.dealInfo.aud_fare}${booking.dealInfo.ind_fare ? ` (₹${booking.dealInfo.ind_fare})` : ''}<br>
<strong>Deal Route:</strong> ${booking.dealInfo.route}<br>
<strong>Deal Flights:</strong> ${booking.dealInfo.flight1}${booking.dealInfo.flight2 !== booking.dealInfo.flight1 ? ' + ' + booking.dealInfo.flight2 : ''}<br>
<strong>Available Seats:</strong> ${booking.dealInfo.current_stock}<br><br>`;
                    }
                    summary += `<strong>Name:</strong> ${booking.name}<br>
<strong>Email:</strong> ${booking.email}<br>
<strong>Mobile:</strong> ${booking.mobile}<br>
<strong>Passport:</strong> ${booking.passport}<br>
<strong>Route:</strong> ${booking.fromCity}, ${booking.fromCountry.charAt(0).toUpperCase() + booking.fromCountry.slice(1)} → ${booking.toCity}, ${booking.toCountry.charAt(0).toUpperCase() + booking.toCountry.slice(1)}<br>
<strong>Departure:</strong> ${booking.departureDate}<br>
${booking.returnDate ? `<strong>Return:</strong> ${booking.returnDate}<br>` : '<strong>Trip Type:</strong> One-way<br>'}
<strong>Passengers:</strong> ${booking.passengers}<br>
<strong>Class:</strong> ${booking.travelClass}<br><br>
Type <strong>"confirm"</strong> to submit your booking or <strong>"cancel"</strong> to start over.`;
                    return res.json({
                        response: summary,
                        bookingStep: 'confirm',
                        bookingSummary: booking
                    });
                } else {
                    return res.json({
                        response: 'Please type "Economy", "Business", or "First"',
                        bookingStep: 'travelClass'
                    });
                }
                
            case 'confirm':
                if (lowerMessage === 'confirm' || lowerMessage === 'yes' || lowerMessage === 'submit') {
                    // Check deal stock before confirming
                    if (booking.dealId && booking.dealInfo) {
                        const passengers = parseInt(booking.passengers) || 1;
                        // Reload deal info to get latest stock
                        const currentDeal = dealsData.find(d => d.auto_id === booking.dealId);
                        if (currentDeal && currentDeal.current_stock < passengers) {
                            return res.json({
                                response: `⚠️ Sorry! Deal ID ${booking.dealId} only has ${currentDeal.current_stock} seat(s) available, but you requested ${passengers}. Please choose another deal or reduce the number of passengers.`,
                                bookingStep: 'confirm'
                            });
                        }
                    }
                    
                    booking.status = 'confirmed';
                    booking.bookingDate = new Date().toISOString();
                    const saved = await saveBooking(booking);
                    bookingSessions.delete(sessionId);
                    
                    let confirmMessage = `✅ <strong>Booking Confirmed!</strong><br><br>`;
                    if (booking.dealId) {
                        const updatedDeal = dealsData.find(d => d.auto_id === booking.dealId);
                        confirmMessage += `💰 <strong>Deal ID ${booking.dealId} Applied!</strong><br>Stock updated: ${updatedDeal ? updatedDeal.current_stock + (parseInt(booking.passengers) || 1) : 'N/A'} → ${updatedDeal ? updatedDeal.current_stock : 'N/A'}<br><br>`;
                    }
                    confirmMessage += `Your flight booking has been submitted successfully!<br><br>
<strong>Booking Reference:</strong> ${saved.filename}<br>
<strong>Route:</strong> ${booking.fromCity} → ${booking.toCity}<br>
<strong>Departure:</strong> ${booking.departureDate}<br><br>
You will receive a confirmation email at ${booking.email} shortly.<br><br>
Thank you for choosing Chalo India! 🇮🇳✈️`;
                    
                    return res.json({
                        response: confirmMessage,
                        bookingStep: 'completed',
                        bookingReference: saved.filename
                    });
                } else if (lowerMessage === 'cancel' || lowerMessage === 'no') {
                    bookingSessions.delete(sessionId);
                    return res.json({
                        response: 'Booking cancelled. You can start a new booking anytime by typing "book flight"!',
                        bookingStep: 'cancelled'
                    });
                } else {
                    return res.json({
                        response: 'Please type "confirm" to submit your booking or "cancel" to start over',
                        bookingStep: 'confirm'
                    });
                }
                
            default:
                booking.step = null;
                bookingSessions.set(sessionId, booking);
                return res.json({
                    response: 'Booking session reset. Type "book flight" to start a new booking.',
                    bookingStep: null
                });
        }
    } catch (error) {
        console.error('Error in booking step:', error);
        return res.json({
            response: 'An error occurred. Please type "book flight" to start over.',
            bookingStep: null
        });
    }
}

// Chat endpoint with RAG
app.post('/api/chat', async (req, res) => {
    console.log('=== Chat Request Received ===');
    console.log('Request body:', JSON.stringify(req.body));
    
    const sessionId = req.body.sessionId || 'default';
    
    try {
        const userMessage = req.body.message;
        console.log('User message:', userMessage);

        if (!userMessage) {
            console.log('Error: No message provided');
            return res.status(400).json({ error: 'Message is required' });
        }

        // Handle simple greetings FIRST (before checking ragChain)
        const lowerMessage = userMessage.toLowerCase().trim();
        
        // Greetings
        if (lowerMessage === 'hi' || lowerMessage === 'hello' || lowerMessage === 'hey' || 
            lowerMessage === 'hi there' || lowerMessage === 'hello there') {
            console.log('Handling greeting: hi/hello');
            return res.json({ 
                response: 'Hello! 👋 Welcome to Chalo India Flight Booking! I\'m here to help you with flight bookings, cancellations, privacy policies, terms & conditions, and any questions about our services. How can I assist you today?' 
            });
        }
        
        // Help requests
        if (lowerMessage === 'help' || lowerMessage === 'what can you do' || 
            lowerMessage === 'what do you do' || lowerMessage === 'how can you help') {
            console.log('Handling help request');
            return res.json({ 
                response: `I can help you with:<br><br>
                ✈️ <strong>Flight Booking</strong> - Book flights between India and Australia (type "book flight" to start)<br>
                💰 <strong>Special Deals</strong> - View exclusive Chalo India deals (type "deals" or "show deals")<br>
                ❌ <strong>Cancellation Policy</strong> - Details about cancellation rules and refunds<br>
                🔒 <strong>Privacy Policy</strong> - Information about how we handle your data<br>
                📋 <strong>Terms & Conditions</strong> - Our booking terms and policies<br>
                🏢 <strong>Company Information</strong> - About Chalo India and our services<br><br>
                Just ask me any question about these topics!` 
            });
        }
        
        // Initialize booking session
        if (!bookingSessions.has(sessionId)) {
            bookingSessions.set(sessionId, {
                step: null,
                name: '',
                email: '',
                mobile: '',
                passport: '',
                fromCountry: '',
                fromCity: '',
                toCountry: '',
                toCity: '',
                departureDate: '',
                returnDate: '',
                passengers: '',
                travelClass: ''
            });
        }
        
        const booking = bookingSessions.get(sessionId);
        
        // Check if booking with deal ID - MUST CHECK BEFORE DEALS REQUEST HANDLER
        const dealIdMatch = userMessage.match(/\bdeal\s*(?:id|#)?\s*:?\s*(\d+)/i) || 
                           userMessage.match(/\b(\d+)\s*(?:deal|id)/i);
        let dealId = null;
        if (dealIdMatch) {
            dealId = parseInt(dealIdMatch[1]);
            const deal = dealsData.find(d => d.auto_id === dealId);
            if (deal && deal.current_stock > 0) {
                booking.dealId = dealId;
                booking.dealInfo = deal;
            } else if (deal) {
                return res.json({
                    response: `⚠️ Deal ID ${dealId} is currently out of stock. Please choose another deal or start a regular booking.`
                });
            } else {
                return res.json({
                    response: `⚠️ Deal ID ${dealId} not found. Please check the deal ID and try again, or start a regular booking.`
                });
            }
        }
        
        // Start booking flow - CHECK THIS BEFORE DEALS HANDLER
        if ((lowerMessage.includes('book') && (lowerMessage.includes('flight') || lowerMessage.includes('deal') || dealIdMatch)) || 
            lowerMessage === 'book' || lowerMessage === 'booking' ||
            lowerMessage.includes('i want to book') || lowerMessage.includes('book a ticket')) {
            booking.step = 'name';
            if (dealId) {
                booking.dealId = dealId;
                const deal = dealsData.find(d => d.auto_id === dealId);
                if (deal) {
                    booking.dealInfo = deal;
                    // Auto-set route from deal
                    const routeParts = deal.route.split('-');
                    booking.fromCity = routeParts[0]; // e.g., DEL
                    booking.toCity = routeParts[1];   // e.g., MEL
                    
                    // Determine countries from city codes
                    const indiaCities = ['DEL', 'BOM', 'BLR', 'MAA', 'CCU', 'HYD', 'AMD', 'PNQ', 'GOI', 'JAI'];
                    const australiaCities = ['MEL', 'SYD', 'ADL', 'BNE', 'PER', 'CBR', 'DRW', 'HBA', 'OOL', 'CNS'];
                    
                    if (indiaCities.includes(booking.fromCity)) {
                        booking.fromCountry = 'india';
                    } else if (australiaCities.includes(booking.fromCity)) {
                        booking.fromCountry = 'australia';
                    }
                    
                    if (indiaCities.includes(booking.toCity)) {
                        booking.toCountry = 'india';
                    } else if (australiaCities.includes(booking.toCity)) {
                        booking.toCountry = 'australia';
                    }
                    
                    bookingSessions.set(sessionId, booking);
                    return res.json({ 
                        response: `Great! I'll help you book Deal ID ${dealId}.<br><br><strong>Deal Details:</strong><br>Route: ${deal.route}<br>Price: AUD $${deal.aud_fare}${deal.ind_fare ? ` (₹${deal.ind_fare})` : ''}<br>Available Seats: ${deal.current_stock}<br>Airline: ${deal.airline_code}<br><br>Since you're booking a specific deal, the route is already set. Let's collect your details:<br><br><strong>Step 1:</strong> What is your full name?`,
                        bookingStep: 'name',
                        dealId: dealId
                    });
                }
            }
            bookingSessions.set(sessionId, booking);
            return res.json({ 
                response: 'Great! I\'ll help you book a flight. Let\'s start with your details.<br><br><strong>Step 1:</strong> What is your full name?',
                bookingStep: 'name'
            });
        }
        
        // Deals requests - ONLY if not booking
        if ((lowerMessage.includes('deal') || lowerMessage.includes('offer') || 
            lowerMessage.includes('discount') || lowerMessage.includes('price') ||
            lowerMessage.includes('fare') || lowerMessage.includes('cheap')) && 
            !lowerMessage.includes('book')) {
            console.log('Handling deals request');
            const deals = searchDeals(userMessage);
            
            if (deals.length === 0) {
                return res.json({
                    response: `I couldn't find any deals matching your search. Try asking:<br>
                    • "Show me deals"<br>
                    • "Lowest fare deals from Melbourne to Delhi"<br>
                    • "Deals in December"<br>
                    • "Best prices for Sydney to Mumbai"`
                });
            }
            
            let dealsHTML = `<strong>💰 Chalo India Special Deals</strong><br><br>`;
            dealsHTML += `Found ${deals.length} deal(s) matching your search:<br><br>`;
            
            deals.forEach((deal, index) => {
                const routeParts = deal.route.split('-');
                const fromCity = routeParts[0];
                const toCity = routeParts[1];
                const date = new Date(deal.dep_date);
                const formattedDate = date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
                
                dealsHTML += `
                <div style="background:#fff9f0;border-left:4px solid #f16528;padding:12px;margin:8px 0;border-radius:4px;">
                    <strong>Deal ID: ${deal.auto_id}</strong> | PNR: ${deal.pnr}<br>
                    <strong>Route:</strong> ${fromCity} → ${toCity}<br>
                    <strong>Date:</strong> ${formattedDate}<br>
                    <strong>Airline:</strong> ${deal.airline_code} | <strong>Flights:</strong> ${deal.flight1}${deal.flight2 !== deal.flight1 ? ' + ' + deal.flight2 : ''}<br>
                    <strong>Price:</strong> AUD $${deal.aud_fare}${deal.ind_fare ? ` (₹${deal.ind_fare})` : ''}<br>
                    <strong>Available Seats:</strong> ${deal.current_stock} of ${deal.original_stock}<br>
                    <strong>Type:</strong> ${deal.route_type}
                </div>`;
            });
            
            dealsHTML += `<br>💡 <strong>To book any of these deals, type "book deal id X" (where X is the Deal ID)!</strong>`;
            
            return res.json({
                response: dealsHTML,
                deals: deals
            });
        }
        
        // Handle booking steps - CHECK THIS FIRST for active bookings
        if (booking.step) {
            console.log(`Handling booking step: ${booking.step}`);
            return await handleBookingStep(req, res, sessionId, booking, userMessage, lowerMessage);
        }
        
        // Thank you responses
        if (lowerMessage === 'thanks' || lowerMessage === 'thank you' || 
            lowerMessage === 'thankyou' || lowerMessage === 'ty') {
            console.log('Handling thank you');
            return res.json({ 
                response: 'You\'re welcome! 😊 Is there anything else I can help you with?' 
            });
        }
        
        // Goodbye
        if (lowerMessage === 'bye' || lowerMessage === 'goodbye' || 
            lowerMessage === 'see you' || lowerMessage === 'see ya') {
            console.log('Handling goodbye');
            return res.json({ 
                response: 'Goodbye! 👋 Have a great day and safe travels with Chalo India!' 
            });
        }
        
        // Identity questions (who are you, what are you)
        if (lowerMessage === 'who are you' || lowerMessage === 'who are you?' ||
            lowerMessage === 'what are you' || lowerMessage === 'what are you?' ||
            lowerMessage.startsWith('who are you') || lowerMessage.startsWith('what are you')) {
            console.log('Handling identity question');
            return res.json({ 
                response: `I'm the Chalo India chatbot! 🤖✈️ I'm here to help you with all your flight booking questions.<br><br>
                I can assist you with:<br>
                • Flight booking information<br>
                • Cancellation policies and refunds<br>
                • Privacy policy questions<br>
                • Terms and conditions<br>
                • General inquiries about Chalo India<br><br>
                How can I help you today?` 
            });
        }
        
        // What/Who questions about the company
        if (lowerMessage.startsWith('what is chalo india') || 
            lowerMessage.startsWith('who is chalo india') ||
            lowerMessage.startsWith('tell me about chalo india') ||
            lowerMessage.startsWith('tell me about chalo') ||
            (lowerMessage.includes('tell me about') && lowerMessage.includes('chalo')) ||
            lowerMessage === 'what is this' || lowerMessage === 'what is chalo' ||
            lowerMessage === 'about chalo india' || lowerMessage === 'about chalo') {
            console.log('Handling company question');
            return res.json({ 
                response: `Chalo India is a premier flight booking service specializing in flights between India and Australia. 🇮🇳✈️<br><br>
                <strong>Our Mission:</strong> To connect India and Australia through seamless, affordable air travel while providing exceptional customer service.<br><br>
                <strong>Our Services:</strong><br>
                • One-way and return flight bookings<br>
                • Multiple route options between India and Australia<br>
                • Flexible booking options with various travel classes (Economy, Business, First)<br>
                • 24/7 customer support<br>
                • Easy cancellation and modification policies<br>
                • Secure payment processing<br><br>
                <strong>Why Choose Us:</strong> Competitive pricing, wide network of routes, user-friendly platform, and dedicated customer support.<br><br>
                You can ask me about our booking process, cancellation policies, privacy policy, or terms & conditions!` 
            });
        }

        if (!ragChain) {
            console.log('Warning: RAG chain not initialized, using fallback');
            return res.json({ 
                response: 'Hello! I\'m the Chalo India chatbot. I can help you with flight bookings, cancellations, privacy policies, and terms & conditions. How can I assist you today?'
            });
        }

        // Use RAG chain to get response
        console.log(`Processing query with RAG: "${userMessage}"`);
        
        try {
            // Get relevant documents first (use text-based retrieval to avoid embedding delays)
            let relevantDocs = [];
            try {
                relevantDocs = await retriever.getRelevantDocuments(userMessage);
                console.log(`Retrieved ${relevantDocs.length} relevant document chunks`);
            } catch (retrievalError) {
                console.log('Retrieval error, using empty context:', retrievalError.message);
                relevantDocs = []; // Continue with empty context, Gemini can still answer
            }
            
            // Format documents for context
            const formatDocs = (docs) => {
                if (docs.length === 0) {
                    return 'No specific documentation available for this question.';
                }
                return docs.map((doc, i) => {
                    return `[Document ${i + 1} - ${doc.metadata.title || doc.metadata.source}]\n${doc.pageContent}`;
                }).join('\n\n---\n\n');
            };
            
            const context = formatDocs(relevantDocs);
            
            // Create prompt with context
            const prompt = `You are a helpful and friendly customer service chatbot for Chalo India, a flight booking service specializing in flights between India and Australia.

You can answer questions in two ways:
1. If relevant information is in the context below, use it to provide accurate answers
2. If the question is not in the context, use your general knowledge to provide helpful answers about flight booking, travel, or Chalo India services

IMPORTANT: You can answer general questions about flight booking, booking processes, travel, etc. even if not in the context. Be helpful and informative.

Context from documentation (if available):
${context}

User Question: ${userMessage}

Provide a clear, concise, and helpful answer. Format your response in HTML where appropriate for better readability (use <br> for line breaks, <strong> for emphasis, etc.). Be professional, friendly, and conversational.

If the user asks about booking a flight, explain the process even if not in the context. If they ask general travel questions, provide helpful information.

Answer:`;
            
            // Use LLM directly to generate response
            const response = await llm.invoke(prompt);
            const responseText = typeof response === 'string' ? response : response.content;
            
            console.log(`Response generated successfully`);
            res.json({ response: responseText });
        } catch (ragError) {
            console.error('RAG chain error:', ragError.message);
            
            // If RAG fails due to embedding quota, try using LLM directly without embeddings
            const lowerMsg = userMessage.toLowerCase();
            
            // Check if it's a general knowledge question that should use Gemini
            if (lowerMsg.includes('australia') || lowerMsg.includes('india') || 
                lowerMsg.includes('know') || lowerMsg.includes('tell me about') ||
                lowerMsg.includes('what is') || lowerMsg.includes('where is') ||
                lowerMsg.includes('how') || lowerMsg.includes('why') ||
                lowerMsg.includes('when') || lowerMsg.includes('explain')) {
                
                console.log('Using Gemini LLM directly for general knowledge question');
                try {
                    const generalPrompt = `You are a helpful customer service chatbot for Chalo India, a flight booking service between India and Australia. 

The user asked: ${userMessage}

Provide a helpful, informative answer. If the question is about Australia, India, travel, or flight booking, provide detailed information. Be friendly and conversational. Format your response in HTML where appropriate (use <br> for line breaks, <strong> for emphasis).

Answer:`;
                    
                    const directResponse = await llm.invoke(generalPrompt);
                    const directResponseText = typeof directResponse === 'string' ? directResponse : directResponse.content;
                    
                    console.log('Direct LLM response generated');
                    return res.json({ response: directResponseText });
                } catch (llmError) {
                    console.error('Direct LLM error:', llmError.message);
                    // Fall through to keyword-based fallback
                }
            }
            
            // If LLM also fails, use keyword-based fallback
            let fallbackResponse = '';
            
            // Check for identity questions first
            if (lowerMsg.includes('who are you') || lowerMsg.includes('what are you')) {
                fallbackResponse = `I'm the Chalo India chatbot! 🤖✈️ I'm here to help you with all your flight booking questions. I can assist you with flight booking information, cancellation policies, privacy policy questions, terms and conditions, and general inquiries about Chalo India. How can I help you today?`;
            } 
            // Check for company/about questions
            else if (lowerMsg.includes('chalo india') || (lowerMsg.includes('about') && lowerMsg.includes('chalo'))) {
                fallbackResponse = `Chalo India is a premier flight booking service specializing in flights between India and Australia. 🇮🇳✈️<br><br>
                We offer affordable, reliable, and convenient air travel solutions with excellent customer service. Our services include one-way and return flight bookings, multiple route options, flexible booking with various travel classes, and 24/7 customer support.<br><br>
                You can ask me about booking procedures, cancellation policies, privacy policy, or terms & conditions!`;
            } else if (lowerMsg.includes('cancel') || lowerMsg.includes('refund')) {
                fallbackResponse = 'For cancellation and refund information, please contact our support team at support@chaloindia.com or check our cancellation policy. Generally, cancellations made more than 48 hours before departure are eligible for refunds (minus processing fees).';
            } else if (lowerMsg.includes('book') || lowerMsg.includes('flight')) {
                fallbackResponse = 'To book a flight, visit our website or use our mobile app. Select your departure and destination cities (India or Australia), choose your travel dates, select passengers and class, then complete payment. You\'ll receive a confirmation email with your booking details.';
            } else if (lowerMsg.includes('privacy') || lowerMsg.includes('data')) {
                fallbackResponse = 'We collect personal information (name, email, phone), payment information, and travel preferences to process your bookings. We use SSL encryption to protect your data and do not sell your information to third parties. For more details, contact privacy@chaloindia.com.';
            } else if (lowerMsg.includes('term') || lowerMsg.includes('condition')) {
                fallbackResponse = 'Our terms include: full payment required at booking, valid travel documents needed, baggage allowances vary by class, and we act as an intermediary between you and the airline. For complete terms, visit our website or contact support.';
            } else if (lowerMsg.includes('book') || lowerMsg.includes('booking') || lowerMsg.includes('ticket')) {
                fallbackResponse = `Yes! I can help you with flight booking information. Here's how to book a flight with Chalo India:<br><br>
                <strong>Booking Process:</strong><br>
                1. Visit our website or use our mobile app<br>
                2. Select your departure city (India) and destination city (Australia) or vice versa<br>
                3. Choose your travel dates (one-way or return)<br>
                4. Select number of passengers and travel class (Economy, Business, or First)<br>
                5. Enter passenger details and contact information<br>
                6. Review your booking and make secure payment<br>
                7. Receive confirmation email with booking details<br><br>
                <strong>Available Routes:</strong> We offer flights between major cities in India (Delhi, Mumbai, Bangalore, Chennai, etc.) and Australia (Melbourne, Sydney, Adelaide, Brisbane, etc.)<br><br>
                For assistance with booking, contact support@chaloindia.com or visit our website!`;
            } else if (lowerMsg.includes('australia') || lowerMsg.includes('know australia')) {
                fallbackResponse = `Yes! I know about Australia! 🇦🇺<br><br>
                <strong>About Australia:</strong><br>
                Australia is a beautiful country and one of our main destinations for Chalo India flights!<br><br>
                <strong>Major Cities We Fly To:</strong><br>
                • Melbourne - Cultural capital with great food and arts scene<br>
                • Sydney - Famous for Opera House and Harbour Bridge<br>
                • Adelaide - Wine regions and festivals<br>
                • Brisbane - Gateway to Gold Coast<br>
                • Perth - Beautiful beaches and sunny weather<br>
                • Canberra - The capital city<br>
                • And more!<br><br>
                We offer flights from major Indian cities to all these Australian destinations. Would you like to know more about booking a flight to Australia?`;
            } else if (lowerMsg.includes('india')) {
                fallbackResponse = `Yes! I know about India! 🇮🇳<br><br>
                <strong>About India:</strong><br>
                India is a diverse and vibrant country, and one of our main departure points for Chalo India flights!<br><br>
                <strong>Major Cities We Fly From:</strong><br>
                • Delhi - The capital city<br>
                • Mumbai - Financial capital<br>
                • Bangalore - Tech hub<br>
                • Chennai - Cultural center<br>
                • Kolkata - City of joy<br>
                • Hyderabad - Pearl city<br>
                • And more!<br><br>
                We offer flights from all these Indian cities to Australia. Would you like to know more about booking a flight?`;
            } else {
                fallbackResponse = `I'm here to help with Chalo India flight booking questions! You can ask me about:<br>
• Flight booking procedures<br>
• Cancellation policies and refunds<br>
• Privacy policy and data handling<br>
• Terms and conditions<br>
• Company information<br>
• General travel and booking questions<br><br>
If you need immediate assistance, contact support@chaloindia.com`;
            }
            
            // Always return a response, never an error
            res.json({ response: fallbackResponse });
        }
    } catch (error) {
        console.error('Error in chat endpoint:', error);
        console.error('Error stack:', error.stack);
        
        // Final fallback - always return a response, never an error
        const lowerMsg = (req.body.message || '').toLowerCase();
        let finalResponse = 'Hello! I\'m the Chalo India chatbot. I can help you with flight bookings, cancellations, privacy policies, and terms & conditions. How can I assist you today?';
        
        if (lowerMsg.includes('who are you') || lowerMsg.includes('what are you')) {
            finalResponse = 'I\'m the Chalo India chatbot! I\'m here to help you with flight booking questions, cancellation policies, privacy policy, terms & conditions, and general inquiries. How can I assist you?';
        } else if (lowerMsg.includes('australia') || lowerMsg.includes('know australia')) {
            finalResponse = 'Yes! I know about Australia! 🇦🇺 It\'s one of our main destinations. We offer flights from major Indian cities to Australian cities like Melbourne, Sydney, Adelaide, Brisbane, Perth, and more. Would you like to know more about booking a flight to Australia?';
        } else if (lowerMsg.includes('india')) {
            finalResponse = 'Yes! I know about India! 🇮🇳 It\'s one of our main departure points. We offer flights from major Indian cities like Delhi, Mumbai, Bangalore, Chennai, Kolkata, and more to Australia. Would you like to know more about booking a flight?';
        } else if (lowerMsg.includes('chalo india') || lowerMsg.includes('about')) {
            finalResponse = 'Chalo India is a premier flight booking service specializing in flights between India and Australia. We offer affordable, reliable, and convenient air travel solutions. You can ask me about booking procedures, cancellation policies, privacy policy, or terms & conditions!';
        }
        
        res.json({ 
            response: finalResponse
        });
    }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok',
        ragInitialized: ragChain !== null,
        vectorStoreReady: vectorStore !== null,
        retrieverReady: retriever !== null,
        chunksLoaded: documentChunks.length
    });
});

// API Key status endpoint (for verification)
app.get('/api/credentials', (req, res) => {
    res.json({ 
        apiKeyConfigured: GEMINI_API_KEY ? true : false,
        apiKeyLength: GEMINI_API_KEY ? GEMINI_API_KEY.length : 0,
        apiKeyPrefix: GEMINI_API_KEY ? GEMINI_API_KEY.substring(0, 10) + '...' : 'Not set',
        projectNumber: '204982138599',
        status: 'API key is configured and ready'
    });
});

// Reload PDFs endpoint (for development)
app.post('/api/reload', async (req, res) => {
    try {
        console.log('Reloading PDFs...');
        await loadAndProcessPDFs();
        await loadDeals();
        res.json({ message: 'PDFs and deals reloaded successfully' });
    } catch (error) {
        console.error('Error reloading:', error);
        res.status(500).json({ error: 'Failed to reload', details: error.message });
    }
});

// Get deals endpoint
app.get('/api/deals', (req, res) => {
    const query = req.query.q || '';
    const deals = query ? searchDeals(query) : dealsData.slice(0, 10);
    res.json({ deals, total: dealsData.length });
});

// Admin endpoints
app.get('/api/admin/bookings', async (req, res) => {
    try {
        const bookingsDir = path.join(__dirname, 'bookings');
        
        // Check if bookings directory exists
        try {
            await fs.access(bookingsDir);
        } catch {
            return res.json({ bookings: [], total: 0 });
        }
        
        const files = await fs.readdir(bookingsDir);
        const jsonFiles = files.filter(f => f.endsWith('.json') && f.startsWith('booking-'));
        const bookings = [];
        
        for (const file of jsonFiles) {
            try {
                const filePath = path.join(bookingsDir, file);
                const content = await fs.readFile(filePath, 'utf8');
                if (content.trim()) {
                    const booking = JSON.parse(content);
                    // Add filename for reference
                    booking.filename = file;
                    bookings.push(booking);
                }
            } catch (err) {
                console.error(`Error reading ${file}:`, err.message);
                // Continue with other files
            }
        }
        
        // Sort by date (newest first)
        bookings.sort((a, b) => {
            const dateA = new Date(a.timestamp || a.bookingDate || 0);
            const dateB = new Date(b.timestamp || b.bookingDate || 0);
            return dateB - dateA;
        });
        
        console.log(`✓ Admin loaded ${bookings.length} bookings`);
        res.json({ bookings, total: bookings.length });
    } catch (error) {
        console.error('Error loading bookings:', error);
        res.status(500).json({ error: 'Failed to load bookings', details: error.message });
    }
});

app.get('/api/admin/deals', (req, res) => {
    res.json({ deals: dealsData, total: dealsData.length });
});

app.post('/api/admin/deals', async (req, res) => {
    try {
        const newDeal = req.body;
        
        // Generate auto_id
        const maxId = dealsData.length > 0 ? Math.max(...dealsData.map(d => d.auto_id)) : 0;
        newDeal.auto_id = maxId + 1;
        
        // Generate trip_id if not provided
        if (!newDeal.trip_id) {
            newDeal.trip_id = `${newDeal.route}-${newDeal.airline_code}${newDeal.flight1}-${newDeal.flight2 || newDeal.flight1}`;
        }
        
        // Set defaults
        newDeal.status = newDeal.status || 'active';
        newDeal.flight2 = newDeal.flight2 || newDeal.flight1;
        
        dealsData.push(newDeal);
        
        // Save to file
        const dealsFile = path.join(__dirname, 'deals', 'deals.json');
        await fs.writeFile(dealsFile, JSON.stringify(dealsData, null, 2));
        
        console.log(`✓ Admin added new deal: ${newDeal.auto_id}`);
        res.json({ success: true, deal: newDeal });
    } catch (error) {
        console.error('Error adding deal:', error);
        res.status(500).json({ error: 'Failed to add deal', details: error.message });
    }
});

app.delete('/api/admin/deals/:id', async (req, res) => {
    try {
        const dealId = parseInt(req.params.id);
        const index = dealsData.findIndex(d => d.auto_id === dealId);
        
        if (index === -1) {
            return res.status(404).json({ error: 'Deal not found' });
        }
        
        const deleted = dealsData.splice(index, 1)[0];
        
        // Save to file
        const dealsFile = path.join(__dirname, 'deals', 'deals.json');
        await fs.writeFile(dealsFile, JSON.stringify(dealsData, null, 2));
        
        console.log(`✓ Admin deleted deal: ${dealId}`);
        res.json({ success: true, deleted });
    } catch (error) {
        console.error('Error deleting deal:', error);
        res.status(500).json({ error: 'Failed to delete deal', details: error.message });
    }
});

app.put('/api/admin/deals/:id', async (req, res) => {
    try {
        const dealId = parseInt(req.params.id);
        const index = dealsData.findIndex(d => d.auto_id === dealId);
        
        if (index === -1) {
            return res.status(404).json({ error: 'Deal not found' });
        }
        
        // Update deal
        dealsData[index] = { ...dealsData[index], ...req.body, auto_id: dealId };
        
        // Save to file
        const dealsFile = path.join(__dirname, 'deals', 'deals.json');
        await fs.writeFile(dealsFile, JSON.stringify(dealsData, null, 2));
        
        console.log(`✓ Admin updated deal: ${dealId}`);
        res.json({ success: true, deal: dealsData[index] });
    } catch (error) {
        console.error('Error updating deal:', error);
        res.status(500).json({ error: 'Failed to update deal', details: error.message });
    }
});

// Start server
async function startServer() {
    await ensurePDFsDirectory();
    await loadAndProcessPDFs();
    await loadDeals();
    
    app.listen(PORT, () => {
        console.log(`\n🚀 Chalo India Chatbot Server is running!`);
        console.log(`📡 Server: http://localhost:${PORT}`);
        console.log(`💬 Chatbot: http://localhost:${PORT}/index.html`);
        console.log(`🔍 Health Check: http://localhost:${PORT}/api/health`);
        console.log(`💰 Deals Loaded: ${dealsData.length} deals available\n`);
    });
}

startServer().catch(console.error);
