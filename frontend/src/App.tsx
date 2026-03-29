import { AnimatePresence, motion } from 'motion/react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import Stats from './components/Stats';
import HowItWorks from './components/HowItWorks';
import Features from './components/Features';
import Testimonials from './components/Testimonials';
import Footer from './components/Footer';
import Login from './components/Login';
import FindJobs from './components/FindJobs';
import ForEmployers from './components/ForEmployers';
import Dashboard from './components/Dashboard';
import AccessibilityWidget from './components/AccessibilityWidget';
import { NavigationProvider, useNavigation } from './context/NavigationContext';
import { ToastProvider } from './context/ToastContext';

function AppContent() {
  const { currentPage } = useNavigation();

  return (
    <div className="min-h-screen flex flex-col font-sans text-text-primary bg-bg-page">
      <Navbar />
      
      <main className="flex-grow relative">
        <AnimatePresence mode="wait">
          {currentPage === 'landing' && (
            <motion.div
              key="landing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Hero />
              <Stats />
              <HowItWorks />
              <Features />
              <Testimonials />
            </motion.div>
          )}

          {currentPage === 'login' && (
            <motion.div
              key="login"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <Login />
            </motion.div>
          )}

          {currentPage === 'find-jobs' && (
            <motion.div
              key="find-jobs"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <FindJobs />
            </motion.div>
          )}

          {currentPage === 'employers' && (
            <motion.div
              key="employers"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <ForEmployers />
            </motion.div>
          )}

          {currentPage === 'dashboard' && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Dashboard />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <Footer />
      <AccessibilityWidget />
    </div>
  );
}

export default function App() {
  return (
    <NavigationProvider>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </NavigationProvider>
  );
}
