import type { ReactNode } from "react";
import { Route, Routes } from "react-router-dom";
import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import Stats from "./components/Stats";
import HowItWorks from "./components/HowItWorks";
import Features from "./components/Features";
import Testimonials from "./components/Testimonials";
import Footer from "./components/Footer";
import Login from "./components/Login";
import FindJobs from "./components/FindJobs";
import ForEmployers from "./components/ForEmployers";
import Dashboard from "./components/Dashboard";
import CandidateDashboard from "./components/CandidateDashboard";
import AccessibilityWidget from "./components/AccessibilityWidget";
import RecruiterDashboard from "./components/RecruiterDashboard";

function LandingPage() {
  return (
    <>
      <Hero />
      <Stats />
      <HowItWorks />
      <Features />
      <Testimonials />
    </>
  );
}

function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col font-sans text-text-primary bg-bg-page">
      <Navbar />
      {/* Avoid AnimatePresence + motion around <Routes>: it re-renders Routes with the
          new URL during exit and can leave the main area blank (e.g. /dashboard/recruiter). */}
      <main className="flex-grow relative">{children}</main>
      <Footer />
      <AccessibilityWidget />
    </div>
  );
}

export default function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/find-jobs" element={<FindJobs />} />
        <Route path="/employers" element={<ForEmployers />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/dashboard/recruiter" element={<RecruiterDashboard />} />
        <Route path="/dashboard/candidate" element={<CandidateDashboard />} />
      </Routes>
    </AppShell>
  );
}
