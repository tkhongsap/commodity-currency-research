## Relevant Files

- `server/services/serper.ts` - Enhanced SERPER service with multi-region collection and AI triage integration
- `server/services/serper.test.ts` - Unit tests for enhanced SERPER service
- `server/services/openai.ts` - Enhanced OpenAI service with news ranking functionality using GPT-4.1-mini
- `server/services/openai.test.ts` - Unit tests for OpenAI news ranking methods with mocked responses
- `server/routes.ts` - Updated API routes with new intelligent endpoints and 15-second timeouts
- `shared/schema.ts` - Enhanced news schemas with risk scoring, region fields, and ranking response types
- `client/src/components/NewsModal.tsx` - Enhanced news modal with risk badges, impact reasoning, and ranking indicators
- `client/src/components/NewsModal.test.tsx` - Unit tests for enhanced news modal component
- `client/src/hooks/useNews.ts` - Updated React hooks for intelligent news triage with new API endpoints

### Notes

- Unit tests should typically be placed alongside the code files they are testing (e.g., `MyComponent.tsx` and `MyComponent.test.tsx` in the same directory).
- Use `npx jest [optional/path/to/test/file]` to run tests. Running without a path executes all tests found by the Jest configuration.

## Tasks

- [x] 1.0 Enhance SERPER Service for Multi-Region News Collection
  - [x] 1.1 Add multi-region constants and mapping (US, UK, DE, JP, CN, TH, SG, MY)
  - [x] 1.2 Implement `searchNewsByRegion()` method for single region searches
  - [x] 1.3 Implement `collectGlobalNews()` method for parallel multi-region collection
  - [x] 1.4 Add time-based filtering with `tbs: "qdr:w"` parameter for past week news
  - [x] 1.5 Implement news deduplication logic based on title and source similarity
  - [x] 1.6 Add error handling for individual region failures without breaking entire collection
  - [x] 1.7 Update `getInstrumentNews()` method to use new multi-region collection
  - [x] 1.8 Write unit tests for all new SERPER service methods

- [x] 2.0 Implement AI-Powered News Ranking with OpenAI Integration
  - [x] 2.1 Add `rankNewsByImpact()` method to OpenAI service using GPT-4.1-mini
  - [x] 2.2 Create AI prompt template focusing on risk categories (geopolitical, supply chain, policy changes, etc.)
  - [x] 2.3 Implement news scoring logic (1-10 scale) with impact reasoning generation
  - [x] 2.4 Add `triageAndRankNews()` method to SERPER service that calls OpenAI ranking
  - [x] 2.5 Implement fallback mechanism to chronological sorting when AI ranking fails
  - [x] 2.6 Add timeout handling (10 seconds) for OpenAI API calls
  - [x] 2.7 Implement response validation and error handling for malformed AI responses
  - [x] 2.8 Write unit tests for AI ranking functionality with mocked OpenAI responses

- [x] 3.0 Update Shared Schemas for Risk-Scored News Data
  - [x] 3.1 Enhance `NewsItemSchema` to include optional `region`, `riskScore`, and `impactReason` fields
  - [x] 3.2 Update TypeScript types to reflect new schema fields
  - [x] 3.3 Ensure backward compatibility with existing news data structures
  - [x] 3.4 Add validation for risk score range (1-10) and required string fields
  - [x] 3.5 Update any existing schema-dependent code to handle new optional fields

- [x] 4.0 Enhance Frontend Components for Risk-Based News Display
  - [x] 4.1 Update NewsModal component to display risk score badges with color coding
  - [x] 4.2 Add impact reasoning display with highlighted explanation boxes
  - [x] 4.3 Implement region tags showing article origin (US, UK, TH, etc.)
  - [x] 4.4 Add ranking indicators (#1, #2, etc.) showing priority order
  - [x] 4.5 Enhance loading states for AI processing with appropriate messaging
  - [x] 4.6 Improve error states with clear messages for AI ranking failures
  - [x] 4.7 Update NewsModal title to indicate "Top 5 Risk Impact News"
  - [x] 4.8 Ensure responsive design for risk badges and new UI elements
  - [x] 4.9 Write unit tests for enhanced NewsModal component

- [x] 5.0 Update API Routes and Integration Points
  - [x] 5.1 Update `/api/news/search` route to use enhanced news triage system
  - [x] 5.2 Update `/api/news/:instrument` route to use new intelligent ranking
  - [x] 5.3 Add proper error handling and timeout responses (15 seconds) for enhanced routes
  - [x] 5.4 Ensure existing frontend integration points continue to work seamlessly
  - [x] 5.5 Update route response formats to include new risk scoring fields
  - [x] 5.6 Add logging for AI ranking performance and fallback usage monitoring
  - [x] 5.7 Test integration with existing PriceCard "View News" buttons
  - [x] 5.8 Test integration with global search bar functionality 