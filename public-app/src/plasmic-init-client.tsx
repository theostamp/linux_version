"use client";

import type React from "react";
import { PlasmicRootProvider } from "@plasmicapp/loader-nextjs";

import { PLASMIC } from "@/plasmic-init";

/**
 * PlasmicClientRootProvider είναι Client Component wrapper που "κρύβει" το loader.
 * Αυτό χρειάζεται γιατί props από Server -> Client components πρέπει να είναι serializable,
 * ενώ ο Plasmic loader ΔΕΝ είναι.
 */
export function PlasmicClientRootProvider(
  props: Omit<React.ComponentProps<typeof PlasmicRootProvider>, "loader">
) {
  if (!PLASMIC) {
    // Αν δεν έχουν μπει env vars ακόμα, ας αποτύχει “ήσυχα” αντί να σπάει όλο το app.
    // (Το /plasmic-host θα δείξει κενό μέχρι να ρυθμιστούν.)
    return null;
  }

  return <PlasmicRootProvider loader={PLASMIC} {...props} />;
}
