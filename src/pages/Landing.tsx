import { useNavigate } from "react-router-dom";
import {
  Landmark,
  TrendingUp,
  Layers,
  Zap,
  BarChart2,
  Check,
  X,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function Landing() {
  const navigate = useNavigate();
  const goToAuth = () => navigate("/auth");
  const goToSignup = () => navigate("/auth?tab=signup");
  const scrollToFeatures = () =>
    document.getElementById("features")?.scrollIntoView({ behavior: "smooth" });

  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* ── NAV ─────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 bg-white border-b border-slate-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 shrink-0">
            <Brand size={30} textClassName="text-base sm:text-lg" />
          </div>

          <div className="flex items-center gap-1 sm:gap-3 shrink-0">
            <Button variant="ghost" size="sm" onClick={goToAuth} className="px-2 sm:px-3">
              Sign In
            </Button>
            <Button
              size="sm"
              onClick={goToSignup}
              className="bg-blue-600 hover:bg-blue-700 text-white px-3 whitespace-nowrap"
            >
              Get Started
            </Button>
          </div>
        </div>
      </nav>

      {/* ── HERO ────────────────────────────────────────────────── */}
      <section className="bg-gradient-to-br from-blue-50 via-white to-white py-20 sm:py-28">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Text */}
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 text-xs font-semibold px-3 py-1 rounded-full">
              🎯 Built for Vietnamese investors
            </div>
            <h1 className="text-4xl sm:text-5xl font-extrabold leading-tight tracking-tight text-slate-900">
              Know exactly when your investments{" "}
              <span className="text-blue-600">pay for your life.</span>
            </h1>
            <p className="text-lg text-slate-600 leading-relaxed max-w-lg">
              Finance Lab tracks your{" "}
              <strong className="text-slate-800">crossover point</strong> — the
              moment your passive income covers your expenses. Built for young
              Vietnamese adults serious about financial freedom.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                size="lg"
                onClick={goToSignup}
                className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
              >
                Start for free <ArrowRight className="h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" onClick={scrollToFeatures}>
                See how it works
              </Button>
            </div>
            <p className="text-xs text-slate-400">
              No credit card required · Free forever on the basic plan
            </p>
          </div>

          {/* Crossover Chart Visual */}
          <div className="relative">
            <svg
              viewBox="0 0 480 230"
              xmlns="http://www.w3.org/2000/svg"
              className="w-full drop-shadow-md rounded-2xl"
            >
              {/* Background */}
              <rect width="480" height="230" rx="16" fill="#f0f9ff" />

              {/* Grid lines */}
              {[55, 95, 135, 175].map((y) => (
                <line
                  key={y}
                  x1="30"
                  y1={y}
                  x2="450"
                  y2={y}
                  stroke="#bae6fd"
                  strokeWidth="1"
                  strokeDasharray="3,4"
                />
              ))}

              {/* Area fill under passive income */}
              <path
                d="M 30,200 C 130,188 290,135 450,68 L 450,215 L 30,215 Z"
                fill="#2563eb"
                fillOpacity="0.07"
              />

              {/* Passive income line */}
              <path
                d="M 30,200 C 130,188 290,135 450,68"
                stroke="#2563eb"
                strokeWidth="2.5"
                fill="none"
                strokeLinecap="round"
              />

              {/* Expenses line (dashed, nearly flat) */}
              <path
                d="M 30,140 C 160,139 300,137 450,133"
                stroke="#f97316"
                strokeWidth="2"
                fill="none"
                strokeLinecap="round"
                strokeDasharray="7,4"
              />

              {/* Crossover vertical dashed line (approx x=285, y=137) */}
              <line
                x1="285"
                y1="28"
                x2="285"
                y2="205"
                stroke="#64748b"
                strokeWidth="1"
                strokeDasharray="4,3"
              />

              {/* Crossover circle */}
              <circle
                cx="285"
                cy="137"
                r="6"
                fill="white"
                stroke="#2563eb"
                strokeWidth="2"
              />
              <circle cx="285" cy="137" r="2.5" fill="#2563eb" />

              {/* Crossover label pill */}
              <rect x="205" y="12" width="160" height="24" rx="12" fill="#1d4ed8" />
              <text
                x="285"
                y="28"
                textAnchor="middle"
                fill="white"
                fontSize="11"
                fontWeight="700"
                fontFamily="system-ui"
              >
                🎯 Crossover Point!
              </text>

              {/* Line labels */}
              <text
                x="38"
                y="195"
                fill="#2563eb"
                fontSize="10"
                fontWeight="600"
                fontFamily="system-ui"
                opacity="0.7"
              >
                ↑ Passive Income
              </text>
              <text
                x="38"
                y="128"
                fill="#f97316"
                fontSize="10"
                fontWeight="600"
                fontFamily="system-ui"
                opacity="0.8"
              >
                – Expenses
              </text>

              {/* X-axis labels */}
              {[
                { x: 30, label: "Today" },
                { x: 160, label: "Year 1" },
                { x: 285, label: "Year 2" },
                { x: 410, label: "Year 3" },
              ].map(({ x, label }) => (
                <text
                  key={label}
                  x={x}
                  y="225"
                  textAnchor="middle"
                  fill="#94a3b8"
                  fontSize="10"
                  fontFamily="system-ui"
                >
                  {label}
                </text>
              ))}
            </svg>
          </div>
        </div>
      </section>

      {/* ── PROBLEM STATEMENT ───────────────────────────────────── */}
      <section className="py-20 bg-white border-t border-slate-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center space-y-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 max-w-2xl mx-auto">
            Most finance apps tell you where your money went.{" "}
            <span className="text-blue-600">We tell you when you're free.</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {[
              {
                emoji: "📊",
                title: "Track everything",
                body: "Income, expenses, investments, and savings — all in one place. Categorise every transaction and see where your money actually goes.",
              },
              {
                emoji: "🏗️",
                title: "Build your Asset Tower",
                body: "A 5-tier investment framework from Defensive to Risk. Know exactly how your portfolio is balanced and when to rebalance.",
              },
              {
                emoji: "🎯",
                title: "See your crossover point",
                body: "Know exactly when your passive income equals your expenses. That's the day you work because you want to — not because you have to.",
              },
            ].map((item) => (
              <div key={item.title} className="space-y-3 text-center">
                <div className="text-4xl">{item.emoji}</div>
                <h3 className="font-semibold text-lg">{item.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ────────────────────────────────────────────── */}
      <section id="features" className="py-20 bg-slate-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-12">
          <div className="text-center space-y-3">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
              Everything you need to reach financial freedom
            </h2>
            <p className="text-slate-500 max-w-xl mx-auto">
              Purpose-built tools that work together — not another generic
              budgeting app.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {[
              {
                icon: TrendingUp,
                title: "Crossover Point Dashboard",
                body: "See what % of your monthly expenses your passive income currently covers. Watch it grow toward 100% — that's your financial freedom number.",
                color: "text-blue-600",
                bg: "bg-blue-50",
              },
              {
                icon: Layers,
                title: "Asset Tower (Tháp Tài Sản)",
                body: "Classify every investment into 5 tiers: Defensive, Safe, Income, Growth, Risk. Get instant rebalancing alerts when a tier is out of range.",
                color: "text-purple-600",
                bg: "bg-purple-50",
              },
              {
                icon: Zap,
                title: "Income Quality Tracking",
                body: "Label every income source as Active, Scalable, or Passive. Track your shift from trading time for money to earning while you sleep.",
                color: "text-amber-600",
                bg: "bg-amber-50",
              },
              {
                icon: BarChart2,
                title: "Financial Reports",
                body: "Net worth trend, savings rate %, expense breakdown by category, and investment ROI per holding — all in one place with beautiful charts.",
                color: "text-green-600",
                bg: "bg-green-50",
              },
            ].map((feature) => {
              const Icon = feature.icon;
              return (
                <Card
                  key={feature.title}
                  className="border border-slate-200 hover:shadow-md transition-shadow"
                >
                  <CardHeader className="pb-3">
                    <div className={`w-10 h-10 rounded-lg ${feature.bg} flex items-center justify-center mb-3`}>
                      <Icon className={`h-5 w-5 ${feature.color}`} strokeWidth={1.5} />
                    </div>
                    <CardTitle className="text-base font-semibold">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-slate-500 text-sm leading-relaxed">{feature.body}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── PRICING ─────────────────────────────────────────────── */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-10">
          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-3xl font-bold">Simple, honest pricing</h2>
            <p className="text-slate-500">Start free. Upgrade when you're ready.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-start">
            {/* Free */}
            <Card className="border border-slate-200">
              <CardHeader>
                <CardTitle className="text-xl">Free</CardTitle>
                <div className="mt-2">
                  <span className="text-3xl font-extrabold">₫0</span>
                  <span className="text-slate-500 ml-1">/ month</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2.5 text-sm">
                  {[
                    { label: "Transaction tracking", included: true },
                    { label: "Budget planning", included: true },
                    { label: "Basic dashboard", included: true },
                    { label: "Up to 3 months history", included: true },
                    { label: "Advanced reports", included: false },
                    { label: "Asset Tower", included: false },
                    { label: "Crossover Point", included: false },
                  ].map((f) => (
                    <li key={f.label} className={`flex items-center gap-2 ${f.included ? "text-slate-700" : "text-slate-400"}`}>
                      {f.included ? (
                        <Check className="h-4 w-4 text-green-600 shrink-0" />
                      ) : (
                        <X className="h-4 w-4 shrink-0" />
                      )}
                      {f.label}
                    </li>
                  ))}
                </ul>
                <Button variant="outline" className="w-full" onClick={goToSignup}>
                  Get started free
                </Button>
              </CardContent>
            </Card>

            {/* Pro */}
            <Card className="border-2 border-blue-600 shadow-lg relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge className="bg-blue-600 text-white px-3 py-0.5 text-xs font-semibold">
                  Most Popular
                </Badge>
              </div>
              <CardHeader>
                <CardTitle className="text-xl text-blue-700">Pro</CardTitle>
                <div className="mt-2">
                  <span className="text-3xl font-extrabold">₫99,000</span>
                  <span className="text-slate-500 ml-1">/ month</span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  or ₫990,000 / year{" "}
                  <span className="text-green-600 font-medium">(save 2 months)</span>
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2.5 text-sm">
                  {[
                    "Everything in Free",
                    "Unlimited history",
                    "Asset Tower framework",
                    "Crossover Point tracking",
                    "Income quality classification",
                    "Full financial reports",
                    "CSV export",
                    "Priority support",
                  ].map((f) => (
                    <li key={f} className="flex items-center gap-2 text-slate-700">
                      <Check className="h-4 w-4 text-green-600 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={goToSignup}
                >
                  Start Pro free for 7 days
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────── */}
      <footer className="bg-slate-900 text-slate-400 py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 mb-8">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Brand size={28} textClassName="text-base text-white" />
              </div>

              <p className="text-sm text-slate-500">Your path to financial freedom</p>
            </div>
            <div className="flex items-center gap-6 text-sm">
              <a href="#" className="hover:text-white transition-colors">
                Privacy Policy
              </a>
              <a href="#" className="hover:text-white transition-colors">
                Terms of Service
              </a>
            </div>
          </div>
          <div className="border-t border-slate-800 pt-6 text-xs text-slate-600 text-center">
            © 2026 Finance Lab. Built for the next generation of Vietnamese investors.
          </div>
        </div>
      </footer>
    </div>
  );
}
