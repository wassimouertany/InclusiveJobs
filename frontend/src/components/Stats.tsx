import { Building2, Users, Handshake, CheckCircle2 } from 'lucide-react';
import { useNavigation } from '../context/NavigationContext';

const stats = [
  { label: 'Job Offers',      value: '1,200+', icon: Building2,   action: 'find-jobs', iconBg: 'bg-teal-50',   iconColor: 'text-teal-600'   },
  { label: 'Candidates',      value: '8,500+', icon: Users,        action: 'employers', iconBg: 'bg-indigo-50', iconColor: 'text-indigo-600' },
  { label: 'Recruiters',      value: '340+',   icon: Handshake,    action: 'employers', iconBg: 'bg-orange-50', iconColor: 'text-orange-500' },
  { label: 'Match Accuracy',  value: '92%',    icon: CheckCircle2, action: 'landing',   iconBg: 'bg-green-50',  iconColor: 'text-green-600'  },
];

export default function Stats() {
  const { navigate } = useNavigation();

  return (
    <section className="bg-white border-y border-border" data-decorative="true">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4">
          {stats.map((stat, index) => (
            <div
              key={index}
              onClick={() => navigate(stat.action as any)}
              className="py-10 px-6 text-center group card-hover cursor-pointer border-r border-gray-100 last:border-r-0"
            >
              <div className={`w-12 h-12 rounded-2xl ${stat.iconBg} flex items-center justify-center mx-auto mb-4`}>
                <stat.icon className={`w-6 h-6 ${stat.iconColor}`} />
              </div>
              <div className="font-display text-3xl sm:text-4xl font-bold text-text-primary mb-1 tracking-tight group-hover:text-primary transition-colors">
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
