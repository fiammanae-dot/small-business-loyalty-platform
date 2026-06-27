import Link from "next/link";
import { ArrowRight, BarChart3, CheckCircle2, Gift, QrCode, ScanLine, Sparkles, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { MotionItem, MotionReveal, MotionStagger } from "@/components/HomepageMotion";

const logos = ["BIRCH COFFEE", "Proper Pizza", "ELEVATE FITNESS", "LUNA SALON", "FOUNDRY CLOTHING", "& more"];

const proofItems = [
  { label: "No app needed", icon: CheckCircle2 },
  { label: "QR scanner ready", icon: QrCode },
  { label: "Repeat visits", icon: Users },
  { label: "Retention insights", icon: BarChart3 },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#FBFBFB] text-[#111827]">
      <PublicHeader />
      <HeroSection />
      <TrustedStrip />
    </main>
  );
}

function PublicHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-[#EDEDED] bg-white/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-[#F97316] text-sm font-bold text-white shadow-sm">LB</span>
          <span className="text-[17px] font-semibold tracking-tight">LoyaltyBase</span>
        </Link>
        <nav className="hidden items-center gap-8 text-sm font-medium text-[#475569] md:flex" aria-label="Main navigation">
          <Link href="/benefits" className="transition hover:text-[#111827]">Product</Link>
          <Link href="/pricing" className="transition hover:text-[#111827]">Pricing</Link>
          <Link href="/faq" className="transition hover:text-[#111827]">FAQ</Link>
          <Link href="/request-demo" className="transition hover:text-[#111827]">Request Demo</Link>
        </nav>
        <Link href="/request-demo" className="inline-flex h-11 items-center rounded-xl bg-[#F97316] px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#EA580C]">
          Start free trial
        </Link>
      </div>
    </header>
  );
}

