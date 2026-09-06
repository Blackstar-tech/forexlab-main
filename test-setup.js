// Setup file for test environment
process.env.NODE_ENV = "test";
process.env.GMAIL_USER = process.env.GMAIL_USER || "festadj6@gmail.com";
process.env.GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD || "testpassword";
process.env.NEXT_PUBLIC_APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
