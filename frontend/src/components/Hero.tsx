import { Search, User } from 'lucide-react';
import { motion } from 'motion/react';
import { useNavigation } from '../context/NavigationContext';

export default function Hero() {
  const { navigate } = useNavigation();

  return (
    <section className="relative overflow-hidden bg-bg-page pt-16 pb-20 lg:pt-24 lg:pb-28">
      <motion.div
        aria-hidden
        className="absolute -top-24 -right-24 w-96 h-96 bg-primary/5 rounded-full blur-3xl"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
      />
      <motion.div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <motion.div
          className="grid lg:grid-cols-2 gap-12 items-center"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <motion.div className="text-center lg:text-left">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-text-primary leading-tight mb-6">
              Empowering <span className="text-primary">Inclusive Hiring</span> with AI
            </h1>
            <p className="text-lg sm:text-xl text-text-secondary mb-8 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
              Connecting people with specific needs to opportunities that truly fit them — through intelligent matching and accessible design.
            </p>

            <motion.div
              className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-10"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.15 }}
            >
              <button
                type="button"
                onClick={() => navigate('find-jobs')}
                className="flex items-center justify-center px-8 py-4 bg-primary text-white rounded-xl font-semibold text-lg hover:bg-primary-dark transition-colors shadow-lg shadow-primary/20 transform active:scale-95 duration-200"
              >
                <Search className="w-5 h-5 mr-2" />
                Find Jobs
              </button>
              <button
                type="button"
                onClick={() => navigate('login')}
                className="flex items-center justify-center px-8 py-4 border-2 border-primary text-primary bg-transparent rounded-xl font-semibold text-lg hover:bg-primary hover:text-white transition-colors transform active:scale-95 duration-200"
              >
                <User className="w-5 h-5 mr-2" />
                Sign In / Register
              </button>
            </motion.div>

            <p className="text-sm text-text-secondary font-medium">
              Trusted by <span className="text-primary font-bold">500+ companies</span> across Tunisia and beyond
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <motion.div
              className="relative rounded-2xl overflow-hidden shadow-2xl ring-1 ring-black/5"
              whileHover={{ scale: 1.01 }}
              transition={{ duration: 0.3 }}
            >
              <motion.div className="aspect-[4/3] relative">
                <img
                  src="/images/hero-inclusive-team.png"
                  alt="Diverse team collaborating in an inclusive modern workplace"
                  className="w-full h-full object-cover"
                  loading="eager"
                  fetchPriority="high"
                />
                <motion.div
                  className="absolute inset-0 bg-gradient-to-t from-primary/20 via-transparent to-transparent pointer-events-none"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.8, delay: 0.4 }}
                />
              </motion.div>
            </motion.div>
          </motion.div>
        </motion.div>
      </motion.div>
    </section>
  );
}
