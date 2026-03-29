import { Quote } from 'lucide-react';

const testimonials = [
  {
    name: "Sarah Ben Ali",
    role: "Software Developer",
    quote: "InclusiveJobs helped me find a company that values my skills and provides the screen reader support I need. The matching was perfect.",
    initials: "SB",
    color: "bg-blue-500"
  },
  {
    name: "Mohamed K.",
    role: "HR Manager",
    quote: "We've hired three amazing talents through this platform. The inclusion analytics help us track our diversity goals effectively.",
    initials: "MK",
    color: "bg-green-500"
  },
  {
    name: "Amira Tounsi",
    role: "Graphic Designer",
    quote: "Finally, a job board that understands accessibility isn't just a checkbox. The interface is a joy to use.",
    initials: "AT",
    color: "bg-purple-500"
  }
];

export default function Testimonials() {
  return (
    <section className="py-20 bg-bg-page">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-text-primary mb-4">What Our Users Say</h2>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {testimonials.map((t, index) => (
            <div key={index} className="bg-white p-8 rounded-xl shadow-sm border border-border relative">
              <Quote className="absolute top-6 right-6 w-8 h-8 text-gray-100 fill-current" />
              <div className="flex items-center mb-6">
                <div className={`w-12 h-12 rounded-full ${t.color} flex items-center justify-center text-white font-bold text-lg mr-4`}>
                  {t.initials}
                </div>
                <div>
                  <div className="font-bold text-text-primary">{t.name}</div>
                  <div className="text-sm text-text-secondary">{t.role}</div>
                </div>
              </div>
              <p className="text-text-secondary italic">"{t.quote}"</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
