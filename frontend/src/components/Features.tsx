import { Brain, Check, Globe, BarChart3, Shield } from 'lucide-react';

const checklistItems = [
  'AI-powered job matching based on disability type',
  'Accessible design (screen reader, big cursor, contrast modes)',
  'Audio CAPTCHA for visual impairments',
  'Multi-language support: Arabic, French, English',
  'Recruiter dashboard with inclusion analytics',
  'Real-time application tracking',
];

const featureCards = [
  { icon: Brain,   label: 'Smart AI Matching',    cardBg: 'bg-teal-50',   iconBg: 'bg-teal-100',   iconColor: 'text-teal-600'   },
  { icon: Shield,  label: 'Accessibility Tools',   cardBg: 'bg-indigo-50', iconBg: 'bg-indigo-100', iconColor: 'text-indigo-600' },
  { icon: Globe,   label: 'Multi-Language',         cardBg: 'bg-orange-50', iconBg: 'bg-orange-100', iconColor: 'text-orange-500' },
  { icon: BarChart3, label: 'Inclusion Analytics', cardBg: 'bg-green-50',  iconBg: 'bg-green-100',  iconColor: 'text-green-600'  },
];

export default function Features() {
  return (
    <section className="py-20 bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-center">

          {/* Left: checklist */}
          <div>
            <span className="text-primary font-semibold text-sm uppercase tracking-widest">Why InclusiveJobs</span>
            <h2 className="font-display text-3xl md:text-4xl text-text-primary mt-2 mb-8">
              Built for <span className="text-primary">Accessibility &amp; Inclusion</span>
            </h2>
            <div className="space-y-4">
              {checklistItems.map((feature, index) => (
                <div key={index} className="flex items-start gap-4">
                  <div className="shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center mt-0.5">
                    <Check className="w-3.5 h-3.5 text-primary" strokeWidth={3} />
                  </div>
                  <span className="text-text-secondary">{feature}</span>
                </div>
              ))}
            </div>
            <div className="mt-10">
              <button className="text-primary font-semibold hover:text-primary-dark flex items-center group">
                Learn more about our technology
                <span className="ml-2 transform group-hover:translate-x-1 transition-transform">→</span>
              </button>
            </div>
          </div>

          {/* Right: real photo */}
          <div className="relative rounded-3xl overflow-hidden shadow-2xl ring-1 ring-white/10">
            <img
              src="/images/feature-albino-professional.jpg"
              alt="Professional with albinism working independently on laptop in an accessible workspace"
              className="w-full h-full object-cover rounded-3xl"
              loading="lazy"
            />
            {/* Floating badge */}
            <div className="absolute bottom-5 left-5 bg-white/95 backdrop-blur-sm rounded-2xl px-4 py-3 shadow-xl flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-teal-500 flex items-center justify-center shrink-0">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M20 6L9 17l-5-5"/>
                </svg>
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900 leading-none">Accessible by Design</p>
                <p className="text-xs text-slate-500 mt-0.5">WCAG 2.1 compliant</p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
