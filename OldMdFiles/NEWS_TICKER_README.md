# News Ticker & Community Messages System

## Overview
The kiosk now includes a comprehensive news and community messaging system with:
- **Fresh news ticker** at the bottom of the screen with real-time Greek news
- **Community messages** in the sidebar with local updates and greetings

## Features

### Fresh News Ticker (Bottom of Screen)
- **Real-time Greek news** from multiple reliable sources
- **Auto-rotation** every 12 seconds for fresh content
- **Auto-refresh** every 3 minutes for latest headlines
- **News counter** showing current position (e.g., "3 / 25")
- **Professional styling** with red-orange gradient

### Community Messages (Sidebar)
- **Local community updates** and announcements
- **Time-based greetings** (morning, afternoon, evening, night)
- **Building-specific information**
- **Auto-rotation** every 30 seconds
- **Green-blue gradient styling**

### News Sources
- **Google News Greece** - Real-time Greek news
- **ERT News** - Official Greek public broadcaster
- **Kathimerini** - Major Greek newspaper
- **Ta Nea** - Popular Greek newspaper
- **To Vima** - Greek newspaper
- **Proto Thema** - Greek news portal
- **News 247** - Greek news site
- **CNN Greece** - CNN's Greek edition

### Technical Features
- **Auto-rotation**: News items rotate every 12 seconds
- **Auto-refresh**: News content refreshes every 3 minutes
- **Community messages**: Rotate every 30 seconds
- **Fallback system**: Graceful fallback to local content if external sources fail
- **News counter**: Shows current news item position
- **Responsive design**: Adapts to different screen sizes
- **Built-in XML parsing**: Uses regex-based parsing for RSS feeds (no external dependencies)
- **Error handling**: Graceful fallback to local content if external sources fail

## API Endpoints

### `/api/news`
Returns a single random fresh news item.

**Response:**
```json
{
  "content": "Fresh news headline",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "source": "fresh-news-api"
}
```

### `/api/news/multiple`
Returns multiple fresh news items for rotation.

**Response:**
```json
{
  "items": ["News item 1", "News item 2", "..."],
  "timestamp": "2024-01-01T12:00:00.000Z",
  "source": "fresh-news-api",
  "count": 25
}
```

### `/api/community-messages`
Returns community messages for the sidebar.

**Response:**
```json
{
  "content": "Community message",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "source": "community-messages",
  "allMessages": ["Message 1", "Message 2", "..."]
}
```

## Layout Changes

### News Ticker Position
- **Moved to bottom** of the screen for better visibility
- **Dark blue styling** for professional appearance
- **Clean design** without prefix text
- **Fixed "NEWS:" banner** on the left side with z-index +1
- **Faster rotation** (12 seconds) for fresh content
- **More frequent refresh** (3 minutes) for latest news

### Community Messages
- **Added to sidebar** in a dedicated card
- **Green-blue gradient** styling to distinguish from news
- **🏠 Κοινότητα** header with house icon
- **30-second rotation** for community updates

## Configuration

### News Sources
Edit `frontend/app/api/news/route.ts` to modify news sources:

```typescript
const NEWS_SOURCES = [
  {
    name: 'Source Name',
    url: 'RSS_FEED_URL',
    type: 'rss'
  }
];
```

### Community Messages
Edit `frontend/app/api/community-messages/route.ts` to modify messages:

```typescript
const COMMUNITY_MESSAGES = [
  "Your custom community message! 🎉",
  "Another community update! 📢"
];
```

### Timing
- **News rotation**: 12 seconds per item (configurable in KioskMode.tsx)
- **News refresh**: 3 minutes (configurable in API route)
- **Community rotation**: 30 seconds (configurable in KioskSidebar.tsx)
- **Cache duration**: 3 minutes for RSS feeds

## Styling

### News Ticker (Bottom)
- **Gradient background**: Dark blue (blue-800 to blue-900)
- **White text** for readability
- **Clean design** without prefix text
- **Fixed "NEWS:" banner** on the left side with z-index +1 (transparent background)
- **Smooth marquee animation** (30 seconds) with fade transitions
- **News counter** on the right side
- **Responsive text sizing**

### Community Messages (Sidebar)
- **Gradient background**: Green to blue
- **White text** for readability (2 sizes smaller)
- **House icon** (🏠) and "Κοινότητα" label
- **Card-based layout** with backdrop blur
- **Responsive design**

## Error Handling

- If external news sources fail, the system falls back to minimal content
- Network errors are logged but don't break the kiosk
- Empty or invalid RSS feeds are skipped gracefully
- Community messages always have fallback content

## Testing

Use the test pages to verify functionality:
- **`http://demo.localhost:8080/test-news-simple.html`** - News API test
- **`http://demo.localhost:8080/test-news-api.html`** - Original test page

## Dependencies

- Built-in XML parsing using regex (no external dependencies required)
- Optional: `xml2js` and `@types/xml2js` (installed but not required)

## Installation

```bash
cd frontend
npm install xml2js @types/xml2js
```

**Note**: The system now uses built-in XML parsing and doesn't require external dependencies, but xml2js is installed as a backup option.

## Usage

The system is automatically active on the kiosk page at `/kiosk`. It will:

### News Ticker
1. Load fresh news on page load
2. Rotate through news items every 12 seconds
3. Refresh news content every 3 minutes
4. Display fallback content if external sources fail

### Community Messages
1. Load community messages on page load
2. Rotate through messages every 30 seconds
3. Display time-appropriate greetings
4. Show building-specific information

## Customization

### Adding New News Sources
1. Add the RSS feed URL to `NEWS_SOURCES`
2. Ensure the feed is accessible and returns valid XML
3. Test with the test page

### Modifying Community Messages
1. Edit the `COMMUNITY_MESSAGES` and `GENERAL_MESSAGES` arrays
2. Add emojis and formatting as needed
3. Keep messages concise for display

### Changing Timing
1. Modify the interval in the useEffect hooks in KioskMode.tsx and KioskSidebar.tsx
2. Adjust cache duration in the API routes
3. Test to ensure smooth operation

### Layout Adjustments
1. News ticker position: Modify the bottom positioning in KioskMode.tsx
2. Sidebar layout: Adjust the community message card in KioskSidebar.tsx
3. Styling: Update gradient colors and spacing as needed 