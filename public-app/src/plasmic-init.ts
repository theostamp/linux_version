import { initPlasmicLoader } from "@plasmicapp/loader-nextjs/react-server-conditional";

const projectId = process.env.PLASMIC_PROJECT_ID;
const apiToken = process.env.PLASMIC_API_TOKEN;

/**
 * Plasmic loader singleton.
 *
 * Notes:
 * - Για production, ΔΕΝ θέλουμε preview=true γιατί τραβάει και unpublished changes.
 * - Στο App Router, το init γίνεται από react-server-conditional για να είναι ασφαλές σε RSC.
 */
export const PLASMIC =
  projectId && apiToken
    ? initPlasmicLoader({
        projects: [
          {
            id: projectId,
            token: apiToken,
          },
        ],
        preview: process.env.NODE_ENV !== "production",
      })
    : null;
