"use client";
// Updated landing page v2.3 - Community & resident-centric messaging
import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { Building, ChevronDown, Menu, X, MessageCircle, Phone, Star, Users, Heart } from "lucide-react";

const pricingPlans = [
  {
    id: "free",
    name: "Free",
    priceMonthly: "0€",
    upfrontCost: null as string | null,
    highlight: false,
    badge: null as string | null,
    target: "Εσωτερικοί διαχειριστές που θέλουν μια πρώτη γνωριμία με την πλατφόρμα",
    features: [
      "1 πολυκατοικία, έως 12 διαμερίσματα",
      "Βασική διαχείριση κοινοχρήστων",
      "Ενημέρωση όλων των ενοίκων",
      "Βασικές ανακοινώσεις στην πλατφόρμα",
    ],
  },
  {
    id: "cloud",
    name: "Concierge Cloud",
    priceMonthly: "από 25€",
    upfrontCost: null as string | null,
    highlight: false,
    badge: null as string | null,
    target: "Πολυκατοικίες που θέλουν πλήρη ψηφιακή διαχείριση χωρίς Info Point",
    features: [
      "Πλήρης πλατφόρμα για όλους τους ενοίκους",
      "Απεριόριστες ανακοινώσεις, αιτήματα και ψηφοφορίες",
      "Πρόσβαση ενοίκων μέσω web / κινητού",
      "Ιδανικό για δοκιμή πριν το Info Point",
    ],
  },
  {
    id: "kiosk_all_in",
    name: "Info Point – All In",
    priceMonthly: "από 39€",
    upfrontCost: null as string | null,
    highlight: true,
    badge: "Προτεινόμενο",
    target: "Πολυκατοικίες που θέλουν σημείο ενημέρωσης στην είσοδο",
    features: [
      "Οθόνη ενημέρωσης στην είσοδο της πολυκατοικίας",
      "Εγκατάσταση & αρχική παραμετροποίηση",
      "Πλήρης πρόσβαση στην πλατφόρμα για όλους",
      "Σύνδεση στο internet περιλαμβάνεται",
      "Υποστήριξη & ενημερώσεις",
    ],
  },
  {
    id: "kiosk_upfront",
    name: "Info Point – Office",
    priceMonthly: "25€",
    upfrontCost: "250€ εφάπαξ",
    highlight: false,
    badge: null as string | null,
    target: "Γραφεία διαχείρισης με πολλές πολυκατοικίες",
    features: [
      "Σημείο ενημέρωσης ανά πολυκατοικία",
      "Χαμηλότερο μηνιαίο πάγιο",
      "Ενοποιημένη διαχείριση πολυκατοικιών",
      "Υποστήριξη & αναβαθμίσεις",
    ],
  },
];

const faqs = [
  {
    question: "Χρειάζεται να αλλάξουμε γραφείο διαχείρισης για να χρησιμοποιήσουμε την πλατφόρμα;",
    answer:
      "Όχι απαραίτητα. Το newconcierge.app μπορεί να το χρησιμοποιήσει είτε ο εσωτερικός διαχειριστής της πολυκατοικίας, είτε το γραφείο διαχείρισης με το οποίο συνεργάζεστε ήδη. Η κοινότητα αποφασίζει.",
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
      "Γι' αυτό υπάρχει το σημείο ενημέρωσης στην είσοδο! Όλοι μπορούν να ενημερώνονται χωρίς login, χωρίς κινητό. Κανείς δεν μένει εκτός της κοινότητας.",
  },
  {
    question: "Πώς βοηθάει στην καλύτερη συνεργασία των ενοίκων;",
    answer:
      "Με διαφάνεια στις αποφάσεις, ψηφοφορίες που καταγράφονται, κοινόχρηστα που βλέπουν όλοι. Λιγότερες παρεξηγήσεις, περισσότερη εμπιστοσύνη, καλύτερη κοινότητα.",
  },
];

