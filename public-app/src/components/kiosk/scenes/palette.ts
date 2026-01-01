export type ScenePalette = {
  background: string;
  overlay: string;
  sidebarSurface: string;
  cardSurface: string;
  tickerSurface: string;
  accentBorder: string;
};

export const getScenePalette = (hour: number): ScenePalette => {
  if (hour >= 6 && hour < 12) {
    return {
      background: 'linear-gradient(135deg, #020617 0%, #0f172a 45%, #312e81 100%)',
      overlay: 'radial-gradient(circle at 20% 20%, rgba(56,189,248,0.18), transparent 55%)',
      sidebarSurface: 'rgba(15, 23, 42, 0.72)',
      cardSurface: 'rgba(15, 23, 42, 0.78)',
      tickerSurface: 'rgba(2, 6, 23, 0.82)',
      accentBorder: 'rgba(125, 211, 252, 0.5)',
    };
  }

  if (hour >= 12 && hour < 18) {
    return {
      background: 'linear-gradient(135deg, #0f172a 0%, #312e81 45%, #9333ea 100%)',
      overlay: 'radial-gradient(circle at 70% 30%, rgba(236,72,153,0.2), transparent 60%)',
      sidebarSurface: 'rgba(30, 27, 75, 0.72)',
      cardSurface: 'rgba(30, 27, 75, 0.78)',
      tickerSurface: 'rgba(15, 23, 42, 0.85)',
      accentBorder: 'rgba(196, 181, 253, 0.5)',
    };
  }

  return {
    background: 'linear-gradient(135deg, #020617 0%, #0f172a 30%, #1e1b4b 100%)',
    overlay: 'radial-gradient(circle at 80% 10%, rgba(129,140,248,0.25), transparent 50%)',
    sidebarSurface: 'rgba(2, 6, 23, 0.78)',
    cardSurface: 'rgba(2, 6, 23, 0.82)',
    tickerSurface: 'rgba(2, 6, 23, 0.9)',
    accentBorder: 'rgba(147, 197, 253, 0.45)',
  };
};
