import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Play } from "next/font/google";
import "./globals.css";
import AppProviders from "@/components/AppProviders";
import GoogleMapsScript from "@/components/GoogleMapsScript";
import { ReactQueryProvider } from "@/components/contexts/ReactQueryProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const play = Play({
  variable: "--font-play",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "newconcierge.app | Ο Ψηφιακός Θυρωρός της Πολυκατοικίας σου",
  description: "InfoPoint Kiosk στην είσοδο της πολυκατοικίας και πλατφόρμα cloud. Ανακοινώσεις, ψηφοφορίες, κοινόχρηστα και αιτήματα σε ένα μέρος. Για πολυκατοικίες και γραφεία διαχείρισης.",
  keywords: ["ψηφιακός θυρωρός", "κοινόχρηστα", "πολυκατοικία", "διαχείριση κτιρίου", "InfoPoint Kiosk", "ανακοινώσεις πολυκατοικίας", "ψηφοφορίες πολυκατοικίας"],
  authors: [{ name: "newconcierge.app" }],
  openGraph: {
    title: "newconcierge.app | Ο Ψηφιακός Θυρωρός της Πολυκατοικίας σου",
    description: "InfoPoint Kiosk στην είσοδο και πλατφόρμα cloud. Ανακοινώσεις, ψηφοφορίες, κοινόχρηστα χωρίς χαρτιά.",
    type: "website",
    locale: "el_GR",
  },
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
  themeColor: "#10b981", // emerald-500 for the new design
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} ${play.variable} antialiased`}>
        <GoogleMapsScript apiKey={googleMapsApiKey} />
        <ReactQueryProvider>
          <AppProviders>{children}</AppProviders>
        </ReactQueryProvider>
      </body>
    </html>
  );
}
