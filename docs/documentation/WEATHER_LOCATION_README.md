# Location-Based Weather System

## Overview
The kiosk now includes a location-based weather system that automatically adjusts the weather forecast based on the building's location coordinates.

## Features

### Dynamic Weather Location
- **Building-specific coordinates**: Uses latitude/longitude from building data
- **Automatic city detection**: Shows the correct city name in the weather widget
- **Fallback to Athens**: If no coordinates are available, defaults to Athens (37.98, 23.72)
- **Real-time updates**: Weather data refreshes automatically

### Building Management Information
- **Real manager data**: Displays actual building manager information
- **Internal manager**: Shows internal manager name and phone
- **Management office**: Shows management company and office phone
- **Dynamic display**: Only shows available information
- **Fallback message**: Shows message when no management data is available

### Weather API Integration
- **Open-Meteo API**: Free, reliable weather data source
- **Greek weather descriptions**: Localized weather descriptions in Greek
- **Temperature display**: Current temperature in Celsius
- **Weather icons**: Visual representation of weather conditions

## Technical Implementation

### Building Data Structure
```typescript
interface Building {
  id: number;
  name: string;
  address: string;
  city?: string;
  postal_code?: string;
  latitude?: number;    // Building coordinates
  longitude?: number;   // Building coordinates
  internal_manager_name?: string;
  internal_manager_phone?: string;
  management_office_name?: string;
  management_office_phone?: string;
  management_office_address?: string;
}
```

### Weather API Endpoint
**`/api/weather`** - Returns weather data for specific coordinates

**Parameters:**
- `latitude` (required): Building latitude
- `longitude` (required): Building longitude  
- `city` (optional): City name for display

**Response:**
```json
{
  "temperature": 22.5,
  "weathercode": 0,
  "description": "Αίθριος",
  "city": "Αθήνα",
  "coordinates": {
    "latitude": 37.98,
    "longitude": 23.72
  },
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

### Weather Codes
| Code | Description |
|------|-------------|
| 0 | Αίθριος |
| 1 | Κυρίως καθαρός |
| 2 | Λίγα σύννεφα |
| 3 | Συννεφιά |
| 45 | Ομίχλη |
| 48 | Ομίχλη |
| 51 | Ασθενής ψιχάλα |
| 53 | Ψιχάλα |
| 55 | Έντονη ψιχάλα |
| 61 | Ασθενής βροχή |
| 63 | Μέτρια βροχή |
| 65 | Ισχυρή βροχή |
| 80 | Περιστασιακή βροχή |
| 95 | Καταιγίδα |

## Component Updates

### KioskSidebar Component
- **New props**: Accepts `buildingInfo` with coordinates and management data
- **Dynamic weather loading**: Uses building coordinates for weather API calls
- **City display**: Shows building's city name in weather widget
- **Management info**: Displays real building manager and office information
- **Automatic refresh**: Updates when building changes

### Usage Example
```tsx
<KioskSidebar buildingInfo={data?.building_info} />
```

## Configuration

### Setting Building Coordinates
1. **Admin Panel**: Add coordinates when creating/editing buildings
2. **Google Maps Integration**: Automatic coordinate detection from address
3. **Manual Entry**: Direct latitude/longitude input

### Fallback Behavior
- **No coordinates**: Defaults to Athens (37.98, 23.72)
- **Invalid coordinates**: Falls back to Athens
- **API errors**: Shows error state with fallback city

## Benefits

### User Experience
- **Accurate weather**: Building-specific forecasts
- **Local relevance**: Weather for the actual building location
- **Professional appearance**: Location-aware information display

### Technical Benefits
- **Scalable**: Works for any number of buildings
- **Reliable**: Fallback mechanisms for error handling
- **Efficient**: Cached weather data with automatic refresh
- **Maintainable**: Centralized weather API endpoint

## Error Handling

### Network Issues
- **API timeout**: Graceful fallback to default location
- **Invalid response**: Error logging with fallback
- **Rate limiting**: Automatic retry with exponential backoff

### Data Validation
- **Missing coordinates**: Fallback to Athens
- **Invalid coordinates**: Validation and error handling
- **Missing city**: Default city name display

## Future Enhancements

### Planned Features
- **Extended forecast**: 7-day weather predictions
- **Weather alerts**: Severe weather notifications
- **Multiple locations**: Support for buildings with multiple addresses
- **Weather history**: Historical weather data display

### API Improvements
- **Caching**: Local weather data caching
- **Multiple providers**: Backup weather data sources
- **Customization**: Building-specific weather preferences

## Testing

### Manual Testing
1. **Different buildings**: Test with various building coordinates
2. **Missing data**: Test fallback behavior
3. **Network issues**: Test error handling
4. **City display**: Verify correct city names

### API Testing
```bash
# Test weather API with Athens coordinates
curl "http://localhost:3000/api/weather?latitude=37.98&longitude=23.72&city=Αθήνα"

# Test with invalid coordinates
curl "http://localhost:3000/api/weather?latitude=invalid&longitude=invalid"
```

## Dependencies

### External APIs
- **Open-Meteo**: Free weather data API
- **No API key required**: Public weather service

### Internal Dependencies
- **Building data**: Requires building coordinates
- **Next.js API routes**: For weather endpoint
- **React hooks**: For state management

## Installation

No additional installation required. The system uses:
- Existing building data structure
- Built-in Next.js API routes
- Open-Meteo public API

## Usage

The weather system is automatically active when:
1. **Building has coordinates**: Uses building location
2. **Building has no coordinates**: Falls back to Athens
3. **Multiple buildings**: Each building shows its own weather

The weather widget will automatically update when:
- Building selection changes
- Weather data refreshes
- Network connection is restored 