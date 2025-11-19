import cors from 'cors';

// Dynamically determine allowed origins based on environment
function getAllowedOrigins(): string[] {
  const origins: string[] = [];
  
  // Add custom origin from environment variable (for Railway or custom domains)
  if (process.env.FRONTEND_URL) {
    origins.push(process.env.FRONTEND_URL);
  }
  
  // Add Replit domains (both .dev and .app)
  if (process.env.REPL_SLUG && process.env.REPL_OWNER) {
    origins.push(`https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`);
    origins.push(`https://${process.env.REPL_SLUG}-${process.env.REPL_OWNER}.replit.app`);
  }
  
  // Add Railway public domain if available
  if (process.env.RAILWAY_PUBLIC_DOMAIN) {
    origins.push(`https://${process.env.RAILWAY_PUBLIC_DOMAIN}`);
  }
  
  // Add Railway static URL if available
  if (process.env.RAILWAY_STATIC_URL) {
    origins.push(process.env.RAILWAY_STATIC_URL);
  }
  
  // For development, allow localhost
  if (process.env.NODE_ENV === 'development') {
    origins.push('http://localhost:5000');
    origins.push('http://localhost:3000');
    origins.push('http://127.0.0.1:5000');
    origins.push('http://127.0.0.1:3000');
  }
  
  return origins;
}

// CORS configuration
export const corsConfig = cors({
  origin: (origin, callback) => {
    const allowedOrigins = getAllowedOrigins();
    
    // Allow requests with no origin (like mobile apps, curl, Postman)
    if (!origin) {
      return callback(null, true);
    }
    
    // Check if origin is in allowed list
    if (allowedOrigins.some(allowed => origin.startsWith(allowed))) {
      return callback(null, true);
    }
    
    // Also allow any Replit or Railway domain patterns
    if (
      origin.includes('.replit.dev') ||
      origin.includes('.replit.app') ||
      origin.includes('.repl.co') ||
      origin.includes('.railway.app') ||
      origin.includes('.up.railway.app')
    ) {
      return callback(null, true);
    }
    
    // Log rejected origins in development for debugging
    if (process.env.NODE_ENV === 'development') {
      console.warn(`CORS: Origin "${origin}" not allowed. Allowed origins:`, allowedOrigins);
    }
    
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true, // Allow cookies and authentication headers
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 86400, // 24 hours
});