function HeroSection() {
  return (
    <section className="border-b border-[#EDEDED] bg-[radial-gradient(circle_at_top_left,#FFF2E6_0%,#FBFBFB_38%)]">
      <div className="mx-auto grid max-w-7xl gap-12 px-4 py-12 sm:px-6 lg:grid-cols-[1.08fr_0.92fr] lg:items-center lg:px-8 lg:py-16">
        <div className="relative max-w-[640px] pr-2">
          <MotionReveal>
            <span className="inline-flex items-center gap-2 rounded-full border border-[#F7D8BE] bg-white px-4 py-2 text-sm font-semibold text-[#F97316] shadow-sm">
              <Sparkles className="h-4 w-4" /> BUILT FOR SMALL BUSINESS
            </span>
            <h1 className="mt-8 text-[4rem] font-semibold tracking-tight text-[#0F172A] sm:text-[5.25rem] lg:text-[6.15rem] lg:leading-[0.9]">
              Loyal customers.
              <br />
              Real, repeat <span className="text-[#F97316]">growth.</span>
            </h1>
            <p className="mt-6 max-w-xl text-[1.04rem] leading-8 text-[#64748B]">
              Launch a modern loyalty program in minutes.
              <br />
              Reward more purchases. Grow your business.
            </p>
            <MotionStagger className="mt-8 flex flex-col gap-3 sm:flex-row" delay={0.1}>
              <MotionItem>
                <Link href="/request-demo" className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#F97316] px-6 text-sm font-semibold text-white shadow-lg shadow-orange-100 transition hover:bg-[#EA580C]">
                  Start free trial <ArrowRight className="h-4 w-4" />
                </Link>
              </MotionItem>
              <MotionItem>
                <Link href="/request-demo" className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-[#E5E7EB] bg-white px-6 text-sm font-semibold text-[#111827] shadow-sm transition hover:border-[#F97316] hover:text-[#EA580C]">
                  Book a demo
                </Link>
              </MotionItem>
            </MotionStagger>
            <p className="mt-4 text-sm text-[#94A3B8]">No credit card required. Cancel anytime.</p>

            <div className="mt-10 grid max-w-2xl grid-cols-2 gap-4 sm:grid-cols-4">
              {proofItems.map((item) => (
                <div key={item.label} className="flex items-center gap-3 rounded-2xl border border-[#ECECEC] bg-white px-4 py-3 shadow-sm">
                  <item.icon className="h-5 w-5 shrink-0 text-[#111827]" />
                  <span className="text-sm font-medium text-[#334155]">{item.label}</span>
                </div>
              ))}
            </div>
          </MotionReveal>
        </div>

        <div className="relative min-h-[760px]">
          <div className="absolute left-[-10px] top-24 hidden w-[250px] rounded-[28px] border border-[#EAEAEA] bg-white p-5 shadow-[0_20px_50px_rgba(15,23,42,0.08)] lg:block">
            <p className="text-[15px] font-semibold text-[#111827]">Scan. Earn. Enjoy.</p>
            <p className="mt-2 text-sm leading-6 text-[#64748B]">Earn points in seconds. Just scan the QR code at checkout.</p>
            <div className="mt-6 rounded-2xl bg-[#F8FAFC] p-4">
              <div className="mx-auto h-28 w-full rounded-2xl border border-dashed border-[#CBD5E1] bg-white"></div>
            </div>
          </div>

          <div className="absolute left-[8px] bottom-14 hidden w-[250px] rounded-[28px] border border-[#EAEAEA] bg-white p-5 shadow-[0_20px_50px_rgba(15,23,42,0.08)] lg:block">
            <p className="text-[15px] font-semibold text-[#111827]">Reward yourself</p>
            <p className="mt-2 text-sm leading-6 text-[#64748B]">Redeem points for exclusive rewards and offers.</p>
            <div className="mt-4 flex items-center justify-end text-3xl">☕</div>
          </div>

          <div className="relative mx-auto flex h-full max-w-[440px] items-center justify-end pr-2">
            <div className="rounded-[36px] border border-[#E8E8E8] bg-white p-3 shadow-[0_28px_80px_rgba(15,23,42,0.12)]">
              <div className="rounded-[30px] bg-[#111827] p-3">
                <div className="mx-auto h-[700px] w-[350px] rounded-[36px] border-[10px] border-black bg-[#F8FAFC] p-5 shadow-inner sm:w-[372px]">
                  <div className="mb-4 flex items-center justify-between text-xs text-[#0F172A]">
                    <span>9:41</span>
                    <span>•••••</span>
                  </div>
                  <div className="rounded-[24px] bg-white p-4 shadow-sm">
                    <p className="text-xs text-[#64748B]">Good morning, Alex 👋</p>
                    <div className="mt-2 text-4xl font-semibold text-[#111827]">250</div>
                    <p className="text-sm text-[#64748B]">Points</p>
                  </div>
                  <div className="mt-4 rounded-[24px] bg-[#1F2937] p-4 text-white shadow-sm">
                    <p className="text-sm text-white/70">COFFEE CORNER</p>
                    <div className="mt-2 flex items-center justify-between">
                      <div>
                        <p className="text-xl font-semibold">Loyalty Card</p>
                        <p className="mt-1 text-sm text-white/70">6 of 10 stamps</p>
                      </div>
                      <div className="text-3xl">☕</div>
                    </div>
                    <div className="mt-4 flex gap-2">
                      {Array.from({ length: 10 }).map((_, i) => (
                        <div key={i} className={`h-8 w-8 rounded-full border text-center text-xs font-bold leading-8 ${i < 6 ? 'border-[#F97316] bg-[#F97316] text-white' : 'border-white/20 bg-white/10 text-white/80'}`}>
                          {i + 1}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="mt-4 rounded-[24px] bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-[#111827]">Scan in-store</p>
                        <p className="text-xs text-[#64748B]">Show this code to earn points</p>
                      </div>
                      <div className="rounded-xl border border-[#E5E7EB] bg-[#F8FAFC] p-3 text-xl">▣</div>
                    </div>
                  </div>
                  <div className="mt-4 rounded-[24px] bg-white p-4 shadow-sm">
                    <p className="text-sm font-semibold text-[#111827]">Your progress</p>
                    <div className="mt-3 h-2 rounded-full bg-[#E5E7EB]">
                      <div className="h-2 w-[70%] rounded-full bg-[#F97316]"></div>
                    </div>
                    <p className="mt-3 text-xs text-[#64748B]">You’re $15 away from a reward!</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="absolute right-[-8px] top-[235px] hidden rounded-[22px] bg-[#111827] px-5 py-4 text-white shadow-[0_20px_50px_rgba(15,23,42,0.18)] lg:block">
              <p className="text-xs text-white/70">Done</p>
              <div className="mt-3 rounded-2xl bg-white/10 px-4 py-3 text-sm">Add to wallet. Always with you.</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function TrustedStrip() {
  return (
    <section className="border-b border-[#EDEDED] bg-white py-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <p className="text-center text-sm text-[#64748B]">Trusted by local businesses around the world</p>
        <div className="mt-8 grid grid-cols-2 gap-4 text-center text-sm font-semibold text-[#94A3B8] sm:grid-cols-3 lg:grid-cols-6">
          {logos.map((logo) => (
            <div key={logo} className="rounded-2xl border border-[#F0F0F0] bg-[#FAFAFA] px-4 py-4 tracking-[0.22em]">{logo}</div>
          ))}
        </div>
      </div>
    </section>
  );
}

