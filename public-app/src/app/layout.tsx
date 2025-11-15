import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import AppProviders from "@/components/AppProviders";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "New Concierge",
  description: "Modern building management platform for residents and managers.",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "64x64 32x32 24x24 16x16" },
      { url: "/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512x512.png", sizes: "512x512", type: "image/png" }
    ],
    apple: [
      { url: "/icon-192x192.png", sizes: "192x192", type: "image/png" }
    ]
  },
};

export const viewport: Viewport = {
  themeColor: "#2563eb",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {googleMapsApiKey ? (
          <Script
            id="google-maps-script"
            src={`https://maps.googleapis.com/maps/api/js?key=${googleMapsApiKey}&libraries=places`}
            strategy="lazyOnload"
            onLoad={() => {
              if (typeof window !== 'undefined') {
                console.log('[Google Maps] Script loaded successfully');
              }
            }}
            onError={() => {
              console.error('[Google Maps] Failed to load script. Check API key and billing.');
            }}
          />
        ) : (
          <Script id="google-maps-warning" strategy="afterInteractive">
            {`
              console.warn('[Google Maps] NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is not set. Address autocomplete will not work.');
            `}
          </Script>
        )}
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
