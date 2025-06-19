# Product Requirements Document: Intelligent News Triage System

## Introduction/Overview

The Intelligent News Triage System is an enhancement to the existing news functionality that replaces the current simple news search with an AI-powered system that collects news from multiple global regions and intelligently ranks articles by business risk impact and market relevance. Instead of showing users 10+ random news articles, the system will display only the top 5 most impactful articles with risk scores and impact reasoning, helping users quickly identify critical market-moving events.

**Problem Statement:** Users are currently overwhelmed with irrelevant news or missing critical market-moving information due to the simple keyword-based search that only searches from a single region (US) without intelligent prioritization.

**Goal:** Provide users with the most relevant, highest-impact news articles that could affect their commodity and currency investments, with clear risk assessment and reasoning.

## Goals

1. **Reduce Information Overload:** Display only the top 5 most impactful news articles instead of 10+ unfiltered results
2. **Improve News Relevance:** Use AI to rank news by business risk impact and market relevance
3. **Enhance Decision Making:** Provide risk scores (1-10) and impact reasoning for each article
4. **Increase Global Coverage:** Collect news from multiple regions (US, Europe, Asia-Pacific, Southeast Asia) while maintaining simple UX
5. **Focus on Recency:** Prioritize breaking news and events from the past week
6. **Maintain Performance:** Deliver results within reasonable time limits with proper fallback mechanisms

## User Stories

1. **As a trader/analyst**, I want to see only the most impactful news for a commodity/currency so that I can quickly assess market risks without scrolling through irrelevant articles.

2. **As a business user**, I want breaking news prioritized by AI so that I don't miss critical market events that could affect my investments or business decisions.

3. **As a risk manager**, I want to understand why certain news is considered high-impact (with risk scores and reasoning) so that I can make informed decisions about portfolio adjustments.

4. **As a busy executive**, I want to quickly scan the top 5 most important news items with clear risk indicators so that I can stay informed without spending excessive time reading.

5. **As a Southeast Asia-focused investor**, I want global news that specifically impacts my regional markets to be prioritized and clearly identified.

## Functional Requirements

### Core Functionality

1. **Multi-Region News Collection:** The system must collect news from at least 8 regions: US (us), UK (gb), Germany (de), Japan (jp), China (cn), Thailand (th), Singapore (sg), and Malaysia (my).

2. **Time-Based Filtering:** The system must only collect news from the past week using the `tbs: "qdr:w"` parameter.

3. **AI-Powered Ranking:** The system must use GPT-4.1-mini to analyze and rank news articles by business risk impact on a scale of 1-10.

4. **Risk Categorization:** The AI must focus on these risk categories:
   - Geopolitical risks and conflicts
   - Supply chain disruptions
   - Economic policy changes
   - Market volatility events
   - Natural disasters affecting trade
   - Central bank decisions
   - Trade war developments
   - Commodity supply/production changes

5. **Top 5 Display:** The system must display exactly 5 articles, ranked by impact score.

6. **Risk Score Display:** Each article must show a visual risk score badge (1-10) with color coding:
   - Red (8-10): High risk/impact
   - Orange (6-7): Medium risk/impact  
   - Yellow (1-5): Lower risk/impact

7. **Impact Reasoning:** Each article must include an AI-generated explanation of why it's considered high-impact.

8. **Region Identification:** Each article must show which region it originated from.

9. **Deduplication:** The system must remove duplicate articles based on title and source similarity.

10. **Fallback Mechanism:** If AI ranking fails, the system must fall back to chronological sorting (most recent first).

### Integration Points

11. **Commodity/Currency Cards:** The "View News" button on each price card must use the intelligent triage system.

12. **Global Search:** The search bar must use the intelligent triage system for user-initiated searches.

13. **Existing UI Components:** The system must integrate with existing NewsModal component with enhanced display features.

### Performance Requirements

14. **Response Time:** The system must return results within 15 seconds or provide a timeout message.

15. **API Rate Limiting:** The system must handle SERPER API rate limits gracefully across multiple region requests.

16. **Error Handling:** The system must handle individual region failures without breaking the entire news collection process.

## Non-Goals (Out of Scope)

