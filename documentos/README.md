# OwnerIQ - Property Data Analytics Platform

## Overview
OwnerIQ is a comprehensive web application for property owners and investors to manage and analyze their real estate portfolios. The platform provides centralized access to property metrics, KPIs, and financial data.

## Architecture

### Data Model Hierarchy

1. **Person (User)**
   - Root entity representing the user/investor
   - Contains authentication and profile information
   - Primary key: `person_id` (UUID)

2. **Properties**
   - Belongs to a Person
   - Contains property details and financial inputs
   - Foreign key: `person_id`
   - Primary key: `property_id` (UUID)

3. **Property Metrics**
   - Calculated financial metrics for each property
   - NOI, Cap Rate, Cash Flow, etc.
   - Foreign key: `property_id`

4. **Portfolios (Future)**
   - Groups of properties
   - Belongs to a Person
   - Can have multiple members with roles

5. **Watchlists & Saved Searches**
   - User's saved property interests
   - Belongs to a Person

6. **Recommendations & Alerts**
   - AI-generated property recommendations
   - Deal scoring and alerts

### Application Flow

1. **Authentication**
   - User registers/logs in (Supabase Auth)
   - Creates Person profile in database

2. **Onboarding**
   - Add properties with financial details
   - System calculates metrics automatically

3. **Dashboard**
   - View portfolio overview
   - KPI cards and charts
   - Property grid with status

4. **Management**
   - Add/edit properties
   - View detailed analytics
   - Generate reports

## Tech Stack

- **Frontend**: React with Chart.js for analytics
- **Backend**: Node.js/Express API
- **Database**: PostgreSQL (Supabase)
- **Authentication**: Supabase Auth
- **Styling**: Custom CSS with responsive design

## Database Schema

The database follows a hierarchical structure starting from Person:

```
Person
├── Properties
│   ├── Property Metrics
│   ├── Operating Inputs
│   ├── Loan Details
│   └── Valuation History
├── Portfolios
├── Watchlists
└── Recommendations
```

## API Endpoints

- `POST /api/auth/create-profile` - Create user profile
- `GET /api/properties` - Get user's properties
- `POST /api/properties` - Add new property
- `GET /api/properties/:id/metrics` - Get property metrics

## Getting Started

1. Set up Supabase project
2. Run schema.sql in Supabase SQL editor
3. Configure environment variables
4. Start backend: `cd backend && npm run dev`
5. Start frontend: `cd frontend && npm start`

## Features

- Real-time property metrics calculation
- Interactive dashboard with charts
- Property management interface
- Responsive design for mobile/desktop
- Secure authentication
- Scalable architecture for future features