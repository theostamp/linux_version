'use client';

import Link from 'next/link';
import { ArrowRight, Check, Sparkles } from 'lucide-react';

type HighlightItem = {
  title: string;
  description: string;
};

type PremiumFeatureInfoProps = {
  title: string;
  description: string;
  bullets: string[];
  highlights: HighlightItem[];
  ctaHref: string;
  ctaLabel: string;
  ctaExternal?: boolean;
  icon: React.ReactNode;
  tags?: string[];
  note?: string;
  eyebrow?: string;
};

export default function PremiumFeatureInfo({
  title,
  description,
  bullets,
  highlights,
  ctaHref,
  ctaLabel,
  ctaExternal = false,
  icon,
  tags,
  note,
  eyebrow = 'Premium λειτουργία',
}: PremiumFeatureInfoProps) {
  return (
    <div className="space-y-10">
      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-slate-950 text-slate-50">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(16,185,129,0.25),transparent_55%),radial-gradient(circle_at_85%_0%,rgba(56,189,248,0.2),transparent_55%),linear-gradient(135deg,#020617_0%,#0f172a_45%,#0b1120_100%)]" />
        <div className="relative grid gap-10 px-6 py-10 sm:px-10 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-300">
              <Sparkles className="h-3.5 w-3.5" />
              {eyebrow}
            </span>
            <div className="space-y-3">
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
              <p className="text-sm text-slate-300 sm:text-base">{description}</p>
              {note ? <p className="text-xs text-slate-400">{note}</p> : null}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {ctaExternal ? (
                <a
                  href={ctaHref}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-5 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/25 transition-all hover:bg-emerald-400 hover:shadow-emerald-400/30"
                >
                  {ctaLabel}
                  <ArrowRight className="h-4 w-4" />
                </a>
              ) : (
                <Link
                  href={ctaHref}
                  className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-5 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/25 transition-all hover:bg-emerald-400 hover:shadow-emerald-400/30"
                >
                  {ctaLabel}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              )}
              <span className="text-xs text-slate-400">Ενεργοποίηση ανά κτίριο</span>
            </div>
            <ul className="space-y-2 text-sm text-slate-200/90">
              {bullets.map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-300">
                    <Check className="h-3.5 w-3.5" />
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-300">
                  {icon}
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Premium module</p>
                  <p className="text-lg font-semibold text-slate-50">{title}</p>
                </div>
              </div>
              {tags && tags.length > 0 ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="grid gap-3">
              {highlights.map((highlight) => (
                <div
                  key={highlight.title}
                  className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 transition-all duration-200 hover:border-emerald-400/30 hover:bg-slate-900"
                >
                  <p className="text-sm font-semibold text-slate-50">{highlight.title}</p>
                  <p className="mt-2 text-xs text-slate-400">{highlight.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
