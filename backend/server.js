require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const { authenticateToken } = require('./middleware/auth');
const { registerClientRoutes } = require('./routes/clients');
const pdfRouter = require('./routes/pdf');
const aiPipelineRouter = require('./routes/ai-pipeline');
const externalRouter = require('./routes/external');
const propertyDocumentsRouter = require('./routes/property-documents');
const mortgageRouter = require('./routes/mortgage');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Supabase client
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

// Register routes
app.use('/api', pdfRouter);
app.use('/api/ai-pipeline', aiPipelineRouter);
app.use('/api/external', externalRouter);
app.use('/api/property-documents', propertyDocumentsRouter);
app.use('/api/mortgage', mortgageRouter);
registerClientRoutes(app, supabase, authenticateToken);

// Root route
app.get('/', (req, res) => {
  res.send('OwnerIQ API');
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});