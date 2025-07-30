# Kiosk Top Bar Implementation

## Overview
The kiosk interface has been enhanced with a new top bar that replaces the plain header. The new top bar contains a weather widget and 2 rotating advertisement banners, while maintaining the existing sidebar for other application functions.

## New Components

### KioskTopBar Component
**File:** `frontend/components/KioskTopBar.tsx`

**Features:**
- **Weather Widget**: Displays real-time weather information from Open-Meteo API
  - Current temperature in Celsius
  - Weather condition description in Greek
  - Weather icon based on conditions
  - Location indicator (Athens, Greece)
  - Loading state with spinner
  - Error handling with fallback display

- **Advertisement Banners**: 2 rotating banners with:
  - Automatic rotation every 8 seconds
  - Manual navigation with dot indicators
  - Hover effects and smooth transitions
  - Backdrop blur effects for modern UI
  - Clickable banners (can be linked to external services)

**Weather Conditions Supported:**
- Αίθριος (Clear)
- Κυρίως καθαρός (Mainly clear)
- Λίγα σύννεφα (Partly cloudy)
- Συννεφιά (Overcast)
- Ομίχλη (Fog)
- Ψιχάλα (Drizzle)
- Βροχή (Rain)
- Χιόνι (Snow)
- Καταιγίδα (Thunderstorm)

## Changes Made

### 1. KioskMode Component Updates
**File:** `frontend/components/KioskMode.tsx`

**Changes:**
- Added import for `KioskTopBar` component
- Replaced plain header with new `KioskTopBar` component
- Removed weather state and loading logic (now handled in KioskTopBar)
- Removed weather display from slide headers
- Maintained building info bar with time and date
- Kept existing sidebar functionality unchanged

### 2. Layout Structure
The new layout structure is:
```
┌─────────────────────────────────────────────────────────┐
│ KioskTopBar (Weather Widget + Advertisement Banners)    │
├─────────────────────────────────────────────────────────┤
│ Building Info Bar (Building Name + Time/Date)          │
├─────────────────────────────────────────────────────────┤
│ News Ticker (if available)                             │
├─────────────────────────────────────────────────────────┤
│ Main Content Area (Slides)                             │
├─────────────────────────────────────────────────────────┤
│ Navigation Dots                                        │
└─────────────────────────────────────────────────────────┘
```

## Configuration

### Weather API
The weather widget uses the Open-Meteo API (free, no API key required):
- **Endpoint**: `https://api.open-meteo.com/v1/forecast`
- **Location**: Athens, Greece (37.98, 23.72)
- **Timezone**: Europe/Athens
- **Language**: Greek descriptions

### Advertisement Banners
Currently using mock data. To integrate with real data:

1. **Update the `advertisingBanners` array** in `KioskTopBar.tsx`:
```typescript
const advertisingBanners: AdvertisingBanner[] = [
  {
    id: 1,
    title: 'Your Service Title',
    description: 'Service description',
    image_url: '/path/to/image.jpg',
    link: 'https://your-service-url.com',
    duration: 5000,
  },
  // Add more banners...
];
```

2. **Or fetch from API** by replacing the mock array with an API call:
```typescript
const [advertisingBanners, setAdvertisingBanners] = useState<AdvertisingBanner[]>([]);

useEffect(() => {
  async function loadBanners() {
    try {
      const response = await fetch('/api/advertising-banners');
      const data = await response.json();
      setAdvertisingBanners(data);
    } catch (error) {
      console.error('Failed to load banners:', error);
    }
  }
  loadBanners();
}, []);
```

## Testing

### Test Page
A test page has been created at `/test-kiosk` to verify the component functionality:
- Navigate to `http://localhost:3000/test-kiosk` to test the KioskTopBar in isolation
- Verify weather loading, banner rotation, and responsive design

### Features to Test
1. **Weather Widget**:
   - Loading state displays correctly
   - Weather data loads and displays properly
   - Error handling works when API is unavailable
   - Icons change based on weather conditions

2. **Advertisement Banners**:
   - Automatic rotation every 8 seconds
   - Manual navigation with dot indicators
   - Smooth transitions between banners
   - Hover effects work correctly

3. **Responsive Design**:
   - Component adapts to different screen sizes
   - Text remains readable on smaller screens
   - Layout doesn't break on mobile devices

## Styling

The component uses Tailwind CSS classes with:
- **Gradient backgrounds**: `bg-gradient-to-r from-blue-600 to-indigo-700`
- **Backdrop blur effects**: `backdrop-blur-sm`
- **Smooth transitions**: `transition-all duration-500`
- **Responsive design**: Flexbox layout with proper spacing
- **Modern UI elements**: Rounded corners, shadows, and hover effects

## Future Enhancements

1. **Dynamic Location**: Allow building-specific weather location
2. **More Weather Data**: Add humidity, wind speed, forecast
3. **Banner Analytics**: Track banner clicks and impressions
4. **Customizable Timing**: Allow admin to set banner rotation speed
5. **Weather Alerts**: Display weather warnings when applicable
6. **Localization**: Support for multiple languages

## Dependencies

- **React**: For component lifecycle and state management
- **Lucide React**: For weather and UI icons
- **Tailwind CSS**: For styling and responsive design
- **Open-Meteo API**: For weather data (free, no API key required) 