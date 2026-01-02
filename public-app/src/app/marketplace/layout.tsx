export default function MarketplaceLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-bg-app-main text-text-primary">
      {children}
    </div>
  );
}
