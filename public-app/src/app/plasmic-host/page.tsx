import { PlasmicCanvasHost } from "@plasmicapp/loader-nextjs";
import { notFound } from "next/navigation";

// Μην αφαιρέσεις αυτό το import: φορτώνει registrations / client wrapper για App Router.
import "@/plasmic-init-client";

export default function PlasmicHost() {
  // Local-only: δεν θέλουμε να υπάρχει καν σαν route σε production deployments.
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  // Αν δεν έχουν μπει env vars ακόμα, δείξε καθαρό μήνυμα (μόνο για local dev).
  if (!process.env.PLASMIC_PROJECT_ID || !process.env.PLASMIC_API_TOKEN) {
    return (
      <pre style={{ padding: 16 }}>
        Missing Plasmic env vars. Create / update .env.local with:
        {"\n"}PLASMIC_PROJECT_ID=...
        {"\n"}PLASMIC_API_TOKEN=...
      </pre>
    );
  }

  return <PlasmicCanvasHost />;
}