1. **User Customization:** Users cannot customize risk categories or region preferences in this version
2. **Historical News:** No access to news older than one week
3. **Real-time Updates:** No live news streaming or push notifications
4. **Social Media Integration:** No Twitter, Reddit, or other social media news sources
5. **News Sentiment Analysis:** No sentiment scoring beyond risk impact assessment
6. **Multi-language Support:** English-only news articles
7. **News Archiving:** No long-term storage of news articles or user reading history
8. **Advanced Filtering:** No user-defined filters by source, region, or topic
9. **Mock Data:** No fake or placeholder news data in any environment

## Design Considerations

### UI Enhancements

- **Risk Score Badges:** Circular badges with risk scores (1-10) using color coding
- **Impact Reason Cards:** Highlighted boxes explaining why each article is important
- **Region Tags:** Small tags showing article origin (US, UK, TH, etc.)
- **Ranking Indicators:** Clear numbering (#1, #2, etc.) showing priority order
- **Loading States:** Proper loading indicators during AI processing
- **Error States:** Clear error messages for API failures

### Visual Hierarchy

- Most impactful articles (risk score 8-10) prominently displayed
- Clear visual separation between articles
- Easy-to-scan layout with consistent spacing
- Responsive design for mobile and desktop

## Technical Considerations

### API Integration

- **SERPER API:** Multiple concurrent requests to different regions
- **OpenAI API:** GPT-4.1-mini for cost-effective news ranking
- **Rate Limiting:** Implement proper queuing and retry mechanisms
- **Caching:** Consider caching AI rankings for identical news sets

### Performance Optimization

- **Parallel Processing:** Collect news from all regions simultaneously
- **Timeout Handling:** Individual region timeouts shouldn't block others
- **Fallback Strategy:** Graceful degradation when AI ranking fails
- **Error Recovery:** Retry mechanisms for failed API calls

### Data Flow

1. User clicks "View News" or searches globally
2. System collects news from 8 regions in parallel
3. Deduplicate articles by title/source similarity
4. Send to OpenAI for impact ranking and reasoning
5. Return top 5 articles with risk scores and explanations
6. Display in enhanced NewsModal with visual indicators

## Success Metrics

### User Engagement

- **Time to Relevant Information:** Reduce time users spend scanning irrelevant news
- **Article Click-through Rate:** Increase percentage of news articles users actually read
- **User Session Duration:** Measure if users spend more focused time on high-impact articles

### Content Quality

- **News Relevance Feedback:** Track user satisfaction with article relevance
- **Breaking News Coverage:** Measure how quickly system surfaces market-moving events
- **Regional Coverage Balance:** Ensure important news from all regions is captured

### System Performance

- **API Response Times:** Maintain sub-15-second response times
- **AI Ranking Accuracy:** Monitor fallback rate to chronological sorting
- **Error Rates:** Track API failures and system reliability

## Open Questions

1. **Caching Strategy:** Should we cache AI rankings for identical news sets to reduce OpenAI costs and improve response times?

2. **User Feedback Loop:** Should we implement a simple thumbs up/down system to improve AI ranking over time?

3. **Regional Weighting:** Should Southeast Asian news be weighted more heavily for this user base?

4. **Monitoring and Alerts:** Do we need admin dashboards to monitor AI ranking performance and API usage?

5. **Cost Management:** What are the acceptable OpenAI API cost limits for this feature?

## Edge Case Handling

### AI Ranking Failures
- **Timeout:** If OpenAI takes >10 seconds, fall back to chronological sorting
- **API Error:** If OpenAI is unavailable, fall back to chronological sorting with clear user notification
- **Invalid Response:** If AI returns malformed JSON, fall back to chronological sorting

### News Collection Failures
- **No News Found:** Display "No recent news found" message instead of empty list
- **All Regions Fail:** Show error message with retry option
- **Partial Region Failure:** Continue with available regions, log failures

### Low Impact Scenarios
- **All Low Risk Scores:** Display articles even if all scores are below 6
- **Duplicate Content:** Prefer more recent articles when deduplicating
- **Single Source Dominance:** Ensure variety in news sources when possible

## Implementation Priority

### Phase 1: Core Functionality
- Multi-region news collection
- Basic AI ranking with GPT-4.1-mini
- Enhanced NewsModal with risk scores

### Phase 2: Polish and Optimization
- Advanced deduplication
- Performance optimization
- Error handling improvements

### Phase 3: Monitoring and Refinement
- Usage analytics
- Performance monitoring
- AI ranking accuracy assessment
