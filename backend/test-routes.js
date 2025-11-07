const express = require('express');
const pdfRouter = require('./routes/pdf');

const app = express();

console.log('\n=== Testing PDF Router ===');
console.log('pdfRouter type:', typeof pdfRouter);
console.log('pdfRouter constructor:', pdfRouter.constructor.name);

// Try mounting the router
app.use('/api', pdfRouter);

// List all registered routes
console.log('\n=== Registered Routes ===');
function printRoutes(stack, prefix = '') {
  stack.forEach((middleware) => {
    if (middleware.route) {
      // Route registered directly on the app
      const methods = Object.keys(middleware.route.methods).join(', ').toUpperCase();
      console.log(`${methods} ${prefix}${middleware.route.path}`);
    } else if (middleware.name === 'router') {
      // Router middleware
      console.log(`\nRouter mounted at: ${prefix}${middleware.regexp}`);
      if (middleware.handle.stack) {
        printRoutes(middleware.handle.stack, prefix + middleware.regexp.source.replace(/\\/g, '').replace(/\^|\$/g, '').replace(/\?\(\?=\\\/\|\$\)/g, ''));
      }
    }
  });
}

printRoutes(app._router.stack);

console.log('\n=== Test Complete ===\n');