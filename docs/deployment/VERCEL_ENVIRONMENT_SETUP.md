# Vercel Environment Variables Setup

## Required Environment Variables for Frontend

### API Configuration
```env
NEXT_PUBLIC_API_URL=https://linuxversion-production.up.railway.app
```

### Stripe Configuration
```env
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51... (ή pk_live_ για production)
```

## Setup Instructions

### 1. Access Vercel Dashboard
- Go to https://vercel.com
- Navigate to your project
- Click on "Settings" tab

### 2. Add Environment Variables
- Go to "Environment Variables" section
- Add each variable from the list above
- Make sure to select "Production", "Preview", and "Development" environments

### 3. Redeploy
- After adding variables, trigger a new deployment
- Go to "Deployments" tab
- Click "Redeploy" on the latest deployment

## Verification Steps

### 1. Check Environment Variables in Browser
```javascript
// Open browser console on your Vercel app
console.log(process.env.NEXT_PUBLIC_API_URL)
console.log(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
```

### 2. Test API Connection
```javascript
// Test if API is accessible
fetch('/api/billing/plans/')
  .then(response => response.json())
  .then(data => console.log('API working:', data))
```

### 3. Test Stripe Integration
```javascript
// Test if Stripe is loaded
console.log('Stripe loaded:', typeof window.Stripe !== 'undefined')
```

## Production vs Development

### Development (Local)
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### Production (Vercel)
```env
NEXT_PUBLIC_API_URL=https://linuxversion-production.up.railway.app
```

## Next.js Configuration

### Verify next.config.js
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'https://linuxversion-production.up.railway.app/api/:path*',
      },
    ]
  },
}

module.exports = nextConfig
```

## Security Notes

1. **Only NEXT_PUBLIC_ variables are exposed to browser**
2. **Never put secrets in NEXT_PUBLIC_ variables**
3. **Use different keys for test/production**
4. **Monitor Vercel logs for any issues**

## Troubleshooting

### Common Issues
1. **API calls failing**: Check NEXT_PUBLIC_API_URL
2. **Stripe not loading**: Check NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
3. **CORS errors**: Check Railway CORS settings
4. **Build failures**: Check environment variables are set

### Debug Commands
```bash
# Check build logs in Vercel dashboard
# Look for any environment variable errors
```

## Testing Checklist

- [ ] Environment variables set in Vercel
- [ ] Build successful
- [ ] API calls working
- [ ] Stripe integration working
- [ ] No CORS errors in browser console
