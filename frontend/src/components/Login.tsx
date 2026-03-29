import { useState } from 'react';
import { Eye, EyeOff, LogIn, Volume2 } from 'lucide-react';
import { motion } from 'motion/react';
import { useNavigation } from '../context/NavigationContext';
import { useToast } from '../context/ToastContext';

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { navigate } = useNavigation();
  const { showToast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Mock login logic
    if (email && password) {
      showToast("Welcome back! Redirecting to dashboard...", "success");
      setTimeout(() => {
        navigate('dashboard');
      }, 1000);
    } else {
      showToast("Please enter valid credentials.", "error");
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-bg-page relative">
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-border"
      >
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-text-primary mb-2">Welcome Back</h2>
          <p className="text-text-secondary">Access your inclusive hiring dashboard.</p>
        </div>

        <form className="space-y-6" onSubmit={handleSubmit}>
          
          {/* Email Field */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-text-primary mb-1">
              Email Address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="name@professional.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="appearance-none block w-full px-4 py-3 border border-border rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
            />
          </div>

          {/* Password Field */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-text-primary mb-1">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="appearance-none block w-full px-4 py-3 border border-border rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all pr-10"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Human Verification */}
          <div className="bg-gray-50 rounded-lg border border-border p-4 flex items-center justify-between">
            <div>
              <div className="font-bold text-sm text-text-primary mb-1">Human Verification</div>
              <button type="button" className="flex items-center text-accent-blue text-xs font-medium hover:underline">
                <Volume2 className="w-3 h-3 mr-1" />
                Play Audio Code
              </button>
            </div>
            <input
              type="text"
              placeholder="0000"
              className="w-24 text-center tracking-widest font-mono py-2 border border-border rounded bg-white focus:outline-none focus:border-primary"
              maxLength={4}
            />
          </div>

          {/* Sign In Button */}
          <button
            type="submit"
            className="w-full flex justify-center items-center px-4 py-3.5 border border-transparent rounded-xl shadow-sm text-base font-medium text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors active:scale-95"
          >
            <LogIn className="w-5 h-5 mr-2" />
            Sign In
          </button>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">OR</span>
            </div>
          </div>

          {/* Social Login */}
          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              className="w-full inline-flex justify-center py-2.5 px-4 border border-gray-300 rounded-lg shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <span className="sr-only">Sign in with Google</span>
              <span className="mr-2">🌐</span> Google
            </button>
            <button
              type="button"
              className="w-full inline-flex justify-center py-2.5 px-4 border border-gray-300 rounded-lg shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <span className="sr-only">Sign in with LinkedIn</span>
              <span className="mr-2">💼</span> LinkedIn
            </button>
          </div>

        </form>
      </motion.div>
    </div>
  );
}
