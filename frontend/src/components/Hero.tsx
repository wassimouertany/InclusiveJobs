import { Search, User } from 'lucide-react';
import { motion } from 'motion/react';
import { useNavigation } from '../context/NavigationContext';

const TRUST_AVATARS = [
  { initials: 'SB', bg: 'bg-teal-500' },
  { initials: 'MK', bg: 'bg-indigo-500' },
  { initials: 'AT', bg: 'bg-orange-400' },
];

export default function Hero() {
  const { navigate } = useNavigation();

  return (
    <section className="mesh-bg relative overflow-hidden pt-16 pb-20 lg:pt-24 lg:pb-28">
      <div
        aria-hidden
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-175 h-175 rounded-full border border-white/5 pointer-events-none"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <motion.div
          className="grid lg:grid-cols-2 gap-12 items-center"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          {/* Left: text content */}
          <div className="text-center lg:text-left">
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 text-white/80 text-sm mb-6"
            >
              <span className="w-2 h-2 rounded-full bg-primary-light animate-pulse" />
              Now matching 8,500+ candidates
            </motion.div>

            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl text-white leading-tight mb-6">
              Empowering{' '}
              <span className="gradient-text">Inclusive Hiring</span>{' '}
              with AI
            </h1>

            <p className="text-lg text-white/70 mb-8 max-w-lg mx-auto lg:mx-0 leading-relaxed">
              Connecting people with specific needs to opportunities that truly fit them — through intelligent matching and accessible design.
            </p>

            <motion.div
              className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-10"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <button
                type="button"
                onClick={() => navigate('find-jobs')}
                className="flex items-center justify-center px-8 py-4 bg-primary text-white rounded-xl font-semibold text-lg hover:bg-primary-dark transition-colors shadow-lg shadow-primary/30 active:scale-95 duration-200"
              >
                <Search className="w-5 h-5 mr-2" />
                Find Jobs
              </button>
              <button
                type="button"
                onClick={() => navigate('login')}
                className="flex items-center justify-center px-8 py-4 border-2 border-white/30 text-white rounded-xl font-semibold text-lg hover:bg-white/10 hover:border-white/50 transition-colors active:scale-95 duration-200"
              >
                <User className="w-5 h-5 mr-2" />
                Sign In / Register
              </button>
            </motion.div>

            {/* Trust line */}
            <div className="flex items-center gap-3 justify-center lg:justify-start">
              <div className="flex -space-x-2">
                {TRUST_AVATARS.map((a) => (
                  <span
                    key={a.initials}
                    className={`w-8 h-8 rounded-full ${a.bg} text-white text-xs font-bold flex items-center justify-center ring-2 ring-[#0C1A2E]`}
                  >
                    {a.initials}
                  </span>
                ))}
              </div>
              <p className="text-sm text-white/60">
                Trusted by{' '}
                <strong className="text-white font-semibold">500+ companies</strong>{' '}
                across Tunisia
              </p>
            </div>
          </div>

          {/* Right: image with floating overlays */}
          <motion.div
            className="relative"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <motion.div
              className="relative rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10"
              whileHover={{ scale: 1.01 }}
              transition={{ duration: 0.3 }}
            >
              <div className="aspect-4/3 relative">
                <img
                  src="/images/hero-wheelchair-team.jpg"
                  alt="Two professionals in wheelchairs working confidently in an inclusive modern workplace"
                  className="w-full h-full object-cover"
                  loading="eager"
                  fetchPriority="high"
                />
                <div className="absolute inset-0 bg-linear-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
              </div>

              {/* Floating stat card */}
              <motion.div
                className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-sm rounded-xl px-4 py-3 shadow-xl"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
              >
                <p className="font-display text-2xl font-bold text-primary leading-none">92%</p>
                <p className="text-xs text-gray-500 mt-0.5">Match Accuracy</p>
              </motion.div>

              {/* Accessibility badge */}
              <motion.div
                className="absolute top-4 right-4 bg-primary/90 backdrop-blur-sm text-white text-xs font-semibold px-3 py-1.5 rounded-full shadow-lg"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.7 }}
              >
                ♿ Accessibility First
              </motion.div>
            </motion.div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
