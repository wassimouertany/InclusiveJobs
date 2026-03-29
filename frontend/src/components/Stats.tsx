import { Building2, Users, Handshake, CheckCircle2 } from 'lucide-react';
import { useNavigation } from '../context/NavigationContext';

const stats = [
  { label: 'Job Offers', value: '1,200+', icon: Building2, action: 'find-jobs' },
  { label: 'Candidates', value: '8,500+', icon: Users, action: 'employers' },
  { label: 'Recruiters', value: '340+', icon: Handshake, action: 'employers' },
  { label: 'Match Accuracy', value: '92%', icon: CheckCircle2, action: 'landing' },
];

export default function Stats() {
  const { navigate } = useNavigation();

  return (
    <section className="bg-white border-y border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-gray-100">
          {stats.map((stat, index) => (
            <div 
              key={index} 
              onClick={() => navigate(stat.action as any)}
              className="py-8 px-4 text-center group hover:bg-gray-50 transition-colors cursor-pointer"
            >
              <div className="flex justify-center mb-3">
                <stat.icon className="w-6 h-6 text-primary/40 group-hover:text-primary transition-colors" />
              </div>
              <div className="text-3xl sm:text-4xl font-bold text-primary mb-1 tracking-tight">
                {stat.value}
              </div>
              <div className="text-sm font-medium text-text-secondary uppercase tracking-wider">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
