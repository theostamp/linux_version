import { NextResponse } from 'next/server';

// Reliable Greek news sources for fresh news
const NEWS_SOURCES = [
  {
    name: 'Google News Greece',
    url: 'https://news.google.com/rss/search?q=Greece&hl=el&gl=GR&ceid=GR:el',
    type: 'rss'
  },
  {
    name: 'ERT News',
    url: 'https://www.ertnews.gr/feed/',
    type: 'rss'
  },
  {
    name: 'Kathimerini',
    url: 'https://www.kathimerini.gr/rss',
    type: 'rss'
  },
  {
    name: 'Ta Nea',
    url: 'https://www.tanea.gr/feed/',
    type: 'rss'
  },
  {
    name: 'To Vima',
    url: 'https://www.tovima.gr/feed/',
    type: 'rss'
  },
  {
    name: 'Proto Thema',
    url: 'https://www.protothema.gr/feed/',
    type: 'rss'
  },
  {
    name: 'News 247',
    url: 'https://www.news247.gr/feed/',
    type: 'rss'
  },
  {
    name: 'CNN Greece',
    url: 'https://www.cnn.gr/feed',
    type: 'rss'
  }
];

// Simple XML parser using regex
function parseRSSFeedSimple(text: string): string[] {
  const titles: string[] = [];
  
  // Extract titles from RSS feed using regex
  const itemRegex = /<item[^>]*>(.*?)<\/item>/gis;
  
  // First try to get titles from items
  const items = text.match(itemRegex) || [];
  
  items.forEach((item, index) => {
    if (index < 8) { // Limit to 8 headlines per source
      const titleMatch = item.match(/<title[^>]*>(.*?)<\/title>/i);
      if (titleMatch && titleMatch[1]) {
        const title = titleMatch[1]
          .replace(/<[^>]*>/g, '') // Remove HTML tags
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .replace(/&[^;]+;/g, ' ') // Replace other HTML entities
          .trim();
        
        // Filter out RSS metadata and ensure it's a real news headline
        if (title.length > 15 && title.length < 200 && 
            !title.includes('RSS') && !title.includes('Feed') && 
            !title.includes('Ειδήσεις') && !title.includes('Αρχική')) {
          titles.push(title);
        }
      }
    }
  });
  
  return titles;
}

// Function to parse RSS feed
async function parseRSSFeed(url: string): Promise<string[]> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      next: { revalidate: 180 } // Cache for 3 minutes for fresher news
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const text = await response.text();
    return parseRSSFeedSimple(text);
    
  } catch (error) {
    console.error('Error fetching RSS feed:', error);
    return [];
  }
}

// Function to fetch fresh news from multiple sources
async function fetchFreshNews(): Promise<string[]> {
  const allNews: string[] = [];
  
  // Try to fetch from each news source
  for (const source of NEWS_SOURCES) {
    try {
      if (source.type === 'rss') {
        const titles = await parseRSSFeed(source.url);
        allNews.push(...titles);
      }
    } catch (error) {
      console.error(`Error fetching from ${source.name}:`, error);
    }
  }
  
  // If no fresh news fetched, return minimal fallback
  if (allNews.length === 0) {
    return [
      "Ενημερωθείτε για τα τελευταία νέα της Ελλάδας! 🇬🇷",
      "Καλώς ήρθατε στην πολυκατοικία μας! 🏠"
    ];
  }
  
  // Shuffle and return unique news items
  const uniqueNews = [...new Set(allNews)];
  return uniqueNews.sort(() => Math.random() - 0.5).slice(0, 25);
}

export async function GET() {
  try {
    const newsItems = await fetchFreshNews();
    const randomNews = newsItems[Math.floor(Math.random() * newsItems.length)];
    
    return NextResponse.json({
      content: randomNews,
      timestamp: new Date().toISOString(),
      source: 'fresh-news-api'
    });
  } catch (error) {
    console.error('Error in news API:', error);
    
    // Return minimal fallback
    const fallbackNews = "Ενημερωθείτε για τα τελευταία νέα της Ελλάδας! 🇬🇷";
    
    return NextResponse.json({
      content: fallbackNews,
      timestamp: new Date().toISOString(),
      source: 'fallback'
    });
  }
} 