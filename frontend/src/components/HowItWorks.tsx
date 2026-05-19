import { UserCog, Sparkles, MousePointerClick } from 'lucide-react';
import { motion } from 'motion/react';
import { useNavigation } from '../context/NavigationContext';

const steps = [
  {
    number: '01',
    title: 'Create Your Profile',
    desc: 'Tell us about your skills, needs, and preferences to build a comprehensive profile.',
    icon: UserCog,
    action: 'login',
    gradient: 'from-teal-500 to-teal-600',
  },
  {
    number: '02',
    title: 'Get AI Recommendations',
    desc: 'Our algorithm matches you to the most compatible offers based on your unique profile.',
    icon: Sparkles,
    action: 'find-jobs',
    gradient: 'from-indigo-500 to-indigo-600',
  },
  {
    number: '03',
    title: 'Apply & Get Hired',
    desc: 'Apply in one click and track your applications easily through your dashboard.',
    icon: MousePointerClick,
    action: 'find-jobs',
    gradient: 'from-orange-400 to-orange-500',
  },
];

export default function HowItWorks() {
  const { navigate } = useNavigation();

  return (
    <section className="py-20 bg-bg-page">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <span className="text-primary font-semibold text-sm uppercase tracking-widest">The Process</span>
          <h2 className="font-display text-3xl sm:text-4xl text-text-primary mt-2 mb-4">
            How InclusiveJobs Works
          </h2>
          <div className="h-1 w-16 bg-linear-to-r from-primary to-primary-light mx-auto rounded-full" />
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((step, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.12 }}
              onClick={() => navigate(step.action as any)}
              className="bg-white rounded-2xl p-8 shadow-sm border border-border card-hover relative overflow-hidden cursor-pointer"
            >
              {/* Large ghost step number */}
              <span className="absolute top-4 right-5 font-display text-6xl font-bold text-gray-50 leading-none select-none">
                {step.number}
              </span>

              {/* Icon badge */}
              <div className={`w-13 h-13 rounded-2xl bg-linear-to-br ${step.gradient} flex items-center justify-center mb-6 shadow-lg`}>
                <step.icon className="w-6 h-6 text-white" />
              </div>

              <h3 className="text-xl font-bold text-text-primary mb-3">{step.title}</h3>
              <p className="text-text-secondary leading-relaxed">{step.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
