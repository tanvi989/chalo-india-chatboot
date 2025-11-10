const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// Ensure pdfs directory exists
const pdfsDir = path.join(__dirname, 'pdfs');
if (!fs.existsSync(pdfsDir)) {
    fs.mkdirSync(pdfsDir, { recursive: true });
}

// Helper function to create PDF with better compatibility
function createPDF(filename, title, content) {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({
            autoFirstPage: true,
            margins: { top: 50, bottom: 50, left: 50, right: 50 }
        });
        const filePath = path.join(pdfsDir, filename);
        const stream = fs.createWriteStream(filePath);
        
        doc.pipe(stream);
        
        // Add title
        doc.fontSize(20)
           .font('Helvetica-Bold')
           .text(title, { align: 'center' });
        doc.moveDown(2);
        
        // Add content
        doc.font('Helvetica')
           .fontSize(12);
        
        content.forEach(section => {
            if (section.title) {
                doc.fontSize(14)
                   .font('Helvetica-Bold')
                   .text(section.title);
                doc.moveDown(0.5);
                doc.font('Helvetica')
                   .fontSize(12);
            }
            if (section.text) {
                doc.text(section.text, {
                    align: 'left',
                    lineGap: 5
                });
                doc.moveDown();
            }
            if (section.list) {
                section.list.forEach(item => {
                    doc.text(`• ${item}`, { 
                        indent: 20,
                        lineGap: 3
                    });
                });
                doc.moveDown();
            }
        });
        
        // Finalize PDF
        doc.end();
        
        stream.on('finish', () => {
            console.log(`✓ Created ${filename}`);
            resolve();
        });
        stream.on('error', (err) => {
            console.error(`Error creating ${filename}:`, err);
            reject(err);
        });
    });
}

