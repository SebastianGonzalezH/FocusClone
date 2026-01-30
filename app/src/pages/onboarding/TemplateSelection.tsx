import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Rocket, Briefcase, Palette, Check, ArrowRight, Mail } from 'lucide-react';

interface Template {
  id: string;
  name: string;
  description: string;
  categories: { name: string; color_hex: string }[];
}

const TEMPLATES: Template[] = [
  {
    id: 'founder',
    name: 'The Founder',
    description: 'Focus on high-leverage growth, strategy, and operations.',
    categories: [
      { name: 'Deep Work & Strategy', color_hex: '#D4AF37' },
      { name: 'Sales & Growth', color_hex: '#3b82f6' },
      { name: 'Operations & Admin', color_hex: '#64748b' },
      { name: 'Core Communication', color_hex: '#0ea5e9' },
      { name: 'Meetings', color_hex: '#f43f5e' },
      { name: 'Learning & Education', color_hex: '#8b5cf6' },
      { name: 'Social Media', color_hex: '#f59e0b' },
      { name: 'Entertainment', color_hex: '#ef4444' },
      { name: 'Personal & Utility', color_hex: '#94a3b8' },
      { name: 'Miscellaneous', color_hex: '#cbd5e1' },
    ]
  },
  {
    id: 'creative',
    name: 'The Creative',
    description: 'Focus on production, inspiration, and asset management.',
    categories: [
      { name: 'Creative Production', color_hex: '#D4AF37' },
      { name: 'Inspiration & Research', color_hex: '#8b5cf6' },
      { name: 'Client & Business Ops', color_hex: '#64748b' },
      { name: 'Core Communication', color_hex: '#0ea5e9' },
      { name: 'Meetings', color_hex: '#f43f5e' },
      { name: 'Learning & Education', color_hex: '#d946ef' },
      { name: 'Social Media', color_hex: '#f59e0b' },
      { name: 'Entertainment', color_hex: '#ef4444' },
      { name: 'Personal & Utility', color_hex: '#94a3b8' },
      { name: 'Miscellaneous', color_hex: '#cbd5e1' },
    ]
  },
  {
    id: 'business_professional',
    name: 'Business Professional',
    description: 'Focus on high-impact deliverables and coordination.',
    categories: [
      { name: 'High-Impact Output', color_hex: '#D4AF37' },
      { name: 'Project Management', color_hex: '#8b5cf6' },
      { name: 'Administrative Ops', color_hex: '#64748b' },
      { name: 'Core Communication', color_hex: '#0ea5e9' },
      { name: 'Meetings', color_hex: '#f43f5e' },
      { name: 'Learning & Education', color_hex: '#d946ef' },
      { name: 'Social Media', color_hex: '#f59e0b' },
      { name: 'Entertainment', color_hex: '#ef4444' },
      { name: 'Personal & Utility', color_hex: '#94a3b8' },
      { name: 'Miscellaneous', color_hex: '#cbd5e1' },
    ]
  }
];

const templateIcons: Record<string, React.ReactNode> = {
  founder: <Rocket size={24} strokeWidth={1.5} />,
  business_professional: <Briefcase size={24} strokeWidth={1.5} />,
  creative: <Palette size={24} strokeWidth={1.5} />,
};

