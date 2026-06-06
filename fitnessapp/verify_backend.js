require('dotenv').config();
const { GoogleGenAI } = require('@google/genai');
const nodemailer = require('nodemailer');

async function testBackend() {
  console.log('--- STARTING BACKEND INTEGRATION TEST FOR MAKE ME FIT ---');
  
  // 1. Verify environment variables
  console.log('Checking environment variables...');
  if (!process.env.GEMINI_API_KEY) {
    console.error('ERROR: GEMINI_API_KEY is not set in .env');
    process.exit(1);
  }
  console.log('GEMINI_API_KEY is present.');
  
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log('WARNING: SMTP credentials not fully set. Will fall back to Ethereal.');
  } else {
    console.log(`SMTP Configured. Host: ${process.env.SMTP_HOST}, From: ${process.env.SMTP_FROM}`);
  }

  // 2. Test Gemini API
  console.log('\nTesting Gemini API Connection (gemini-2.5-flash)...');
  try {
    const aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await aiClient.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: 'Write a 1-sentence welcome message from an elite personal trainer named Coach MakeMeFit.',
    });
    console.log('SUCCESS: Gemini API responded successfully!');
    console.log(`Response: "${response.text.trim()}"`);
  } catch (err) {
    console.error('ERROR: Gemini API call failed:', err.message);
    process.exit(1);
  }

  // 3. Test SMTP / Ethereal mail delivery
  console.log('\nTesting Email Delivery...');
  try {
    let transporter;
    const isSmtpConfigured = process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS;

    if (isSmtpConfigured) {
      transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: parseInt(process.env.SMTP_PORT) === 465,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
    } else {
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
    }

    const recipientEmail = isSmtpConfigured ? process.env.SMTP_USER : 'test@example.com';
    const mailOptions = {
      from: process.env.SMTP_FROM || '"Make me Fit Test" <trainer@makemefit.com>',
      to: recipientEmail,
      subject: 'Make me Fit Backend Integration Test Success',
      text: 'This is a successful test email from the Make me Fit setup verification script.',
      html: '<p>This is a successful test email from the <strong>Make me Fit</strong> setup verification script.</p>'
    };

    console.log(`Sending test email to: ${recipientEmail}...`);
    const info = await transporter.sendMail(mailOptions);
    console.log('SUCCESS: Email sent successfully!');
    console.log('Message ID:', info.messageId);
    
    if (!isSmtpConfigured) {
      console.log('Preview URL:', nodemailer.getTestMessageUrl(info));
    }
  } catch (err) {
    console.error('ERROR: Email delivery failed:', err.message);
    process.exit(1);
  }

  console.log('\n--- ALL BACKEND INTEGRATION TESTS PASSED ---');
}

testBackend();
