'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  CircleHelp,
  Gift,
  MessageSquare,
  QrCode,
  ScanLine,
  ShieldCheck,
  Sparkles,
  Store,
  Users,
  Coffee,
  Utensils,
  Scissors,
  Flower2,
  Car,
  TrendingUp,
  Zap,
  Award,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface Feature {
  title: string;
  description: string;
  icon: LucideIcon;
}

interface Industry {
  name: string;
  icon: LucideIcon;
}

interface Step {
  title: string;
  description: string;
}

interface Benefit {
  label: string;
  icon: LucideIcon;
}

interface PricingPlan {
  name: string;
  price: string;
  period: string;
  yearlyPrice: string;
  features: string[];
  highlighted: boolean;
}

interface FAQ {
  question: string;
  answer: string;
}

// ============================================================================
// DATA CONSTANTS
// ============================================================================

const FEATURES: Feature[] = [
  {
    title: 'Digital Loyalty Cards',
    description: 'Customers keep their card on their phone. No app required.',
    icon: Gift,
  },
  {
    title: 'Referral Growth',
    description: 'Turn loyal customers into brand advocates.',
    icon: Users,
  },
  {
    title: 'Customer Tiers',
    description: 'Reward Silver, Gold, and VIP customers automatically.',
    icon: Award,
  },
];

const INDUSTRIES: Industry[] = [
  { name: 'Coffee Shops', icon: Coffee },
  { name: 'Restaurants', icon: Utensils },
  { name: 'Barbershops', icon: Scissors },
  { name: 'Beauty Salons', icon: Flower2 },
  { name: 'Car Care Centers', icon: Car },
];

const STEPS: Step[] = [
  {
    title: 'Customer Joins',
    description: 'Create a customer profile and share the digital card.',
  },
  {
    title: 'Scan QR Code',
    description: 'Use the scanner or manual fallback to record visits.',
  },
  {
    title: 'Earn Rewards',
    description: 'Customers accumulate stamps toward their next reward.',
  },
  {
    title: 'Return More Often',
    description: 'Redeem the reward and restart the next loyalty cycle.',
  },
];

const BENEFITS: Benefit[] = [
  { label: 'Increase repeat visits', icon: TrendingUp },
  { label: 'Improve customer retention', icon: Users },
  { label: 'Reward loyal customers', icon: Gift },
  { label: 'Grow through referrals', icon: Sparkles },
  { label: 'Track loyalty performance', icon: BarChart3 },
];

const PRICING_PLANS: PricingPlan[] = [
  {
    name: 'Starter',
    price: 'AED 100',
    period: '/month',
    yearlyPrice: 'AED 1,000/year',
    features: ['1 Branch', '1 Program'],
    highlighted: false,
  },
  {
    name: 'Growth',
    price: 'AED 200',
    period: '/month',
    yearlyPrice: 'AED 2,000/year',
    features: ['3 Branches', '5 Programs'],
    highlighted: true,
  },
  {
    name: 'Multi Branch',
    price: 'AED 1,000',
    period: '/year per branch',
    yearlyPrice: '',
    features: ['10 Branches', '15 Programs'],
    highlighted: false,
  },
];

const PRICING_INCLUDES: string[] = [
  'Referrals',
  'Customer Tiers',
  'Reports',
  'CSV Exports',
  'Branding',
];

const FAQS: FAQ[] = [
  {
    question: 'Do customers need an app?',
    answer:
      'No. Customers access their loyalty card directly from their phone browser. No app download required.',
  },
  {
    question: 'Can I use multiple branches?',
    answer:
      'Yes. All plans support multi-branch operations with centralized reporting and per-branch customization.',
  },
  {
    question: 'How do referrals work?',
    answer:
      'Loyal customers receive a unique referral link. When new customers join through the link, both earn rewards.',
  },
  {
    question: 'Can staff issue stamps?',
    answer:
      'Yes. Staff can scan QR codes or manually issue stamps through the dashboard. Full audit trail included.',
  },
  {
    question: 'How does QR scanning work?',
    answer:
      'Staff use the built-in scanner to instantly record visits, issue stamps, and track customer activity in real-time.',
  },
];

