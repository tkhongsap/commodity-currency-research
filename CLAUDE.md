# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
# Development
npm run dev              # Start development server with hot reload (runs both frontend and backend)

# Build & Production
npm run build            # Build frontend with Vite and bundle server with esbuild
npm run start            # Start production server

# Type Checking
npm run check            # Run TypeScript compiler to check for type errors

# Database
npm run db:push          # Push database schema changes using Drizzle Kit
```

## High-Level Architecture

This is a full-stack TypeScript application tracking commodity and currency prices with real-time updates, news integration, and AI-powered insights.

### Tech Stack
- **Frontend**: React 18 + TypeScript + Vite + TanStack Query + Tailwind CSS + Radix UI
- **Backend**: Express.js + TypeScript + Node.js
- **Database**: PostgreSQL with Drizzle ORM
- **External APIs**: Yahoo Finance (prices), Serper (news), OpenAI (AI insights)

### Project Structure
```
/client/                 # React frontend
  /src/
    /components/        # UI components (Shadcn/ui based)
    /hooks/            # Custom hooks (usePriceData, useNews, useAIInsights)
    /pages/            # Page components
    /lib/              # Utilities and configurations
/server/                # Express backend
  /services/           # External API integrations
  routes.ts            # API endpoint definitions
/shared/               # Shared types and schemas
  schema.ts            # Zod schemas for type validation
```

### API Routes
- `GET /api/prices` - Fetch all commodity/currency prices
- `GET /api/prices/:symbol` - Get specific instrument data
- `POST /api/news/search` - Search news with query
- `GET /api/news/:instrument` - Get instrument-specific news
- `GET /api/insights/:symbol` - Generate AI insights

### Data Flow
1. External APIs → Server Services → Express Routes → Client Hooks → React Components
2. Type safety enforced via shared Zod schemas
3. TanStack Query handles caching and state management
4. Auto-refresh every 60 seconds for price data

### Key Services
- **YahooFinanceService**: Fetches real-time price data for commodities (CL=F, ALI=F, HRC=F, SB=F) and currencies (THB=X, MYR=X, EURUSD=X, GBPUSD=X)
- **SerperService**: Google News search integration
- **OpenAIService**: GPT-4.1-mini for market analysis

### Environment Variables Required
```
DATABASE_URL      # PostgreSQL connection string
OPENAI_API_KEY    # OpenAI API access
SERPER_API_KEY    # Serper API access
```

### Development Notes
- Frontend dev server proxies API requests to backend (port 5000)
- Uses Vite for fast HMR in development
- No linting/formatting tools configured - only TypeScript checking
- No test framework configured
- Database migrations handled by Drizzle Kit