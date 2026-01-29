import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Clock, Sparkles, BarChart3, ArrowRight, Check } from 'lucide-react';

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <span className="text-display text-2xl text-accent">K</span>
          <div className="flex items-center gap-6">
            <Link to="/login" className="text-sm text-muted hover:text-white transition-colors">
              Sign in
            </Link>
            <Link
              to="/signup"
              className="btn-primary text-sm px-4 py-2"
            >
              Start Free Trial
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-6 pt-24 pb-20">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <h1 className="text-display text-5xl md:text-6xl text-white mb-6 leading-tight">
            Know exactly where<br />your time goes
          </h1>
          <p className="text-lg text-muted max-w-xl mx-auto mb-10">
            Automatic time tracking with AI-powered categorization.
            Zero manual input. Beautiful insights.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link
              to="/signup"
              className="btn-primary inline-flex items-center gap-2 px-6 py-3"
            >
              Start 3-Day Free Trial
              <ArrowRight size={16} strokeWidth={1.5} />
            </Link>
            <span className="text-xs text-muted">No credit card required</span>
          </div>
        </motion.div>
      </section>

      {/* App Preview - Dashboard */}
      <section className="max-w-5xl mx-auto px-6 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <p className="text-[10px] text-muted uppercase tracking-widest text-center mb-6">Dashboard</p>
          <div className="premium-card p-4 shadow-glow">
            {/* Dashboard Mockup */}
            <div className="bg-background p-6">
              {/* Stats Row */}
              <div className="flex items-center gap-8 mb-8">
                <div>
                  <p className="text-4xl font-semibold text-white tracking-tight">6h 42m</p>
                  <p className="text-[10px] text-muted uppercase tracking-wider mt-1">Total Today</p>
                </div>
                <div className="w-px h-12 bg-border" />
                <div>
                  <p className="text-4xl font-semibold text-accent tracking-tight">4h 15m</p>
                  <p className="text-[10px] text-muted uppercase tracking-wider mt-1">Productive</p>
                </div>
              </div>

              {/* Timeline Bars */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-muted w-10">9 AM</span>
                  <div className="flex-1 h-6 bg-card overflow-hidden flex">
                    <div className="h-full bg-accent/80" style={{ width: '60%' }} />
                    <div className="h-full bg-muted/30" style={{ width: '25%' }} />
                    <div className="h-full bg-red-500/50" style={{ width: '15%' }} />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-muted w-10">10 AM</span>
                  <div className="flex-1 h-6 bg-card overflow-hidden flex">
                    <div className="h-full bg-accent/80" style={{ width: '45%' }} />
                    <div className="h-full bg-blue-500/50" style={{ width: '35%' }} />
                    <div className="h-full bg-muted/30" style={{ width: '20%' }} />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-muted w-10">11 AM</span>
                  <div className="flex-1 h-6 bg-card overflow-hidden flex">
                    <div className="h-full bg-accent/80" style={{ width: '80%' }} />
                    <div className="h-full bg-muted/30" style={{ width: '20%' }} />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-muted w-10">12 PM</span>
                  <div className="flex-1 h-6 bg-card overflow-hidden flex">
                    <div className="h-full bg-muted/30" style={{ width: '15%' }} />
                    <div className="h-full bg-orange-500/50" style={{ width: '70%' }} />
                    <div className="h-full bg-muted/30" style={{ width: '15%' }} />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-muted w-10">1 PM</span>
                  <div className="flex-1 h-6 bg-card overflow-hidden flex">
                    <div className="h-full bg-accent/80" style={{ width: '55%' }} />
                    <div className="h-full bg-blue-500/50" style={{ width: '30%' }} />
                    <div className="h-full bg-muted/30" style={{ width: '15%' }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* App Preview - Activity Log */}
      <section className="max-w-5xl mx-auto px-6 pb-24">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <p className="text-[10px] text-muted uppercase tracking-widest text-center mb-6">Activity Log</p>
          <div className="premium-card p-4 shadow-glow">
            {/* Activity Log Mockup */}
            <div className="bg-background">
              {/* Table Header */}
              <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-card/50 text-[10px] text-muted uppercase tracking-wider">
                <div className="col-span-3">Application</div>
                <div className="col-span-4">Window</div>
                <div className="col-span-2">Category</div>
                <div className="col-span-2">Time</div>
                <div className="col-span-1 text-right">Duration</div>
              </div>

              {/* Activity Rows */}
              <div className="grid grid-cols-12 gap-4 px-4 py-3 border-t border-border text-sm">
                <div className="col-span-3 text-white font-medium">VS Code</div>
                <div className="col-span-4 text-muted truncate">Landing.tsx - Kronos</div>
                <div className="col-span-2"><span className="text-accent text-xs">Development</span></div>
                <div className="col-span-2 text-muted">2:45 PM</div>
                <div className="col-span-1 text-right text-white">45m</div>
              </div>
              <div className="grid grid-cols-12 gap-4 px-4 py-3 border-t border-border text-sm">
                <div className="col-span-3 text-white font-medium">Chrome</div>
                <div className="col-span-4 text-muted truncate">Tailwind CSS Documentation</div>
                <div className="col-span-2"><span className="text-blue-400 text-xs">Research</span></div>
                <div className="col-span-2 text-muted">2:30 PM</div>
                <div className="col-span-1 text-right text-white">15m</div>
              </div>
              <div className="grid grid-cols-12 gap-4 px-4 py-3 border-t border-border text-sm">
                <div className="col-span-3 text-white font-medium">Figma</div>
                <div className="col-span-4 text-muted truncate">Kronos Design System</div>
                <div className="col-span-2"><span className="text-purple-400 text-xs">Design</span></div>
                <div className="col-span-2 text-muted">2:00 PM</div>
                <div className="col-span-1 text-right text-white">30m</div>
              </div>
              <div className="grid grid-cols-12 gap-4 px-4 py-3 border-t border-border text-sm">
                <div className="col-span-3 text-white font-medium">Slack</div>
                <div className="col-span-4 text-muted truncate">team-engineering</div>
                <div className="col-span-2"><span className="text-orange-400 text-xs">Communication</span></div>
                <div className="col-span-2 text-muted">1:45 PM</div>
                <div className="col-span-1 text-right text-white">12m</div>
              </div>
              <div className="grid grid-cols-12 gap-4 px-4 py-3 border-t border-border text-sm">
                <div className="col-span-3 text-white font-medium">VS Code</div>
                <div className="col-span-4 text-muted truncate">index.css - Kronos</div>
                <div className="col-span-2"><span className="text-accent text-xs">Development</span></div>
                <div className="col-span-2 text-muted">1:15 PM</div>
                <div className="col-span-1 text-right text-white">30m</div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Features */}
      <section className="border-t border-border py-24">
        <div className="max-w-5xl mx-auto px-6">
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-[10px] text-muted uppercase tracking-widest text-center mb-12"
          >
            How it works
          </motion.p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: Clock,
                title: 'Automatic Tracking',
                description: 'Runs silently in the background. No timers to start or stop.'
              },
              {
                icon: Sparkles,
                title: 'AI Categorization',
                description: 'Automatically categorizes your activities with one click.'
              },
              {
                icon: BarChart3,
                title: 'Beautiful Insights',
                description: 'See where your time goes with elegant, actionable dashboards.'
              }
            ].map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="text-center"
              >
                <div className="inline-flex p-3 bg-accent-dim text-accent mb-4">
                  <feature.icon size={24} strokeWidth={1.5} />
                </div>
                <h3 className="text-sm font-medium text-white mb-2">{feature.title}</h3>
                <p className="text-xs text-muted leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="border-t border-border py-24">
        <div className="max-w-md mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="premium-card p-8 text-center"
          >
            <p className="text-[10px] text-muted uppercase tracking-widest mb-4">Simple Pricing</p>
            <div className="mb-6">
              <span className="text-5xl font-semibold text-white">$9</span>
              <span className="text-muted">/month</span>
            </div>

            <ul className="space-y-3 mb-8 text-left">
              {[
                'Automatic time tracking',
                'AI-powered categorization',
                'Unlimited history',
                'Beautiful analytics',
                'macOS app included'
              ].map((item) => (
                <li key={item} className="flex items-center gap-3 text-sm text-muted">
                  <Check size={14} className="text-accent flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>

            <Link
              to="/signup"
              className="btn-primary w-full inline-flex items-center justify-center gap-2 py-3"
            >
              Start 3-Day Free Trial
              <ArrowRight size={16} strokeWidth={1.5} />
            </Link>
            <p className="text-[10px] text-muted mt-4">Cancel anytime. No questions asked.</p>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="max-w-5xl mx-auto px-6 flex items-center justify-between">
          <span className="text-display text-lg text-accent">K</span>
          <p className="text-xs text-muted">
            © {new Date().getFullYear()} Kronos. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