// ============================================================================
// ANIMATION VARIANTS
// ============================================================================

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: 'easeOut',
    },
  },
};

const phoneVariants = {
  hidden: { opacity: 0, x: 100, rotateY: -20 },
  visible: {
    opacity: 1,
    x: 0,
    rotateY: 0,
    transition: {
      duration: 0.8,
      ease: 'easeOut',
    },
  },
  float: {
    y: [0, -20, 0],
    transition: {
      duration: 4,
      ease: 'easeInOut',
      repeat: Infinity,
    },
  },
};

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================

export default function HomePage(): JSX.Element {
  return (
    <main className="min-h-screen bg-white text-[#1E293B]">
      <PublicHeader />
      <HeroSection />
      <IndustriesSection />
      <WhyLoyaltyBaseSection />
      <HowItWorksSection />
      <PlatformPreviewSection />
      <BenefitsSection />
      <PricingSection />
      <FaqSection />
      <FinalCtaSection />
      <Footer />
    </main>
  );
}

// ============================================================================
// HEADER COMPONENT
// ============================================================================

function PublicHeader(): JSX.Element {
  return (
    <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="flex items-center gap-2"
          aria-label="LoyaltyBase homepage"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-md bg-[#F97316] text-sm font-bold text-white">
            LB
          </span>
          <span className="text-lg font-bold text-[#1E293B]">LoyaltyBase</span>
        </Link>

        <nav className="hidden items-center gap-8 text-sm font-semibold text-gray-600 md:flex">
          <a href="#features" className="transition hover:text-[#F97316]">
            Features
          </a>
          <a href="#how-it-works" className="transition hover:text-[#F97316]">
            How it works
          </a>
          <a href="#pricing" className="transition hover:text-[#F97316]">
            Pricing
          </a>
          <a href="#faq" className="transition hover:text-[#F97316]">
            FAQ
          </a>
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-[#1E293B] transition hover:border-[#F97316] hover:text-[#EA580C]"
          >
            Login
          </Link>
          <a
            href="mailto:hello@loyaltybase.ae?subject=Request%20Demo"
            className="hidden rounded-md bg-[#F97316] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#EA580C] sm:inline-flex"
          >
            Request Demo
          </a>
        </div>
      </div>
    </header>
  );
}

// ============================================================================
// HERO SECTION
// ============================================================================

function HeroSection(): JSX.Element {
  return (
    <section className="overflow-hidden border-b border-orange-100 bg-gradient-to-b from-orange-50 to-white">
      <div className="mx-auto grid max-w-7xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:items-center lg:px-8 lg:py-28">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={containerVariants}
        >
          <motion.span
            variants={itemVariants}
            className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-white px-3 py-1 text-sm font-semibold text-[#EA580C] shadow-sm"
          >
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            Loyalty for growing businesses
          </motion.span>

          <motion.h1
            variants={itemVariants}
            className="mt-6 text-5xl font-bold tracking-tight text-[#1E293B] sm:text-6xl lg:text-7xl"
          >
            Turn Every Visit Into Customer Loyalty
          </motion.h1>

          <motion.p
            variants={itemVariants}
            className="mt-6 max-w-2xl text-lg leading-8 text-gray-600"
          >
            Digital loyalty cards, referrals, rewards, and customer tiers
            designed for growing businesses.
          </motion.p>

          <motion.div
            variants={itemVariants}
            className="mt-8 flex flex-col gap-4 sm:flex-row"
          >
            <a
              href="mailto:hello@loyaltybase.ae?subject=Request%20Demo"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#F97316] px-6 py-3 text-base font-semibold text-white shadow-lg transition hover:bg-[#EA580C]"
            >
              Request Demo
              <ArrowRight className="h-5 w-5" aria-hidden="true" />
            </a>
            <a
              href="#features"
              className="inline-flex items-center justify-center rounded-lg border-2 border-[#F97316] bg-white px-6 py-3 text-base font-semibold text-[#F97316] transition hover:bg-orange-50"
            >
              View Features
            </a>
          </motion.div>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={phoneVariants}
          animate="float"
        >
          <MobilePreview />
        </motion.div>
      </div>
    </section>
  );
}

// ============================================================================
// ENHANCED 3D MOBILE PREVIEW COMPONENT
// ============================================================================

function MobilePreview(): JSX.Element {
  return (
    <div className="relative flex justify-center perspective">
      {/* Outer phone frame with 3D effect */}
      <div className="relative" style={{ perspective: '1200px' }}>
        {/* Shadow and glow effect */}
        <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-orange-400/20 to-orange-600/20 blur-3xl" />

        {/* Phone body */}
        <div className="relative rounded-3xl border-8 border-black bg-black p-3 shadow-2xl" style={{ width: '320px' }}>
          {/* Notch */}
          <div className="absolute top-0 left-1/2 transform -translate-x-1/2 z-10 w-40 h-7 bg-black rounded-b-3xl border-b-2 border-gray-900" />

          {/* Screen content */}
          <div className="rounded-2xl bg-gradient-to-b from-[#1E293B] to-[#0F172A] p-4 text-white overflow-hidden">
            {/* Status bar */}
            <div className="flex items-center justify-between text-xs font-semibold px-2 py-1 mb-2">
              <span>9:41</span>
              <div className="flex items-center gap-1">
                <div className="w-1 h-2 bg-white rounded-sm" />
                <div className="w-1 h-2 bg-white rounded-sm" />
                <div className="w-1 h-2 bg-white rounded-sm" />
              </div>
            </div>

            {/* App header */}
            <div className="flex items-center justify-between px-2 mb-4">
              <span className="text-xs font-bold">≡</span>
              <span className="text-sm font-bold text-[#F97316]">LoyaltyBase</span>
              <span className="text-xs">🔔</span>
            </div>

            {/* Card content */}
            <div className="mb-6">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold text-orange-200">Coffee Club</p>
                  <h2 className="mt-1 text-xl font-bold">Mina Hanna</h2>
                </div>
                <span className="rounded-full bg-gradient-to-r from-yellow-400 to-yellow-600 px-2 py-1 text-xs font-bold uppercase text-black">
                  Gold
                </span>
              </div>

              <div className="mb-6 rounded-xl bg-gradient-to-br from-yellow-500 to-yellow-700 p-4">
                <div className="flex items-end justify-between mb-3">
                  <div>
                    <p className="text-xs text-yellow-100">Stamp progress</p>
                    <p className="text-3xl font-bold text-white">8/10</p>
                  </div>
                  <Gift className="h-8 w-8 text-yellow-100" aria-hidden="true" />
                </div>
                <div className="h-2 rounded-full bg-white/30">
                  <motion.div
                    className="h-2 rounded-full bg-white"
                    initial={{ width: 0 }}
                    whileInView={{ width: '80%' }}
                    transition={{ duration: 1.5, delay: 0.5 }}
                    viewport={{ once: true }}
                  />
                </div>
                <p className="mt-2 text-xs text-yellow-100">
                  2 stamps away from free coffee
                </p>
              </div>
            </div>

            {/* Reward section */}
            <div className="rounded-xl bg-white p-3 text-[#1E293B]">
              <p className="text-xs font-semibold text-[#EA580C]">Next Reward</p>
              <p className="mt-1 font-bold">Free Coffee</p>
              <div className="mt-3 flex items-center justify-center rounded-lg border-2 border-gray-300 bg-gray-100 py-3">
                <QrCode className="h-10 w-10 text-[#1E293B]" aria-hidden="true" />
              </div>
            </div>
          </div>

          {/* Side button accent */}
          <div className="absolute right-0 top-32 w-1 h-12 bg-gradient-to-b from-gray-600 to-gray-800 rounded-l" />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// INDUSTRIES SECTION
// ============================================================================

function IndustriesSection(): JSX.Element {
  return (
    <section className="bg-white py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={containerVariants}
          className="mb-12 text-center"
        >
          <motion.p
            variants={itemVariants}
            className="text-sm font-semibold uppercase text-[#EA580C]"
          >
            Industries
          </motion.p>
          <motion.h2
            variants={itemVariants}
            className="mt-3 text-3xl font-bold text-[#1E293B]"
          >
            Perfect for every business type
          </motion.h2>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={containerVariants}
          className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5"
        >
          {INDUSTRIES.map((industry) => {
            const Icon = industry.icon;
            return (
              <motion.div
                key={industry.name}
                variants={itemVariants}
                whileHover={{ scale: 1.05, borderColor: '#F97316' }}
                className="flex flex-col items-center gap-3 rounded-lg border border-gray-200 bg-white p-4 text-center transition cursor-pointer"
              >
                <Icon
                  className="h-8 w-8 text-[#F97316]"
                  aria-hidden="true"
                />
                <p className="text-sm font-semibold text-[#1E293B]">
                  {industry.name}
                </p>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}

// ============================================================================
// WHY LOYALTYBASE SECTION
// ============================================================================

function WhyLoyaltyBaseSection(): JSX.Element {
  return (
    <section id="features" className="bg-gray-50 py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={containerVariants}
          className="mb-12 text-center"
        >
          <motion.p
            variants={itemVariants}
            className="text-sm font-semibold uppercase text-[#EA580C]"
          >
            Why LoyaltyBase
          </motion.p>
          <motion.h2
            variants={itemVariants}
            className="mt-3 text-3xl font-bold text-[#1E293B]"
          >
            Everything you need to build loyalty
          </motion.h2>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={containerVariants}
          className="grid gap-6 md:grid-cols-3"
        >
          {FEATURES.map((feature) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={feature.title}
                variants={itemVariants}
                whileHover={{
                  scale: 1.05,
                  boxShadow: '0 20px 40px rgba(249, 115, 22, 0.1)',
                }}
                className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition cursor-pointer"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-orange-100">
                  <Icon
                    className="h-6 w-6 text-[#F97316]"
                    aria-hidden="true"
                  />
                </div>
                <h3 className="mt-4 text-lg font-bold text-[#1E293B]">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-gray-600">
                  {feature.description}
                </p>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}

// ============================================================================
// HOW IT WORKS SECTION
// ============================================================================

function HowItWorksSection(): JSX.Element {
  return (
    <section id="how-it-works" className="bg-white py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={containerVariants}
          className="mb-12 text-center"
        >
          <motion.p
            variants={itemVariants}
            className="text-sm font-semibold uppercase text-[#EA580C]"
          >
            How It Works
          </motion.p>
          <motion.h2
            variants={itemVariants}
            className="mt-3 text-3xl font-bold text-[#1E293B]"
          >
            Simple 4-step process
          </motion.h2>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={containerVariants}
          className="grid gap-6 md:grid-cols-4"
        >
          {STEPS.map((step, index) => (
            <motion.div
              key={step.title}
              variants={itemVariants}
              className="relative"
            >
              <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                <motion.div
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F97316] text-sm font-bold text-white"
                  whileHover={{ scale: 1.2, rotate: 360 }}
                  transition={{ duration: 0.5 }}
                >
                  {index + 1}
                </motion.div>
                <h3 className="mt-4 text-lg font-bold text-[#1E293B]">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm text-gray-600">
                  {step.description}
                </p>
              </div>
              {index < STEPS.length - 1 && (
                <div className="hidden md:block absolute top-1/3 -right-3 text-2xl text-gray-300">
                  →
                </div>
              )}
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

// ============================================================================
// PLATFORM PREVIEW SECTION
// ============================================================================

function PlatformPreviewSection(): JSX.Element {
  return (
    <section className="bg-gray-50 py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={containerVariants}
          className="mb-12 text-center"
        >
          <motion.p
            variants={itemVariants}
            className="text-sm font-semibold uppercase text-[#EA580C]"
          >
            Platform Preview
          </motion.p>
          <motion.h2
            variants={itemVariants}
            className="mt-3 text-3xl font-bold text-[#1E293B]"
          >
            Powerful tools for your business
          </motion.h2>
          <motion.p
            variants={itemVariants}
            className="mx-auto mt-4 max-w-2xl text-gray-600"
          >
            Manage your entire loyalty program from one intuitive dashboard.
            Create programs, enroll customers, scan QR codes, and track
            performance.
          </motion.p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={containerVariants}
          className="rounded-lg border border-gray-200 bg-white p-8 shadow-lg"
        >
          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                title: 'Business Dashboard',
                description:
                  'Real-time analytics, customer insights, and program performance metrics.',
                gradient: 'from-blue-50 to-blue-100',
                color: 'bg-blue-300',
              },
              {
                title: 'Customer 360',
                description:
                  'Complete customer profiles with visit history, rewards, and referral data.',
                gradient: 'from-purple-50 to-purple-100',
                color: 'bg-purple-300',
              },
              {
                title: 'QR Scanner',
                description:
                  'Fast, reliable QR scanning for issuing stamps and tracking visits.',
                gradient: 'from-orange-50 to-orange-100',
                color: 'bg-orange-300',
              },
            ].map((item, index) => (
              <motion.div
                key={item.title}
                variants={itemVariants}
                whileHover={{ scale: 1.05 }}
                className={`rounded-lg bg-gradient-to-br ${item.gradient} p-6`}
              >
                <h3 className="font-bold text-[#1E293B]">{item.title}</h3>
                <p className="mt-2 text-sm text-gray-600">
                  {item.description}
                </p>
                <div className="mt-4 space-y-2">
                  {index === 2 ? (
                    <div className="flex items-center justify-center">
                      <QrCode
                        className="h-12 w-12 text-[#F97316]"
                        aria-hidden="true"
                      />
                    </div>
                  ) : (
                    <>
                      <motion.div
                        className={`h-2 w-3/4 rounded ${item.color}`}
                        animate={{ width: ['60%', '75%', '60%'] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      />
                      <motion.div
                        className={`h-2 w-full rounded ${item.color}`}
                        animate={{ width: ['80%', '100%', '80%'] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      />
                      <motion.div
                        className={`h-2 w-2/3 rounded ${item.color}`}
                        animate={{ width: ['50%', '67%', '50%'] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      />
                    </>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// ============================================================================
// BENEFITS SECTION
// ============================================================================

function BenefitsSection(): JSX.Element {
  return (
    <section className="bg-white py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={containerVariants}
          className="mb-12 text-center"
        >
          <motion.p
            variants={itemVariants}
            className="text-sm font-semibold uppercase text-[#EA580C]"
          >
            Benefits
          </motion.p>
          <motion.h2
            variants={itemVariants}
            className="mt-3 text-3xl font-bold text-[#1E293B]"
          >
            Why businesses choose LoyaltyBase
          </motion.h2>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={containerVariants}
          className="grid gap-4 md:grid-cols-2 lg:grid-cols-5"
        >
          {BENEFITS.map((benefit) => {
            const Icon = benefit.icon;
            return (
              <motion.div
                key={benefit.label}
                variants={itemVariants}
                whileHover={{ scale: 1.05, x: 5 }}
                className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-4 cursor-pointer"
              >
                <Icon
                  className="h-6 w-6 shrink-0 text-[#F97316]"
                  aria-hidden="true"
                />
                <p className="font-semibold text-[#1E293B]">
                  {benefit.label}
                </p>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}

// ============================================================================
// PRICING SECTION
// ============================================================================

function PricingSection(): JSX.Element {
  return (
    <section id="pricing" className="bg-gray-50 py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={containerVariants}
          className="mb-12 text-center"
        >
          <motion.p
            variants={itemVariants}
            className="text-sm font-semibold uppercase text-[#EA580C]"
          >
            Pricing
          </motion.p>
          <motion.h2
            variants={itemVariants}
            className="mt-3 text-3xl font-bold text-[#1E293B]"
          >
            Plans that scale with your business
          </motion.h2>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={containerVariants}
          className="mb-12 grid gap-6 md:grid-cols-3"
        >
          {PRICING_PLANS.map((plan) => (
            <motion.div
              key={plan.name}
              variants={itemVariants}
              whileHover={{ scale: plan.highlighted ? 1.08 : 1.05 }}
              className={`rounded-lg border-2 p-8 transition ${
                plan.highlighted
                  ? 'border-[#F97316] bg-white shadow-lg'
                  : 'border-gray-200 bg-white'
              }`}
            >
              {plan.highlighted && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  className="mb-4 inline-block rounded-full bg-[#F97316] px-3 py-1 text-xs font-bold text-white uppercase"
                >
                  Most Popular
                </motion.div>
              )}

              <h3 className="text-2xl font-bold text-[#1E293B]">
                {plan.name}
              </h3>

              <div className="mt-4">
                <span className="text-4xl font-bold text-[#1E293B]">
                  {plan.price}
                </span>
                <span className="text-gray-600">{plan.period}</span>
              </div>

              {plan.yearlyPrice && (
                <p className="mt-2 text-sm text-gray-600">
                  or {plan.yearlyPrice}
                </p>
              )}

              <div className="mt-6 space-y-3">
                {plan.features.map((feature) => (
                  <motion.div
                    key={feature}
                    whileHover={{ x: 5 }}
                    className="flex items-center gap-2"
                  >
                    <CheckCircle2
                      className="h-5 w-5 text-[#F97316]"
                      aria-hidden="true"
                    />
                    <span className="text-sm text-gray-600">{feature}</span>
                  </motion.div>
                ))}
              </div>

              <a
                href="mailto:hello@loyaltybase.ae?subject=Request%20Demo"
                className={`mt-8 block w-full rounded-lg py-3 text-center font-semibold transition ${
                  plan.highlighted
                    ? 'bg-[#F97316] text-white hover:bg-[#EA580C]'
                    : 'border-2 border-[#F97316] text-[#F97316] hover:bg-orange-50'
                }`}
              >
                Get Started
              </a>
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={containerVariants}
          className="rounded-lg border border-gray-200 bg-white p-6 text-center"
        >
          <p className="font-semibold text-[#1E293B]">All plans include:</p>
          <div className="mt-4 flex flex-wrap justify-center gap-4">
            {PRICING_INCLUDES.map((item) => (
              <motion.div
                key={item}
                variants={itemVariants}
                className="flex items-center gap-2"
              >
                <CheckCircle2
                  className="h-5 w-5 text-[#F97316]"
                  aria-hidden="true"
                />
                <span className="text-sm text-gray-600">{item}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// ============================================================================
// FAQ SECTION
// ============================================================================

function FaqSection(): JSX.Element {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section id="faq" className="bg-white py-16">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={containerVariants}
          className="mb-12 text-center"
        >
          <motion.p
            variants={itemVariants}
            className="text-sm font-semibold uppercase text-[#EA580C]"
          >
            FAQ
          </motion.p>
          <motion.h2
            variants={itemVariants}
            className="mt-3 text-3xl font-bold text-[#1E293B]"
          >
            Common questions
          </motion.h2>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={containerVariants}
          className="space-y-4"
        >
          {FAQS.map((faq, index) => (
            <motion.div
              key={faq.question}
              variants={itemVariants}
              className="rounded-lg border border-gray-200 bg-white overflow-hidden"
            >
              <button
                onClick={() =>
                  setOpenIndex(openIndex === index ? null : index)
                }
                className="w-full flex items-center justify-between p-6 font-semibold text-[#1E293B] hover:bg-gray-50 transition"
              >
                <span>{faq.question}</span>
                <motion.div
                  animate={{ rotate: openIndex === index ? 180 : 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <CircleHelp
                    className="h-5 w-5 text-[#F97316]"
                    aria-hidden="true"
                  />
                </motion.div>
              </button>
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{
                  opacity: openIndex === index ? 1 : 0,
                  height: openIndex === index ? 'auto' : 0,
                }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <p className="px-6 pb-6 text-sm text-gray-600">
                  {faq.answer}
                </p>
              </motion.div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

// ============================================================================
// FINAL CTA SECTION
// ============================================================================

function FinalCtaSection(): JSX.Element {
  return (
    <section className="bg-gradient-to-r from-[#F97316] to-[#EA580C] py-16">
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
        variants={containerVariants}
        className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8"
      >
        <motion.h2
          variants={itemVariants}
          className="text-4xl font-bold text-white"
        >
          Start Building Customer Loyalty Today
        </motion.h2>
        <motion.p
          variants={itemVariants}
          className="mt-4 text-lg text-orange-100"
        >
          Launch your loyalty program in minutes and keep customers coming
          back.
        </motion.p>
        <motion.a
          variants={itemVariants}
          whileHover={{ scale: 1.05 }}
          href="mailto:hello@loyaltybase.ae?subject=Request%20Demo"
          className="mt-8 inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3 text-base font-semibold text-[#F97316] transition hover:bg-orange-50"
        >
          Request Demo
          <ArrowRight className="h-5 w-5" aria-hidden="true" />
        </motion.a>
      </motion.div>
    </section>
  );
}

// ============================================================================
// FOOTER COMPONENT
// ============================================================================

function Footer(): JSX.Element {
  return (
    <footer className="border-t border-gray-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 md:grid-cols-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-10 w-10 items-center justify-center rounded-md bg-[#F97316] text-sm font-bold text-white">
                LB
              </span>
              <span className="font-bold text-[#1E293B]">LoyaltyBase</span>
            </div>
            <p className="mt-2 text-sm text-gray-600">
              Digital loyalty for growing businesses.
            </p>
          </div>

          <div>
            <p className="font-semibold text-[#1E293B]">Product</p>
            <div className="mt-4 space-y-2">
              <a
                href="#features"
                className="block text-sm text-gray-600 transition hover:text-[#F97316]"
              >
                Features
              </a>
              <a
                href="#pricing"
                className="block text-sm text-gray-600 transition hover:text-[#F97316]"
              >
                Pricing
              </a>
              <a
                href="#how-it-works"
                className="block text-sm text-gray-600 transition hover:text-[#F97316]"
              >
                How it works
              </a>
            </div>
          </div>

          <div>
            <p className="font-semibold text-[#1E293B]">Company</p>
            <div className="mt-4 space-y-2">
              <a
                href="/login"
                className="block text-sm text-gray-600 transition hover:text-[#F97316]"
              >
                Login
              </a>
              <a
                href="mailto:hello@loyaltybase.ae"
                className="block text-sm text-gray-600 transition hover:text-[#F97316]"
              >
                Contact
              </a>
            </div>
          </div>

          <div>
            <p className="font-semibold text-[#1E293B]">Legal</p>
            <div className="mt-4 space-y-2">
              <a
                href="/privacy"
                className="block text-sm text-gray-600 transition hover:text-[#F97316]"
              >
                Privacy Policy
              </a>
              <a
                href="/terms"
                className="block text-sm text-gray-600 transition hover:text-[#F97316]"
              >
                Terms of Service
              </a>
            </div>
          </div>
        </div>

        <div className="mt-8 border-t border-gray-200 pt-8 text-center text-sm text-gray-600">
          <p>&copy; 2024 LoyaltyBase. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}

