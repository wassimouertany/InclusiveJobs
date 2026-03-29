import { useState } from 'react';
import { User, Menu, X, Heart } from 'lucide-react';
import { useNavigation } from '../context/NavigationContext';
import { Page } from '../types';

export default function Navbar() {
  const { currentPage, navigate } = useNavigation();
  const [lang, setLang] = useState<'EN' | 'FR' | 'AR'>('EN');
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const navLinks: { id: Page; label: string }[] = [
    { id: 'landing', label: 'Home' },
    { id: 'find-jobs', label: 'Find Jobs' },
    { id: 'employers', label: 'For Employers' },
  ];

  return (
    <nav className="bg-white/80 backdrop-blur-md border-b border-border sticky top-0 z-50 transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20 items-center">
          {/* Logo */}
          <div 
            className="flex items-center cursor-pointer group" 
            onClick={() => navigate('landing')}
          >
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center mr-3 shadow-lg shadow-primary/20 group-hover:scale-105 transition-transform duration-300">
              <Heart className="text-white w-6 h-6 fill-current" />
            </div>
            <span className="font-bold text-xl text-text-primary tracking-tight group-hover:text-primary transition-colors">
              InclusiveJobs
            </span>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <div className="flex items-center space-x-6 mr-4">
              {navLinks.map((link) => (
                <button
                  key={link.id}
                  onClick={() => navigate(link.id)}
                  className={`text-sm font-medium transition-colors relative py-1 ${
                    currentPage === link.id
                      ? 'text-primary'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  {link.label}
                  {currentPage === link.id && (
                    <span className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-full" />
                  )}
                </button>
              ))}
            </div>

            <div className="h-6 w-px bg-gray-200"></div>

            {/* Language Switcher */}
            <div className="flex items-center bg-gray-100/50 rounded-lg p-1 border border-border/50">
              {(['EN', 'FR', 'AR'] as const).map((l) => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                    lang === l
                      ? 'bg-white text-primary shadow-sm border border-gray-100'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>

            {/* CTA Buttons */}
            <div className="flex items-center space-x-3">
              {currentPage !== 'login' && currentPage !== 'dashboard' && (
                 <button 
                 onClick={() => navigate('login')}
                 className="flex items-center px-4 py-2.5 text-text-secondary hover:text-primary hover:bg-primary/5 rounded-lg transition-colors font-medium text-sm"
               >
                 <User className="w-4 h-4 mr-2" />
                 Sign In
               </button>
              )}
             
              {currentPage === 'dashboard' ? (
                <button 
                  onClick={() => navigate('landing')}
                  className="px-5 py-2.5 bg-gray-100 text-text-primary rounded-xl hover:bg-gray-200 transition-all font-medium text-sm"
                >
                  Log Out
                </button>
              ) : (
                <button 
                  onClick={() => navigate('employers')}
                  className="px-5 py-2.5 bg-primary text-white rounded-xl hover:bg-primary-dark transition-all shadow-md hover:shadow-lg shadow-primary/20 font-medium text-sm transform hover:-translate-y-0.5"
                >
                  Post a Job
                </button>
              )}
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-text-secondary hover:text-text-primary p-2"
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden bg-white border-t border-border p-4 space-y-4 shadow-lg absolute w-full animate-in slide-in-from-top-5 duration-200">
          <div className="space-y-2">
            {navLinks.map((link) => (
              <button
                key={link.id}
                onClick={() => {
                  navigate(link.id);
                  setIsMenuOpen(false);
                }}
                className={`block w-full text-left px-4 py-3 rounded-lg font-medium transition-colors ${
                  currentPage === link.id
                    ? 'bg-primary/5 text-primary'
                    : 'text-text-secondary hover:bg-gray-50'
                }`}
              >
                {link.label}
              </button>
            ))}
          </div>
          
          <div className="border-t border-gray-100 pt-4 flex justify-center space-x-2">
            {(['EN', 'FR', 'AR'] as const).map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={`px-4 py-2 text-sm font-medium rounded-md ${
                  lang === l
                    ? 'bg-primary/10 text-primary'
                    : 'bg-gray-50 text-text-secondary'
                }`}
              >
                {l}
              </button>
            ))}
          </div>
          
          <div className="grid grid-cols-2 gap-3 pt-2">
            <button 
              onClick={() => {
                navigate('login');
                setIsMenuOpen(false);
              }}
              className="flex justify-center items-center px-4 py-3 border border-border text-text-primary rounded-xl hover:bg-gray-50 transition-colors font-medium"
            >
              Sign In
            </button>
            <button 
              onClick={() => {
                navigate('employers');
                setIsMenuOpen(false);
              }}
              className="px-4 py-3 bg-primary text-white rounded-xl hover:bg-primary-dark transition-colors font-medium shadow-lg shadow-primary/20"
            >
              Post a Job
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
