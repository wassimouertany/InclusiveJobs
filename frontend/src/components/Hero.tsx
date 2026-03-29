import { Search, Briefcase } from 'lucide-react';
import { motion } from 'motion/react';
import { useNavigation } from '../context/NavigationContext';

export default function Hero() {
  const { navigate } = useNavigation();

  return (
    <section className="relative overflow-hidden bg-bg-page pt-16 pb-20 lg:pt-24 lg:pb-28">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          
          {/* Left Content */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center lg:text-left"
          >
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-text-primary leading-tight mb-6">
              Empowering <span className="text-primary">Inclusive Hiring</span> with AI
            </h1>
            <p className="text-lg sm:text-xl text-text-secondary mb-8 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
              Connecting people with specific needs to opportunities that truly fit them — through intelligent matching and accessible design.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-10">
              <button 
                onClick={() => navigate('find-jobs')}
                className="flex items-center justify-center px-8 py-4 bg-primary text-white rounded-xl font-semibold text-lg hover:bg-primary-dark transition-colors shadow-lg shadow-primary/20 transform active:scale-95 duration-200"
              >
                <Search className="w-5 h-5 mr-2" />
                Find Jobs
              </button>
              <button 
                onClick={() => navigate('employers')}
                className="flex items-center justify-center px-8 py-4 border-2 border-primary text-primary bg-transparent rounded-xl font-semibold text-lg hover:bg-primary hover:text-white transition-colors transform active:scale-95 duration-200"
              >
                <Briefcase className="w-5 h-5 mr-2" />
                Post a Job
              </button>
            </div>

            <p className="text-sm text-text-secondary font-medium">
              Trusted by <span className="text-primary font-bold">500+ companies</span> across Tunisia and beyond
            </p>
          </motion.div>

          {/* Right Visual */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative"
          >
            <div className="relative rounded-2xl overflow-hidden shadow-2xl bg-white p-6 border border-border">
               {/* Abstract representation of inclusive hiring */}
               <div className="aspect-[4/3] bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl relative overflow-hidden flex items-center justify-center">
                  <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#4F46E5_1px,transparent_1px)] [background-size:16px_16px]"></div>
                  
                  {/* Central Circle */}
                  <div className="w-32 h-32 bg-white rounded-full shadow-xl flex items-center justify-center z-10 relative">
                    <Briefcase className="w-12 h-12 text-primary" />
                    {/* Orbiting elements */}
                    <div className="absolute -right-16 top-0 bg-white p-3 rounded-lg shadow-md animate-bounce delay-75">
                        <span className="text-2xl">♿</span>
                    </div>
                    <div className="absolute -left-12 bottom-0 bg-white p-3 rounded-lg shadow-md animate-bounce delay-150">
                        <span className="text-2xl">🧠</span>
                    </div>
                    <div className="absolute top-[-40px] left-8 bg-white p-3 rounded-lg shadow-md animate-bounce delay-300">
                        <span className="text-2xl">👂</span>
                    </div>
                  </div>

                  {/* Connecting Lines */}
                  <svg className="absolute inset-0 w-full h-full pointer-events-none">
                    <path d="M200 150 L300 100" stroke="#E5E7EB" strokeWidth="2" strokeDasharray="4 4" />
                    <path d="M200 150 L100 200" stroke="#E5E7EB" strokeWidth="2" strokeDasharray="4 4" />
                    <path d="M200 150 L220 50" stroke="#E5E7EB" strokeWidth="2" strokeDasharray="4 4" />
                  </svg>
               </div>

               {/* Floating UI Card Overlay */}
               <div className="absolute -bottom-6 -left-6 bg-white p-4 rounded-xl shadow-lg border border-border max-w-[200px]">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                      <span className="text-green-600 text-xs font-bold">98%</span>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Match Score</div>
                      <div className="text-sm font-bold text-gray-900">High Compatibility</div>
                    </div>
                  </div>
                  <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-green-500 w-[98%]"></div>
                  </div>
               </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
