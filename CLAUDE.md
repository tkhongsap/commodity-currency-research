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

This is a full-stack TypeScript application tracking commodity and currency prices with real-time updates, intelligent news triage, and AI-powered insights.

### Tech Stack
- **Frontend**: React 18 + TypeScript + Vite + TanStack Query + Tailwind CSS + Radix UI (Shadcn/ui)
- **Backend**: Express.js + TypeScript + Node.js
- **Database**: PostgreSQL with Drizzle ORM
- **External APIs**: Yahoo Finance (prices), Serper (multi-region news), OpenAI (AI insights & news ranking)

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

#### Core Data
- `GET /api/prices` - Fetch all commodity/currency prices
- `GET /api/prices/:symbol` - Get specific instrument data
- `GET /api/insights/:symbol` - Generate AI insights (20s timeout)

#### News System (Dual Architecture)
**Legacy Endpoints** (basic search, backward compatible):
- `POST /api/news/search` - Basic news search with query
- `GET /api/news/:instrument` - Basic instrument-specific news

**Intelligent Endpoints** (AI-powered, multi-region):
- `POST /api/news/intelligent-search` - AI-ranked global news search (15s timeout)
- `GET /api/news/intelligent/:instrument` - AI-ranked instrument news (15s timeout)

### Intelligent News Triage System

The news system implements a sophisticated multi-region collection and AI-powered ranking:

#### Multi-Region Collection
- **8 Regions**: US, UK, Germany, Japan, China, Thailand, Singapore, Malaysia
- **Parallel Processing**: Simultaneous collection from all regions using Promise.all()
- **Error Resilience**: Individual region failures don't break entire collection
- **Time Filtering**: Past week news only (`tbs: "qdr:w"`)
- **Deduplication**: Advanced similarity detection for titles and sources
- **Optimized Queries**: Multi-tier query system for better impact detection

#### AI-Powered Ranking
- **Model**: GPT-4.1-mini for cost-effective analysis
- **Risk Categories**: Geopolitical, supply chain, policy changes, market volatility, natural disasters, central bank decisions, trade wars, commodity supply changes
- **Scoring**: 1-10 risk impact scale with reasoning
- **Output**: Top 5 articles ranked by business impact
- **Fallback**: Chronological sorting when AI ranking fails
- **Performance**: 10s timeout for AI calls, 15s total endpoint timeout

### Data Flow & Architecture Patterns

#### News Processing Pipeline
1. **Query Optimization**: Multi-tier impact-focused query building
2. **Collection**: Multi-region parallel news gathering (SerperService)
3. **Deduplication**: Title/source similarity filtering
4. **AI Analysis**: GPT-4.1-mini ranking by business impact (OpenAIService)
5. **Response**: Top 5 articles with risk scores and reasoning
6. **Fallback**: Multiple query strategies and chronological sorting

#### Query Optimization System
- **Primary Query**: High-impact terms (crisis, disruption, sanctions, conflict, surge, crash)
- **Policy Query**: Central bank decisions, regulatory changes, monetary policy
- **Market Query**: Price movements, volatility, supply/demand shocks
- **Regional Query**: Geopolitical events, trade disputes, regional impacts
- **Fallback Strategy**: Progressive query relaxation for better coverage

#### Type Safety & Validation
- **Shared Schemas**: Zod validation in `/shared/schema.ts`
- **Backward Compatibility**: Optional fields for enhanced data (region, riskScore, impactReason)
- **Response Types**: Dual support for NewsResponse and NewsRankingResponse

#### Frontend Integration
- **NewsModal Component**: Dual-mode display (basic vs intelligent)
- **Risk Visualization**: Color-coded badges (Red 8-10, Orange 6-7, Gray 1-5)
- **Enhanced UX**: Ranking indicators, region tags, impact reasoning boxes
- **Hooks**: useIntelligentNewsSearch, useInstrumentIntelligentNews

### Key Services

- **YahooFinanceService**: Real-time price data for commodities (CL=F, ALI=F, HRC=F, SB=F) and currencies (THB=X, MYR=X, EURUSD=X, GBPUSD=X)
- **SerperService**: Multi-region news collection with AI triage integration and deduplication
- **OpenAIService**: Market analysis (GPT-4.1-mini) and news ranking (GPT-4.1-mini)

### Environment Variables Required
```
DATABASE_URL      # PostgreSQL connection string
OPENAI_API_KEY    # OpenAI API access (supports OPENAI_KEY alternative)
SERPER_API_KEY    # Serper API access (supports SERPER_KEY alternative)
```

### Performance & Monitoring

#### Logging Strategy
- **Prefix**: `[NEWS-TRIAGE]` for intelligent news operations
- **Metrics**: Response times, article counts, fallback usage
- **Warnings**: Timeouts, fallback activations, region failures

#### Timeout Management
- **AI Ranking**: 10 seconds with fallback to chronological sorting
- **Total Endpoints**: 15 seconds with proper error responses
- **Regional Requests**: Individual timeouts don't block parallel collection

### Development Notes
- Frontend dev server proxies API requests to backend (port 5000)
- Uses Vite for fast HMR in development
- TypeScript-only validation (no linting/formatting tools)
- No test framework configured
- Database migrations via Drizzle Kit
- News system maintains backward compatibility through dual API architecture