export default function TemplateSelection() {
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);
  const [checkingCategories, setCheckingCategories] = useState(true);
  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate();

  // Check if user already has categories - if so, redirect to dashboard
  // This prevents accidental category deletion when profile fetch fails
  useEffect(() => {
    async function checkExistingCategories() {
      if (!user) {
        setCheckingCategories(false);
        return;
      }

      const { data: categories } = await supabase
        .from('categories')
        .select('id')
        .eq('user_id', user.id)
        .limit(1);

      // If user already has categories, they've completed onboarding before
      // Redirect them back to dashboard instead of allowing template re-selection
      if (categories && categories.length > 0) {
        console.log('User already has categories, redirecting to dashboard');
        // Also ensure their profile is marked as onboarding complete
        await supabase
          .from('user_profiles')
          .update({ onboarding_completed: true })
          .eq('id', user.id);
        await refreshProfile();
        navigate('/', { replace: true });
        return;
      }

      setCheckingCategories(false);
    }

    checkExistingCategories();
  }, [user, navigate, refreshProfile]);

  async function applyTemplate() {
    if (!selectedTemplate || !user) return;

    setApplying(true);

    const template = TEMPLATES.find(t => t.id === selectedTemplate);
    if (!template) return;

    await supabase
      .from('categories')
      .delete()
      .eq('user_id', user.id);

    const categoriesToInsert = template.categories.map(cat => ({
      name: cat.name,
      color_hex: cat.color_hex,
      user_id: user.id
    }));

    const { error: catError } = await supabase
      .from('categories')
      .insert(categoriesToInsert);

    if (catError) {
      console.error('Error creating categories:', catError.message);
      setApplying(false);
      return;
    }

    // Use upsert to create profile if it doesn't exist
    const { error: profileError } = await supabase
      .from('user_profiles')
      .upsert({
        id: user.id,
        email: user.email,
        template_id: selectedTemplate,
        onboarding_completed: true
      }, { onConflict: 'id' });

    if (profileError) {
      console.error('Error updating profile:', profileError.message);
    }

    await refreshProfile();
    setApplying(false);
    navigate('/');
  }

  // Show loading while checking if user has existing categories
  if (checkingCategories) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted">Loading...</div>
      </div>
    );
  }

  // Show email verification message if user is not authenticated
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full"
        >
          <div className="premium-card p-8 text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring' }}
              className="inline-flex items-center justify-center w-16 h-16 bg-accent/10 border border-accent/20 mb-6"
            >
              <Mail size={32} className="text-accent" strokeWidth={1.5} />
            </motion.div>

            <h1 className="text-xl font-medium mb-3 text-white">Verify Your Email</h1>
            <p className="text-sm text-muted mb-6 leading-relaxed">
              We've sent a verification link to your email address.
              Please check your inbox and click the link to continue setting up your account.
            </p>

            <div className="bg-card border border-border p-4 mb-6">
              <p className="text-xs text-muted">
                <span className="text-accent font-medium">Tip:</span> Check your spam folder if you don't see the email.
              </p>
            </div>

            <motion.button
              onClick={() => navigate('/login')}
              className="btn-primary w-full"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Back to Login
            </motion.button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <span className="text-display text-4xl text-accent">K</span>
          <h1 className="text-xl font-medium mt-6 mb-2 text-white">Choose Your Template</h1>
          <p className="text-xs text-muted uppercase tracking-wider">
            Select a category template that matches your workflow
          </p>
        </motion.div>

        {/* Template Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
          {TEMPLATES.map((template, index) => (
            <motion.button
              key={template.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => setSelectedTemplate(template.id)}
              className={`relative premium-card p-5 text-left transition-all duration-200 ${
                selectedTemplate === template.id
                  ? 'border-accent'
                  : 'hover:bg-card-hover'
              }`}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
            >
              {selectedTemplate === template.id && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute top-3 right-3 bg-accent p-1"
                >
                  <Check size={12} strokeWidth={2.5} className="text-black" />
                </motion.div>
              )}

              <div className={`mb-3 p-2.5 inline-block transition-colors ${
                selectedTemplate === template.id
                  ? 'bg-accent-dim text-accent'
                  : 'bg-card-hover text-muted'
              }`}>
                {templateIcons[template.id] || <Briefcase size={24} strokeWidth={1.5} />}
              </div>

              <h3 className="text-sm font-medium mb-1 text-white">{template.name}</h3>
              <p className="text-xs text-muted mb-4">{template.description}</p>

              <div className="flex flex-wrap gap-1">
                {template.categories.slice(0, 3).map((cat, idx) => (
                  <span
                    key={idx}
                    className="text-[10px] px-2 py-0.5 bg-card-hover text-muted uppercase tracking-wider"
                  >
                    {cat.name}
                  </span>
                ))}
                {template.categories.length > 3 && (
                  <span className="text-[10px] px-2 py-0.5 bg-card-hover text-muted">
                    +{template.categories.length - 3}
                  </span>
                )}
              </div>
            </motion.button>
          ))}
        </div>

        {/* Continue Button */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-center"
        >
          <motion.button
            onClick={applyTemplate}
            disabled={!selectedTemplate || applying}
            className="btn-primary px-10 inline-flex items-center gap-2 disabled:opacity-50"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {applying ? 'Setting up...' : 'Continue'}
            <ArrowRight size={16} strokeWidth={1.5} />
          </motion.button>
        </motion.div>
      </div>
    </div>
  );
}
