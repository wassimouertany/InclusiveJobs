import { useRef, type ReactNode } from "react";
import { MotionConfig } from "motion/react";
import { Navigate, Route, Routes } from "react-router-dom";
import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import Stats from "./components/Stats";
import HowItWorks from "./components/HowItWorks";
import Features from "./components/Features";
import Testimonials from "./components/Testimonials";
import Footer from "./components/Footer";
import Login from "./components/Login";
import ForEmployers from "./components/ForEmployers";
import Dashboard from "./components/Dashboard";
import CandidateLayout from "./pages/candidate/CandidateLayout";
import CandidateHome from "./pages/candidate/CandidateHome";
import CandidateProfile from "./pages/candidate/CandidateProfile";
import CandidateFindJobs from "./pages/candidate/CandidateFindJobs";
import CandidateApplications from "./pages/candidate/CandidateApplications";
import AccessibilityWidget from "./components/AccessibilityWidget";
import RecruiterLayout from "./pages/recruiter/RecruiterLayout";
import RecruiterJobsPage from "./pages/recruiter/RecruiterJobsPage";
import RecruiterMatchesPage from "./pages/recruiter/RecruiterMatchesPage";
import RecruiterSearchPage from "./pages/recruiter/RecruiterSearchPage";
import RecruiterProfilePage from "./pages/recruiter/RecruiterProfilePage";
import RecruiterCandidateView from "./pages/recruiter/RecruiterCandidateView";
import RecruiterApplicationsPage from "./pages/recruiter/RecruiterApplicationsPage";
import CommunityPage from "./pages/community/CommunityPage";
import CompanyDetailPage from "./pages/community/CompanyDetailPage";
import RecruiterHomePage from "./pages/recruiter/RecruiterHomePage";
import { ShadowGuideProvider } from "./features/guide/ShadowGuideProvider";
import SessionExpiryBanner from "./components/SessionExpiryBanner";
import SessionExpiredScreen from "./components/SessionExpiredScreen";
import { useFocusMode } from "./utils/focusMode";
import { useSelectionSpeechEnabled } from "./utils/selectionSpeechPref";
import TextToSpeechSelection from "./features/text-to-speech/TextToSpeechSelection";
import ScreenMagnifier from "./features/magnifier/ScreenMagnifier";

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
  const focusModeActive = useFocusMode();
  const selectionSpeechEnabled = useSelectionSpeechEnabled();
  // Stable across renders — document.body exists for the lifetime of this SPA.
  const bodyRef = useRef<HTMLElement | null>(typeof document !== "undefined" ? document.body : null);
  // ScreenMagnifier transforms/clips this exact node while active (see
  // features/magnifier/ScreenMagnifier.tsx). It has to be the real, single
  // app content — never cloned — so everything below (Navbar, routes,
  // Footer) lives inside it. AccessibilityWidget, SessionExpiryBanner and
  // SessionExpiredScreen are deliberately siblings OUTSIDE this div instead
  // of children of it: a CSS transform on an ancestor becomes the
  // containing block for its `position: fixed` descendants, which would
  // sweep the widget's toggle button into the loupe's transform/clip-path
  // and make it unreachable — the one thing the brief says must never
  // happen.
  const stageRef = useRef<HTMLDivElement | null>(null);

  return (
    // Focus Mode: index.css's `.ij-focus-mode` rule zeroes out CSS
    // animations/transitions, but most motion in this app runs through
    // Framer Motion (motion/react), which animates via the Web Animations
    // API rather than CSS — a CSS-only rule can't stop it. MotionConfig's
    // reducedMotion="always" is the actual kill switch for that.
    <MotionConfig reducedMotion={focusModeActive ? "always" : "user"}>
      <div ref={stageRef} id="ij-magnifier-stage" className="min-h-screen flex flex-col font-sans text-text-primary bg-bg-page">
        <Navbar />
        {/* Avoid AnimatePresence + motion around <Routes>: it re-renders Routes with the
            new URL during exit and can leave the main area blank (e.g. /dashboard/recruiter). */}
        {/* ShadowGuideProvider is role-gated internally (only active for signed-in
            candidate/recruiter accounts), so mounting it around every route here —
            rather than duplicating it inside each authenticated <Route> — is a no-op
            on public pages and covers /dashboard/candidate/* and /dashboard/recruiter/*. */}
        <ShadowGuideProvider>
          <main className="grow relative">{children}</main>
        </ShadowGuideProvider>
        <Footer />
      </div>
      <AccessibilityWidget />
      <SessionExpiryBanner />
      <SessionExpiredScreen />
      {/* "Read on Selection" toggle in AccessibilityWidget — off by default.
          Mounted only while enabled, so zero selectionchange listeners run
          otherwise (same "entirely disabled, not just quiet" principle as
          Focus Mode's other integrations). */}
      {selectionSpeechEnabled ? <TextToSpeechSelection containerRef={bodyRef} /> : null}
      <ScreenMagnifier stageRef={stageRef} />
    </MotionConfig>
  );
}

export default function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/community" element={<CommunityPage />} />
        <Route path="/community/company/:recruiterId" element={<CompanyDetailPage />} />
        <Route path="/find-jobs" element={<CandidateFindJobs />} />
        <Route path="/employers" element={<ForEmployers />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/dashboard/recruiter" element={<RecruiterLayout />}>
          <Route index element={<RecruiterHomePage />} />
          <Route path="jobs" element={<RecruiterJobsPage />} />
          <Route path="matches" element={<RecruiterMatchesPage />} />
          <Route path="search" element={<RecruiterSearchPage />} />
          <Route path="profile" element={<RecruiterProfilePage />} />
          <Route path="applications" element={<RecruiterApplicationsPage />} />
        </Route>
        <Route path="/dashboard/recruiter/candidate/:candidateId" element={<RecruiterCandidateView />} />
        <Route path="/dashboard/candidate" element={<CandidateLayout />}>
          <Route
            index
            element={<Navigate to="/dashboard/candidate/home" replace />}
          />
          <Route path="home" element={<CandidateHome />} />
          <Route path="profile" element={<CandidateProfile />} />
          <Route path="find-jobs" element={<CandidateFindJobs />} />
          <Route path="applications" element={<CandidateApplications />} />
        </Route>
      </Routes>
    </AppShell>
  );
}