const testimonials = [
  {
    name: "Μαρία Κ.",
    role: "Διαχειρίστρια πολυκατοικίας",
    location: "Γλυφάδα",
    avatar: "ΜΚ",
    rating: 5,
    text: "Η κοινότητά μας άλλαξε εντελώς. Από τότε που βάλαμε το σημείο ενημέρωσης στην είσοδο, οι ένοικοι νιώθουν ότι συμμετέχουν. Σταμάτησαν οι φωνές, ξεκίνησε η συνεργασία.",
  },
  {
    name: "Γιώργος Π.",
    role: "Ιδιοκτήτης γραφείου διαχείρισης",
    location: "Αθήνα",
    avatar: "ΓΠ",
    rating: 5,
    text: "Διαχειριζόμαστε 35 πολυκατοικίες. Με το newconcierge βλέπω όλα τα αιτήματα σε ένα dashboard. Οι ένοικοι είναι πιο ικανοποιημένοι γιατί νιώθουν ότι τους ακούμε.",
  },
  {
    name: "Δημήτρης Α.",
    role: "Πρόεδρος Δ.Σ. πολυκατοικίας",
    location: "Θεσσαλονίκη",
    avatar: "ΔΑ",
    rating: 5,
    text: "Οι ψηφοφορίες γίνονται πλέον με διαφάνεια. Κάθε ένοικος έχει φωνή, τα αποτελέσματα είναι ξεκάθαρα. Η κοινότητά μας λειτουργεί πιο ομαλά από ποτέ.",
  },
  {
    name: "Ελένη Μ.",
    role: "Ένοικος",
    location: "Πειραιάς",
    avatar: "ΕΜ",
    rating: 5,
    text: "Νιώθω ότι είμαι μέρος της κοινότητας. Βλέπω τι αποφασίστηκε, ψηφίζω για θέματα που με αφορούν, ενημερώνομαι χωρίς να κυνηγάω τον διαχειριστή. Επιτέλους!",
  },
];

