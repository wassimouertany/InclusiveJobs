import React, { useState, useEffect, useRef } from "react";
import { AppView, UserRole, HandicapType, Language } from "../types";
import { Input, Button, ProgressBar } from "./UI";
import {
  Eye,
  EyeOff,
  LogIn,
  UserPlus,
  Volume2,
  Globe,
  Linkedin,
  ChevronRight,
  ChevronLeft,
  Upload,
  Check,
  Cpu,
  Building2,
} from "lucide-react";
import { API_BASE_URL } from "../config/api";
import {
  AUTH_ROLE_KEY,
  AUTH_TOKEN_KEY,
  AUTH_USER_ID_KEY,
} from "../config/auth";
import { extractSkillsFromCV } from "../services/geminiService";
import { useNavigation } from "../context/NavigationContext";
import { useToast } from "../context/ToastContext";

function appendCandidateFormData(
  formData: FormData,
  data: {
    last_name: string;
    first_name: string;
    birth_date: string;
    email: string;
    password: string;
    phone_number: string;
    address: string;
    industry: string;
    gender: string;
    years_of_experience: number;
    education_level: string;
    work_accommodations: string[];
    profile_title: string;
    key_skills: string[];
    disability_type: string;
    accessibility_needs: string;
    work_preference: string;
    availability_status: string;
  }
) {
  const jsonArrayKeys = new Set(["work_accommodations", "key_skills"]);
  for (const [key, value] of Object.entries(data)) {
    if (jsonArrayKeys.has(key)) {
      formData.append(key, JSON.stringify(value));
    } else {
      formData.append(key, String(value));
    }
  }
}

async function readErrorDetail(response: Response): Promise<string> {
  try {
    const body = await response.json();
    if (typeof body?.detail === "string") return body.detail;
    if (Array.isArray(body?.detail)) {
      return body.detail.map((e: { msg?: string }) => e.msg).filter(Boolean).join(", ") || "Request failed";
    }
    return "Request failed";
  } catch {
    return response.statusText || "Request failed";
  }
}

