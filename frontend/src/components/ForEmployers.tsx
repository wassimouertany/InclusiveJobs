import { Check, ArrowRight, Users, ShieldCheck, TrendingUp } from 'lucide-react';
import { motion } from 'motion/react';
import { useNavigation } from '../context/NavigationContext';
import { useToast } from '../context/ToastContext';

export default function ForEmployers() {
  const { navigate } = useNavigation();
  const { showToast } = useToast();

  const handleDemo = () => {
    showToast("Demo request sent! We'll contact you shortly.", "success");
  };

  return (
    <div className="bg-bg-page min-h-screen">
      
      {/* Hero Section */}
      <section className="bg-gray-900 text-white relative overflow-hidden py-24 lg:py-32">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80')] bg-cover bg-center opacity-10 mix-blend-overlay"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-gray-900/80 to-gray-900"></div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-3xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-flex items-center px-3 py-1 rounded-full bg-primary/20 text-primary-light border border-primary/30 text-sm font-medium mb-6">
                <span className="flex h-2 w-2 rounded-full bg-primary-light mr-2 animate-pulse"></span>
                Join 500+ Inclusive Companies
              </div>
              <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6 leading-tight">
                Build a workforce that <br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-light to-purple-400">reflects the world.</span>
              </h1>
              <p className="text-xl text-gray-300 mb-8 leading-relaxed max-w-2xl">
                Access a pool of untapped talent. Our AI-driven platform connects you with qualified candidates with specific needs, ensuring a perfect match for skills and culture.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <button 
                  onClick={() => navigate('login')}
                  className="px-8 py-4 bg-primary text-white rounded-xl font-bold text-lg hover:bg-primary-dark transition-all shadow-lg shadow-primary/20 flex items-center justify-center active:scale-95"
                >
                  Post a Job for Free
                  <ArrowRight className="ml-2 w-5 h-5" />
                </button>
                <button 
                  onClick={handleDemo}
                  className="px-8 py-4 bg-white/10 backdrop-blur-sm text-white border border-white/20 rounded-xl font-bold text-lg hover:bg-white/20 transition-all flex items-center justify-center active:scale-95"
                >
                  Schedule a Demo
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats / Social Proof */}
      <section className="bg-white border-b border-border py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm font-semibold text-gray-500 uppercase tracking-wider mb-8">Trusted by industry leaders in inclusion</p>
          <div className="flex flex-wrap justify-center gap-12 opacity-60 grayscale hover:grayscale-0 transition-all duration-500">
             {/* Simple text logos for demo purposes */}
             {['Vermeg', 'Orange', 'Instadeep', 'Sopra HR', 'Teleperformance'].map((company) => (
               <span key={company} className="text-2xl font-bold text-gray-400 hover:text-gray-800 cursor-default">{company}</span>
             ))}
          </div>
        </div>
      </section>

      {/* Value Props */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-text-primary mb-4">Why Hire Through InclusiveJobs?</h2>
            <p className="text-text-secondary max-w-2xl mx-auto">
              We go beyond simple job posting. We provide the ecosystem you need to successfully integrate diverse talent.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Users,
                title: "Access Untapped Talent",
                desc: "Reach thousands of qualified candidates who are often overlooked by traditional recruitment channels."
              },
              {
                icon: ShieldCheck,
                title: "Compliance & CSR",
                desc: "Meet your legal obligations and Corporate Social Responsibility goals with verifiable inclusion metrics."
              },
              {
                icon: TrendingUp,
                title: "Retention & Loyalty",
                desc: "Inclusive hiring is proven to increase team retention rates and overall employee satisfaction."
              }
            ].map((feature, idx) => (
              <div key={idx} className="bg-white p-8 rounded-2xl shadow-sm border border-border hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary mb-6">
                  <feature.icon className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-text-primary mb-3">{feature.title}</h3>
                <p className="text-text-secondary leading-relaxed">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature Highlight */}
      <section className="py-24 bg-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="order-2 lg:order-1 relative">
               <div className="absolute -inset-4 bg-gradient-to-tr from-primary/20 to-purple-200 rounded-full blur-3xl opacity-50"></div>
               <div className="relative bg-gray-50 rounded-2xl border border-border p-8 shadow-xl">
                  {/* Mock Dashboard UI */}
                  <div className="space-y-6">
                    <div className="flex justify-between items-center">
                      <h4 className="font-bold text-gray-900">Candidate Match Analysis</h4>
                      <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded">98% Match</span>
                    </div>
                    <div className="space-y-4">
                       <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm">
                          <div className="flex justify-between mb-2">
                            <span className="text-sm font-medium text-gray-600">Technical Skills</span>
                            <span className="text-sm font-bold text-gray-900">Excellent</span>
                          </div>
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-primary w-[95%]"></div>
                          </div>
                       </div>
                       <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm">
                          <div className="flex justify-between mb-2">
                            <span className="text-sm font-medium text-gray-600">Accessibility Fit</span>
                            <span className="text-sm font-bold text-gray-900">Perfect</span>
                          </div>
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-green-500 w-[100%]"></div>
                          </div>
                          <p className="text-xs text-gray-500 mt-2">
                            Candidate requires screen reader (supported by your office).
                          </p>
                       </div>
                    </div>
                  </div>
               </div>
            </div>
            <div className="order-1 lg:order-2">
              <h2 className="text-3xl md:text-4xl font-bold text-text-primary mb-6">
                AI that understands <br/>
                <span className="text-primary">human potential.</span>
              </h2>
              <p className="text-lg text-text-secondary mb-8 leading-relaxed">
                Our proprietary matching algorithm doesn't just look at keywords. It analyzes the intersection of skills, workplace environment, and necessary accommodations to predict long-term success.
              </p>
              <ul className="space-y-4">
                {[
                  "Automated accessibility matching",
                  "Bias-free candidate screening",
                  "Integration support guides"
                ].map((item, i) => (
                  <li key={i} className="flex items-center text-text-primary font-medium">
                    <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center mr-3 text-green-600">
                      <Check className="w-3.5 h-3.5" strokeWidth={3} />
                    </div>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-primary rounded-3xl p-12 text-center text-white relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-white/20 to-transparent pointer-events-none"></div>
            
            <h2 className="text-3xl md:text-4xl font-bold mb-6 relative z-10">Ready to transform your hiring?</h2>
            <p className="text-primary-100 text-lg mb-10 max-w-2xl mx-auto relative z-10">
              Join the movement towards a more inclusive economy. Post your first job today or talk to our experts.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4 relative z-10">
              <button 
                onClick={() => navigate('login')}
                className="px-8 py-4 bg-white text-primary rounded-xl font-bold text-lg hover:bg-gray-50 transition-colors shadow-lg active:scale-95"
              >
                Start Hiring Now
              </button>
              <button 
                onClick={handleDemo}
                className="px-8 py-4 bg-transparent border-2 border-white text-white rounded-xl font-bold text-lg hover:bg-white/10 transition-colors active:scale-95"
              >
                Contact Sales
              </button>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
