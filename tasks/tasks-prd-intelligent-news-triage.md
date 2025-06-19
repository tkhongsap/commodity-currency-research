## Relevant Files

- `server/services/serper.ts` - Enhanced SERPER service with multi-region collection and AI triage integration
- `server/services/serper.test.ts` - Unit tests for enhanced SERPER service
- `server/services/openai.ts` - Enhanced OpenAI service with news ranking functionality
- `server/services/openai.test.ts` - Unit tests for OpenAI news ranking methods
- `server/routes.ts` - Updated API routes to use enhanced news triage system
- `shared/schema.ts` - Enhanced news schemas with risk scoring and region fields
- `client/src/components/NewsModal.tsx` - Enhanced news modal with risk scores and impact reasoning
- `client/src/components/NewsModal.test.tsx` - Unit tests for enhanced news modal
- `client/src/hooks/useNews.ts` - Updated React hooks for intelligent news triage
- `client/src/hooks/useNews.test.ts` - Unit tests for news hooks

### Notes

- Unit tests should typically be placed alongside the code files they are testing (e.g., `MyComponent.tsx` and `MyComponent.test.tsx` in the same directory).
- Use `npx jest [optional/path/to/test/file]` to run tests. Running without a path executes all tests found by the Jest configuration.

## Tasks

- [ ] 1.0 Enhance SERPER Service for Multi-Region News Collection
  - [ ] 1.1 Add multi-region constants and mapping (US, UK, DE, JP, CN, TH, SG, MY)
  - [ ] 1.2 Implement `searchNewsByRegion()` method for single region searches
  - [ ] 1.3 Implement `collectGlobalNews()` method for parallel multi-region collection
  - [ ] 1.4 Add time-based filtering with `tbs: "qdr:w"` parameter for past week news
  - [ ] 1.5 Implement news deduplication logic based on title and source similarity
  - [ ] 1.6 Add error handling for individual region failures without breaking entire collection
  - [ ] 1.7 Update `getInstrumentNews()` method to use new multi-region collection
  - [ ] 1.8 Write unit tests for all new SERPER service methods

- [ ] 2.0 Implement AI-Powered News Ranking with OpenAI Integration
  - [ ] 2.1 Add `rankNewsByImpact()` method to OpenAI service using GPT-4o-mini
  - [ ] 2.2 Create AI prompt template focusing on risk categories (geopolitical, supply chain, policy changes, etc.)
  - [ ] 2.3 Implement news scoring logic (1-10 scale) with impact reasoning generation
  - [ ] 2.4 Add `triageAndRankNews()` method to SERPER service that calls OpenAI ranking
  - [ ] 2.5 Implement fallback mechanism to chronological sorting when AI ranking fails
  - [ ] 2.6 Add timeout handling (10 seconds) for OpenAI API calls
  - [ ] 2.7 Implement response validation and error handling for malformed AI responses
  - [ ] 2.8 Write unit tests for AI ranking functionality with mocked OpenAI responses

- [ ] 3.0 Update Shared Schemas for Risk-Scored News Data
  - [ ] 3.1 Enhance `NewsItemSchema` to include optional `region`, `riskScore`, and `impactReason` fields
  - [ ] 3.2 Update TypeScript types to reflect new schema fields
  - [ ] 3.3 Ensure backward compatibility with existing news data structures
  - [ ] 3.4 Add validation for risk score range (1-10) and required string fields
  - [ ] 3.5 Update any existing schema-dependent code to handle new optional fields

- [ ] 4.0 Enhance Frontend Components for Risk-Based News Display
  - [ ] 4.1 Update NewsModal component to display risk score badges with color coding
  - [ ] 4.2 Add impact reasoning display with highlighted explanation boxes
  - [ ] 4.3 Implement region tags showing article origin (US, UK, TH, etc.)
  - [ ] 4.4 Add ranking indicators (#1, #2, etc.) showing priority order
  - [ ] 4.5 Enhance loading states for AI processing with appropriate messaging
  - [ ] 4.6 Improve error states with clear messages for AI ranking failures
  - [ ] 4.7 Update NewsModal title to indicate "Top 5 Risk Impact News"
  - [ ] 4.8 Ensure responsive design for risk badges and new UI elements
  - [ ] 4.9 Write unit tests for enhanced NewsModal component

- [ ] 5.0 Update API Routes and Integration Points
  - [ ] 5.1 Update `/api/news/search` route to use enhanced news triage system
  - [ ] 5.2 Update `/api/news/:instrument` route to use new intelligent ranking
  - [ ] 5.3 Add proper error handling and timeout responses (15 seconds) for enhanced routes
  - [ ] 5.4 Ensure existing frontend integration points continue to work seamlessly
  - [ ] 5.5 Update route response formats to include new risk scoring fields
  - [ ] 5.6 Add logging for AI ranking performance and fallback usage monitoring
  - [ ] 5.7 Test integration with existing PriceCard "View News" buttons
  - [ ] 5.8 Test integration with global search bar functionality 