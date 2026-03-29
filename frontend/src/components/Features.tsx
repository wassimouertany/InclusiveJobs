import { Check } from 'lucide-react';

const features = [
  "AI-powered job matching based on disability type",
  "Accessible design (screen reader, big cursor, contrast modes)",
  "Audio CAPTCHA for visual impairments",
  "Multi-language support: Arabic, French, English",
  "Recruiter dashboard with inclusion analytics",
  "Real-time application tracking"
];

export default function Features() {
  return (
    <section className="py-20 bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          
          {/* Left Content */}
          <div>
            <h2 className="text-3xl md:text-4xl font-bold text-text-primary mb-8">
              Built for <span className="text-primary">Accessibility & Inclusion</span>
            </h2>
            <div className="space-y-4">
              {features.map((feature, index) => (
                <div key={index} className="flex items-start">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center mt-0.5 mr-4">
                    <Check className="w-4 h-4 text-primary" strokeWidth={3} />
                  </div>
                  <span className="text-lg text-text-secondary">{feature}</span>
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

          {/* Right Mockup */}
          <div className="relative">
            <div className="absolute -inset-4 bg-gradient-to-r from-blue-100 to-purple-100 rounded-3xl transform rotate-2 opacity-50 blur-lg"></div>
            <div className="relative bg-gray-900 rounded-xl shadow-2xl border-4 border-gray-800 overflow-hidden">
              {/* Fake Browser Header */}
              <div className="bg-gray-800 px-4 py-3 flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                </div>
                <div className="ml-4 bg-gray-700 rounded-md px-3 py-1 text-xs text-gray-400 flex-1 text-center font-mono">
                  dashboard.inclusivejobs.com
                </div>
              </div>
              
              {/* Dashboard Content Mockup */}
              <div className="bg-gray-50 p-6 min-h-[300px]">
                <div className="flex justify-between items-center mb-6">
                  <div className="h-6 w-32 bg-gray-200 rounded"></div>
                  <div className="h-8 w-8 bg-primary rounded-full"></div>
                </div>
                
                <div className="grid grid-cols-3 gap-4 mb-6">
                   <div className="bg-white p-4 rounded-lg shadow-sm">
                      <div className="h-4 w-8 bg-blue-100 rounded mb-2"></div>
                      <div className="h-6 w-16 bg-gray-200 rounded"></div>
                   </div>
                   <div className="bg-white p-4 rounded-lg shadow-sm">
                      <div className="h-4 w-8 bg-green-100 rounded mb-2"></div>
                      <div className="h-6 w-16 bg-gray-200 rounded"></div>
                   </div>
                   <div className="bg-white p-4 rounded-lg shadow-sm">
                      <div className="h-4 w-8 bg-purple-100 rounded mb-2"></div>
                      <div className="h-6 w-16 bg-gray-200 rounded"></div>
                   </div>
                </div>

                <div className="bg-white p-4 rounded-lg shadow-sm mb-4">
                   <div className="flex gap-4 mb-4">
                      <div className="h-12 w-12 bg-gray-100 rounded-lg"></div>
                      <div className="flex-1">
                        <div className="h-4 w-3/4 bg-gray-200 rounded mb-2"></div>
                        <div className="h-3 w-1/2 bg-gray-100 rounded"></div>
                      </div>
                   </div>
                   <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-primary w-2/3"></div>
                   </div>
                </div>
                
                 <div className="bg-white p-4 rounded-lg shadow-sm">
                   <div className="flex gap-4">
                      <div className="h-12 w-12 bg-gray-100 rounded-lg"></div>
                      <div className="flex-1">
                        <div className="h-4 w-3/4 bg-gray-200 rounded mb-2"></div>
                        <div className="h-3 w-1/2 bg-gray-100 rounded"></div>
                      </div>
                   </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
