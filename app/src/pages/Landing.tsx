import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Clock, Sparkles, BarChart3, ArrowRight, Check } from 'lucide-react';

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <span className="text-display text-2xl text-accent">F</span>
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

      {/* Screenshot/Preview */}
      <section className="max-w-4xl mx-auto px-6 pb-24">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="premium-card p-2 shadow-gold"
        >
          <div className="bg-card aspect-video flex items-center justify-center">
            <div className="text-center">
              <div className="flex items-center justify-center gap-8 mb-8">
                <div className="text-center">
                  <p className="text-4xl font-semibold text-white">6h 42m</p>
                  <p className="text-[10px] text-muted uppercase tracking-wider mt-2">Total Today</p>
                </div>
                <div className="w-px h-12 bg-border" />
                <div className="text-center">
                  <p className="text-4xl font-semibold text-accent">4h 15m</p>
                  <p className="text-[10px] text-muted uppercase tracking-wider mt-2">Productive</p>
                </div>
              </div>
              <p className="text-xs text-muted">Dashboard Preview</p>
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
              <span className="text-5xl font-semibold text-white">$7</span>
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
          <span className="text-display text-lg text-accent">F</span>
          <p className="text-xs text-muted">
            © {new Date().getFullYear()} FocusClone. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