const translations = {
  en: {
    welcome: "Welcome Back",
    accessDashboard: "Access your inclusive hiring dashboard.",
    email: "Email Address",
    password: "Password",
    signIn: "Sign In",
    createAccount: "Create Professional Account",
    step: "Step",
    of: "of",
    candidate: "Candidate",
    company: "Company",
    continue: "Continue",
    back: "Back",
    launch: "Launch Workplace",
    basicInfo: "Basic Account Setup",
    medicalProfile: "Accessibility Profile",
    professionalExp: "Professional Experience",
    companyInfra: "Company Infrastructure",
    instCommit: "Institutional Commitment",
    fullName: "Your Legal Full Name",
    compName: "Official Company Name",
    phone: "Direct Phone",
    disabilityCat: "Disability Category",
    accommodations: "Workplace Accommodations",
    resumeUpload: "Smart Resume Upload",
    resumeDesc: "Gemini AI will scan your career history and match your skills.",
    aiThinking: "AI Brainstorming...",
    aiMapping: "Mapping your skills to top opportunities",
    extractedSkills: "Your AI-Extracted Skills",
    uploadPrompt: "Upload resume to see skills.",
    or: "or",
    verification: "Human Verification",
    playAudio: "Play Audio Code",
    placeholderEmail: "name@professional.com",
    placeholderName: "e.g., Alex Johnson",
    placeholderComp: "e.g., Global Tech Solutions",
    placeholderPass: "••••••••",
    placeholderPhone: "+216 -- --- ---",
    jobTitle: "Desired Job Title",
    yearsExp: "Years of Experience",
    proSummary: "Professional Summary / Bio",
    proSummaryHint: "Briefly describe your expertise and what makes you a great fit.",
    companySector: "Industry Sector",
    companySize: "Company Size",
    accessibleLocals: "Are your offices physically accessible?",
    inclusionPolicy: "Do you have an active inclusion policy?",
    pwdEmployees: "How many PwD employees do you currently have?",
    disabilities: {
      [HandicapType.MOTOR]: "Motor",
      [HandicapType.VISUAL]: "Visual",
      [HandicapType.HEARING]: "Hearing",
      [HandicapType.COGNITIVE]: "Cognitive",
      [HandicapType.PSYCHOLOGICAL]: "Psychological",
      [HandicapType.OTHER]: "Other",
    },
  },
  fr: {
    welcome: "Bon retour",
    accessDashboard: "Accédez à votre tableau de bord de recrutement inclusif.",
    email: "Adresse e-mail",
    password: "Mot de passe",
    signIn: "Se connecter",
    createAccount: "Créer un compte professionnel",
    step: "Étape",
    of: "sur",
    candidate: "Candidat",
    company: "Entreprise",
    continue: "Continuer",
    back: "Retour",
    launch: "Lancer l'espace",
    basicInfo: "Configuration de base",
    medicalProfile: "Profil d'accessibilité",
    professionalExp: "Expérience professionnelle",
    companyInfra: "Infrastructure d'entreprise",
    instCommit: "Engagement institutionnel",
    fullName: "Nom complet légal",
    compName: "Nom officiel de l'entreprise",
    phone: "Téléphone direct",
    disabilityCat: "Catégorie de handicap",
    accommodations: "Aménagements de travail",
    resumeUpload: "Téléchargement intelligent du CV",
    resumeDesc: "L'IA Gemini analysera votre historique de carrière.",
    aiThinking: "Réflexion de l'IA...",
    aiMapping: "Cartographie de vos compétences",
    extractedSkills: "Vos compétences extraites par l'IA",
    uploadPrompt: "Téléchargez un CV pour voir les compétences.",
    or: "ou",
    verification: "Vérification humaine",
    playAudio: "Lire le code audio",
    placeholderEmail: "nom@professionnel.com",
    placeholderName: "ex: Jean Dupont",
    placeholderComp: "ex: Global Tech Solutions",
    placeholderPass: "••••••••",
    placeholderPhone: "+216 -- --- ---",
    jobTitle: "Poste souhaité",
    yearsExp: "Années d'expérience",
    proSummary: "Résumé professionnel / Bio",
    proSummaryHint: "Décrivez brièvement votre expertise.",
    companySector: "Secteur d'activité",
    companySize: "Taille de l'entreprise",
    accessibleLocals: "Vos locaux sont-ils physiquement accessibles ?",
    inclusionPolicy: "Avez-vous une politique d'inclusion active ?",
    pwdEmployees: "Combien d'employés handicapés avez-vous ?",
    disabilities: {
      [HandicapType.MOTOR]: "Moteur",
      [HandicapType.VISUAL]: "Visuel",
      [HandicapType.HEARING]: "Auditif",
      [HandicapType.COGNITIVE]: "Cognitif",
      [HandicapType.PSYCHOLOGICAL]: "Psychologique",
      [HandicapType.OTHER]: "Autre",
    },
  },
  ar: {
    welcome: "مرحباً بعودتك",
    accessDashboard: "قم بالوصول إلى لوحة تحكم التوظيف الشاملة الخاصة بك.",
    email: "البريد الإلكتروني",
    password: "كلمة المرور",
    signIn: "تسجيل الدخول",
    createAccount: "إنشاء حساب احترافي",
    step: "خطوة",
    of: "من",
    candidate: "مرشح",
    company: "شركة",
    continue: "متابعة",
    back: "رجوع",
    launch: "إطلاق المنصة",
    basicInfo: "إعداد الحساب الأساسي",
    medicalProfile: "ملف الوصول",
    professionalExp: "الخبرة المهنية",
    companyInfra: "البنية التحتية للشركة",
    instCommit: "الالتزام المؤسسي",
    fullName: "الاسم الكامل القانوني",
    compName: "اسم الشركة الرسمي",
    phone: "الهاتف المباشر",
    disabilityCat: "فئة الإعاقة",
    accommodations: "تجهيزات مكان العمل",
    resumeUpload: "رفع السيرة الذاتية الذكي",
    resumeDesc: "سيقوم الذكاء الاصطناعي (Gemini) بمسح تاريخك المهني ومطابقة مهاراتك.",
    aiThinking: "تفكير الذكاء الاصطناعي...",
    aiMapping: "مطابقة مهاراتك مع أفضل الفرص",
    extractedSkills: "مهاراتك المستخرجة بواسطة الذكاء الاصطناعي",
    uploadPrompt: "ارفع سيرتك الذاتية لرؤية المهارات.",
    or: "أو",
    verification: "التحقق البشري",
    playAudio: "تشغيل الرمز الصوتي",
    placeholderEmail: "الاسم@النطاق.com",
    placeholderName: "مثال: أحمد علي",
    placeholderComp: "مثال: شركة التقنية العالمية",
    placeholderPass: "••••••••",
    placeholderPhone: "+216 -- --- ---",
    jobTitle: "المسمى الوظيفي المطلوب",
    yearsExp: "سنوات الخبرة",
    proSummary: "الملخص المهني / السيرة الذاتية",
    proSummaryHint: "صف خبرتك بإيجاز وما الذي يجعلك مناسباً للوظيفة.",
    companySector: "قطاع الصناعة",
    companySize: "حجم الشركة",
    accessibleLocals: "هل مكاتبكم متاحة جسدياً لذوي الإعاقة؟",
    inclusionPolicy: "هل لديكم سياسة نشطة للدمج؟",
    pwdEmployees: "كم عدد الموظفين ذوي الإعاقة لديكم حالياً؟",
    disabilities: {
      [HandicapType.MOTOR]: "حركية",
      [HandicapType.VISUAL]: "بصرية",
      [HandicapType.HEARING]: "سمعية",
      [HandicapType.COGNITIVE]: "إدراكية",
      [HandicapType.PSYCHOLOGICAL]: "نفسية",
      [HandicapType.OTHER]: "أخرى",
    },
  },
};

