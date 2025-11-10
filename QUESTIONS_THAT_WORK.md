# Questions That Work - Chalo India Chatbot

## ✅ General Questions (Work Immediately)

These questions work without needing the RAG system:

### Greetings
- `hi`
- `hello`
- `hey`
- `hi there`
- `hello there`

### Help Requests
- `help`
- `what can you do`
- `what do you do`
- `how can you help`

### Thank You
- `thanks`
- `thank you`
- `thankyou`
- `ty`

### Goodbye
- `bye`
- `goodbye`
- `see you`
- `see ya`

### Company Information
- `what is chalo india`
- `who is chalo india`
- `what is this`
- `what is chalo`

---

## 📚 Questions About PDF Content (Use RAG)

These questions will search through your PDF documents:

### Privacy Policy
- "What information do you collect?"
- "How do you use my personal information?"
- "What is your data security policy?"
- "Do you share my information with third parties?"
- "What are my privacy rights?"
- "Tell me about your privacy policy"

### Booking Information
- "How do I book a flight?"
- "What cities do you fly to?"
- "What travel classes are available?"
- "What do I need to complete a booking?"
- "What will I receive after booking?"
- "How to book a flight?"
- "What routes are available?"

### Cancellation Policy
- "What is your cancellation policy?"
- "How much refund will I get if I cancel?"
- "What are the cancellation timeframes?"
- "How do I cancel my booking?"
- "What happens if I don't show up for my flight?"
- "Can I get a refund?"

### Terms and Conditions
- "What are your booking terms?"
- "What are the payment terms?"
- "What travel documents do I need?"
- "What is your baggage policy?"
- "Can I change my flight?"
- "What are the terms and conditions?"

### Company Information
- "Tell me about Chalo India"
- "What is your mission?"
- "What services do you offer?"
- "Why should I choose Chalo India?"
- "How can I contact you?"

---

## 🔧 How It Works

1. **General Questions**: Handled directly without API calls
2. **Content Questions**: Uses RAG (Retrieval Augmented Generation) to search PDFs
3. **Fallback**: If RAG fails, provides keyword-based responses

---

## 💡 Tips

- Be specific in your questions for better results
- Use keywords like "booking", "cancellation", "privacy", "terms"
- The chatbot works best with questions related to the PDF content
- Simple greetings like "hi" and "help" work instantly!

---

## 🚀 Testing

Try these in order:
1. `hi` - Should get immediate greeting
2. `help` - Should see list of capabilities
3. `what is your cancellation policy?` - Should search PDFs
4. `thanks` - Should get thank you response

---

**Note**: The system uses text-based retrieval by default to avoid API quota issues. It will automatically use embeddings if available, but works perfectly fine without them!