// Create all PDFs
async function createAllPDFs() {
    console.log('Creating sample PDF files...\n');

    // 1. Privacy Policy PDF
    await createPDF('privacy.pdf', 'Chalo India - Privacy Policy', [
        {
            title: '1. Information We Collect',
            text: 'Chalo India collects the following information when you use our flight booking services:'
        },
        {
            list: [
                'Personal Information: Name, email address, phone number, date of birth',
                'Payment Information: Credit card details, billing address (securely processed)',
                'Travel Information: Flight preferences, booking history, passport details',
                'Device Information: IP address, browser type, device information'
            ]
        },
        {
            title: '2. How We Use Your Information',
            text: 'We use your information to:'
        },
        {
            list: [
                'Process and manage your flight bookings',
                'Send booking confirmations and travel updates',
                'Improve our services and customer experience',
                'Comply with legal requirements and prevent fraud'
            ]
        },
        {
            title: '3. Data Security',
            text: 'We implement industry-standard security measures to protect your personal information. All payment transactions are encrypted using SSL technology.'
        },
        {
            title: '4. Third-Party Sharing',
            text: 'We may share your information with airlines, payment processors, and service providers necessary to complete your booking. We do not sell your personal information to third parties.'
        },
        {
            title: '5. Your Rights',
            text: 'You have the right to access, update, or delete your personal information. Contact us at privacy@chaloindia.com for any privacy-related inquiries.'
        }
    ]);

    // 2. Booking Information PDF
    await createPDF('booking.pdf', 'Chalo India - Flight Booking Guide', [
        {
            title: 'How to Book a Flight',
            text: 'Booking a flight with Chalo India is simple and straightforward:'
        },
        {
            list: [
                'Visit our website or use our mobile app',
                'Select your departure and destination cities (India or Australia)',
                'Choose your travel dates (one-way or return)',
                'Select number of passengers and travel class',
                'Enter passenger details and contact information',
                'Review your booking and make payment',
                'Receive confirmation email with booking details'
            ]
        },
        {
            title: 'Available Routes',
            text: 'We offer flights between major cities in India and Australia:'
        },
        {
            list: [
                'India: Delhi, Mumbai, Bangalore, Chennai, Kolkata, Hyderabad, Ahmedabad, Pune, Goa, Jaipur',
                'Australia: Melbourne, Sydney, Adelaide, Brisbane, Perth, Canberra, Darwin, Hobart, Gold Coast, Cairns'
            ]
        },
        {
            title: 'Travel Classes',
            text: 'We offer three travel classes:'
        },
        {
            list: [
                'Economy Class: Comfortable seating with standard amenities',
                'Business Class: Premium seating with extra legroom and priority services',
                'First Class: Luxury experience with exclusive services and amenities'
            ]
        },
        {
            title: 'Booking Requirements',
            text: 'To complete your booking, you will need:'
        },
        {
            list: [
                'Valid passport (for international travel)',
                'Email address for confirmation',
                'Phone number for travel updates',
                'Payment method (credit/debit card)'
            ]
        },
        {
            title: 'Booking Confirmation',
            text: 'After successful booking, you will receive:'
        },
        {
            list: [
                'Booking confirmation email with PNR number',
                'E-ticket with flight details',
                'Check-in instructions',
                'Baggage allowance information'
            ]
        }
    ]);

    // 3. Chalo India Company Information PDF
    await createPDF('chaloindia.pdf', 'Chalo India - About Us', [
        {
            title: 'Welcome to Chalo India',
            text: 'Chalo India is a premier flight booking service specializing in flights between India and Australia. We are committed to providing affordable, reliable, and convenient air travel solutions.'
        },
        {
            title: 'Our Mission',
            text: 'To connect India and Australia through seamless, affordable air travel while providing exceptional customer service and support.'
        },
        {
            title: 'Our Services',
            text: 'We offer comprehensive flight booking services:'
        },
        {
            list: [
                'One-way and return flight bookings',
                'Multiple route options between India and Australia',
                'Flexible booking options with various travel classes',
                '24/7 customer support',
                'Easy cancellation and modification policies',
                'Secure payment processing'
            ]
        },
        {
            title: 'Why Choose Chalo India?',
            text: 'We stand out because of:'
        },
        {
            list: [
                'Competitive pricing and special offers',
                'Wide network of routes',
                'User-friendly booking platform',
                'Dedicated customer support team',
                'Transparent policies and terms',
                'Secure and reliable booking system'
            ]
        },
        {
            title: 'Contact Information',
            text: 'Reach out to us:'
        },
        {
            list: [
                'Email: support@chaloindia.com',
                'Phone: +91-XXX-XXXX-XXXX (India) / +61-XXX-XXX-XXX (Australia)',
                'Website: www.chaloindia.com',
                'Customer Support: Available 24/7'
            ]
        },
        {
            title: 'Our Commitment',
            text: 'We are committed to providing you with the best travel experience. Your satisfaction is our priority, and we continuously work to improve our services based on your feedback.'
        }
    ]);

    // 4. Cancellation Policy PDF
    await createPDF('cancellation.pdf', 'Chalo India - Cancellation Policy', [
        {
            title: 'Cancellation Rules',
            text: 'Understanding our cancellation policy helps you make informed decisions about your bookings.'
        },
        {
            title: '1. Cancellation Timeframes',
            text: 'Cancellation charges depend on when you cancel:'
        },
        {
            list: [
                'More than 48 hours before departure: Full refund (minus processing fee)',
                '24-48 hours before departure: 50% refund',
                'Less than 24 hours before departure: No refund (except in special circumstances)'
            ]
        },
        {
            title: '2. Processing Fees',
            text: 'A processing fee of $25 (or equivalent in local currency) applies to all cancellations. This fee covers administrative costs.'
        },
        {
            title: '3. Refund Processing',
            text: 'Refunds are processed within 7-14 business days to the original payment method. You will receive an email confirmation once the refund is initiated.'
        },
        {
            title: '4. Special Circumstances',
            text: 'Full refunds may be available in the following cases:'
        },
        {
            list: [
                'Flight cancellation by airline',
                'Medical emergencies (with valid documentation)',
                'Natural disasters or travel restrictions',
                'Death in immediate family (with documentation)'
            ]
        },
        {
            title: '5. How to Cancel',
            text: 'You can cancel your booking through:'
        },
        {
            list: [
                'Our website: Log in and go to "My Bookings"',
                'Mobile app: Navigate to your booking and select cancel',
                'Customer support: Call or email our support team',
                'Email: Send cancellation request to support@chaloindia.com'
            ]
        },
        {
            title: '6. Partial Cancellations',
            text: 'For return flights, you can cancel individual segments. Cancellation charges apply to each segment separately based on the cancellation timeframe.'
        },
        {
            title: '7. No-Show Policy',
            text: 'If you do not show up for your flight without prior cancellation, no refund will be provided. We recommend canceling at least 24 hours in advance.'
        }
    ]);

    // 5. Terms and Conditions PDF
    await createPDF('terms.pdf', 'Chalo India - Terms and Conditions', [
        {
            title: '1. Acceptance of Terms',
            text: 'By using Chalo India services, you agree to be bound by these terms and conditions. Please read them carefully before making a booking.'
        },
        {
            title: '2. Booking Terms',
            text: 'When you make a booking:'
        },
        {
            list: [
                'You confirm that all information provided is accurate',
                'You are responsible for ensuring travel documents are valid',
                'You agree to pay all applicable fees and charges',
                'You understand that prices are subject to change until payment is confirmed'
            ]
        },
        {
            title: '3. Payment Terms',
            text: 'Payment terms include:'
        },
        {
            list: [
                'Full payment is required at the time of booking',
                'We accept major credit cards and debit cards',
                'All prices are in USD unless otherwise stated',
                'Additional fees may apply for certain services'
            ]
        },
        {
            title: '4. Travel Documents',
            text: 'Passengers are responsible for:'
        },
        {
            list: [
                'Valid passport with at least 6 months validity',
                'Required visas for destination country',
                'Any health certificates or vaccinations',
                'Carrying all necessary travel documents'
            ]
        },
        {
            title: '5. Baggage Policy',
            text: 'Baggage allowances vary by airline and travel class:'
        },
        {
            list: [
                'Economy: Typically 20-23 kg checked baggage',
                'Business: Typically 30-32 kg checked baggage',
                'First: Typically 40 kg checked baggage',
                'Carry-on: Usually 7-10 kg (varies by airline)'
            ]
        },
        {
            title: '6. Flight Changes',
            text: 'Flight changes are subject to:'
        },
        {
            list: [
                'Availability on the requested flight',
                'Change fees as per airline policy',
                'Fare difference if applicable',
                'Advance notice requirements'
            ]
        },
        {
            title: '7. Liability',
            text: 'Chalo India acts as an intermediary between you and the airline. We are not liable for flight delays, cancellations, or other issues that are the responsibility of the airline.'
        },
        {
            title: '8. Dispute Resolution',
            text: 'Any disputes will be resolved through arbitration in accordance with the laws of the jurisdiction where the booking was made.'
        },
        {
            title: '9. Modifications to Terms',
            text: 'We reserve the right to modify these terms at any time. Continued use of our services constitutes acceptance of modified terms.'
        }
    ]);

    console.log('\n✅ All sample PDF files created successfully!');
    console.log('📁 Location: pdfs/ folder\n');
}

// Run the script
createAllPDFs().catch(console.error);

