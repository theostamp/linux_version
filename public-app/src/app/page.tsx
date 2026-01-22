"use client";
// Updated landing page v2.4 - Dynamic pricing calculator
import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { Building, ChevronDown, Menu, X, MessageCircle, Phone, Star, Check, Home, Monitor } from "lucide-react";
import { PricingCalculator } from "@/components/pricing";

const faqs = [
  {
    question: "Χρειάζεται να αλλάξουμε γραφείο διαχείρισης για να χρησιμοποιήσουμε την πλατφόρμα;",
    answer:
      "Όχι απαραίτητα. Το newconcierge.app μπορεί να το χρησιμοποιήσει είτε ο εσωτερικός διαχειριστής της πολυκατοικίας, είτε το γραφείο διαχείρισης με το οποίο συνεργάζεστε ήδη. Η πολυκατοικία αποφασίζει.",
  },
  {
    question: "Χρειάζεται internet στην πολυκατοικία;",
    answer:
      "Όχι. Το σημείο ενημέρωσης (Info Point) συνοδεύεται από δική του σύνδεση, η οποία περιλαμβάνεται στο πακέτο. Η πολυκατοικία δεν χρειάζεται ξεχωριστή γραμμή internet.",
  },
  {
    question: "Τι γίνεται αν υπάρξει πρόβλημα με την οθόνη;",
    answer:
      "Παρέχουμε υποστήριξη και αντικατάσταση βάσει του συμβολαίου. Ακόμη και αν υπάρξει θέμα, οι ένοικοι συνεχίζουν να ενημερώνονται κανονικά μέσω web και κινητού.",
  },
  {
    question: "Τι γίνεται αν κάποιοι ένοικοι δεν θέλουν να χρησιμοποιούν εφαρμογές;",
    answer:
      "Γι' αυτό υπάρχει το σημείο ενημέρωσης στην είσοδο! Όλοι μπορούν να ενημερώνονται χωρίς login, χωρίς κινητό. Κανείς δεν μένει εκτός.",
  },
  {
    question: "Πώς βοηθάει στην καλύτερη συνεργασία των ενοίκων;",
    answer:
      "Με διαφάνεια στις αποφάσεις, ψηφοφορίες που καταγράφονται, κοινόχρηστα που βλέπουν όλοι. Λιγότερες παρεξηγήσεις, περισσότερη εμπιστοσύνη.",
  },
  {
    question: "Πόσο χρόνο μπορώ να γλιτώσω από τις δουλειές ρουτίνας;",
    answer:
      "Με βάση την εμπειρία μας, η εξοικονόμηση χρόνου μπορεί να φτάσει έως ~40% σε ρουτίνες όπως πέρασμα παραστατικών και έκδοση κοινοχρήστων. Είναι εκτίμηση και εξαρτάται από τον τρόπο που δουλεύει κάθε γραφείο.",
  },
  {
    question: "Τι αλλάζει στην έκδοση των μηνιαίων κοινοχρήστων;",
    answer:
      "Δεν χρειάζεται να συλλέγεις χειροκίνητα δαπάνες, να εκτυπώνεις και να κάνεις διανομή πόρτα-πόρτα. Τα παραστατικά περνάνε με AI, τα κοινόχρηστα οργανώνονται κεντρικά και οι ένοικοι ενημερώνονται ψηφιακά ή από το Info Point.",
  },
];

const testimonials = [
  {
    name: "Μαρία Κ.",
    role: "Διαχειρίστρια πολυκατοικίας",
    location: "Γλυφάδα",
    avatar: "ΜΚ",
    imageSrc: "/mar3.jpg",
    rating: 5,
    text: "Η κοινότητά μας άλλαξε εντελώς. Από τότε που βάλαμε το σημείο ενημέρωσης στην είσοδο, οι ένοικοι νιώθουν ότι συμμετέχουν. Σταμάτησαν οι φωνές, ξεκίνησε η συνεργασία.",
  },
  {
    name: "Γιώργος Π.",
    role: "Ιδιοκτήτης γραφείου διαχείρισης",
    location: "Αθήνα",
    avatar: "ΓΠ",
    imageSrc: "/mar1.jpg",
    rating: 5,
    text: "Διαχειριζόμαστε 35 πολυκατοικίες. Με το newconcierge βλέπω όλα τα αιτήματα σε ένα dashboard. Οι ένοικοι είναι πιο ικανοποιημένοι γιατί νιώθουν ότι τους ακούμε.",
  },
  {
    name: "Δημήτρης Α.",
    role: "Διαχειριστής πολυκατοικίας",
    location: "Θεσσαλονίκη",
    avatar: "ΔΑ",
    imageSrc: "/mar4.jpg",
    rating: 5,
    text: "Οι ψηφοφορίες γίνονται πλέον με διαφάνεια. Κάθε ένοικος έχει φωνή, τα αποτελέσματα είναι ξεκάθαρα. Η κοινότητά μας λειτουργεί πιο ομαλά από ποτέ.",
  },
  {
    name: "Ελένη Μ.",
    role: "Ένοικος",
    location: "Πειραιάς",
    avatar: "ΕΜ",
    imageSrc: "/mar2.jpg",
    rating: 5,
    text: "Νιώθω ότι είμαι μέρος της πολυκατοικίας. Βλέπω τι αποφασίστηκε, ψηφίζω για θέματα που με αφορούν, ενημερώνομαι χωρίς να κυνηγάω τον διαχειριστή. Επιτέλους!",
  },
  {
    name: "Αντώνης Σ.",
    role: "Ιδιοκτήτης γραφείου διαχείρισης",
    location: "Θεσσαλονίκη",
    avatar: "ΑΣ",
    rating: 5,
    text: "Η μηνιαία έκδοση κοινοχρήστων ήταν μαραθώνιος με χαρτιά και διανομές. Με το AI περνάμε τα παραστατικά σε λεπτά και οι ένοικοι ενημερώνονται από το Info Point. Κερδίζουμε χρόνο κάθε μήνα.",
  },
];

const stats = [
  { value: "200+", label: "Πολυκατοικίες" },
  { value: "2.500+", label: "Διαμερίσματα" },
  { value: "98%", label: "Ικανοποίηση" },
];

// Animation hook for scroll reveal
function useScrollReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px -50px 0px" }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, []);

  return { ref, isVisible };
}

