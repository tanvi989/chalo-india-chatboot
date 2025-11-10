# 💰 Chalo India Deals Guide

## Overview
The Chalo India chatbot now supports special flight deals! Users can search for deals, view available offers, and book flights using specific deal IDs. When a deal is booked, the stock automatically decreases.

## 📋 Table of Contents
1. [How to View Deals](#how-to-view-deals)
2. [How to Search for Specific Deals](#how-to-search-for-specific-deals)
3. [How to Book with a Deal ID](#how-to-book-with-a-deal-id)
4. [Deal Stock Management](#deal-stock-management)
5. [Deal Data Structure](#deal-data-structure)
6. [Example Queries](#example-queries)

---

## How to View Deals

### Basic Deal Viewing
Simply ask the chatbot to show deals:

**Examples:**
- `show me deals`
- `deals`
- `what deals do you have?`
- `show available deals`

The chatbot will display all available deals with:
- Deal ID
- PNR
- Route (e.g., DEL-MEL)
- Departure Date
- Airline Code
- Flight Numbers
- Price (AUD and INR if available)
- Available Seats
- Route Type (Inbound/Outbound)

---

## How to Search for Specific Deals

### Search by Route
You can search for deals between specific cities:

**Examples:**
- `deals from melbourne to delhi`
- `show me deals from sydney to mumbai`
- `delhi to melbourne deals`
- `flights from bangalore to perth`

### Search by Month
Find deals for a specific month:

**Examples:**
- `deals in december`
- `show me november deals`
- `october flight deals`
- `deals available in january`

### Search by Price
Find the cheapest deals:

**Examples:**
- `lowest fare deals`
- `cheapest flights`
- `best prices`
- `lowest fare deals in december`

### Combined Searches
Combine multiple criteria:

**Examples:**
- `lowest fare deals in december for melbourne to delhi`
- `cheapest flights from sydney to mumbai in november`
- `best prices for delhi to melbourne in december`

---

## How to Book with a Deal ID

### Step 1: View Available Deals
First, ask to see deals:
```
User: show me deals
```

### Step 2: Start Booking with Deal ID
When you see a deal you like, start booking by mentioning the Deal ID:

**Examples:**
- `book deal id 1`
- `book deal 2`
- `i want to book deal id 3`
- `book flight deal 1`

### Step 3: Complete Booking Steps
The chatbot will guide you through the booking process:
1. **Name** - Enter your full name
2. **Email** - Enter your email address
3. **Mobile** - Enter your mobile number
4. **Passport** - Enter your passport number
5. **From Country** - Select India or Australia
6. **From City** - Select departure city (by number)
7. **To Country** - Select destination country
8. **To City** - Select destination city (by number)
9. **Departure Date** - Enter date (DD/MM/YYYY)
10. **Return Date** - Enter return date or "no" for one-way
11. **Passengers** - Enter number of passengers (1-9)
12. **Travel Class** - Select Economy, Business, or First

### Step 4: Review and Confirm
The booking summary will show:
- Deal ID and deal details
- Deal price
- Your personal information
- Route and dates
- Number of passengers

Type `confirm` to complete the booking.

---

## Deal Stock Management

### Automatic Stock Reduction
When a booking is confirmed with a deal ID:
- The stock automatically decreases by the number of passengers
- The `deals.json` file is updated immediately
- The server logs show the stock change

**Example:**
- Deal ID 1 has 10 seats available
- User books for 2 passengers
- Stock decreases: 10 → 8
- `deals.json` is updated automatically

### Stock Validation
The system validates stock before confirming:
- Checks if enough seats are available
- Prevents overbooking
- Shows error if insufficient stock

**Error Message Example:**
```
⚠️ Sorry! Deal ID 1 only has 2 seat(s) available, 
but you requested 4. Please choose another deal 
or reduce the number of passengers.
```

### Viewing Current Stock
When viewing deals, the current stock is displayed:
```
Available Seats: 3 of 10
```

---

## Deal Data Structure

### Location
Deals are stored in: `deals/deals.json`

### JSON Format
```json
{
  "auto_id": 1,
  "pnr": "6BYNXY",
  "dep_date": "2022-11-09",
  "trip_id": "DEL-MEL-SQ403-SQ207",
  "original_stock": 10,
  "current_stock": 1,
  "airline_code": "SQ",
  "route": "DEL-MEL",
  "aud_fare": 750,
  "ind_fare": null,
  "route_type": "Inbound",
  "flight1": "SQ403",
  "flight2": "SQ207",
  "status": "active"
}
```

### Fields Explained
- **auto_id**: Unique deal identifier (used for booking)
- **pnr**: Booking reference code
- **dep_date**: Departure date (YYYY-MM-DD)
- **trip_id**: Trip identifier
- **original_stock**: Initial number of seats
- **current_stock**: Current available seats (decreases on booking)
- **airline_code**: Airline code (SQ, QF, AI, etc.)
- **route**: Route code (e.g., "DEL-MEL")
- **aud_fare**: Price in Australian Dollars
- **ind_fare**: Price in Indian Rupees (optional)
- **route_type**: "Inbound" or "Outbound"
- **flight1**: First flight number
- **flight2**: Second flight number (if applicable)
- **status**: Deal status ("active" or "inactive")

---

## Example Queries

### Viewing Deals
```
User: show me deals
Bot: [Shows all available deals]

User: what deals are available?
Bot: [Shows all available deals]
```

### Searching Deals
```
User: lowest fare deals in december for melbourne to delhi
Bot: [Shows matching deals sorted by price]

User: deals from sydney to mumbai
Bot: [Shows deals for SYD-MUM route]

User: cheapest flights
Bot: [Shows all deals sorted by price]
```

### Booking with Deal ID
```
User: book deal id 1
Bot: Great! I'll help you book Deal ID 1.
     Deal Details:
     Route: DEL-MEL
     Price: AUD $750
     Available Seats: 10
     
     Step 1: What is your full name?

User: John Doe
Bot: Step 2: What is your email address?

[... continues through booking steps ...]

User: confirm
Bot: ✅ Booking Confirmed!
     💰 Deal ID 1 Applied!
     Stock updated: 10 → 9
     [Booking details...]
```

---

## Tips for Users

1. **Check Stock**: Always check available seats before booking
2. **Multiple Passengers**: Stock decreases by number of passengers
3. **Deal Expiry**: Deals are date-specific, check departure dates
4. **Route Matching**: Make sure the deal route matches your travel needs
5. **Price Comparison**: Use "lowest fare" queries to find best deals

---

## Tips for Developers

### Adding New Deals
1. Open `deals/deals.json`
2. Add new deal object with unique `auto_id`
3. Set `current_stock` equal to `original_stock`
4. Save file
5. Restart server or use `/api/reload` endpoint

### Updating Stock Manually
1. Edit `deals/deals.json`
2. Update `current_stock` value
3. Save file
4. Server will reload on next request (or restart)

### Monitoring Stock
- Check server logs for stock updates
- View `deals/deals.json` for current stock
- Check booking files in `bookings/` folder

### API Endpoints
- `GET /api/deals?q=query` - Search deals
- `POST /api/reload` - Reload deals and PDFs

---

## Troubleshooting

### Deal Not Found
**Problem**: "Deal ID X not found"
**Solution**: Check `deals/deals.json` for correct `auto_id`

### Out of Stock
**Problem**: "Deal ID X is currently out of stock"
**Solution**: Choose another deal or wait for stock update

### Stock Not Updating
**Problem**: Stock doesn't decrease after booking
**Solution**: 
- Check server logs for errors
- Verify `deals/deals.json` is writable
- Check booking confirmation was successful

---

## Support

For issues or questions about deals:
- Check server logs: `npm start` output
- Verify deals file: `deals/deals.json`
- Test API: `http://localhost:3000/api/deals`

---

**Last Updated**: November 2025
**Version**: 1.0


