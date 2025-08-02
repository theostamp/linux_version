// frontend/app/display/layout.tsx
export default function DisplayLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // ⬇︎ Κανένας AuthProvider εδώ — σκέτο passthrough
  return children;
}