const stats = [
  { value: "50+", label: "Πολυκατοικίες" },
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
    <div className="border-b border-slate-800 last:border-b-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between py-5 text-left transition-colors hover:text-emerald-400"
      >
        <span className="text-sm font-medium text-slate-50 sm:text-base">{question}</span>
        <ChevronDown
          className={`ml-4 h-5 w-5 shrink-0 text-slate-400 transition-transform duration-300 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>
      <div
        className={`grid transition-all duration-300 ease-in-out ${
          isOpen ? "grid-rows-[1fr] pb-5" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <p className="text-sm text-slate-400 sm:text-base">{answer}</p>
        </div>
      </div>
    </div>
  );
}

function TestimonialCard({ testimonial, index }: { testimonial: typeof testimonials[0]; index: number }) {
  return (
    <AnimatedSection delay={index * 100}>
      <div className="group h-full rounded-2xl border border-slate-800 bg-slate-900/50 p-6 transition-all duration-300 hover:border-emerald-500/30 hover:bg-slate-900 hover:shadow-lg hover:shadow-emerald-500/5">
        <div className="mb-4 flex items-center gap-1">
          {[...Array(testimonial.rating)].map((_, i) => (
            <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
          ))}
        </div>
        <p className="mb-6 text-sm leading-relaxed text-slate-300">"{testimonial.text}"</p>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-sm font-bold text-white">
            {testimonial.avatar}
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-50">{testimonial.name}</p>
            <p className="text-xs text-slate-500">{testimonial.role} • {testimonial.location}</p>
          </div>
        </div>
      </div>
    </AnimatedSection>
  );
}

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50">
      {/* NAVIGATION */}
      <header className="sticky top-0 z-50 border-b border-slate-800/50 bg-slate-950/80 backdrop-blur-xl">
        <nav className="flex items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500 shadow-lg shadow-emerald-500/25">
              <Building className="h-5 w-5 text-slate-950" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-slate-500">Ψηφιακός Θυρωρός</p>
              <p className="text-lg font-bold text-slate-50">newconcierge.app</p>
            </div>
          </div>

          {/* Desktop nav */}
          <div className="hidden items-center gap-8 md:flex">
            <a href="#how-it-works" className="text-sm text-slate-300 transition-colors hover:text-emerald-400">
              Πώς λειτουργεί
            </a>
            <a href="#features" className="text-sm text-slate-300 transition-colors hover:text-emerald-400">
              Λειτουργίες
            </a>
            <a href="#pricing" className="text-sm text-slate-300 transition-colors hover:text-emerald-400">
              Τιμές
            </a>
            <a href="#testimonials" className="text-sm text-slate-300 transition-colors hover:text-emerald-400">
              Κριτικές
            </a>
            <Link
              href="/login"
              className="rounded-full border border-slate-700 px-5 py-2 text-sm font-medium text-slate-200 transition-all hover:border-slate-500 hover:bg-slate-800"
            >
              Σύνδεση
            </Link>
            <Link
              href="/signup"
              className="rounded-full bg-emerald-500 px-5 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/25 transition-all hover:bg-emerald-400 hover:shadow-emerald-400/30"
            >
              Ξεκίνα δωρεάν
            </Link>
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-700 md:hidden"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </nav>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="border-t border-slate-800 bg-slate-950 px-4 py-4 md:hidden">
            <div className="flex flex-col gap-4">
              <a href="#how-it-works" className="text-sm text-slate-300" onClick={() => setMobileMenuOpen(false)}>
                Πώς λειτουργεί
              </a>
              <a href="#features" className="text-sm text-slate-300" onClick={() => setMobileMenuOpen(false)}>
                Λειτουργίες
              </a>
              <a href="#pricing" className="text-sm text-slate-300" onClick={() => setMobileMenuOpen(false)}>
                Τιμές
              </a>
              <a href="#testimonials" className="text-sm text-slate-300" onClick={() => setMobileMenuOpen(false)}>
                Κριτικές
              </a>
              <div className="flex gap-3 pt-2">
                <Link href="/login" className="flex-1 rounded-full border border-slate-700 px-4 py-2 text-center text-sm text-slate-200">
                  Σύνδεση
                </Link>
                <Link href="/signup" className="flex-1 rounded-full bg-emerald-500 px-4 py-2 text-center text-sm font-semibold text-slate-950">
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
        className="relative overflow-hidden border-b border-slate-800"
      >
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/5 via-slate-950 to-slate-950" />
        <div className="absolute left-1/2 top-0 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-emerald-500/10 blur-3xl" />

        <div className="relative flex w-full flex-col gap-12 py-16 md:flex-row md:items-stretch md:py-24">
          {/* Left content */}
          <div className="relative z-10 flex w-full flex-1 flex-col space-y-6 px-4 sm:px-6 md:justify-center lg:px-16">
            <AnimatedSection>
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 text-xs font-medium uppercase tracking-wide text-emerald-300">
                <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
                Με επίκεντρο τον ένοικο • Info Point
              </span>
            </AnimatedSection>
            
            <AnimatedSection delay={100}>
              <h1 className="text-balance text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl xl:text-6xl">
                Η πολυκατοικία σου γίνεται
                <br />
                <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                  κοινότητα.
                </span>
              </h1>
            </AnimatedSection>
            
            <AnimatedSection delay={200}>
              <p className="max-w-xl text-base text-slate-400 sm:text-lg">
                Ένα σημείο ενημέρωσης με οθόνη στην είσοδο και μια πλατφόρμα για όλους τους ενοίκους.
                Διαφάνεια, συνεργασία και ομαλή επικοινωνία – χωρίς χαρτιά, χωρίς εντάσεις.
              </p>
            </AnimatedSection>

            <AnimatedSection delay={300}>
              <ul className="grid gap-3 text-sm text-slate-300 sm:grid-cols-2">
                {[
                  "Όλοι ενημερωμένοι, κανείς απ' έξω",
                  "Ψηφοφορίες με διαφάνεια για όλους",
                  "Ομαλή συνεργασία ενοίκων",
                  "Κοινότητα, όχι απλά πολυκατοικία",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-xs text-emerald-400">
                      ✓
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </AnimatedSection>

            <AnimatedSection delay={400}>
              <div className="flex flex-wrap items-center gap-4 pt-2">
                <a
                  href="#cta"
                  className="group inline-flex items-center gap-2 rounded-full bg-emerald-500 px-6 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/25 transition-all hover:bg-emerald-400 hover:shadow-emerald-400/30 hover:scale-105"
                >
                  Ζήτησε demo
                  <svg className="h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </a>
                <a
                  href="#pricing"
                  className="rounded-full border border-slate-700 px-6 py-3 text-sm font-semibold text-slate-200 transition-all hover:border-slate-500 hover:bg-slate-800"
                >
                  Δες τα πακέτα τιμών
                </a>
              </div>
            </AnimatedSection>
            
            {/* Stats counter */}
            <AnimatedSection delay={500}>
              <div className="flex flex-wrap items-center gap-6 border-t border-slate-800 pt-6">
                {stats.map((stat, index) => (
                  <div key={stat.label} className="flex items-center gap-3">
                    {index > 0 && <div className="hidden h-8 w-px bg-slate-800 sm:block" />}
                    <div>
                      <p className="text-2xl font-bold text-emerald-400">{stat.value}</p>
                      <p className="text-xs text-slate-500">{stat.label}</p>
                    </div>
                  </div>
                ))}
              </div>
            </AnimatedSection>
          </div>

          {/* Right side: full-width Info Point visual */}
          <AnimatedSection
            delay={300}
            className="relative w-full px-4 sm:px-6 md:flex-1 md:self-stretch md:px-0 md:pl-8 lg:pl-12"
          >
            <div className="relative h-[420px] w-full overflow-hidden rounded-[40px] border border-slate-800 bg-gradient-to-b from-slate-900/90 via-slate-950/90 to-slate-950 shadow-2xl shadow-emerald-500/20 sm:h-[520px] md:h-full md:min-h-[560px] lg:min-h-[640px]">
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-emerald-500/15 via-transparent to-transparent" />
              <div className="relative flex h-full flex-col rounded-[32px] border border-slate-800 bg-slate-900/80">
                {/* Info Point header */}
                <div className="border-b border-slate-800 bg-slate-900/80 px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 animate-pulse rounded-full bg-emerald-500" />
                      <span className="text-xs font-medium text-slate-300">Σημείο Ενημέρωσης</span>
                    </div>
                    <span className="text-xs text-slate-500">12:45</span>
                  </div>
                </div>
                {/* Info Point content */}
                <div className="relative flex-1 overflow-hidden">
                  <Image
                    src="/screen_eisodos.jpg"
                    alt="Info Point - Σημείο ενημέρωσης στην είσοδο"
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 60vw, 50vw"
                  />
                </div>
              </div>
              {/* Badge */}
              <div className="absolute -right-3 -top-3 rounded-full bg-emerald-500 px-5 py-1.5 text-xs font-bold text-slate-950 shadow-lg shadow-emerald-500/40">
                Info Point
              </div>
              {/* Glow effect */}
              <div className="pointer-events-none absolute -inset-6 -z-10 rounded-[48px] bg-emerald-500/20 blur-3xl" />
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="border-b border-slate-800 bg-slate-950">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <AnimatedSection>
            <div className="mb-12 text-center">
              <span className="mb-4 inline-block rounded-full bg-emerald-500/10 px-4 py-1.5 text-xs font-medium uppercase tracking-wider text-emerald-400">
                Απλή διαδικασία
              </span>
              <h2 className="text-2xl font-bold sm:text-3xl lg:text-4xl">
                Πώς λειτουργεί ο Ψηφιακός Θυρωρός
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-base text-slate-400">
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
                  "Αναλαμβάνουμε την τοποθέτηση του συστήματος ενημέρωσης και όλο τον απαραίτητο εξοπλισμό στην είσοδο της πολυκατοικίας. Ένα Info Point που ενημερώνει όλους τους ενοίκους – ακόμα κι αυτούς που δεν χρησιμοποιούν smartphones ή email.",
                placeholder: "Οθόνη ενημέρωσης σε είσοδο πολυκατοικίας",
              },
              {
                step: "2",
                title: "Εύκολη διαχείριση",
                description:
                  "Ο διαχειριστής χρησιμοποιεί ένα απλό περιβάλλον για ανακοινώσεις, κοινόχρηστα και ψηφοφορίες. Η κοινότητα ενημερώνεται αυτόματα.",
                placeholder: "Screenshot από dashboard διαχειριστή",
              },
              {
                step: "3",
                title: "Κάθε ένοικος συμμετέχει",
                description:
                  "Στην οθόνη ή στο κινητό τους – κάθε ένοικος μένει ενήμερος και μπορεί να συμμετέχει στις αποφάσεις. Κοινότητα με διαφάνεια.",
                placeholder: "Ένοικοι ενημερωμένοι παντού",
              },
            ].map((item, index) => (
              <AnimatedSection key={item.step} delay={index * 150}>
                <div className="group relative h-full rounded-2xl border border-slate-800 bg-slate-900/50 p-6 transition-all duration-300 hover:border-emerald-500/50 hover:bg-slate-900 hover:shadow-lg hover:shadow-emerald-500/5">
                  <div className="absolute -top-4 left-6 flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 text-sm font-bold text-slate-950 shadow-lg shadow-emerald-500/25 transition-transform group-hover:scale-110">
                    {item.step}
                  </div>
                  <div className="mb-4 pt-2 text-lg font-semibold text-emerald-400">{item.title}</div>
                  <p className="mb-4 text-sm text-slate-300">{item.description}</p>
                  <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/50 p-4 text-center text-xs text-slate-500">
                    {item.placeholder}
                  </div>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* COMMUNITY FOCUS */}
      <section id="kiosk-focus" className="border-b border-slate-800 bg-slate-900/30">
        <div className="mx-auto flex max-w-7xl flex-col gap-12 px-4 py-16 sm:px-6 md:flex-row md:items-center lg:px-8">
          <div className="flex-1 space-y-6">
            <AnimatedSection>
              <span className="inline-block rounded-full bg-emerald-500/10 px-4 py-1.5 text-xs font-medium uppercase tracking-wider text-emerald-400">
                Η φιλοσοφία μας
              </span>
            </AnimatedSection>
            <AnimatedSection delay={100}>
              <h2 className="text-2xl font-bold sm:text-3xl lg:text-4xl">
                Με επίκεντρο τον ένοικο
              </h2>
            </AnimatedSection>
            <AnimatedSection delay={200}>
              <p className="text-base text-slate-400">
                Δεν είναι άλλη μια εφαρμογή κοινοχρήστων. Είναι ένα εργαλείο που ενώνει την κοινότητα.
                Ένα σημείο ενημέρωσης στην είσοδο και μια πλατφόρμα που δίνει φωνή σε κάθε ένοικο.
              </p>
            </AnimatedSection>

            <div className="space-y-4">
              {[
                {
                  title: "Κάθε ένοικος μετράει",
                  description:
                    "Όλοι βλέπουν τις ανακοινώσεις, τα κοινόχρηστα, τις αποφάσεις. Κανείς δεν μένει απ' έξω – ούτε αυτοί που δεν έχουν smartphone.",
                },
                {
                  title: "Ομαλή συνεργασία",
                  description:
                    "Οι ψηφοφορίες γίνονται με διαφάνεια, τα αποτελέσματα είναι ξεκάθαρα. Λιγότερες εντάσεις στις συνελεύσεις, περισσότερη εμπιστοσύνη.",
                },
                {
                  title: "Κοινότητα με ταυτότητα",
                  description:
                    "Η πολυκατοικία αποκτά χαρακτήρα. Μια είσοδος που δείχνει σεβασμό στους ενοίκους, οργάνωση και σύγχρονη διαχείριση.",
                },
              ].map((item, index) => (
                <AnimatedSection key={item.title} delay={300 + index * 100}>
                  <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 transition-all duration-300 hover:border-emerald-500/30 hover:bg-slate-900">
                    <h3 className="mb-2 font-semibold text-emerald-400">{item.title}</h3>
                    <p className="text-sm text-slate-400">{item.description}</p>
                  </div>
                </AnimatedSection>
              ))}
            </div>
          </div>

          {/* Info Point screenshot */}
          <AnimatedSection delay={200} className="flex-1">
            <div className="rounded-3xl border border-slate-800 bg-slate-900/50 p-4 transition-transform duration-500 hover:scale-[1.02]">
              <div className="relative aspect-video overflow-hidden rounded-2xl border border-slate-700 bg-slate-950">
                <Image
                  src="/screen_eisodos.jpg"
                  alt="Screenshot από την οθόνη ενημέρωσης - ανακοινώσεις, ψηφοφορίες, αποτελέσματα"
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
      <section id="features" className="border-b border-slate-800 bg-slate-950">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <AnimatedSection>
            <div className="mb-12 text-center">
              <span className="mb-4 inline-block rounded-full bg-emerald-500/10 px-4 py-1.5 text-xs font-medium uppercase tracking-wider text-emerald-400">
                Λειτουργίες
              </span>
              <h2 className="text-2xl font-bold sm:text-3xl lg:text-4xl">
                Εργαλεία για μια δυνατή κοινότητα
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-base text-slate-400">
                Ανακοινώσεις, κοινόχρηστα, ψηφοφορίες, αιτήματα – όλα σχεδιασμένα για να 
                ενισχύουν τη συνεργασία και την επικοινωνία μεταξύ ενοίκων.
              </p>
            </div>
          </AnimatedSection>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                title: "Ενημέρωση για όλους",
                description:
                  "Ανακοινώσεις, εργασίες, ενημερώσεις. Εμφανίζονται στην οθόνη της εισόδου και στο κινητό κάθε ενοίκου. Κανείς δεν μένει απληροφόρητος.",
              },
              {
                title: "Διαφάνεια στα οικονομικά",
                description:
                  "Κάθε ένοικος βλέπει τα κοινόχρηστά του, την ιστορία, την κατάσταση πληρωμών. Λιγότερες απορίες, περισσότερη εμπιστοσύνη.",
              },
              {
                title: "Φωνή σε κάθε ένοικο",
                description:
                  "Αιτήματα, βλάβες, προτάσεις. Κάθε ένοικος μπορεί να εκφραστεί και να παρακολουθεί την εξέλιξη του αιτήματός του.",
              },
              {
                title: "Δημοκρατικές αποφάσεις",
                description:
                  "Ψηφοφορίες με διαφάνεια. Κάθε διαμέρισμα έχει ψήφο, τα αποτελέσματα καταγράφονται, οι αποφάσεις είναι ξεκάθαρες για όλους.",
              },
              {
                title: "Επικοινωνία χωρίς εντάσεις",
                description:
                  "Σχόλια, ειδοποιήσεις, ενημερώσεις. Η κοινότητα επικοινωνεί ομαλά, χωρίς παρεξηγήσεις και χωρίς ατέλειωτα τηλέφωνα.",
              },
              {
                title: "Έτοιμοι για το μέλλον",
                description:
                  "Η πλατφόρμα υποστηρίζει ενσωμάτωση με μετρητές ενέργειας, αισθητήρες και άλλες τεχνολογίες. Η κοινότητα εξελίσσεται.",
              },
            ].map((feature, index) => (
              <AnimatedSection key={feature.title} delay={index * 100}>
                <div className="group h-full rounded-2xl border border-slate-800 bg-slate-900/50 p-6 transition-all duration-300 hover:border-emerald-500/30 hover:bg-slate-900 hover:shadow-lg hover:shadow-emerald-500/5">
                  <h3 className="mb-3 text-lg font-semibold text-emerald-400">{feature.title}</h3>
                  <p className="text-sm leading-relaxed text-slate-400">{feature.description}</p>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section id="testimonials" className="border-b border-slate-800 bg-slate-900/30">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <AnimatedSection>
            <div className="mb-12 text-center">
              <span className="mb-4 inline-block rounded-full bg-emerald-500/10 px-4 py-1.5 text-xs font-medium uppercase tracking-wider text-emerald-400">
                Κριτικές
              </span>
              <h2 className="text-2xl font-bold sm:text-3xl lg:text-4xl">
                Τι λένε οι χρήστες μας
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-base text-slate-400">
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
      <section id="pricing" className="border-b border-slate-800 bg-slate-950">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <AnimatedSection>
            <div className="mb-12 text-center">
              <span className="mb-4 inline-block rounded-full bg-emerald-500/10 px-4 py-1.5 text-xs font-medium uppercase tracking-wider text-emerald-400">
                Πακέτα
              </span>
              <h2 className="text-2xl font-bold sm:text-3xl lg:text-4xl">
                Πακέτα για κάθε πολυκατοικία
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-base text-slate-400">
                Διάλεξε το μοντέλο που ταιριάζει στην πολυκατοικία ή στο γραφείο διαχείρισής σου – με ή χωρίς σημείο ενημέρωσης.
                <br />
                <span className="text-xs text-slate-500">
                  Οι τιμές δεν περιλαμβάνουν Φ.Π.Α. 24%.
                </span>
              </p>
            </div>
          </AnimatedSection>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {pricingPlans.map((plan, index) => (
              <AnimatedSection key={plan.id} delay={index * 100}>
                <div
                  className={`relative flex h-full flex-col rounded-2xl border p-6 transition-all duration-300 hover:scale-[1.02] ${
                    plan.highlight
                      ? "border-emerald-500 bg-slate-900 shadow-xl shadow-emerald-500/20"
                      : "border-slate-800 bg-slate-950/70 hover:border-slate-700"
                  }`}
                >
                  {plan.badge && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-emerald-500 px-4 py-1 text-xs font-bold text-slate-950">
                      {plan.badge}
                    </div>
                  )}
                  <div className={plan.badge ? "pt-2" : ""}>
                    <h3 className="text-lg font-bold text-slate-50">{plan.name}</h3>
                    <p className="mt-1 text-xs text-slate-500">{plan.target}</p>
                  </div>

                  <div className="mt-5">
                    <div className="text-2xl font-bold text-emerald-400">
                      {plan.priceMonthly}
                      <span className="ml-1 text-xs font-normal text-slate-500">/ μήνα / πολυκατοικία</span>
                    </div>
                    {plan.upfrontCost && (
                      <div className="mt-1 text-xs text-slate-400">
                        + {plan.upfrontCost} <span className="text-slate-500">hardware & setup</span>
                      </div>
                    )}
                  </div>

                  <ul className="mt-6 flex-1 space-y-3">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2 text-xs text-slate-300">
                        <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-[10px] text-emerald-400">
                          ✓
                        </span>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <a
                    href="#cta"
                    className={`mt-6 block w-full rounded-full py-2.5 text-center text-sm font-semibold transition-all duration-300 ${
                      plan.highlight
                        ? "bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/25 hover:bg-emerald-400 hover:scale-105"
                        : "border border-slate-700 text-slate-200 hover:border-slate-500 hover:bg-slate-800"
                    }`}
                  >
                    Ζήτησε προσφορά
                  </a>
                </div>
              </AnimatedSection>
            ))}
          </div>

          {/* Custom plan note */}
          <AnimatedSection delay={400}>
            <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900/50 p-6 text-center transition-all duration-300 hover:border-emerald-500/30">
              <h3 className="mb-2 text-lg font-semibold text-slate-50">Πολλές πολυκατοικίες;</h3>
              <p className="text-sm text-slate-400">
                Για γραφεία διαχείρισης ή εταιρείες διαχείρισης που διαχειρίζονται 10+ πολυκατοικίες ή έχουν ιδιαίτερες ανάγκες – επικοινωνήστε για custom λύση.
              </p>
              <a
                href="#cta"
                className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-emerald-400 transition-colors hover:text-emerald-300"
              >
                Επικοινωνήστε μαζί μας
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </a>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* FOR MANAGERS */}
      <section id="for-managers" className="border-b border-slate-800 bg-slate-900/30">
        <div className="mx-auto flex max-w-7xl flex-col gap-12 px-4 py-16 sm:px-6 md:flex-row md:items-center lg:px-8">
          <div className="flex-1 space-y-6">
            <AnimatedSection>
              <span className="inline-block rounded-full bg-emerald-500/10 px-4 py-1.5 text-xs font-medium uppercase tracking-wider text-emerald-400">
                Για επαγγελματίες
              </span>
            </AnimatedSection>
            <AnimatedSection delay={100}>
              <h2 className="text-2xl font-bold sm:text-3xl lg:text-4xl">
                Για γραφεία διαχείρισης: λιγότερα τηλέφωνα, περισσότερη οργάνωση
              </h2>
            </AnimatedSection>
            <AnimatedSection delay={200}>
              <p className="text-base text-slate-400">
                Αν διαχειρίζεσαι δεκάδες πολυκατοικίες, ξέρεις πόσο χρόνο τρώνε τα τηλέφωνα, τα email
                και οι απορίες των ενοίκων. Με το newconcierge.app και τα Info Points, κάθε
                πολυκατοικία ενημερώνεται αυτόματα – κι εσύ βλέπεις τα πάντα από ένα κεντρικό panel.
              </p>
            </AnimatedSection>

            <AnimatedSection delay={300}>
              <ul className="space-y-3 text-sm text-slate-300">
                {[
                  "Κεντρικό dashboard για όλες τις πολυκατοικίες του γραφείου",
                  "Ενεργά αιτήματα & βλάβες σε μία οθόνη",
                  "Λιγότερες παρεξηγήσεις για κοινόχρηστα και αποφάσεις",
                  "Δυνατότητα για custom αναφορές & στατιστικά ανά κτίριο",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-xs text-emerald-400">
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
            <div className="rounded-3xl border border-slate-800 bg-slate-900/50 p-4 transition-transform duration-500 hover:scale-[1.02]">
              <div className="relative aspect-video overflow-hidden rounded-2xl border border-slate-700 bg-slate-950">
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
      <section id="faq" className="border-b border-slate-800 bg-slate-950">
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <AnimatedSection>
            <div className="mb-12 text-center">
              <span className="mb-4 inline-block rounded-full bg-emerald-500/10 px-4 py-1.5 text-xs font-medium uppercase tracking-wider text-emerald-400">
                Απορίες
              </span>
              <h2 className="text-2xl font-bold sm:text-3xl lg:text-4xl">Συχνές ερωτήσεις</h2>
              <p className="mx-auto mt-4 max-w-2xl text-base text-slate-400">
                Μερικές από τις πιο συχνές απορίες γύρω από το Info Point και την πλατφόρμα.
              </p>
            </div>
          </AnimatedSection>

          <AnimatedSection delay={200}>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 px-6">
              {faqs.map((item) => (
                <FaqItem key={item.question} question={item.question} answer={item.answer} />
              ))}
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* CTA FINAL */}
      <section id="cta" className="bg-slate-950">
        <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <AnimatedSection>
            <div className="relative overflow-hidden rounded-3xl border border-emerald-500/30 bg-gradient-to-br from-emerald-600/20 via-slate-900 to-slate-950 p-8 sm:p-10">
              {/* Background glow */}
              <div className="absolute -top-24 left-1/2 h-48 w-96 -translate-x-1/2 rounded-full bg-emerald-500/20 blur-3xl" />

              <div className="relative">
                <h2 className="text-center text-2xl font-bold sm:text-3xl lg:text-4xl">
                  Έτοιμοι να γίνετε κοινότητα;
                </h2>
                <p className="mx-auto mt-4 max-w-xl text-center text-base text-slate-300">
                  Συμπλήρωσε τα στοιχεία σου και θα σε καλέσουμε για μια σύντομη παρουσίαση 15 λεπτών.
                </p>

                {/* Quick contact options */}
                <div className="mt-6 flex flex-wrap justify-center gap-4">
                  <a
                    href="https://wa.me/306900000000"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-5 py-2.5 text-sm font-medium text-emerald-300 transition-all hover:bg-emerald-500/20"
                  >
                    <MessageCircle className="h-4 w-4" />
                    WhatsApp
                  </a>
                  <a
                    href="tel:+302100000000"
                    className="inline-flex items-center gap-2 rounded-full border border-slate-700 px-5 py-2.5 text-sm font-medium text-slate-300 transition-all hover:bg-slate-800"
                  >
                    <Phone className="h-4 w-4" />
                    210 000 0000
                  </a>
                </div>

                <div className="mx-auto mt-6 max-w-lg">
                  <p className="mb-4 text-center text-xs text-slate-500">Ή συμπλήρωσε τη φόρμα:</p>
                  
                  {/* Simplified contact form */}
                  <form className="grid gap-4 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <input
                        type="text"
                        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-50 placeholder-slate-500 transition-colors focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        placeholder="Όνομα *"
                        required
                      />
                    </div>
                    <div>
                      <input
                        type="tel"
                        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-50 placeholder-slate-500 transition-colors focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        placeholder="Τηλέφωνο *"
                        required
                      />
                    </div>
                    <div>
                      <input
                        type="email"
                        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-50 placeholder-slate-500 transition-colors focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        placeholder="Email"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <select className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-50 transition-colors focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500">
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
                        className="group flex w-full items-center justify-center gap-2 rounded-full bg-emerald-500 px-6 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/30 transition-all hover:bg-emerald-400 hover:shadow-emerald-400/40 hover:scale-[1.02]"
                      >
                        Θέλω να με καλέσετε
                        <svg className="h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                        </svg>
                      </button>
                    </div>
                  </form>

                  <p className="mt-4 text-center text-[11px] text-slate-500">
                    Δεν στέλνουμε spam. Θα επικοινωνήσουμε μόνο για να συζητήσουμε τις ανάγκες σου.
                  </p>
                </div>
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-slate-800 bg-slate-950">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500 shadow-lg shadow-emerald-500/25">
                  <Building className="h-5 w-5 text-slate-950" />
                </div>
                <span className="text-lg font-bold text-slate-50">newconcierge.app</span>
              </div>
              <p className="text-sm text-slate-500">
                Μετατρέπουμε πολυκατοικίες σε κοινότητες. Με επίκεντρο τον ένοικο.
              </p>
              {/* Social proof in footer */}
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                ))}
                <span className="ml-2 text-xs text-slate-500">4.9/5 από 50+ πολυκατοικίες</span>
              </div>
            </div>

            <div>
              <h3 className="mb-4 text-sm font-semibold text-slate-50">Προϊόν</h3>
              <ul className="space-y-2 text-sm text-slate-500">
                <li><a href="#how-it-works" className="transition-colors hover:text-emerald-400">Πώς λειτουργεί</a></li>
                <li><a href="#features" className="transition-colors hover:text-emerald-400">Λειτουργίες</a></li>
                <li><a href="#pricing" className="transition-colors hover:text-emerald-400">Τιμές</a></li>
                <li><a href="#testimonials" className="transition-colors hover:text-emerald-400">Κριτικές</a></li>
              </ul>
            </div>

            <div>
              <h3 className="mb-4 text-sm font-semibold text-slate-50">Υποστήριξη</h3>
              <ul className="space-y-2 text-sm text-slate-500">
                <li><a href="#faq" className="transition-colors hover:text-emerald-400">Συχνές ερωτήσεις</a></li>
                <li><a href="#cta" className="transition-colors hover:text-emerald-400">Επικοινωνία</a></li>
              </ul>
            </div>

            <div>
              <h3 className="mb-4 text-sm font-semibold text-slate-50">Επικοινωνία</h3>
              <ul className="space-y-2 text-sm text-slate-500">
                <li className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  <a href="tel:+302100000000" className="transition-colors hover:text-emerald-400">210 000 0000</a>
                </li>
                <li className="flex items-center gap-2">
                  <MessageCircle className="h-4 w-4" />
                  <a href="https://wa.me/306900000000" className="transition-colors hover:text-emerald-400">WhatsApp</a>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-slate-800 pt-8 sm:flex-row">
            <p className="text-sm text-slate-600">© 2025 newconcierge.app. Όλα τα δικαιώματα διατηρούνται.</p>
            <div className="flex gap-4 text-xs text-slate-600">
              <a href="#" className="transition-colors hover:text-emerald-400">Πολιτική απορρήτου</a>
              <a href="#" className="transition-colors hover:text-emerald-400">Όροι χρήσης</a>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
