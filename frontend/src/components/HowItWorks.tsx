import { UserCog, Sparkles, MousePointerClick } from 'lucide-react';
import { motion } from 'motion/react';
import { useNavigation } from '../context/NavigationContext';

const steps = [
  {
    title: 'Create Your Profile',
    desc: 'Tell us about your skills, needs, and preferences to build a comprehensive profile.',
    icon: UserCog,
    action: 'login'
  },
  {
    title: 'Get AI Recommendations',
    desc: 'Our algorithm matches you to the most compatible offers based on your unique profile.',
    icon: Sparkles,
    action: 'find-jobs'
  },
  {
    title: 'Apply & Get Hired',
    desc: 'Apply in one click and track your applications easily through your dashboard.',
    icon: MousePointerClick,
    action: 'find-jobs'
  },
];

export default function HowItWorks() {
  const { navigate } = useNavigation();

  return (
    <section className="py-20 bg-bg-page">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-text-primary mb-4">How InclusiveJobs Works</h2>
          <div className="h-1 w-20 bg-primary mx-auto rounded-full"></div>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((step, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              onClick={() => navigate(step.action as any)}
              className="bg-white rounded-xl p-8 shadow-sm hover:shadow-md transition-all border border-border relative overflow-hidden group cursor-pointer hover:-translate-y-1"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-primary-light transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></div>
              
              <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mb-6 text-primary group-hover:scale-110 transition-transform duration-300">
                <step.icon className="w-7 h-7" />
              </div>
              
              <h3 className="text-xl font-bold text-text-primary mb-3">{step.title}</h3>
              <p className="text-text-secondary leading-relaxed">
                {step.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
