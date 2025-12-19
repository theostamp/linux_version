'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { helpChapters } from '@/components/help/help-data';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  ChevronDown, 
  ChevronUp, 
  Link2, 
  Search, 
  X, 
  BookOpen,
  List,
  Hash
} from 'lucide-react';
import { toast } from 'sonner';

export default function HelpPage() {
  const [query, setQuery] = useState('');
  const [openSections, setOpenSections] = useState<Set<string>>(() => new Set());
  const [activeSection, setActiveSection] = useState<string | null>(null);

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

  // Generate alphabetical index of all sections
  const alphabeticalIndex = useMemo(() => {
    const allSections = helpChapters.flatMap((chapter) =>
      chapter.sections.map((section) => ({
        title: section.title,
        anchorId: getAnchorId(chapter.id, section.id),
        chapterTitle: chapter.title,
        icon: chapter.icon,
      }))
    );
    
    return allSections.sort((a, b) => 
      a.title.localeCompare(b.title, 'el')
    );
  }, []);

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
    setActiveSection(anchorId);

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
      setActiveSection(anchorId);

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

  const handleIndexClick = useCallback((anchorId: string) => {
    setSectionOpen(anchorId, true);
    setActiveSection(anchorId);
    window.history.replaceState(null, '', `#${encodeURIComponent(anchorId)}`);
    
    requestAnimationFrame(() => {
      const target = document.getElementById(anchorId);
      target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, [setSectionOpen]);

  return (
    <div className="flex gap-4 lg:gap-8">
      {/* Main Content */}
      <div className="flex-1 min-w-0 space-y-4 sm:space-y-6 lg:space-y-8">
        {/* Hero Header - Mobile optimized */}
        <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-teal-500/10 via-emerald-500/5 to-cyan-500/10 dark:from-teal-500/20 dark:via-emerald-500/10 dark:to-cyan-500/20 p-4 sm:p-6 lg:p-8 shadow-lg ring-1 ring-teal-200/50 dark:ring-teal-700/30">
          <div className="absolute top-0 right-0 w-32 sm:w-64 h-32 sm:h-64 bg-gradient-to-bl from-teal-400/20 to-transparent rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-24 sm:w-48 h-24 sm:h-48 bg-gradient-to-tr from-emerald-400/20 to-transparent rounded-full blur-3xl" />
          
          <div className="relative flex flex-col gap-4 sm:gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex flex-col gap-2 sm:gap-3">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-2 sm:p-3 rounded-xl sm:rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 shadow-lg shadow-teal-500/25">
                  <BookOpen className="w-5 h-5 sm:w-7 sm:h-7 text-white" />
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-medium text-teal-600 dark:text-teal-400 uppercase tracking-wider">
                    Οδηγός Χρήσης
                  </p>
                  <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight bg-gradient-to-r from-slate-900 via-teal-800 to-emerald-700 dark:from-white dark:via-teal-200 dark:to-emerald-300 bg-clip-text text-transparent">
                    Κέντρο Βοήθειας
                  </h1>
                </div>
              </div>
              <p className="text-slate-600 dark:text-slate-300 text-sm sm:text-base lg:text-lg max-w-xl">
                Οδηγίες, συμβουλές και απαντήσεις για τη χρήση της εφαρμογής.
              </p>
            </div>

            <div className="w-full lg:max-w-md">
              <div className="relative rounded-xl sm:rounded-2xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm ring-1 ring-slate-200 dark:ring-slate-700 shadow-lg">
                <Search className="pointer-events-none absolute left-3 sm:left-4 top-1/2 h-4 w-4 sm:h-5 sm:w-5 -translate-y-1/2 text-teal-500" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Αναζήτηση θέματος..."
                  className="h-10 sm:h-12 border-0 bg-transparent pl-10 sm:pl-12 pr-10 sm:pr-12 shadow-none focus-visible:ring-2 focus-visible:ring-teal-500/50 text-sm sm:text-base text-slate-900 dark:text-slate-100 placeholder:text-slate-500 dark:placeholder:text-slate-400"
                  aria-label="Αναζήτηση βοήθειας"
                />
                {query.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setQuery('')}
                    className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 rounded-full p-1.5 sm:p-2 text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                    aria-label="Καθαρισμός αναζήτησης"
                    title="Καθαρισμός"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              {normalizedQuery && (
                <p className="mt-2 text-xs sm:text-sm text-teal-600 dark:text-teal-400 font-medium">
                  {filteredSectionCount} ενότητες βρέθηκαν
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Chapters Grid - Mobile optimized */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 lg:gap-6">
          {filteredChapters.length === 0 ? (
            <Card className="lg:col-span-2 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 border-0 shadow-xl ring-1 ring-slate-200/50 dark:ring-slate-700/50">
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="text-lg sm:text-xl text-slate-800 dark:text-slate-100">
                  Δεν βρέθηκαν αποτελέσματα
                </CardTitle>
                <CardDescription className="text-sm sm:text-base text-slate-600 dark:text-slate-400">
                  Δοκιμάστε διαφορετικούς όρους αναζήτησης.
                </CardDescription>
              </CardHeader>
              <CardContent className="px-4 pb-4 sm:px-6 sm:pb-6">
                <Button type="button" variant="outline" onClick={() => setQuery('')} className="gap-2 text-sm">
                  <X className="w-4 h-4" />
                  Καθαρισμός αναζήτησης
                </Button>
              </CardContent>
            </Card>
          ) : (
            filteredChapters.map((chapter, chapterIndex) => {
              const chapterSectionIds = chapter.sections.map((section) => getAnchorId(chapter.id, section.id));
              const allOpen = chapterSectionIds.length > 0 && chapterSectionIds.every((id) => openSections.has(id));
              
              // Color schemes for different chapters - enhanced contrast
              const colorSchemes = [
                { 
                  bg: 'from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/40',
                  ring: 'ring-blue-200/60 dark:ring-blue-600/40',
                  icon: 'from-blue-500 to-indigo-600',
                  iconShadow: 'shadow-blue-500/25',
                  accent: 'text-blue-700 dark:text-blue-300'
                },
                { 
                  bg: 'from-purple-50 to-violet-50 dark:from-purple-950/40 dark:to-violet-950/40',
                  ring: 'ring-purple-200/60 dark:ring-purple-600/40',
                  icon: 'from-purple-500 to-violet-600',
                  iconShadow: 'shadow-purple-500/25',
                  accent: 'text-purple-700 dark:text-purple-300'
                },
                { 
                  bg: 'from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/40',
                  ring: 'ring-amber-200/60 dark:ring-amber-600/40',
                  icon: 'from-amber-500 to-orange-600',
                  iconShadow: 'shadow-amber-500/25',
                  accent: 'text-amber-700 dark:text-amber-300'
                },
                { 
                  bg: 'from-teal-50 to-cyan-50 dark:from-teal-950/40 dark:to-cyan-950/40',
                  ring: 'ring-teal-200/60 dark:ring-teal-600/40',
                  icon: 'from-teal-500 to-cyan-600',
                  iconShadow: 'shadow-teal-500/25',
                  accent: 'text-teal-700 dark:text-teal-300'
                },
              ];
              const scheme = colorSchemes[chapterIndex % colorSchemes.length];

              return (
                <Card
                  key={chapter.id}
                  className={`flex flex-col h-full border-0 shadow-lg sm:shadow-xl ring-1 ${scheme.ring} bg-gradient-to-br ${scheme.bg} hover:shadow-2xl transition-shadow duration-300 rounded-xl sm:rounded-2xl`}
                >
                  <CardHeader className="p-3 sm:p-4 lg:p-5 pb-3 sm:pb-4">
                    <div className="flex items-start gap-2.5 sm:gap-4 mb-2 sm:mb-3">
                      <div className={`p-2 sm:p-3 rounded-xl sm:rounded-2xl bg-gradient-to-br ${scheme.icon} shadow-lg ${scheme.iconShadow} flex-shrink-0`}>
                        <chapter.icon className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base sm:text-xl lg:text-2xl font-bold leading-tight text-slate-800 dark:text-slate-100">
                          {chapter.title}
                        </CardTitle>
                        <CardDescription className={`mt-0.5 sm:mt-1 text-xs sm:text-sm font-semibold ${scheme.accent}`}>
                          {chapter.sections.length} ενότητες
                        </CardDescription>
                      </div>
                      {chapter.sections.length > 1 && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="shrink-0 text-[10px] sm:text-xs px-2 sm:px-3 py-1 sm:py-1.5 h-auto bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-600"
                          onClick={() => handleToggleChapter(chapterSectionIds)}
                        >
                          {allOpen ? 'Κλείσιμο' : 'Άνοιγμα'}
                        </Button>
                      )}
                    </div>
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                      {chapter.description}
                    </p>
                  </CardHeader>
                  <CardContent className="flex-1 pt-0 px-3 pb-3 sm:px-4 sm:pb-4 lg:px-5 lg:pb-5">
                    <div className="space-y-2 sm:space-y-3">
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
                            isActive={activeSection === anchorId}
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

      {/* Right Sidebar - Alphabetical Index */}
      <aside className="hidden lg:block w-72 xl:w-80 flex-shrink-0">
        <div className="sticky top-24 space-y-4">
          {/* Index Header */}
          <div className="rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 p-5 shadow-lg ring-1 ring-slate-200/60 dark:ring-slate-700/50">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-xl bg-gradient-to-br from-slate-600 to-slate-800 shadow-md">
                <List className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="font-bold text-lg text-slate-800 dark:text-slate-100">
                  Ευρετήριο
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {alphabeticalIndex.length} θέματα
                </p>
              </div>
            </div>
            
            {/* Scrollable Index List */}
            <div className="max-h-[calc(100vh-280px)] overflow-y-auto pr-2 space-y-1 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600 scrollbar-track-transparent">
              {alphabeticalIndex.map((item, index) => (
                <button
                  key={item.anchorId}
                  onClick={() => handleIndexClick(item.anchorId)}
                  className={`w-full text-left px-3 py-2 rounded-xl text-sm transition-all duration-200 group flex items-start gap-2 ${
                    activeSection === item.anchorId
                      ? 'bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 font-medium shadow-sm'
                      : 'hover:bg-slate-200/70 dark:hover:bg-slate-700/50 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <Hash className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 transition-colors ${
                    activeSection === item.anchorId 
                      ? 'text-teal-500' 
                      : 'text-slate-400 group-hover:text-slate-500 dark:text-slate-500 dark:group-hover:text-slate-400'
                  }`} />
                  <span className="leading-tight">{item.title}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="rounded-2xl bg-gradient-to-br from-teal-50 to-emerald-50 dark:from-teal-900/20 dark:to-emerald-900/20 p-5 shadow-lg ring-1 ring-teal-200/60 dark:ring-teal-700/40">
            <p className="text-xs font-semibold text-teal-600 dark:text-teal-400 uppercase tracking-wider mb-3">
              Σύνοψη
            </p>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600 dark:text-slate-400">Κεφάλαια</span>
                <span className="font-bold text-teal-700 dark:text-teal-300">{helpChapters.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600 dark:text-slate-400">Ενότητες</span>
                <span className="font-bold text-teal-700 dark:text-teal-300">{alphabeticalIndex.length}</span>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}

function HelpSectionItem({
  anchorId,
  title,
  content,
  links,
  isOpen,
  isActive,
  onToggle,
  onCopyLink,
}: {
  anchorId: string;
  title: string;
  content: string[];
  links?: { label: string; href: string }[];
  isOpen: boolean;
  isActive: boolean;
  onToggle: () => void;
  onCopyLink: () => void;
}) {
  const contentId = `${anchorId}--content`;
  return (
    <div
      id={anchorId}
      className={`rounded-xl sm:rounded-2xl px-3 sm:px-4 py-2.5 sm:py-3 transition-all duration-300 scroll-mt-20 sm:scroll-mt-24 ${
        isActive 
          ? 'bg-white dark:bg-slate-800 shadow-lg ring-2 ring-teal-400/50 dark:ring-teal-500/40' 
          : 'bg-white/80 dark:bg-slate-800/80 shadow-md ring-1 ring-slate-200/60 dark:ring-slate-700/50 hover:shadow-lg hover:ring-slate-300/60 dark:hover:ring-slate-600/50'
      }`}
    >
      <div className="flex items-center gap-1.5 sm:gap-2">
        <button
          type="button"
          onClick={onToggle}
          className={`flex flex-1 min-w-0 items-center justify-between gap-2 sm:gap-3 text-left font-semibold text-xs sm:text-sm py-0.5 sm:py-1 transition-colors ${
            isActive 
              ? 'text-teal-700 dark:text-teal-300' 
              : 'text-slate-800 dark:text-slate-100 hover:text-teal-600 dark:hover:text-teal-400'
          }`}
          aria-expanded={isOpen}
          aria-controls={contentId}
        >
          <span className="line-clamp-2 sm:truncate leading-tight">{title}</span>
          {isOpen ? (
            <ChevronUp className="h-4 w-4 text-teal-500 flex-shrink-0" />
          ) : (
            <ChevronDown className="h-4 w-4 text-slate-500 dark:text-slate-400 flex-shrink-0" />
          )}
        </button>

        <button
          type="button"
          onClick={onCopyLink}
          className="shrink-0 inline-flex items-center justify-center rounded-lg p-1 sm:p-1.5 text-slate-400 hover:text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-900/30 transition"
          aria-label="Αντιγραφή συνδέσμου ενότητας"
          title="Αντιγραφή συνδέσμου"
        >
          <Link2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
        </button>
      </div>

      {isOpen && (
        <div id={contentId} className="pt-2 sm:pt-3 pb-1 text-xs sm:text-sm text-slate-700 dark:text-slate-200 space-y-2 border-t border-slate-200/60 dark:border-slate-700/50 mt-2">
          {content.map((paragraph, idx) => (
            <p key={idx} className="leading-relaxed">
              {paragraph}
            </p>
          ))}

          {links && links.length > 0 && (
            <div className="pt-2 sm:pt-3 flex flex-wrap gap-1.5 sm:gap-2">
              {links.map((link) => (
                <Button 
                  key={`${anchorId}-${link.href}`} 
                  asChild 
                  size="sm" 
                  className="bg-teal-500 hover:bg-teal-600 text-white shadow-md shadow-teal-500/20 text-xs sm:text-sm px-2.5 sm:px-3 py-1 sm:py-1.5 h-auto"
                >
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
