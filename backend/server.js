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
const helocRouter = require('./routes/heloc');
const { registerOnboardingRoutes } = require('./routes/onboarding');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    // Allow any localhost origin
    if (origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1')) {
      return callback(null, true);
    }
    const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
    return callback(new Error(msg), false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-demo-mode']
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Supabase client
// Supabase client
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
app.locals.supabase = supabase;

// Supabase Admin client (Service Role) - Bypasses RLS
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const supabaseAdmin = createClient(process.env.SUPABASE_URL, serviceRoleKey);
app.locals.supabaseAdmin = supabaseAdmin;

// Register routes
app.use('/api', pdfRouter);
app.use('/api/ai-pipeline', aiPipelineRouter);
app.use('/api/external', externalRouter);
app.use('/api/property-documents', propertyDocumentsRouter);
app.use('/api/mortgage', mortgageRouter);
app.use('/api/heloc', authenticateToken, helocRouter);
app.use('/api/events', require('./routes/events'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/admin', require('./routes/admin-save')); // Save extracted data to tables
app.use('/api/admin', require('./routes/admin-process-all')); // Process all documents automatically
app.use('/api/admin', require('./routes/admin-process-logs')); // View process logs
registerOnboardingRoutes(app, supabase, authenticateToken);
registerClientRoutes(app, supabase, authenticateToken);

// Root route
app.get('/', (req, res) => {
  res.send('OwnerIQ API');
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});