# Flight Booking Flow Guide

## How to Book a Flight

### Step 1: Start Booking
Type: `book flight` or `book` or `booking`

### Step 2: Enter Your Details
The chatbot will ask you step by step:

1. **Full Name** - Enter your complete name
2. **Email Address** - Enter a valid email (e.g., name@example.com)
3. **Mobile Number** - Enter with country code (e.g., +91-1234567890)
4. **Passport Number** - Enter your passport number

### Step 3: Select Travel Route
5. **From Country** - Type "India" or "Australia"
6. **From City** - Select from top 10 cities:
   - **India**: Delhi, Mumbai, Bangalore, Chennai, Kolkata, Hyderabad, Ahmedabad, Pune, Goa, Jaipur
   - **Australia**: Melbourne, Sydney, Adelaide, Brisbane, Perth, Canberra, Darwin, Hobart, Gold Coast, Cairns
7. **To Country** - Automatically set to the other country
8. **To City** - Select from top 10 cities of destination country

### Step 4: Travel Details
9. **Departure Date** - Enter in DD/MM/YYYY format (e.g., 25/12/2024)
10. **Return Trip** - Type "yes" for return or "no" for one-way
11. **Return Date** - If return trip, enter return date (DD/MM/YYYY)
12. **Passengers** - Enter number (1-9)
13. **Travel Class** - Type "Economy", "Business", or "First"

### Step 5: Confirm Booking
14. **Review Summary** - Check all details
15. **Confirm** - Type "confirm" to submit or "cancel" to start over

## Example Booking Flow

```
You: book flight
Bot: Great! I'll help you book a flight. Let's start with your details.
     Step 1: What is your full name?

You: John Doe
Bot: Thanks John Doe!
     Step 2: What is your email address?

You: john@example.com
Bot: Got it!
     Step 3: What is your mobile number? (with country code)

You: +91-9876543210
Bot: Perfect!
     Step 4: What is your passport number?

You: A12345678
Bot: Great!
     Step 5: Where are you traveling from?
     Please type "India" or "Australia"

You: India
Bot: Select your departure city from India:
     [Shows 10 cities with numbers]
     Type the city number (1-10) or city name

You: 1
Bot: Selected: Delhi
     Step 6: Where are you traveling to?
     Please type "Australia"

You: Australia
Bot: Select your destination city in Australia:
     [Shows 10 cities with numbers]

You: 2
Bot: Selected: Sydney
     Step 7: What is your departure date?
     Please enter in format: DD/MM/YYYY (e.g., 25/12/2024)

You: 25/12/2024
Bot: Departure date: 25/12/2024
     Step 8: Is this a return trip?
     Type "yes" for return trip or "no" for one-way

You: yes
Bot: Great!
     Step 9: What is your return date?
     Please enter in format: DD/MM/YYYY (e.g., 05/01/2025)

You: 05/01/2025
Bot: Return date: 05/01/2025
     Step 10: How many passengers will be traveling? (1-9)

You: 2
Bot: 2 passenger(s)
     Step 11: What travel class would you prefer?
     Type "Economy", "Business", or "First"

You: Economy
Bot: [Shows booking summary]
     Type "confirm" to submit your booking or "cancel" to start over

You: confirm
Bot: ✅ Booking Confirmed!
     Your flight booking has been submitted successfully!
     [Booking details]
```

## Booking Storage

When you confirm a booking, it is saved to:
- **JSON File**: `bookings/booking-[timestamp].json` - Individual booking file
- **Text File**: `bookings/bookings.txt` - All bookings in one file

## Features

✅ Step-by-step guided booking process
✅ Interactive city selection (click or type)
✅ Validates email format
✅ Validates date format
✅ Shows booking summary before confirmation
✅ Saves to both JSON and text files
✅ Can cancel at any time

## Tips

- You can type city numbers (1-10) or city names
- Dates must be in DD/MM/YYYY format
- Email must include @ and .
- You can type "cancel" at any step to start over
- Booking is only saved when you type "confirm"

