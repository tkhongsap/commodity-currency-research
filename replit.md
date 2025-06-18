# Commodities and Currency Tracker

## Overview

This is a full-stack web application that tracks commodity and currency prices with real-time data visualization, news integration, and AI-powered market insights. The application provides a comprehensive dashboard for monitoring market conditions with a focus on Southeast Asian markets and Thailand.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and optimized production builds
- **UI Library**: Shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with custom CSS variables for theming
- **State Management**: TanStack Query (React Query) for server state management
- **Routing**: Wouter for lightweight client-side routing
- **Theme System**: Custom dark/light theme provider with localStorage persistence

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **API Style**: RESTful API with JSON responses
- **Development**: tsx for TypeScript execution in development
- **Production**: esbuild for server bundling

### Data Storage Solutions
- **Primary Database**: PostgreSQL configured via Drizzle ORM
- **ORM**: Drizzle with schema-first approach
- **Migrations**: Drizzle Kit for database schema management
- **Development Storage**: In-memory storage implementation for user data
- **Database Provider**: Neon Database (serverless PostgreSQL)

## Key Components

### Price Data Service
- **Yahoo Finance Integration**: Real-time commodity and currency price fetching
- **Supported Instruments**:
  - Commodities: Crude Oil (WTI), Aluminum, Steel (HRC), Sugar #11
  - Currencies: THB/USD, MYR/USD, EUR/USD, GBP/USD
- **Data Processing**: Price calculations with change percentages and formatting
- **Auto-refresh**: 60-second intervals for real-time updates

### News Integration
- **Serper API**: Google News search functionality
- **Search Capabilities**: Custom news queries and instrument-specific news
- **News Data**: Title, description, URL, publication date, and source information

### AI Insights Service
- **OpenAI Integration**: GPT-4o model for market analysis
- **Analysis Features**:
  - Market overview and price predictions (3, 6, 12, 24 months)
  - Macro-economic analysis
  - Regional impact assessment (Southeast Asia focus)
  - Thailand-specific market impact analysis

### UI Components
- **Price Cards**: Real-time price display with change indicators
- **Modal Systems**: News and AI insights in responsive dialogs
- **Search Interface**: Global news search functionality
- **Theme Toggle**: Dark/light mode switching
- **Auto-refresh Indicator**: Visual feedback for data updates

## Data Flow

1. **Price Data Flow**:
   - Yahoo Finance API → YahooFinanceService → Express routes → React Query → UI components
   - Auto-refresh mechanism updates data every 60 seconds

2. **News Data Flow**:
   - User search → Serper API → SerperService → Express routes → React Query → News modal

3. **AI Insights Flow**:
   - User request → OpenAI API → OpenAIService → Express routes → React Query → Insights modal

4. **Theme Management**:
   - Theme state → localStorage → CSS variables → Tailwind classes

## External Dependencies

### API Services
- **Yahoo Finance**: Real-time financial data (yahoo-finance2 package)
- **Serper API**: Google News search functionality
- **OpenAI API**: GPT-4o for market analysis and insights

### Development Tools
- **Vite**: Frontend build tool with HMR
- **Drizzle Kit**: Database schema management
- **ESBuild**: Server-side bundling for production
- **tsx**: TypeScript execution for development

### UI Libraries
- **Radix UI**: Accessible component primitives
- **Tailwind CSS**: Utility-first CSS framework
- **Lucide React**: Icon library
- **TanStack Query**: Server state management

## Deployment Strategy

### Replit Configuration
- **Modules**: Node.js 20, Web, PostgreSQL 16
- **Development**: `npm run dev` with auto-reload
- **Production Build**: Vite build + esbuild server bundling
- **Port Configuration**: Internal port 5000, external port 80
- **Auto-scaling**: Configured for automatic scaling

### Environment Variables Required
- `DATABASE_URL`: PostgreSQL connection string
- `OPENAI_API_KEY`: OpenAI API access key
- `SERPER_API_KEY`: Serper API access key

### Build Process
1. Frontend build with Vite (outputs to `dist/public`)
2. Server bundle with esbuild (outputs to `dist/index.js`)
3. Static file serving configuration
4. Database schema push with Drizzle

## Changelog

```
Changelog:
- June 18, 2025: Initial setup
- June 18, 2025: Fixed frontend API routing issues for News and AI Insights features
- June 18, 2025: Added timeout handling and fallback mechanisms for OpenAI service
- June 18, 2025: Successfully deployed fully functional dashboard with all features working
```

## User Preferences

```
Preferred communication style: Simple, everyday language.
```