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

          {/* Right: 2×2 feature card grid */}
          <div className="grid grid-cols-2 gap-4">
            {featureCards.map(({ icon: Icon, label, cardBg, iconBg, iconColor }) => (
              <div
                key={label}
                className={`${cardBg} rounded-2xl p-6 card-hover border border-transparent hover:border-primary/10`}
              >
                <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center mb-4`}>
                  <Icon className={`w-5 h-5 ${iconColor}`} />
                </div>
                <p className="font-semibold text-text-primary text-sm leading-snug">{label}</p>
              </div>
            ))}
          </div>

        </div>
      </div>
    </section>
  );
}
