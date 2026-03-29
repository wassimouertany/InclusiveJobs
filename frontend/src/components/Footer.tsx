import { Heart, Facebook, Twitter, Linkedin, Instagram } from 'lucide-react';
import { useNavigation } from '../context/NavigationContext';

export default function Footer() {
  const { navigate } = useNavigation();

  return (
    <footer className="bg-gray-900 text-white pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          
          {/* Brand Column */}
          <div className="col-span-1 md:col-span-1">
            <div 
              className="flex items-center mb-6 cursor-pointer"
              onClick={() => navigate('landing')}
            >
              <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center mr-3">
                <Heart className="text-white w-5 h-5 fill-current" />
              </div>
              <span className="font-bold text-xl tracking-tight">
                InclusiveJobs
              </span>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed mb-6">
              Making employment accessible for everyone. We believe in a world where talent knows no barriers.
            </p>
          </div>

          {/* Links Columns */}
          <div>
            <h3 className="font-bold text-lg mb-4">About</h3>
            <ul className="space-y-3 text-gray-400 text-sm">
              <li><button onClick={() => navigate('landing')} className="hover:text-primary transition-colors">Our Mission</button></li>
              <li><button className="hover:text-primary transition-colors">Team</button></li>
              <li><button className="hover:text-primary transition-colors">Partners</button></li>
              <li><button className="hover:text-primary transition-colors">Press</button></li>
            </ul>
          </div>

          <div>
            <h3 className="font-bold text-lg mb-4">Job Seekers</h3>
            <ul className="space-y-3 text-gray-400 text-sm">
              <li><button onClick={() => navigate('find-jobs')} className="hover:text-primary transition-colors">Browse Jobs</button></li>
              <li><button onClick={() => navigate('login')} className="hover:text-primary transition-colors">Create Profile</button></li>
              <li><button className="hover:text-primary transition-colors">Accessibility Tools</button></li>
              <li><button className="hover:text-primary transition-colors">Success Stories</button></li>
            </ul>
          </div>

          <div>
            <h3 className="font-bold text-lg mb-4">Contact</h3>
            <ul className="space-y-3 text-gray-400 text-sm">
              <li><button className="hover:text-primary transition-colors">Support</button></li>
              <li><button onClick={() => navigate('employers')} className="hover:text-primary transition-colors">Contact Sales</button></li>
              <li><button className="hover:text-primary transition-colors">Privacy Policy</button></li>
              <li><button className="hover:text-primary transition-colors">Terms of Service</button></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-gray-500 text-sm mb-4 md:mb-0">
            © 2025 InclusiveJobs. All rights reserved.
          </p>
          <div className="flex space-x-6">
            <a href="#" className="text-gray-400 hover:text-white transition-colors"><Facebook className="w-5 h-5" /></a>
            <a href="#" className="text-gray-400 hover:text-white transition-colors"><Twitter className="w-5 h-5" /></a>
            <a href="#" className="text-gray-400 hover:text-white transition-colors"><Linkedin className="w-5 h-5" /></a>
            <a href="#" className="text-gray-400 hover:text-white transition-colors"><Instagram className="w-5 h-5" /></a>
          </div>
        </div>
      </div>
    </footer>
  );
}