// Animated section wrapper
function AnimatedSection({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const { ref, isVisible } = useScrollReveal();

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${className}`}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? "translateY(0)" : "translateY(30px)",
        transitionDelay: `${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="rounded-xl bg-[var(--bg-white)] shadow-card-soft">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between px-6 py-5 text-left transition-colors hover:text-[var(--color-accent-primary)]"
      >
        <span className="text-sm font-medium text-accent-primary sm:text-base">{question}</span>
        <ChevronDown
          className={`ml-4 h-5 w-5 shrink-0 text-[var(--text-dark-secondary)] transition-transform duration-300 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>
      <div
        className={`grid transition-all duration-300 ease-in-out ${
          isOpen ? "grid-rows-[1fr] pb-5" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden px-6">
          <p className="text-sm text-[var(--text-dark-secondary)] sm:text-base">{answer}</p>
        </div>
      </div>
    </div>
  );
}

function TestimonialCard({ testimonial, index }: { testimonial: typeof testimonials[0]; index: number }) {
  return (
    <AnimatedSection delay={index * 100}>
      <div className="group h-full rounded-2xl border border-gray-200 bg-[var(--bg-white)] p-6 shadow-card-soft transition-all duration-300 hover:border-accent-primary/30 hover:shadow-lg hover:shadow-accent-primary/10">
        <div className="mb-5 flex items-center gap-4">
          {testimonial.imageSrc ? (
            <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full border border-gray-200/60 bg-[var(--bg-main-light)] sm:h-16 sm:w-16">
              <Image
                src={testimonial.imageSrc}
                alt={`Φωτογραφία μαρτυρίας: ${testimonial.name}`}
                fill
                sizes="64px"
                className="object-cover"
              />
            </div>
          ) : (
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-accent-primary to-accent-secondary text-base font-bold text-white sm:h-16 sm:w-16">
              {testimonial.avatar}
            </div>
          )}

          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-accent-primary sm:text-base">{testimonial.name}</p>
            <p className="text-xs text-[var(--text-dark-secondary)] sm:text-sm">
              {testimonial.role} • {testimonial.location}
            </p>
            <div className="mt-2 flex items-center gap-1">
              {[...Array(testimonial.rating)].map((_, i) => (
                <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
              ))}
            </div>
          </div>
        </div>

        <p className="text-sm leading-relaxed text-[var(--text-dark-secondary)] sm:text-base">"{testimonial.text}"</p>
      </div>
    </AnimatedSection>
  );
}

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [debugHeroTitle, setDebugHeroTitle] = useState(false);
  const [debugHeroInfo, setDebugHeroInfo] = useState<null | {
    color: string;
    opacity: string;
    mixBlendMode: string;
    filter: string;
    parentColor: string;
    parentOpacity: string;
    headingColorVar: string;
    textOnDarkTitleVar: string;
    className: string;
  }>(null);
  const [forceHeroTitleColor, setForceHeroTitleColor] = useState(false);
  const heroTitleRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    setDebugHeroTitle(params.get("debugTitle") === "1");
    setForceHeroTitleColor(params.get("forceTitleColor") === "1");
  }, []);

  useEffect(() => {
    if (!debugHeroTitle || !heroTitleRef.current || typeof window === "undefined") return;
    const titleEl = heroTitleRef.current;
    const computed = window.getComputedStyle(titleEl);
    const rootStyles = window.getComputedStyle(document.documentElement);
    const parent = titleEl.parentElement;
    const parentComputed = parent ? window.getComputedStyle(parent) : null;

    const info = {
      color: computed.color,
      opacity: computed.opacity,
      mixBlendMode: computed.mixBlendMode,
      filter: computed.filter,
      parentColor: parentComputed?.color ?? "n/a",
      parentOpacity: parentComputed?.opacity ?? "n/a",
      headingColorVar: rootStyles.getPropertyValue("--heading-color").trim(),
      textOnDarkTitleVar: rootStyles.getPropertyValue("--text-on-dark-title").trim(),
      className: titleEl.className,
    };

    console.info("[Hero title debug]", info);
    setDebugHeroInfo(info);
  }, [debugHeroTitle]);

  return (
    <main className="min-h-screen bg-bg-app-main text-text-primary">
      {/* NAVIGATION */}
      <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/80 backdrop-blur-xl shadow-sm">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-primary shadow-lg shadow-accent-primary/25">
              <Building className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-text-secondary">Ψηφιακός Θυρωρός</p>
              <p className="text-lg font-bold text-accent-primary">newconcierge.app</p>
            </div>
          </div>

          {/* Desktop nav */}
          <div className="hidden items-center gap-8 md:flex">
            <a href="#how-it-works" className="text-sm text-text-primary transition-colors hover:text-accent-primary">
              Πώς λειτουργεί
            </a>
            <a href="#features" className="text-sm text-text-primary transition-colors hover:text-accent-primary">
              Λειτουργίες
            </a>
            <a href="#for-managers" className="text-sm text-text-primary transition-colors hover:text-accent-primary">
              Για γραφεία
            </a>
            <a href="#pricing" className="text-sm text-text-primary transition-colors hover:text-accent-primary">
              Τιμές
            </a>
            <a href="#testimonials" className="text-sm text-text-primary transition-colors hover:text-accent-primary">
              Κριτικές
            </a>
            <Link
              href="/login"
              className="rounded-full border border-gray-200 px-5 py-2 text-sm font-medium text-text-primary shadow-sm transition-all hover:border-accent-primary hover:bg-bg-app-main"
            >
              Σύνδεση
            </Link>
            <Link
              href="/signup"
              className="rounded-full bg-accent-primary px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-accent-primary/25 transition-all hover:opacity-90 hover:shadow-accent-primary/30"
            >
              Ξεκίνα δωρεάν
            </Link>
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 md:hidden shadow-sm text-text-primary"
            aria-label={mobileMenuOpen ? "Κλείσιμο μενού" : "Άνοιγμα μενού"}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </nav>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div id="mobile-menu" className="border-t border-gray-200 bg-white md:hidden">
            <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6">
              <a href="#how-it-works" className="text-sm text-text-primary transition-colors hover:text-accent-primary" onClick={() => setMobileMenuOpen(false)}>
                Πώς λειτουργεί
              </a>
              <a href="#features" className="text-sm text-text-primary transition-colors hover:text-accent-primary" onClick={() => setMobileMenuOpen(false)}>
                Λειτουργίες
              </a>
              <a href="#for-managers" className="text-sm text-text-primary transition-colors hover:text-accent-primary" onClick={() => setMobileMenuOpen(false)}>
                Για γραφεία
              </a>
              <a href="#pricing" className="text-sm text-text-primary transition-colors hover:text-accent-primary" onClick={() => setMobileMenuOpen(false)}>
                Τιμές
              </a>
              <a href="#testimonials" className="text-sm text-text-primary transition-colors hover:text-accent-primary" onClick={() => setMobileMenuOpen(false)}>
                Κριτικές
              </a>
              <div className="flex gap-3 pt-2">
                <Link href="/login" className="flex-1 rounded-full border border-gray-200 px-4 py-2 text-center text-sm text-text-primary transition-colors hover:border-accent-primary">
                  Σύνδεση
                </Link>
                <Link href="/signup" className="flex-1 rounded-full bg-accent-primary px-4 py-2 text-center text-sm font-semibold text-white">
                  Ξεκίνα
                </Link>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* HERO SECTION */}
      <section
        id="hero"
        className="relative border-b border-gray-200"
      >
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-accent-primary/12 via-[var(--bg-dark-surface)] to-[var(--bg-dark-main)]" />
        <div className="absolute left-1/2 top-0 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-accent-primary/20 blur-3xl" />

        <div className="relative">
          {/* Hero image */}
          <div className="relative z-0 h-[100svh] w-full overflow-hidden">
            <Image
              src="/entrance.webp"
              alt="Είσοδος πολυκατοικίας"
              fill
              className="object-cover"
              sizes="100vw"
              priority
            />
            {/* Gradient overlay for better text readability */}
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  "linear-gradient(180deg, rgba(31,77,122,0.28) 0%, rgba(31,77,122,0.5) 50%, rgba(31,77,122,0.34) 100%)",
              }}
            />
          </div>

          {/* Hero content κάτω από την εικόνα */}
          <div className="relative z-10 mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
            <div className="w-full space-y-8 rounded-3xl bg-[var(--bg-dark-card)] p-6 shadow-2xl shadow-card-soft backdrop-blur-md sm:p-8 lg:p-10">
              <AnimatedSection delay={100}>
                <div className="flex justify-start">
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-4 py-1.5 text-xs font-medium uppercase tracking-wide text-on-dark">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-accent-secondary" />
                    Για γραφεία διαχείρισης • AI παραστατικά & Info Point
                  </span>
                </div>
              </AnimatedSection>

              <AnimatedSection delay={150}>
                <h1
                  ref={heroTitleRef}
                  className="page-title-hero page-title-on-dark text-balance text-center"
                  style={
                    forceHeroTitleColor
                      ? { color: "#00E5FF", outline: "2px dashed #00E5FF", outlineOffset: "6px" }
                      : undefined
                  }
                >
                  <span>Λιγότερη ρουτίνα για το γραφείο διαχείρισης.</span>
                  <br />
                  <span>Καλύτερη εικόνα για κάθε πολυκατοικία.</span>
                </h1>
                {debugHeroTitle && debugHeroInfo && (
                  <div className="mt-4 inline-flex flex-col gap-1 rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-xs text-on-dark">
                    <span>computed color: {debugHeroInfo.color}</span>
                    <span>opacity: {debugHeroInfo.opacity}</span>
                    <span>mix-blend: {debugHeroInfo.mixBlendMode}</span>
                    <span>filter: {debugHeroInfo.filter}</span>
                    <span>parent color: {debugHeroInfo.parentColor}</span>
                    <span>parent opacity: {debugHeroInfo.parentOpacity}</span>
                    <span>--text-on-dark-title: {debugHeroInfo.textOnDarkTitleVar}</span>
                    <span>--heading-color: {debugHeroInfo.headingColorVar}</span>
                    <span className="truncate">class: {debugHeroInfo.className}</span>
                  </div>
                )}
              </AnimatedSection>

              <AnimatedSection delay={200}>
                <p className="text-left text-base leading-relaxed text-on-dark-secondary sm:text-lg md:text-xl lg:text-2xl">
                  Σήμερα ένα γραφείο διαχείρισης χάνει ώρες σε πέρασμα τιμολογίων, παραστατικών και τηλεφωνικές απορίες.
                  Με το newconcierge.app όλα αυτοματοποιούνται: AI αναγνώριση και καταχώρηση παραστατικών, συγκεντρωτική εικόνα
                  κοινοχρήστων ανά κτίριο και ένα Info Point που αναβαθμίζει την εικόνα του γραφείου και της πολυκατοικίας.
                </p>
              </AnimatedSection>

              <AnimatedSection delay={300}>
                <ul className="grid gap-3 text-base text-on-dark-secondary sm:grid-cols-2 sm:gap-x-8 lg:grid-cols-3">
                  {[
                    "AI αναγνώριση & αυτόματη καταχώρηση τιμολογίων/παραστατικών",
                    "Συγκεντρωτική εικόνα κοινοχρήστων ανά πολυκατοικία",
                    "Μείωση τηλεφωνημάτων και αποριών για χρεώσεις",
                    "Info Point kiosk που αναβαθμίζει την εικόνα του γραφείου",
                    "Κεντρικό dashboard για όλα τα κτίρια",
                    "Έως ~40% λιγότερος χρόνος σε ρουτίνες (εκτίμηση)",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-lime-300/20 text-xs text-lime-300">
                        ✓
                      </span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </AnimatedSection>

              <AnimatedSection delay={400}>
                <div className="flex flex-wrap items-center justify-start gap-4 pt-2">
                  <a
                    href="#cta"
                    className="group inline-flex items-center gap-2 rounded-full bg-accent-primary px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-accent-primary/25 transition-all hover:opacity-90 hover:shadow-accent-primary/30 hover:scale-105"
                  >
                    Ζήτησε παρουσίαση
                    <svg className="h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </a>
                  <a
                    href="#pricing"
                    className="rounded-full border border-white/20 px-6 py-3 text-sm font-semibold text-on-dark transition-all hover:border-white/40 hover:bg-white/10"
                  >
                    Δες τις τιμές
                  </a>
                </div>
              </AnimatedSection>

              {/* Stats counter */}
              <AnimatedSection delay={500}>
                <div className="flex flex-wrap items-center justify-center gap-8 border-t border-white/10 pt-6">
                  {stats.map((stat) => (
                    <div key={stat.label} className="text-center">
                      <p className="text-3xl font-bold text-lime-300 sm:text-4xl">{stat.value}</p>
                      <p className="mt-2 text-base text-on-dark-secondary">{stat.label}</p>
                    </div>
                  ))}
                </div>
              </AnimatedSection>
            </div>
          </div>
        </div>
	      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="border-b border-gray-200 bg-gradient-to-b from-[var(--bg-white)] to-[var(--bg-main-light)]">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <AnimatedSection>
            <div className="mb-12 text-left">
              <span className="mb-4 inline-block rounded-full bg-accent-secondary/10 px-4 py-1.5 text-xs font-medium uppercase tracking-wider text-accent-secondary">
                Απλή διαδικασία
              </span>
              <h2 className="text-2xl font-bold text-accent-primary sm:text-3xl lg:text-4xl">
                Πώς λειτουργεί ο Ψηφιακός Θυρωρός
              </h2>
              <p className="mt-4 max-w-2xl text-base leading-relaxed text-text-secondary sm:text-lg">
                Από την είσοδο της πολυκατοικίας μέχρι το κινητό του κάθε ενοίκου – σε τρία απλά βήματα.
              </p>
            </div>
          </AnimatedSection>

          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                step: "1",
                title: "Σημείο ενημέρωσης στην είσοδο",
                description:
                  "Αναλαμβάνουμε την τοποθέτηση του συστήματος ενημέρωσης και όλο τον εξοπλισμό στην είσοδο της πολυκατοικίας. Το Info Point ενημερώνει όλους και αναβαθμίζει την εικόνα του κτιρίου και του γραφείου διαχείρισης.",
                placeholder: "Οθόνη ενημέρωσης σε είσοδο πολυκατοικίας",
                imageSrc: "/ic1.jpg",
              },
              {
                step: "2",
                title: "Εύκολη διαχείριση",
                description:
                  "Ο διαχειριστής δουλεύει από ένα καθαρό dashboard και περνάει παραστατικά με AI σε λίγα δευτερόλεπτα. Κοινόχρηστα, ανακοινώσεις και αποφάσεις ενημερώνονται αυτόματα.",
                placeholder: "Screenshot από dashboard διαχειριστή",
                imageSrc: "/ic2.jpg",
              },
              {
                step: "3",
                title: "Κάθε ένοικος συμμετέχει",
                description:
                  "Στην οθόνη ή στο κινητό τους – οι ένοικοι ενημερώνονται άμεσα και οι απορίες μειώνονται δραστικά. Η διαφάνεια βελτιώνει τη συνεργασία.",
                placeholder: "Ένοικοι ενημερωμένοι παντού",
                imageSrc: "/ic3.jpg",
              },
            ].map((item, index) => (
              <AnimatedSection key={item.step} delay={index * 150}>
                <div className="group relative h-full rounded-2xl bg-bg-card p-6 shadow-card-soft transition-all duration-300 hover:shadow-lg hover:shadow-accent-primary/10">
                  <div className="absolute -top-4 left-6 flex h-8 w-8 items-center justify-center rounded-full bg-accent-primary text-sm font-bold text-white shadow-lg shadow-accent-primary/25 transition-transform group-hover:scale-110">
                    {item.step}
                  </div>
                  <div className="mb-4 pt-2">
                    <div className="mb-3 flex h-[50px] w-[50px] items-center justify-center overflow-hidden rounded-lg border border-accent-primary/20 bg-bg-app-main">
                      <Image
                        src={item.imageSrc}
                        alt={item.placeholder}
                        width={50}
                        height={50}
                        className="object-cover"
                      />
                    </div>
                    <div className="text-lg font-semibold text-accent-primary">{item.title}</div>
                  </div>
                  <p className="text-sm leading-relaxed text-text-secondary sm:text-base">{item.description}</p>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* COMMUNITY FOCUS */}
      <section id="kiosk-focus" className="border-b border-gray-200 bg-[var(--bg-main-light)]">
        <div className="mx-auto flex max-w-7xl flex-col gap-12 px-4 py-16 sm:px-6 md:flex-row md:items-center lg:px-8">
          <div className="flex-1 space-y-6">
            <AnimatedSection>
              <span className="inline-block rounded-full bg-accent-secondary/10 px-4 py-1.5 text-xs font-medium uppercase tracking-wider text-accent-secondary">
                Εικόνα & εμπιστοσύνη
              </span>
            </AnimatedSection>
            <AnimatedSection delay={100}>
              <h2 className="text-2xl font-bold text-accent-primary sm:text-3xl lg:text-4xl">
                Info Point που αναβαθμίζει την πολυκατοικία
              </h2>
            </AnimatedSection>
            <AnimatedSection delay={200}>
              <p className="text-base leading-relaxed text-[var(--text-dark-secondary)] sm:text-lg">
                Δεν είναι άλλη μια εφαρμογή κοινοχρήστων. Το Info Point είναι η «βιτρίνα» της διαχείρισης:
                δείχνει οργάνωση, μειώνει τα τηλεφωνήματα και δίνει στους ενοίκους ξεκάθαρη εικόνα.
              </p>
            </AnimatedSection>

            <div className="space-y-4">
              {[
                {
                  title: "Επαγγελματική εικόνα",
                  description:
                    "Η είσοδος δείχνει ότι η πολυκατοικία έχει σύγχρονη διαχείριση. Το γραφείο αποκτά κύρος και συνέπεια.",
                },
                {
                  title: "Λιγότερα τηλεφωνήματα",
                  description:
                    "Οι ανακοινώσεις και τα κοινόχρηστα εμφανίζονται στην οθόνη και στο κινητό. Οι απορίες μειώνονται δραστικά.",
                },
                {
                  title: "Ενημέρωση χωρίς χαρτιά",
                  description:
                    "Ό,τι ανεβάζεις ενημερώνει αυτόματα όλους τους ενοίκους. Τέλος στα χαρτάκια και τις άτυπες ενημερώσεις.",
                },
              ].map((item, index) => (
                <AnimatedSection key={item.title} delay={300 + index * 100}>
                  <div className="rounded-xl border border-gray-200 bg-[var(--bg-white)] p-4 shadow-card-soft transition-all duration-300 hover:border-accent-primary/30 hover:shadow-lg hover:shadow-accent-primary/10">
                    <h3 className="mb-2 font-semibold text-accent-primary">{item.title}</h3>
                    <p className="text-sm leading-relaxed text-[var(--text-dark-secondary)] sm:text-base">{item.description}</p>
                  </div>
                </AnimatedSection>
              ))}
            </div>
          </div>

          {/* Info Point screenshot */}
          <AnimatedSection delay={200} className="flex-1">
            <div className="rounded-3xl border border-gray-200 bg-[var(--bg-white)] p-4 shadow-card-soft transition-transform duration-500 hover:scale-[1.02]">
              <div className="relative aspect-[3/4] overflow-hidden rounded-2xl border border-gray-200 bg-[var(--bg-main-light)]">
                <Image
                  src="/conc.jpg"
                  alt="Info Point στην είσοδο πολυκατοικίας"
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 600px"
                />
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="border-b border-gray-200 bg-gradient-to-b from-[var(--bg-dark-main)] via-[var(--bg-dark-surface)] to-[var(--bg-dark-main)]">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <AnimatedSection>
            <div className="mb-12 text-left">
              <span className="mb-4 inline-block rounded-full border border-white/20 bg-white/5 px-4 py-1.5 text-xs font-medium uppercase tracking-wider text-on-dark">
                Λειτουργίες
              </span>
              <h2 className="text-2xl font-bold text-on-dark-title sm:text-3xl lg:text-4xl">
                Εργαλεία που κόβουν τη ρουτίνα
              </h2>
              <p className="mt-4 max-w-2xl text-base leading-relaxed text-on-dark-secondary sm:text-lg">
                Ένα σύστημα για γραφεία διαχείρισης που ενοποιεί παραστατικά, κοινόχρηστα και επικοινωνία
                ώστε να δουλεύεις λιγότερο και να δείχνεις περισσότερο επαγγελματισμό.
              </p>
            </div>
          </AnimatedSection>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                title: "AI παραστατικά σε δευτερόλεπτα",
                description:
                  "Ανεβάζεις τιμολόγια και παραστατικά και το AI τα αναγνωρίζει και τα καταχωρεί αυτόματα. Τέλος το χειροκίνητο πέρασμα.",
              },
              {
                title: "Συγκεντρωτική εικόνα κοινοχρήστων",
                description:
                  "Όλα τα κτίρια σε ένα dashboard, με καθαρή εικόνα ανά πολυκατοικία και πλήρες ιστορικό.",
              },
              {
                title: "Info Point kiosk στην είσοδο",
                description:
                  "Φυσικό σημείο ενημέρωσης που αναβαθμίζει την εικόνα της πολυκατοικίας και μειώνει τα τηλεφωνήματα.",
              },
              {
                title: "Διαφάνεια που μειώνει εντάσεις",
                description:
                  "Κοινόχρηστα, αποφάσεις και ανακοινώσεις είναι ξεκάθαρα για όλους. Λιγότερες παρεξηγήσεις, περισσότερη εμπιστοσύνη.",
              },
              {
                title: "Αιτήματα με προτεραιότητα",
                description:
                  "Οι ένοικοι δηλώνουν αιτήματα και το γραφείο τα ιεραρχεί άμεσα με βάση τη σοβαρότητα και τη συχνότητα.",
              },
              {
                title: "Κεντρικός έλεγχος πολλών πολυκατοικιών",
                description:
                  "Πολλαπλά κτίρια, ένα σύστημα. Η ομάδα σου βλέπει τα πάντα χωρίς να αλλάζει εργαλεία.",
              },
            ].map((feature, index) => (
              <AnimatedSection key={feature.title} delay={index * 100}>
                <div className="group h-full rounded-2xl border border-white/10 bg-[var(--bg-dark-surface)] p-6 transition-all duration-300 hover:border-accent-primary/30 hover:shadow-lg hover:shadow-accent-primary/10">
                  <h3 className="mb-3 text-lg font-semibold text-on-dark-title">{feature.title}</h3>
                  <p className="text-sm leading-relaxed text-on-dark-secondary sm:text-base">{feature.description}</p>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section id="testimonials" className="border-b border-gray-200 bg-[var(--bg-main-light)]">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <AnimatedSection>
            <div className="mb-12 text-left">
              <span className="mb-4 inline-block rounded-full bg-accent-secondary/10 px-4 py-1.5 text-xs font-medium uppercase tracking-wider text-accent-secondary">
                Κριτικές
              </span>
              <h2 className="text-2xl font-bold text-accent-primary sm:text-3xl lg:text-4xl">
                Τι λένε οι χρήστες μας
              </h2>
              <p className="mt-4 max-w-2xl text-base leading-relaxed text-[var(--text-dark-secondary)] sm:text-lg">
                Ένοικοι, διαχειριστές και γραφεία διαχείρισης μοιράζονται πώς άλλαξε η συνεργασία στην πολυκατοικία τους.
              </p>
            </div>
          </AnimatedSection>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {testimonials.map((testimonial, index) => (
              <TestimonialCard key={testimonial.name} testimonial={testimonial} index={index} />
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="border-b border-gray-200 bg-[var(--bg-main-light)]">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <AnimatedSection>
            <div className="mb-12 text-left">
              <span className="mb-4 inline-block rounded-full bg-accent-secondary/10 px-4 py-1.5 text-xs font-medium uppercase tracking-wider text-accent-secondary">
                Τιμολόγηση
              </span>
              <h2 className="text-2xl font-bold text-accent-primary sm:text-3xl lg:text-4xl">
                Απλή τιμολόγηση, χωρίς κρυφές χρεώσεις
              </h2>
              <p className="mt-4 max-w-2xl text-base leading-relaxed text-[var(--text-dark-secondary)] sm:text-lg">
                Χρέωση ανά διαμέρισμα, χωρίς πολύπλοκες κλίμακες. Σύρε το slider για να δεις την τιμή σου.
                <br />
                <span className="text-xs text-[var(--text-dark-secondary)]">
                  Οι τιμές δεν περιλαμβάνουν Φ.Π.Α. 24%.
                </span>
              </p>
            </div>
          </AnimatedSection>

          {/* Pricing Calculator Section */}
          <AnimatedSection delay={100}>
            <div className="mb-12">
              <PricingCalculator initialApartments={15} showCTA />
            </div>
          </AnimatedSection>

          {/* Quick Pricing Table */}
          <AnimatedSection delay={200}>
            <div className="rounded-2xl border border-gray-200 bg-[var(--bg-white)] p-6 shadow-card-soft overflow-x-auto">
              <h3 className="mb-4 text-left text-lg font-semibold text-accent-primary">
                Γρήγορος οδηγός τιμολόγησης / διαμέρισμα
              </h3>
              <table className="w-full min-w-[520px] text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="py-3 text-left text-[var(--text-dark-secondary)] font-medium">Πακέτο</th>
                    <th className="py-3 text-center text-[var(--text-dark-secondary)] font-medium">Τιμή/διαμέρισμα</th>
                    <th className="py-3 text-right text-[var(--text-dark-secondary)] font-medium">Κατάλληλο για</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-gray-200/50">
                    <td className="py-3 text-accent-primary">
                      <div className="flex items-center gap-2">
                        <Home className="h-4 w-4 text-[var(--text-dark-secondary)]" />
                        Free
                      </div>
                    </td>
                    <td className="py-3 text-center">
                      <span className="rounded-full bg-accent-secondary/15 px-3 py-1 text-accent-secondary font-semibold">
                        Δωρεάν
                      </span>
                    </td>
                    <td className="py-3 text-right text-[var(--text-dark-secondary)]">Έως 7 διαμερίσματα</td>
                  </tr>
                  <tr className="border-b border-gray-200/50">
                    <td className="py-3 text-accent-primary">
                      <div className="flex items-center gap-2">
                        <Building className="h-4 w-4 text-[var(--text-dark-secondary)]" />
                        Web
                      </div>
                    </td>
                    <td className="py-3 text-center text-accent-primary font-semibold">€1.0</td>
                    <td className="py-3 text-right text-[var(--text-dark-secondary)]">Πλήρης πλατφόρμα χωρίς οθόνη</td>
                  </tr>
                  <tr className="border-b border-gray-200/50">
                    <td className="py-3 text-accent-primary">
                      <div className="flex items-center gap-2">
                        <Monitor className="h-4 w-4 text-[var(--text-dark-secondary)]" />
                        Premium
                      </div>
                    </td>
                    <td className="py-3 text-center text-accent-primary font-semibold">€1.8</td>
                    <td className="py-3 text-right text-[var(--text-dark-secondary)]">Web + Kiosk + AI + Αρχείο</td>
                  </tr>
                  <tr>
                    <td className="py-3 text-accent-primary">
                      <div className="flex items-center gap-2">
                        <Monitor className="h-4 w-4 text-[var(--text-dark-secondary)]" />
                        Premium + IoT
                      </div>
                    </td>
                    <td className="py-3 text-center text-accent-primary font-semibold">€2.3</td>
                    <td className="py-3 text-right text-[var(--text-dark-secondary)]">Smart Heating & IoT αυτοματισμοί</td>
                  </tr>
                </tbody>
              </table>
              <p className="mt-4 text-center text-xs text-[var(--text-dark-secondary)]">
                * Χρέωση ανά διαμέρισμα • Ετήσια πληρωμή: 2 μήνες δωρεάν (16.67% έκπτωση)
              </p>
            </div>
          </AnimatedSection>

          {/* Feature Comparison */}
          <AnimatedSection delay={300}>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {/* Free Features */}
              <div className="rounded-xl border border-gray-200 bg-[var(--bg-white)] p-4 shadow-card-soft">
                <div className="mb-3 flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--bg-main-light)]">
                    <Home className="h-4 w-4 text-[var(--text-dark-secondary)]" />
                  </div>
                  <h4 className="font-semibold text-accent-primary">Free</h4>
                </div>
                <ul className="space-y-2">
                  {["Έως 7 διαμερίσματα", "Βασικό φύλλο κοινοχρήστων", "1 πολυκατοικία"].map((f) => (
                    <li key={f} className="flex items-center gap-2 text-xs text-[var(--text-dark-secondary)] sm:text-sm">
                      <Check className="h-3 w-3 text-accent-primary" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Web Features */}
              <div className="rounded-xl border border-gray-200 bg-[var(--bg-white)] p-4 shadow-card-soft">
                <div className="mb-3 flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-primary/10">
                    <Building className="h-4 w-4 text-accent-primary" />
                  </div>
                  <h4 className="font-semibold text-accent-primary">Web</h4>
                </div>
                <ul className="space-y-2">
                  {[
                    "Dashboard διαχείρισης",
                    "Ανακοινώσεις & ψηφοφορίες",
                    "Αιτήματα με υποστήριξη ενοίκων",
                    "Web & mobile πρόσβαση"
                  ].map((f) => (
                    <li key={f} className="flex items-center gap-2 text-xs text-[var(--text-dark-secondary)] sm:text-sm">
                      <Check className="h-3 w-3 text-accent-primary" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Premium Features */}
              <div className="rounded-xl border border-accent-primary/30 bg-[var(--bg-white)] p-4 shadow-card-soft">
                <div className="mb-3 flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-primary/15">
                    <Monitor className="h-4 w-4 text-accent-primary" />
                  </div>
                  <h4 className="font-semibold text-accent-primary">Premium</h4>
                  <span className="ml-auto rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-slate-950">
                    Δημοφιλές
                  </span>
                </div>
                <ul className="space-y-2">
                  {[
                    "Kiosk display στην είσοδο",
                    "Scenes & widgets",
                    "AI παραστατικά",
                    "Ηλεκτρονικό αρχείο",
                    "Όλα τα Web features"
                  ].map((f) => (
                    <li key={f} className="flex items-center gap-2 text-xs text-[var(--text-dark-secondary)] sm:text-sm">
                      <Check className="h-3 w-3 text-accent-primary" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Premium + IoT Features */}
              <div className="rounded-xl border border-gray-200 bg-[var(--bg-white)] p-4 shadow-card-soft">
                <div className="mb-3 flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-primary/10">
                    <Monitor className="h-4 w-4 text-accent-primary" />
                  </div>
                  <h4 className="font-semibold text-accent-primary">Premium + IoT</h4>
                </div>
                <ul className="space-y-2">
                  {[
                    "Smart Heating dashboard",
                    "IoT ειδοποιήσεις & alarms",
                    "Στατιστικά κατανάλωσης",
                    "Προβλέψεις & βελτιστοποίηση",
                    "Όλα τα Premium features"
                  ].map((f) => (
                    <li key={f} className="flex items-center gap-2 text-xs text-[var(--text-dark-secondary)] sm:text-sm">
                      <Check className="h-3 w-3 text-accent-primary" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </AnimatedSection>

          {/* Custom plan note */}
          <AnimatedSection delay={400}>
            <div className="mt-8 rounded-2xl border border-gray-200 bg-[var(--bg-white)] p-6 text-left shadow-card-soft transition-all duration-300 hover:border-accent-primary/30 hover:shadow-lg hover:shadow-accent-primary/10">
              <h3 className="mb-2 text-lg font-semibold text-accent-primary">Γραφείο διαχείρισης με 5+ πολυκατοικίες;</h3>
              <p className="text-sm leading-relaxed text-[var(--text-dark-secondary)] sm:text-base">
                Επικοινωνήστε μαζί μας για προσαρμοσμένη τιμολόγηση και ειδικές λειτουργίες για επαγγελματίες διαχειριστές.
              </p>
              <a
                href="#cta"
                className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-accent-primary transition-colors hover:opacity-80"
              >
                <Phone className="h-4 w-4" />
                Καλέστε μας
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </a>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* FOR MANAGERS */}
      <section id="for-managers" className="border-b border-gray-200 bg-[var(--bg-main-light)]">
        <div className="mx-auto flex max-w-7xl flex-col gap-12 px-4 py-16 sm:px-6 md:flex-row md:items-center lg:px-8">
          <div className="flex-1 space-y-6">
            <AnimatedSection>
              <span className="inline-block rounded-full bg-accent-secondary/10 px-4 py-1.5 text-xs font-medium uppercase tracking-wider text-accent-secondary">
                Για επαγγελματίες
              </span>
            </AnimatedSection>
            <AnimatedSection delay={100}>
              <h2 className="text-2xl font-bold text-accent-primary sm:text-3xl lg:text-4xl">
                Για γραφεία διαχείρισης: κόψτε τη ρουτίνα, κερδίστε χρόνο
              </h2>
            </AnimatedSection>
            <AnimatedSection delay={200}>
              <p className="text-base leading-relaxed text-[var(--text-dark-secondary)] sm:text-lg">
                Σήμερα, για να εκδοθεί το φύλλο μηνιαίων κοινοχρήστων, συλλέγεις δαπάνες χειροκίνητα,
                εκτυπώνεις και κάνεις διανομή πόρτα-πόρτα. Το newconcierge.app αυτοματοποιεί την καθημερινότητα
                με AI, κρατάει τα παραστατικά οργανωμένα και ενημερώνει ψηφιακά τους ενοίκους, ενώ το Info Point
                αναβαθμίζει την εικόνα κάθε κτιρίου.
              </p>
            </AnimatedSection>

            <AnimatedSection delay={250}>
              <div className="rounded-2xl border border-accent-primary/30 bg-accent-primary/5 p-4 shadow-card-soft">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="rounded-full bg-accent-primary px-3 py-1 text-xs font-semibold text-white">
                    Εκτίμηση εξοικονόμησης
                  </span>
                  <p className="text-sm text-[var(--text-dark-secondary)] sm:text-base">
                    Έως ~40% λιγότερος χρόνος σε δουλειές ρουτίνας (πέρασμα παραστατικών, έκδοση κοινοχρήστων).
                  </p>
                </div>
              </div>
            </AnimatedSection>

            <AnimatedSection delay={300}>
              <ul className="space-y-3 text-sm text-[var(--text-dark-secondary)] sm:text-base">
                {[
                  "AI αναγνώριση & αυτόματη καταχώρηση τιμολογίων/παραστατικών",
                  "Έως ~40% λιγότερος χρόνος σε δουλειές ρουτίνας (εκτίμηση)",
                  "Συγκεντρωτική εικόνα κοινοχρήστων και ιστορικού ανά κτίριο",
                  "Info Point kiosk που αναβαθμίζει το brand του γραφείου",
                  "Μείωση τηλεφωνημάτων χάρη σε διαφανή ενημέρωση",
                  "Κεντρικό dashboard για πολλαπλές πολυκατοικίες",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-primary/15 text-xs text-accent-primary">
                      ✓
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </AnimatedSection>
          </div>

          {/* Dashboard screenshot */}
          <AnimatedSection delay={200} className="flex-1">
            <div className="rounded-3xl border border-gray-200 bg-[var(--bg-white)] p-4 shadow-card-soft transition-transform duration-500 hover:scale-[1.02]">
              <div className="relative aspect-video overflow-hidden rounded-2xl border border-gray-200 bg-[var(--bg-main-light)]">
                <Image
                  src="/phone_screenshot.jpg"
                  alt="Dashboard γραφείου διαχείρισης - πολλαπλές πολυκατοικίες"
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 600px"
                />
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="border-b border-gray-200 bg-[var(--bg-main-light)]">
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <AnimatedSection>
            <div className="mb-12 text-left">
              <span className="mb-4 inline-block rounded-full bg-accent-secondary/10 px-4 py-1.5 text-xs font-medium uppercase tracking-wider text-accent-secondary">
                Απορίες
              </span>
              <h2 className="text-2xl font-bold text-accent-primary sm:text-3xl lg:text-4xl">Συχνές ερωτήσεις</h2>
              <p className="mt-4 max-w-2xl text-base leading-relaxed text-[var(--text-dark-secondary)] sm:text-lg">
                Μερικές από τις πιο συχνές απορίες γύρω από το Info Point και την πλατφόρμα.
              </p>
            </div>
          </AnimatedSection>

          <AnimatedSection delay={200}>
            <div className="space-y-4">
              {faqs.map((item) => (
                <FaqItem key={item.question} question={item.question} answer={item.answer} />
              ))}
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* CTA FINAL */}
      <section id="cta" className="bg-gradient-to-b from-[var(--bg-dark-main)] via-[var(--bg-dark-surface)] to-[var(--bg-dark-main)]">
        <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <AnimatedSection>
            <div className="relative overflow-hidden rounded-3xl border border-accent-primary/30 bg-gradient-to-br from-accent-primary/15 via-[var(--bg-dark-surface)] to-[var(--bg-dark-main)] p-8 sm:p-10 text-on-dark">
              {/* Background glow */}
              <div className="absolute -top-24 left-1/2 h-48 w-96 -translate-x-1/2 rounded-full bg-accent-primary/20 blur-3xl" />

              <div className="relative">
                <h2 className="text-left text-2xl font-bold text-on-dark-title sm:text-3xl lg:text-4xl">
                   Ξεκινήστε τώρα
                </h2>
                <p className="mt-4 max-w-xl text-left text-base leading-relaxed text-on-dark-secondary sm:text-lg">
                  Συμπλήρωσε τα στοιχεία σου και θα σε καλέσουμε για μια σύντομη παρουσίαση 15 λεπτών.
                </p>

                {/* Quick contact options */}
                <div className="mt-6 flex flex-wrap justify-center gap-4">
                  <a
                    href="https://wa.me/306900000000"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-full border border-accent-primary/30 bg-accent-primary/10 px-5 py-2.5 text-sm font-medium text-accent-primary transition-all hover:bg-accent-primary/20"
                  >
                    <MessageCircle className="h-4 w-4" />
                    WhatsApp
                  </a>
                  <a
                    href="tel:+302100000000"
                    className="inline-flex items-center gap-2 rounded-full border border-white/20 px-5 py-2.5 text-sm font-medium text-on-dark-secondary transition-all hover:bg-white/10"
                  >
                    <Phone className="h-4 w-4" />
                    210 000 0000
                  </a>
                </div>

                <div className="mx-auto mt-6 max-w-lg">
                  <p className="mb-4 text-left text-xs text-on-dark-muted">Ή συμπλήρωσε τη φόρμα:</p>

                  {/* Simplified contact form */}
                  <form className="grid gap-4 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <input
                        type="text"
                        className="w-full rounded-xl border border-white/10 bg-[var(--bg-dark-surface)] px-4 py-3 text-sm text-on-dark placeholder-on-dark-muted transition-colors focus:border-accent-primary focus:outline-none focus:ring-1 focus:ring-accent-primary"
                        placeholder="Όνομα *"
                        required
                      />
                    </div>
                    <div>
                      <input
                        type="tel"
                        className="w-full rounded-xl border border-white/10 bg-[var(--bg-dark-surface)] px-4 py-3 text-sm text-on-dark placeholder-on-dark-muted transition-colors focus:border-accent-primary focus:outline-none focus:ring-1 focus:ring-accent-primary"
                        placeholder="Τηλέφωνο *"
                        required
                      />
                    </div>
                    <div>
                      <input
                        type="email"
                        className="w-full rounded-xl border border-white/10 bg-[var(--bg-dark-surface)] px-4 py-3 text-sm text-on-dark placeholder-on-dark-muted transition-colors focus:border-accent-primary focus:outline-none focus:ring-1 focus:ring-accent-primary"
                        placeholder="Email"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <select className="w-full rounded-xl border border-white/10 bg-[var(--bg-dark-surface)] px-4 py-3 text-sm text-on-dark transition-colors focus:border-accent-primary focus:outline-none focus:ring-1 focus:ring-accent-primary">
                        <option value="">Είμαι...</option>
                        <option value="internal">Εσωτερικός διαχειριστής</option>
                        <option value="office">Γραφείο διαχείρισης</option>
                        <option value="owner">Ιδιοκτήτης / εκπρόσωπος</option>
                        <option value="other">Άλλο</option>
                      </select>
                    </div>

                    <div className="sm:col-span-2">
                      <button
                        type="submit"
                        className="group flex w-full items-center justify-center gap-2 rounded-full bg-accent-primary px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-accent-primary/30 transition-all hover:opacity-90 hover:shadow-accent-primary/40 hover:scale-[1.02]"
                      >
                        Θέλω να με καλέσετε
                        <svg className="h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                        </svg>
                      </button>
                    </div>
                  </form>

                  <p className="mt-4 text-center text-[11px] text-on-dark-muted">
                    Δεν στέλνουμε spam. Θα επικοινωνήσουμε μόνο για να συζητήσουμε τις ανάγκες σου.
                  </p>
                </div>
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-gray-200 bg-bg-app-main">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-primary shadow-lg shadow-accent-primary/25">
                  <Building className="h-5 w-5 text-white" />
                </div>
                <span className="text-lg font-bold text-accent-primary">newconcierge.app</span>
              </div>
              <p className="text-sm text-text-secondary">
                Μετατρέπουμε πολυκατοικίες σε κοινότητες. Με επίκεντρο τον ένοικο.
              </p>
              {/* Social proof in footer */}
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                ))}
                <span className="ml-2 text-xs text-text-secondary">4.9/5 από 50+ πολυκατοικίες</span>
              </div>
            </div>

            <div>
              <h3 className="mb-4 text-sm font-semibold text-accent-primary">Προϊόν</h3>
              <ul className="space-y-2 text-sm text-text-secondary">
                <li><a href="#how-it-works" className="transition-colors hover:text-accent-primary">Πώς λειτουργεί</a></li>
                <li><a href="#features" className="transition-colors hover:text-accent-primary">Λειτουργίες</a></li>
                <li><a href="#for-managers" className="transition-colors hover:text-accent-primary">Για γραφεία</a></li>
                <li><a href="#pricing" className="transition-colors hover:text-accent-primary">Τιμές</a></li>
                <li><a href="#testimonials" className="transition-colors hover:text-accent-primary">Κριτικές</a></li>
              </ul>
            </div>

            <div>
              <h3 className="mb-4 text-sm font-semibold text-accent-primary">Υποστήριξη</h3>
              <ul className="space-y-2 text-sm text-text-secondary">
                <li><a href="#faq" className="transition-colors hover:text-accent-primary">Συχνές ερωτήσεις</a></li>
                <li><a href="#cta" className="transition-colors hover:text-accent-primary">Επικοινωνία</a></li>
              </ul>
            </div>

            <div>
              <h3 className="mb-4 text-sm font-semibold text-accent-primary">Επικοινωνία</h3>
              <ul className="space-y-2 text-sm text-text-secondary">
                <li className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  <a href="tel:+302100000000" className="transition-colors hover:text-accent-primary">210 000 0000</a>
                </li>
                <li className="flex items-center gap-2">
                  <MessageCircle className="h-4 w-4" />
                  <a href="https://wa.me/306900000000" className="transition-colors hover:text-accent-primary">WhatsApp</a>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-gray-200 pt-8 sm:flex-row">
            <p className="text-sm text-text-secondary">© 2025 newconcierge.app. Όλα τα δικαιώματα διατηρούνται.</p>
            <div className="flex gap-4 text-xs text-text-secondary">
              <a href="#" className="transition-colors hover:text-accent-primary">Πολιτική απορρήτου</a>
              <a href="#" className="transition-colors hover:text-accent-primary">Όροι χρήσης</a>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
