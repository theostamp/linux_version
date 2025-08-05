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

// Fallback news items when RSS feeds fail
const FALLBACK_NEWS = [
  "Καλώς ήρθατε στην πολυκατοικία μας! 🏠",
  "Ενημερωθείτε για τα τελευταία νέα της Ελλάδας! 🇬🇷",
  "Συντήρηση και καθαριότητα κτιρίου σε εξέλιξη 🧹",
  "Νέα συστήματα ασφαλείας εγκαταστάθηκαν 🔒",
  "Ενημέρωση για τις κοινόχρηστες δαπάνες 💰",
  "Προγραμματισμένες εργασίες συντήρησης 🔧",
  "Νέα κανονισμοί πολυκατοικίας 📋",
  "Ενημέρωση για την ενεργειακή απόδοση ⚡",
  "Καλοκαιρινά προγράμματα συντήρησης ☀️",
  "Ενημέρωση για τα συστήματα ανύψωσης 🛗"
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
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/rss+xml, application/xml, text/xml, */*',
        'Accept-Language': 'el-GR,el;q=0.9,en;q=0.8',
        'Cache-Control': 'no-cache'
      },
      next: { revalidate: 300 } // Cache for 5 minutes to reduce load
    });

    if (!response.ok) {
      console.warn(`RSS feed ${url} returned status ${response.status}`);
      return [];
    }

    const text = await response.text();
    const titles = parseRSSFeedSimple(text);
    
    // Only return if we got meaningful content
    if (titles.length > 0) {
      return titles;
    }
    
    return [];
    
  } catch (error) {
    console.warn(`Error fetching RSS feed ${url}:`, error);
    return [];
  }
}

// Function to fetch fresh news from multiple sources
async function fetchFreshNews(): Promise<string[]> {
  const allNews: string[] = [];
  let successfulSources = 0;
  
  // Try to fetch from each news source
  for (const source of NEWS_SOURCES) {
    try {
      if (source.type === 'rss') {
        const titles = await parseRSSFeed(source.url);
        if (titles.length > 0) {
          allNews.push(...titles);
          successfulSources++;
          console.log(`✅ Successfully fetched ${titles.length} titles from ${source.name}`);
        }
      }
    } catch (error) {
      console.warn(`❌ Error fetching from ${source.name}:`, error);
    }
  }
  
  console.log(`📊 Fetched news from ${successfulSources}/${NEWS_SOURCES.length} sources`);
  
  // If no fresh news fetched, return fallback news
  if (allNews.length === 0) {
    console.log('📰 No RSS news available, using fallback news');
    return FALLBACK_NEWS;
  }
  
  // Shuffle and return unique news items
  const uniqueNews = [...new Set(allNews)];
  const finalNews = uniqueNews.sort(() => Math.random() - 0.5).slice(0, 25);
  
  console.log(`📰 Returning ${finalNews.length} unique news items`);
  return finalNews;
}

export async function GET() {
  try {
    console.log('📰 Starting news API request...');
    const newsItems = await fetchFreshNews();
    
    const response = {
      items: newsItems,
      timestamp: new Date().toISOString(),
      source: 'fresh-news-api',
      count: newsItems.length
    };
    
    console.log(`📰 News API response: ${newsItems.length} items`);
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('❌ Error in news API:', error);
    
    // Return fallback news
    const response = {
      items: FALLBACK_NEWS,
      timestamp: new Date().toISOString(),
      source: 'fallback',
      count: FALLBACK_NEWS.length,
      error: 'RSS feeds unavailable'
    };
    
    console.log('📰 Returning fallback news due to error');
    return NextResponse.json(response);
  }
} 