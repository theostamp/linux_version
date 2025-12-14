'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { helpChapters } from '@/components/help/help-data';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChevronDown, ChevronUp, Link2, Search, X } from 'lucide-react';
import { toast } from 'sonner';

export default function HelpPage() {
  const [query, setQuery] = useState('');
  const [openSections, setOpenSections] = useState<Set<string>>(() => new Set());

  const normalizedQuery = useMemo(() => normalizeText(query), [query]);

  const filteredChapters = useMemo(() => {
    if (!normalizedQuery) return helpChapters;

    return helpChapters
      .map((chapter) => {
        const chapterMatches = matchesHelpChapter(chapter, normalizedQuery);
        const sections = chapterMatches
          ? chapter.sections
          : chapter.sections.filter((section) => matchesHelpSection(section, normalizedQuery));

        return { ...chapter, sections };
      })
      .filter((chapter) => chapter.sections.length > 0);
  }, [normalizedQuery]);

  const filteredSectionCount = useMemo(
    () => filteredChapters.reduce((sum, chapter) => sum + chapter.sections.length, 0),
    [filteredChapters]
  );

  const setSectionOpen = useCallback((anchorId: string, nextOpen: boolean) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (nextOpen) next.add(anchorId);
      else next.delete(anchorId);
      return next;
    });
  }, []);

  const openSectionFromHash = useCallback(() => {
    const rawHash = window.location.hash.replace(/^#/, '');
    if (!rawHash) return;

    const anchorId = decodeURIComponent(rawHash);
    setSectionOpen(anchorId, true);

    requestAnimationFrame(() => {
      const target = document.getElementById(anchorId);
      target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, [setSectionOpen]);

  useEffect(() => {
    openSectionFromHash();
    window.addEventListener('hashchange', openSectionFromHash);
    return () => window.removeEventListener('hashchange', openSectionFromHash);
  }, [openSectionFromHash]);

  const handleCopyLink = useCallback(async (anchorId: string) => {
    try {
      const url = new URL(window.location.href);
      url.hash = anchorId;
      await navigator.clipboard.writeText(url.toString());
      toast.success('Αντιγράφηκε ο σύνδεσμος');
    } catch {
      toast.error('Αποτυχία αντιγραφής συνδέσμου');
    }
  }, []);

  const handleToggleSection = useCallback(
    (anchorId: string) => {
      const nextOpen = !openSections.has(anchorId);
      setSectionOpen(anchorId, nextOpen);

      if (nextOpen) {
        window.history.replaceState(null, '', `#${encodeURIComponent(anchorId)}`);
      }
    },
    [openSections, setSectionOpen]
  );

  const handleToggleChapter = useCallback(
    (sectionIds: string[]) => {
      const allOpen = sectionIds.every((id) => openSections.has(id));
      setOpenSections((prev) => {
        const next = new Set(prev);
        for (const id of sectionIds) {
          if (allOpen) next.delete(id);
          else next.add(id);
        }
        return next;
      });

      if (!allOpen && sectionIds.length > 0) {
        window.history.replaceState(null, '', `#${encodeURIComponent(sectionIds[0])}`);
      }
    },
    [openSections]
  );

  return (
    <div className="space-y-8">
      <div className="rounded-3xl bg-card/60 backdrop-blur-sm p-5 shadow-sm ring-1 ring-border/20">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary-hover bg-clip-text text-transparent">
              Κέντρο Βοήθειας
            </h1>
            <p className="text-muted-foreground">
              Οδηγίες, συμβουλές και απαντήσεις για τη χρήση της εφαρμογής.
            </p>
          </div>

          <div className="w-full sm:max-w-md">
            <div className="relative rounded-xl bg-background/40 ring-1 ring-border/20 shadow-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Αναζήτηση (π.χ. κοινόχρηστα, απαρτία, ψηφοφορία)"
                className="h-11 border-0 bg-transparent pl-9 pr-9 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                aria-label="Αναζήτηση βοήθειας"
              />
              {query.length > 0 && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition"
                  aria-label="Καθαρισμός αναζήτησης"
                  title="Καθαρισμός"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            {normalizedQuery && (
              <p className="mt-2 text-xs text-muted-foreground">
                {filteredSectionCount} ενότητες βρέθηκαν
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredChapters.length === 0 ? (
          <Card className="md:col-span-2 ring-1 ring-border/20 bg-gradient-to-b from-card to-muted/10">
            <CardHeader>
              <CardTitle>Δεν βρέθηκαν αποτελέσματα</CardTitle>
              <CardDescription>Δοκιμάστε διαφορετικούς όρους αναζήτησης.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button type="button" variant="outline" onClick={() => setQuery('')}>
                Καθαρισμός αναζήτησης
              </Button>
            </CardContent>
          </Card>
        ) : (
          filteredChapters.map((chapter) => {
            const chapterSectionIds = chapter.sections.map((section) => getAnchorId(chapter.id, section.id));
            const allOpen = chapterSectionIds.length > 0 && chapterSectionIds.every((id) => openSections.has(id));

            return (
              <Card
                key={chapter.id}
                className="flex flex-col h-full ring-1 ring-border/20 bg-gradient-to-b from-card to-muted/10"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                      <chapter.icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="bg-gradient-to-r from-foreground to-primary bg-clip-text text-transparent">
                        {chapter.title}
                      </CardTitle>
                    </div>
                    {chapter.sections.length > 1 && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="shrink-0"
                        onClick={() => handleToggleChapter(chapterSectionIds)}
                      >
                        {allOpen ? 'Κλείσιμο όλων' : 'Άνοιγμα όλων'}
                      </Button>
                    )}
                  </div>
                  <CardDescription>{chapter.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex-1">
                  <div className="space-y-4">
                    {chapter.sections.map((section) => {
                      const anchorId = getAnchorId(chapter.id, section.id);
                      return (
                        <HelpSectionItem
                          key={anchorId}
                          anchorId={anchorId}
                          title={section.title}
                          content={section.content}
                          links={section.links}
                          isOpen={openSections.has(anchorId)}
                          onToggle={() => handleToggleSection(anchorId)}
                          onCopyLink={() => handleCopyLink(anchorId)}
                        />
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}

function HelpSectionItem({
  anchorId,
  title,
  content,
  links,
  isOpen,
  onToggle,
  onCopyLink,
}: {
  anchorId: string;
  title: string;
  content: string[];
  links?: { label: string; href: string }[];
  isOpen: boolean;
  onToggle: () => void;
  onCopyLink: () => void;
}) {
  const contentId = `${anchorId}--content`;
  return (
    <div
      id={anchorId}
      className="rounded-xl px-4 py-3 bg-card/60 backdrop-blur-sm shadow-sm ring-1 ring-border/20 hover:shadow-md transition-shadow scroll-mt-24"
    >
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onToggle}
          className="flex flex-1 min-w-0 items-center justify-between gap-3 text-left font-medium text-sm py-1 hover:text-primary transition-colors"
          aria-expanded={isOpen}
          aria-controls={contentId}
        >
          <span className="truncate">{title}</span>
          {isOpen ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </button>

        <button
          type="button"
          onClick={onCopyLink}
          className="shrink-0 inline-flex items-center justify-center rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition"
          aria-label="Αντιγραφή συνδέσμου ενότητας"
          title="Αντιγραφή συνδέσμου"
        >
          <Link2 className="h-3.5 w-3.5" />
        </button>
      </div>
      
      {isOpen && (
        <div id={contentId} className="pt-3 pb-1 text-sm text-muted-foreground space-y-2 border-t border-border/20 mt-2">
          {content.map((paragraph, idx) => (
            <p key={idx} className="leading-relaxed">
              {paragraph}
            </p>
          ))}

          {links && links.length > 0 && (
            <div className="pt-2 flex flex-wrap gap-2">
              {links.map((link) => (
                <Button key={`${anchorId}-${link.href}`} asChild size="sm" variant="outline">
                  <Link href={link.href}>{link.label}</Link>
                </Button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function getAnchorId(chapterId: string, sectionId: string) {
  return `${chapterId}--${sectionId}`;
}

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function matchesHelpChapter(
  chapter: (typeof helpChapters)[number],
  normalizedQuery: string
): boolean {
  const values = [chapter.title, chapter.description, ...(chapter.keywords ?? [])];
  return values.some((v) => normalizeText(v).includes(normalizedQuery));
}

function matchesHelpSection(section: (typeof helpChapters)[number]['sections'][number], normalizedQuery: string): boolean {
  const values = [section.title, ...section.content, ...(section.keywords ?? [])];
  return values.some((v) => normalizeText(v).includes(normalizedQuery));
}