export default function Login() {
  const { navigate } = useNavigation();
  const { showToast } = useToast();
  
  const [view, setView] = useState<AppView>("LOGIN");
  const [role, setRole] = useState<UserRole>(UserRole.CANDIDATE);
  const [lang, setLang] = useState<Language>(Language.EN);
  const [step, setStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [skills, setSkills] = useState<string[]>([]);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  
  const t = translations[lang];
  const isRtl = lang === Language.AR;

  const headingRef = useRef<HTMLHeadingElement>(null);

  // Candidate Data State
  const [candidateData, setCandidateData] = useState({
    last_name: "",
    first_name: "",
    birth_date: "",
    email: "",
    password: "",
    phone_number: "",
    address: "",
    industry: "",
    gender: "male",
    years_of_experience: 0,
    education_level: "no_degree",
    work_accommodations: [] as string[],
    profile_title: "",
    key_skills: [] as string[],
    disability_type: "motor",
    accessibility_needs: "",
    work_preference: "hybrid",
    availability_status: "actively_looking",
  });
  const [candidateFiles, setCandidateFiles] = useState({
    logo: null as File | null,
    disability_card: null as File | null,
    resume: null as File | null,
  });

  // Company Data State
  const [companyData, setCompanyData] = useState({
    email: "",
    password: "",
    company_name: "",
    company_industry: "",
    phone_number: "",
    location: "",
    founded_year: new Date().getFullYear(),
    employee_count: 0,
    employees_with_disability: 0,
    inclusion_strategy: "",
    website: "",
  });
  const [companyFiles, setCompanyFiles] = useState({
    logo: null as File | null,
  });

  const [cvText, setCvText] = useState("");

  const totalSteps = role === UserRole.CANDIDATE ? 4 : 3;

  useEffect(() => {
    if (headingRef.current) {
      headingRef.current.focus();
    }
  }, [step, view]);

  const handleNext = () => setStep((s) => Math.min(s + 1, totalSteps));
  const handleBack = () => setStep((s) => Math.max(s - 1, 1));

  const toggleHandicap = (type: HandicapType) => {
    setCandidateData({ ...candidateData, disability_type: type });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsLoading(true);
      const reader = new FileReader();
      reader.onload = async (event) => {
        const text = event.target?.result as string;
        setCvText(text);
        const extracted = await extractSkillsFromCV(text.substring(0, 1000));
        setSkills(extracted);
        setCandidateData(prev => ({ 
          ...prev, 
          key_skills: Array.from(new Set([...prev.key_skills, ...extracted])) 
        }));
        setIsLoading(false);
      };
      reader.readAsText(file);
    }
  };

  const playAudioCaptcha = () => {
    const msgString =
      lang === Language.AR
        ? "يرجى إدخال الأرقام 4 2 9 0"
        : "Please enter the numbers 4 2 9 0";
    const msg = new SpeechSynthesisUtterance(msgString);
    msg.lang =
      lang === Language.AR ? "ar-SA" : lang === Language.FR ? "fr-FR" : "en-US";
    window.speechSynthesis.speak(msg);
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/users/login/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });
      if (!response.ok) {
        const detail = await readErrorDetail(response);
        showToast(detail, "error");
        return;
      }
      const data = await response.json();
      localStorage.setItem(AUTH_TOKEN_KEY, data.access_token);
      localStorage.setItem(AUTH_ROLE_KEY, data.role);
      localStorage.setItem(AUTH_USER_ID_KEY, data.id);
      showToast("Successfully logged in! Welcome back.", "success");
      if (data.role === UserRole.CANDIDATE) {
        navigate("dashboard-candidate");
      } else {
        navigate("dashboard-recruiter");
      }
    } catch (err) {
      console.error(err);
      showToast("Could not reach the server. Is the API running?", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterSubmit = async () => {
    setIsLoading(true);
    try {
      const endpoint =
        role === UserRole.CANDIDATE
          ? `${API_BASE_URL}/users/candidates/`
          : `${API_BASE_URL}/users/recruiters/`;

      const formData = new FormData();

      if (role === UserRole.CANDIDATE) {
        appendCandidateFormData(formData, candidateData);
        if (candidateFiles.resume) formData.append("resume", candidateFiles.resume);
        if (candidateFiles.disability_card)
          formData.append("disability_card", candidateFiles.disability_card);
        if (candidateFiles.logo) formData.append("logo", candidateFiles.logo);
      } else {
        formData.append("email", companyData.email);
        formData.append("password", companyData.password);
        formData.append("company_name", companyData.company_name);
        formData.append("company_industry", companyData.company_industry);
        formData.append("phone_number", companyData.phone_number);
        formData.append("location", companyData.location);
        formData.append("founded_year", String(companyData.founded_year));
        formData.append("employee_count", String(companyData.employee_count));
        formData.append(
          "employees_with_disability",
          String(companyData.employees_with_disability)
        );
        formData.append("inclusion_strategy", companyData.inclusion_strategy);
        if (companyFiles.logo) formData.append("logo", companyFiles.logo);
      }

      const response = await fetch(endpoint, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const detail = await readErrorDetail(response);
        showToast(detail, "error");
        return;
      }

      showToast("Account created successfully! Welcome to InclusiveJobs.", "success");
      setView("LOGIN");
      setStep(1);
    } catch (error) {
      console.error("Registration error:", error);
      showToast("Could not reach the server. Is the API running?", "error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8" dir={isRtl ? "rtl" : "ltr"}>
      
      {/* Language & View Toggle Controls */}
      <div className="w-full max-w-xl flex justify-between items-center mb-8">
        <div className="flex bg-white dark:bg-gray-800 p-1 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          {[
            { code: Language.EN, label: "EN" },
            { code: Language.FR, label: "FR" },
            { code: Language.AR, label: "AR" },
          ].map((l) => (
            <button
              key={l.code}
              onClick={() => setLang(l.code)}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                lang === l.code 
                  ? "bg-primary shadow-sm text-white" 
                  : "text-gray-500 hover:text-gray-900 dark:hover:text-gray-300"
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>

        <Button
          variant="outline"
          onClick={() => {
            setView(view === "LOGIN" ? "REGISTER" : "LOGIN");
            setStep(1);
          }}
          className="text-sm py-2"
        >
          {view === "LOGIN" ? t.createAccount : t.signIn}
        </Button>
      </div>

      <div className="w-full max-w-xl">
        {view === "LOGIN" && (
          <div className="bg-white dark:bg-gray-900 p-8 sm:p-10 rounded-[2.5rem] shadow-2xl border border-gray-100 dark:border-gray-800 animate-in fade-in slide-in-from-bottom-6">
            <h1
              tabIndex={-1}
              ref={headingRef}
              className="text-4xl font-black mb-2 dark:text-gray-100 outline-none text-left"
            >
              {t.welcome}
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mb-10 text-left">
              {t.accessDashboard}
            </p>

            <form className="space-y-6" onSubmit={handleLoginSubmit}>
              <Input
                label={t.email}
                type="email"
                autoComplete="email"
                placeholder={t.placeholderEmail}
                required
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
              />

              <div className="relative">
                <Input
                  label={t.password}
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder={t.placeholderPass}
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={`absolute ${isRtl ? "left-4" : "right-4"} top-[42px] text-gray-400 hover:text-primary transition-colors p-1 rounded-md focus:ring-2 ring-primary/50`}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={22} /> : <Eye size={22} />}
                </button>
              </div>

              <div className="p-5 bg-primary/5 dark:bg-primary/10 rounded-[1.5rem] border border-primary/20 dark:border-primary/30 flex items-center justify-between">
                <div className="text-left">
                  <h3 className="text-sm font-black dark:text-gray-100 mb-1">
                    {t.verification}
                  </h3>
                  <button
                    type="button"
                    onClick={playAudioCaptcha}
                    className="flex items-center gap-2 text-xs text-primary font-bold hover:underline"
                  >
                    <Volume2 size={16} /> {t.playAudio}
                  </button>
                </div>
                <input
                  type="text"
                  className="w-24 px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl dark:bg-gray-800 dark:text-white font-mono text-center focus:border-primary outline-none"
                  placeholder="0000"
                  aria-label="Enter verification code"
                  required
                />
              </div>

              <Button type="submit" className="w-full py-4 text-lg" disabled={isLoading}>
                <LogIn size={22} /> {isLoading ? "…" : t.signIn}
              </Button>

              <div className="relative py-2 flex items-center">
                <div className="flex-grow border-t border-gray-200 dark:border-gray-800"></div>
                <span className="flex-shrink mx-4 text-gray-400 text-sm font-bold uppercase tracking-widest">
                  {t.or}
                </span>
                <div className="flex-grow border-t border-gray-200 dark:border-gray-800"></div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Button type="button" variant="outline" className="text-sm font-bold">
                  <Globe size={18} /> Google
                </Button>
                <Button type="button" variant="outline" className="text-sm font-bold">
                  <Linkedin size={18} /> LinkedIn
                </Button>
              </div>
            </form>
          </div>
        )}

        {view === "REGISTER" && (
          <div className="bg-white dark:bg-gray-900 p-8 sm:p-10 rounded-[2.5rem] shadow-2xl border border-gray-100 dark:border-gray-800 transition-all duration-500 animate-in fade-in slide-in-from-right-6">
            <ProgressBar current={step} total={totalSteps} />

            <div className="mb-10 text-left">
              <h2
                tabIndex={-1}
                ref={headingRef}
                className="text-3xl font-black dark:text-gray-100 outline-none mb-2"
              >
                {step === 1 && t.basicInfo}
                {step === 2 &&
                  (role === UserRole.CANDIDATE
                    ? t.medicalProfile
                    : t.companyInfra)}
                {step === 3 &&
                  (role === UserRole.CANDIDATE
                    ? t.professionalExp
                    : t.instCommit)}
              </h2>
              <p className="text-gray-500 dark:text-gray-400">
                {step === 1 &&
                  (lang === Language.AR
                    ? "أخبرنا من أنت لتخصيص تجربتك."
                    : lang === Language.FR
                      ? "Dites-nous qui vous êtes pour personnaliser votre expérience."
                      : "Tell us who you are to personalize your experience.")}
                {step === 2 &&
                  (role === UserRole.CANDIDATE
                    ? lang === Language.AR
                      ? "ساعدنا في فهم احتياجات مكان العمل الخاصة بك."
                      : "Help us understand your workplace needs."
                    : lang === Language.AR
                      ? "أخبرنا عن إمكانية الوصول المادي والرقمي لديك."
                      : "Tell us about your physical and digital accessibility.")}
                {step === 3 &&
                  (lang === Language.AR
                    ? "أكمل ملفك الشخصي لمطابقة أفضل."
                    : "Finalize your profile for better matching.")}
              </p>
            </div>

            {step === 1 && (
              <div className="space-y-6">
                <div
                  className="grid grid-cols-2 gap-4"
                  role="radiogroup"
                  aria-label="Account Role Selection"
                >
                  <button
                    onClick={() => setRole(UserRole.CANDIDATE)}
                    aria-checked={role === UserRole.CANDIDATE}
                    role="radio"
                    className={`p-5 rounded-3xl border-2 transition-all text-center flex flex-col items-center justify-center ${
                      role === UserRole.CANDIDATE 
                        ? "border-primary bg-primary/5 dark:bg-primary/10 ring-4 ring-primary/20 dark:ring-primary/30" 
                        : "border-gray-100 dark:border-gray-800 hover:border-gray-200"
                    }`}
                  >
                    <div
                      className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-3 ${
                        role === UserRole.CANDIDATE ? "bg-primary text-white" : "bg-gray-100 text-gray-400"
                      }`}
                    >
                      <UserPlus size={28} />
                    </div>
                    <span className="font-black text-sm dark:text-gray-100">
                      {t.candidate}
                    </span>
                  </button>
                  <button
                    onClick={() => setRole(UserRole.COMPANY)}
                    aria-checked={role === UserRole.COMPANY}
                    role="radio"
                    className={`p-5 rounded-3xl border-2 transition-all text-center flex flex-col items-center justify-center ${
                      role === UserRole.COMPANY 
                        ? "border-primary bg-primary/5 dark:bg-primary/10 ring-4 ring-primary/20 dark:ring-primary/30" 
                        : "border-gray-100 dark:border-gray-800 hover:border-gray-200"
                    }`}
                  >
                    <div
                      className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-3 ${
                        role === UserRole.COMPANY ? "bg-primary text-white" : "bg-gray-100 text-gray-400"
                      }`}
                    >
                      <Building2 size={28} />
                    </div>
                    <span className="font-black text-sm dark:text-gray-100">
                      {t.company}
                    </span>
                  </button>
                </div>

                <div className="space-y-4">
                  {role === UserRole.CANDIDATE ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Input
                        label="First Name"
                        placeholder="e.g., Alex"
                        autoComplete="given-name"
                        value={candidateData.first_name}
                        onChange={(e) => setCandidateData({...candidateData, first_name: e.target.value})}
                      />
                      <Input
                        label="Last Name"
                        placeholder="e.g., Johnson"
                        autoComplete="family-name"
                        value={candidateData.last_name}
                        onChange={(e) => setCandidateData({...candidateData, last_name: e.target.value})}
                      />
                    </div>
                  ) : (
                    <Input
                      label={t.compName}
                      placeholder={t.placeholderComp}
                      autoComplete="organization"
                      value={companyData.company_name}
                      onChange={(e) => setCompanyData({...companyData, company_name: e.target.value})}
                    />
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label={t.email}
                      type="email"
                      placeholder={t.placeholderEmail}
                      autoComplete="email"
                      value={role === UserRole.CANDIDATE ? candidateData.email : companyData.email}
                      onChange={(e) => role === UserRole.CANDIDATE 
                        ? setCandidateData({...candidateData, email: e.target.value})
                        : setCompanyData({...companyData, email: e.target.value})}
                    />
                    <Input
                      label={t.phone}
                      type="tel"
                      placeholder={t.placeholderPhone}
                      autoComplete="tel"
                      value={role === UserRole.CANDIDATE ? candidateData.phone_number : companyData.phone_number}
                      onChange={(e) => role === UserRole.CANDIDATE 
                        ? setCandidateData({...candidateData, phone_number: e.target.value})
                        : setCompanyData({...companyData, phone_number: e.target.value})}
                    />
                  </div>

                  {role === UserRole.CANDIDATE ? (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                          label="Birth Date"
                          type="date"
                          value={candidateData.birth_date}
                          onChange={(e) => setCandidateData({...candidateData, birth_date: e.target.value})}
                        />
                        <div className="space-y-1">
                          <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">
                            Gender
                          </label>
                          <select 
                            className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:ring-4 focus:ring-primary/20 focus:border-primary transition-all outline-none bg-white dark:bg-gray-800 dark:text-white"
                            value={candidateData.gender}
                            onChange={(e) => setCandidateData({...candidateData, gender: e.target.value})}
                          >
                            <option value="male">Male</option>
                            <option value="female">Female</option>
                          </select>
                        </div>
                      </div>
                      <Input
                        label="Address"
                        placeholder="e.g., 123 Main St, City, Country"
                        value={candidateData.address}
                        onChange={(e) => setCandidateData({...candidateData, address: e.target.value})}
                      />
                    </>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Input
                        label="Location"
                        placeholder="e.g., Tunis, Tunisia"
                        value={companyData.location}
                        onChange={(e) => setCompanyData({...companyData, location: e.target.value})}
                      />
                      <Input
                        label="Founded Year"
                        type="number"
                        placeholder="e.g., 2010"
                        value={companyData.founded_year.toString()}
                        onChange={(e) => setCompanyData({...companyData, founded_year: parseInt(e.target.value) || 0})}
                      />
                    </div>
                  )}

                  <Input
                    label={t.password}
                    type="password"
                    placeholder={t.placeholderPass}
                    value={role === UserRole.CANDIDATE ? candidateData.password : companyData.password}
                    onChange={(e) => role === UserRole.CANDIDATE 
                      ? setCandidateData({...candidateData, password: e.target.value})
                      : setCompanyData({...companyData, password: e.target.value})}
                  />
                </div>
              </div>
            )}

            {step === 2 && role === UserRole.CANDIDATE && (
              <div className="space-y-6 text-left">
                <div>
                  <label className="block text-sm font-black text-gray-700 dark:text-gray-300 mb-4">
                    {t.disabilityCat}
                  </label>
                  <div
                    className="grid grid-cols-2 gap-3"
                    role="group"
                    aria-label="Disability Types"
                  >
                    {Object.values(HandicapType).map((type) => (
                      <button
                        key={type}
                        onClick={() => toggleHandicap(type)}
                        aria-pressed={candidateData.disability_type === type}
                        className={`px-4 py-4 rounded-2xl border-2 text-sm font-bold transition-all flex items-center gap-3 ${
                          candidateData.disability_type === type 
                            ? "bg-primary text-white border-primary shadow-md scale-[1.02]" 
                            : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-primary/30"
                        }`}
                      >
                        <div
                          className={`w-3 h-3 rounded-full ${
                            candidateData.disability_type === type ? "bg-white" : "bg-gray-300 dark:bg-gray-600"
                          }`}
                        ></div>
                        {t.disabilities[type]}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-6 border-t border-gray-100 dark:border-gray-800">
                  <label className="block text-sm font-black text-gray-700 dark:text-gray-300 mb-4">
                    {t.accommodations}
                  </label>
                  <div className="grid grid-cols-1 gap-3">
                    {[
                      {
                        label: lang === Language.AR ? "أثاث مريح" : lang === Language.FR ? "Mobilier ergonomique" : "Ergonomic Furniture",
                        desc: lang === Language.AR ? "كراسي قابلة للتعديل، مكاتب للوقوف." : lang === Language.FR ? "Chaises réglables, bureaux debout." : "Adjustable chairs, specialized mice.",
                      },
                      {
                        label: lang === Language.AR ? "إمكانية الوصول المادي" : lang === Language.FR ? "Accessibilité physique" : "Physical Accessibility",
                        desc: lang === Language.AR ? "منحدرات، مصاعد، دورات مياه مجهزة." : lang === Language.FR ? "Rampes, ascenseurs, toilettes accessibles." : "Ramps, elevators, accessible restrooms.",
                      },
                      {
                        label: lang === Language.AR ? "المساعدة الرقمية" : lang === Language.FR ? "Assistance numérique" : "Digital Assistance",
                        desc: lang === Language.AR ? "قارئات الشاشة، أدوات التكبير." : lang === Language.FR ? "Lecteurs d'écran, outils de grossissement." : "Screen readers, magnification tools.",
                      },
                      {
                        label: lang === Language.AR ? "نموذج عمل مرن" : lang === Language.FR ? "Modèle de travail flexible" : "Flexible Work Model",
                        desc: lang === Language.AR ? "خيارات العمل عن بعد أو جداول مخصصة." : lang === Language.FR ? "Options hybrides ou horaires personnalisés." : "Hybrid options or customized schedules.",
                      },
                    ].map((item) => (
                      <label
                        key={item.label}
                        className="flex items-start gap-4 p-4 bg-gray-50/50 dark:bg-gray-800/50 rounded-2xl cursor-pointer border-2 border-transparent hover:border-primary/20 dark:hover:border-primary/30 transition-all"
                      >
                        <input
                          type="checkbox"
                          className="mt-1 w-6 h-6 rounded-lg border-gray-300 text-primary focus:ring-primary"
                          checked={candidateData.work_accommodations.includes(item.label)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setCandidateData({...candidateData, work_accommodations: [...candidateData.work_accommodations, item.label]});
                            } else {
                              setCandidateData({...candidateData, work_accommodations: candidateData.work_accommodations.filter(a => a !== item.label)});
                            }
                          }}
                        />
                        <div>
                          <span className="block font-black text-gray-900 dark:text-gray-100 leading-none mb-1">
                            {item.label}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {item.desc}
                          </span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="pt-6 border-t border-gray-100 dark:border-gray-800">
                  <label className="block text-sm font-black text-gray-700 dark:text-gray-300 mb-4">
                    Disability Card (Optional)
                  </label>
                  <div className="relative group">
                    <input
                      type="file"
                      id="disability-card-upload"
                      className="hidden"
                      accept="image/*,.pdf"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setCandidateFiles({...candidateFiles, disability_card: file});
                        }
                      }}
                    />
                    <label
                      htmlFor="disability-card-upload"
                      className="block p-6 border-2 border-dashed border-primary/30 dark:border-primary/40 rounded-2xl bg-primary/5 dark:bg-primary/5 text-center cursor-pointer hover:bg-primary/10 dark:hover:bg-primary/10 hover:border-primary/50 transition-all focus-within:ring-4 ring-primary/20"
                    >
                      <span className="block font-black text-sm text-primary-dark dark:text-primary-light mb-1">
                        {candidateFiles.disability_card ? candidateFiles.disability_card.name : "Upload Disability Card"}
                      </span>
                      <span className="text-xs text-primary/70 dark:text-primary-light/70">
                        PNG, JPG, PDF up to 5MB
                      </span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {step === 2 && role === UserRole.COMPANY && (
              <div className="space-y-6 text-left">
                <Input
                  label={t.companySector}
                  placeholder="e.g., Technology, Healthcare..."
                  value={companyData.company_industry}
                  onChange={(e) => setCompanyData({...companyData, company_industry: e.target.value})}
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label={t.companySize}
                    type="number"
                    placeholder="e.g., 50"
                    value={companyData.employee_count.toString()}
                    onChange={(e) => setCompanyData({...companyData, employee_count: parseInt(e.target.value) || 0})}
                  />
                  <Input
                    label="Employees with Disability"
                    type="number"
                    placeholder="e.g., 5"
                    value={companyData.employees_with_disability.toString()}
                    onChange={(e) => setCompanyData({...companyData, employees_with_disability: parseInt(e.target.value) || 0})}
                  />
                </div>
              </div>
            )}

            {step === 3 && role === UserRole.CANDIDATE && (
              <div className="space-y-8 text-left">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label={t.jobTitle}
                    placeholder="e.g., Software Engineer"
                    value={candidateData.profile_title}
                    onChange={(e) => setCandidateData({...candidateData, profile_title: e.target.value})}
                  />
                  <Input
                    label="Industry"
                    placeholder="e.g., Technology"
                    value={candidateData.industry}
                    onChange={(e) => setCandidateData({...candidateData, industry: e.target.value})}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Input 
                      label={t.yearsExp}
                      type="number"
                      placeholder="0"
                      value={candidateData.years_of_experience.toString()}
                      onChange={(e) => setCandidateData({...candidateData, years_of_experience: parseInt(e.target.value) || 0})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">
                      Education Level
                    </label>
                    <select 
                      className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:ring-4 focus:ring-primary/20 focus:border-primary transition-all outline-none bg-white dark:bg-gray-800 dark:text-white"
                      value={candidateData.education_level}
                      onChange={(e) => setCandidateData({...candidateData, education_level: e.target.value})}
                    >
                      <option value="no_degree">No Degree</option>
                      <option value="high_school">High School</option>
                      <option value="vocational_training">Vocational Training</option>
                      <option value="bachelors">Bachelors</option>
                      <option value="masters">Masters</option>
                      <option value="engineering_degree">Engineering Degree</option>
                      <option value="doctorate">Doctorate</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">
                      Work Preference
                    </label>
                    <select 
                      className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:ring-4 focus:ring-primary/20 focus:border-primary transition-all outline-none bg-white dark:bg-gray-800 dark:text-white"
                      value={candidateData.work_preference}
                      onChange={(e) => setCandidateData({...candidateData, work_preference: e.target.value})}
                    >
                      <option value="fully_remote">Fully Remote</option>
                      <option value="hybrid">Hybrid</option>
                      <option value="on_site">On Site</option>
                      <option value="flexible_hours">Flexible Hours</option>
                      <option value="part_time">Part Time</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">
                      Availability Status
                    </label>
                    <select 
                      className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:ring-4 focus:ring-primary/20 focus:border-primary transition-all outline-none bg-white dark:bg-gray-800 dark:text-white"
                      value={candidateData.availability_status}
                      onChange={(e) => setCandidateData({...candidateData, availability_status: e.target.value})}
                    >
                      <option value="actively_looking">Actively Looking</option>
                      <option value="unavailable">Unavailable</option>
                    </select>
                  </div>
                </div>

                <div>
                  <Input
                    label="Key Skills"
                    placeholder="e.g., React, Python, Communication (comma separated)"
                    value={candidateData.key_skills.join(", ")}
                    onChange={(e) => setCandidateData({...candidateData, key_skills: e.target.value.split(",").map(s => s.trim())})}
                  />
                </div>
              </div>
            )}

            {step === 4 && role === UserRole.CANDIDATE && (
              <div className="space-y-8 text-left">
                <div>
                  <label className="block text-sm font-black text-gray-700 dark:text-gray-300 mb-2">
                    Accessibility Needs
                  </label>
                  <textarea
                    className="w-full px-5 py-4 border-2 border-gray-200 dark:border-gray-700 rounded-3xl focus:ring-4 focus:ring-primary/20 focus:border-primary transition-all outline-none bg-white dark:bg-gray-800 dark:text-white min-h-[120px]"
                    placeholder="Describe any specific accommodations you need..."
                    value={candidateData.accessibility_needs}
                    onChange={(e) => setCandidateData({...candidateData, accessibility_needs: e.target.value})}
                  ></textarea>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="relative group">
                    <input
                      type="file"
                      id="profile-pic-upload"
                      className="hidden"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setCandidateFiles({...candidateFiles, logo: file});
                        }
                      }}
                    />
                    <label
                      htmlFor="profile-pic-upload"
                      className="block p-8 border-2 border-dashed border-primary/30 dark:border-primary/40 rounded-[2rem] bg-primary/5 dark:bg-primary/5 text-center cursor-pointer hover:bg-primary/10 dark:hover:bg-primary/10 hover:border-primary/50 transition-all focus-within:ring-4 ring-primary/20"
                    >
                      <div className="w-16 h-16 bg-white dark:bg-gray-800 rounded-3xl shadow-lg flex items-center justify-center mx-auto mb-4 text-primary group-hover:rotate-6 transition-transform">
                        <Upload size={32} />
                      </div>
                      <span className="block font-black text-lg text-primary-dark dark:text-primary-light mb-1">
                        {candidateFiles.logo ? candidateFiles.logo.name : "Profile Picture"}
                      </span>
                      <span className="text-xs text-primary/70 dark:text-primary-light/70">
                        PNG, JPG up to 5MB
                      </span>
                    </label>
                  </div>

                  <div className="relative group">
                    <input
                      type="file"
                      id="cv-upload"
                      className="hidden"
                      accept=".pdf,application/pdf"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setCandidateFiles({ ...candidateFiles, resume: file });
                          // PDF: backend stores file; Gemini skill extraction uses plain text only
                          if (file.type === "text/plain" || file.name.toLowerCase().endsWith(".txt")) {
                            handleFileUpload(e);
                          }
                        }
                      }}
                    />
                    <label
                      htmlFor="cv-upload"
                      className="block p-8 border-2 border-dashed border-primary/30 dark:border-primary/40 rounded-[2rem] bg-primary/5 dark:bg-primary/5 text-center cursor-pointer hover:bg-primary/10 dark:hover:bg-primary/10 hover:border-primary/50 transition-all focus-within:ring-4 ring-primary/20"
                    >
                      <div className="w-16 h-16 bg-white dark:bg-gray-800 rounded-3xl shadow-lg flex items-center justify-center mx-auto mb-4 text-primary group-hover:rotate-6 transition-transform">
                        <Upload size={32} />
                      </div>
                      <span className="block font-black text-lg text-primary-dark dark:text-primary-light mb-1">
                        {candidateFiles.resume ? candidateFiles.resume.name : t.resumeUpload}
                      </span>
                      <span className="text-xs text-primary/70 dark:text-primary-light/70">
                        {t.resumeDesc}
                      </span>
                    </label>
                  </div>
                </div>

                <div aria-live="polite" className="min-h-[80px]">
                  {isLoading ? (
                    <div className="flex items-center gap-4 p-6 bg-primary text-white rounded-3xl shadow-xl">
                      <Cpu className="animate-spin" size={32} />
                      <div>
                        <span className="block font-black text-lg">
                          {t.aiThinking}
                        </span>
                        <span className="text-xs opacity-80 uppercase tracking-widest font-bold">
                          {t.aiMapping}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <label className="block text-sm font-black text-gray-700 dark:text-gray-300">
                        {t.extractedSkills}
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {candidateData.key_skills.length > 0 ? (
                          candidateData.key_skills.map((skill, idx) => (
                            <span
                              key={idx}
                              className="px-4 py-2 bg-white dark:bg-gray-800 text-primary dark:text-primary-light rounded-2xl text-xs font-black border-2 border-primary/20 dark:border-primary/30 flex items-center gap-2 shadow-sm animate-in zoom-in-50 duration-300"
                            >
                              {skill}{" "}
                              <Check size={14} className="text-success-green" />
                            </span>
                          ))
                        ) : (
                          <p className="text-gray-400 italic text-sm py-4">
                            {t.uploadPrompt}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {step === 3 && role === UserRole.COMPANY && (
              <div className="space-y-6 text-left">
                <Input 
                  label="Company Website" 
                  type="url" 
                  placeholder="https://www.example.com" 
                  value={companyData.website}
                  onChange={(e) => setCompanyData({...companyData, website: e.target.value})}
                />
                
                <div className="space-y-2">
                  <label className="block text-sm font-black text-gray-700 dark:text-gray-300">
                    Tell us more about your inclusion strategy
                  </label>
                  <textarea
                    className="w-full px-5 py-4 border-2 border-gray-200 dark:border-gray-700 rounded-3xl outline-none bg-white dark:bg-gray-800 dark:text-white min-h-[100px] focus:ring-4 focus:ring-primary/20 focus:border-primary transition-all"
                    placeholder="We value diversity because..."
                    value={companyData.inclusion_strategy}
                    onChange={(e) => setCompanyData({...companyData, inclusion_strategy: e.target.value})}
                  ></textarea>
                </div>

                <div className="relative group">
                  <input
                    type="file"
                    id="logo-upload"
                    className="hidden"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setCompanyFiles({...companyFiles, logo: file});
                      }
                    }}
                  />
                  <label
                    htmlFor="logo-upload"
                    className="block p-8 border-2 border-dashed border-primary/30 dark:border-primary/40 rounded-[2rem] bg-primary/5 dark:bg-primary/5 text-center cursor-pointer hover:bg-primary/10 dark:hover:bg-primary/10 hover:border-primary/50 transition-all focus-within:ring-4 ring-primary/20"
                  >
                    <div className="w-16 h-16 bg-white dark:bg-gray-800 rounded-3xl shadow-lg flex items-center justify-center mx-auto mb-4 text-primary group-hover:rotate-6 transition-transform">
                      <Upload size={32} />
                    </div>
                    <span className="block font-black text-lg text-primary-dark dark:text-primary-light mb-1">
                      {companyFiles.logo ? companyFiles.logo.name : "Upload Company Logo"}
                    </span>
                    <span className="text-xs text-primary/70 dark:text-primary-light/70">
                      PNG, JPG up to 5MB
                    </span>
                  </label>
                </div>
              </div>
            )}

            <div
              className={`flex items-center justify-between mt-12 pt-10 border-t border-gray-100 dark:border-gray-800`}
            >
              {step > 1 ? (
                <Button
                  variant="outline"
                  onClick={handleBack}
                  className="w-36 py-4"
                >
                  {isRtl ? (
                    <ChevronRight size={22} />
                  ) : (
                    <ChevronLeft size={22} />
                  )}{" "}
                  {t.back}
                </Button>
              ) : (
                <div className="w-36"></div>
              )}

              {step < totalSteps ? (
                <Button onClick={handleNext} className="w-48 py-4">
                  {t.continue}{" "}
                  {isRtl ? (
                    <ChevronLeft size={22} />
                  ) : (
                    <ChevronRight size={22} />
                  )}
                </Button>
              ) : (
                <Button
                  variant="secondary"
                  onClick={handleRegisterSubmit}
                  className="w-72 py-4"
                >
                  {t.launch} <Check size={22} />
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
