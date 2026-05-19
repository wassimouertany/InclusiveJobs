import { Star } from 'lucide-react';

const testimonials = [
  {
    name: 'Sarah Ben Ali',
    role: 'Software Developer',
    quote: 'InclusiveJobs helped me find a company that values my skills and provides the screen reader support I need. The matching was perfect.',
    initials: 'SB',
    gradient: 'from-teal-400 to-teal-600',
  },
  {
    name: 'Mohamed K.',
    role: 'HR Manager',
    quote: "We've hired three amazing talents through this platform. The inclusion analytics help us track our diversity goals effectively.",
    initials: 'MK',
    gradient: 'from-indigo-400 to-indigo-600',
  },
  {
    name: 'Amira Tounsi',
    role: 'Graphic Designer',
    quote: "Finally, a job board that understands accessibility isn't just a checkbox. The interface is a joy to use.",
    initials: 'AT',
    gradient: 'from-orange-400 to-orange-500',
  },
];

export default function Testimonials() {
  return (
    <section className="mesh-bg py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <span className="text-primary-light font-semibold text-sm uppercase tracking-widest">Testimonials</span>
          <h2 className="font-display text-3xl sm:text-4xl mt-2 mb-4">
            <span className="gradient-text">What Our Users Say</span>
          </h2>
          <p className="text-white/60 max-w-md mx-auto text-sm leading-relaxed">
            Real stories from people whose lives have been impacted by inclusive hiring.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {testimonials.map((t, index) => (
            <div
              key={index}
              className="bg-white/8 backdrop-blur-sm border border-white/10 p-8 rounded-2xl relative"
            >
              {/* Large decorative quote mark */}
              <span className="absolute top-4 right-6 font-display text-7xl text-white/8 leading-none select-none" aria-hidden>
                "
              </span>

              {/* Star rating */}
              <div className="flex gap-1 mb-6">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                ))}
              </div>

              <p className="text-white/80 italic leading-relaxed mb-6">"{t.quote}"</p>

              <div className="flex items-center gap-3">
                <span
                  className={`w-10 h-10 rounded-full bg-linear-to-br ${t.gradient} flex items-center justify-center text-white font-bold text-sm shrink-0`}
                >
                  {t.initials}
                </span>
                <div>
                  <p className="font-semibold text-white text-sm">{t.name}</p>
                  <p className="text-white/50 text-xs">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
