'use client';

import Script from "next/script";

type GoogleMapsScriptProps = {
  apiKey?: string | null;
};

export default function GoogleMapsScript({ apiKey }: GoogleMapsScriptProps) {
  if (!apiKey) {
    return (
      <Script id="google-maps-warning" strategy="afterInteractive">
        {`
          console.warn('[Google Maps] NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is not set. Address autocomplete will not work.');
        `}
      </Script>
    );
  }

  return (
    <Script
      id="google-maps-script"
      src={`https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&loading=async`}
      strategy="afterInteractive"
    />
  );
}
