// server.custom.js — Wrapper for Next.js standalone server
// Increases HTTP timeouts for large file uploads + AI processing (10 min)
const http = require('http');

// Monkey-patch http.createServer BEFORE Next.js creates its server
const origCreateServer = http.createServer;
http.createServer = function(...args) {
  const server = origCreateServer.apply(this, args);
  
  // Set generous timeouts for large PDF upload + AI content generation
  server.timeout = 600000;          // 10 minutes (default: 2 min)
  server.headersTimeout = 610000;   // 10 min + 10s (must be > timeout)
  server.requestTimeout = 600000;   // 10 minutes request timeout
  server.keepAliveTimeout = 65000;  // 65 seconds keep-alive
  
  console.log('[Manhaj] Server timeouts: 10 min (for AI content generation)');
  return server;
};

// Now require the original Next.js standalone server
// It will use our patched createServer with the increased timeouts
require('./server.js');
