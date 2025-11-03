import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Inline manifest to avoid file system issues with standalone output
const MANIFEST = {
  name: 'New Concierge - Building Management',
  short_name: 'New Concierge',
  description: 'Διαχείριση Πολυκατοικίας - Κοινόχρηστα, Ανακοινώσεις, Συντήρηση',
  start_url: '/',
  display: 'standalone',
  background_color: '#ffffff',
  theme_color: '#2563eb',
  orientation: 'portrait',
  icons: [
    {
      src: '/icon-192x192.png',
      sizes: '192x192',
      type: 'image/png',
      purpose: 'any maskable',
    },
    {
      src: '/icon-512x512.png',
      sizes: '512x512',
      type: 'image/png',
      purpose: 'any maskable',
    },
  ],
  categories: ['productivity', 'utilities'],
  lang: 'el',
  dir: 'ltr',
};

export async function GET() {
  try {
    // Try to read manifest.json from public folder (for local dev)
    // In standalone/production, we use inline manifest
    const possiblePaths = [
      path.join(process.cwd(), 'public', 'manifest.json'),
      path.join(process.cwd(), '..', 'public', 'manifest.json'),
      path.join(__dirname, '..', '..', 'public', 'manifest.json'),
    ];

    for (const manifestPath of possiblePaths) {
      if (fs.existsSync(manifestPath)) {
        const manifestContent = fs.readFileSync(manifestPath, 'utf-8');
        const manifest = JSON.parse(manifestContent);
        return NextResponse.json(manifest, {
          headers: {
            'Content-Type': 'application/manifest+json',
            'Cache-Control': 'public, max-age=31536000, immutable',
          },
        });
      }
    }
  } catch (error) {
    console.error('Error reading manifest.json from file system, using inline manifest:', error);
  }

  // Fallback to inline manifest (always works)
  return NextResponse.json(MANIFEST, {
    headers: {
      'Content-Type': 'application/manifest+json',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}

