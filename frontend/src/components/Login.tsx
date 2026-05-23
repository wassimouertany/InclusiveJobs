import React, { useState, useEffect, useRef } from "react";
import {
  AppView,
  UserRole,
  HandicapType,
  Language,
  EducationLevel,
} from "../types";
import { Input, Button, ProgressBar } from "./UI";
import {
  Eye,
  EyeOff,
  LogIn,
  UserPlus,
  Globe,
  Linkedin,
  ChevronRight,
  ChevronLeft,
  Upload,
  Check,
  CheckCircle,
  Cpu,
  Building2,
} from "lucide-react";
import { useAuthStore } from "../config/auth";
import { apiClient } from "../services/apiClient";
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

function readErrorDetailFromResponseLike(
  data: unknown,
  statusText: string
): string {
  if (data !== null && typeof data === "object" && !Array.isArray(data)) {
    const body = data as { detail?: unknown };
    if (typeof body.detail === "string") return body.detail;
    if (Array.isArray(body.detail)) {
      return (
        body.detail.map((e: { msg?: string }) => e.msg).filter(Boolean).join(", ") ||
        "Request failed"
      );
    }
    return "Request failed";
  }
  return statusText || "Request failed";
}

type ExtractDocumentsResponse = {
  resume: {
    first_name: string;
    last_name: string;
    birth_date: string;
    email: string;
    phone_number: string;
    address: string;
    industry: string;
    education_level: string;
    gender: string;
    profile_title: string;
    key_skills: string[];
    years_of_experience: number;
  } | null;
  disability_card: {
    disability_type: string;
    card_number: string;
    expiry_date: string;
    first_name: string;
    last_name: string;
    birth_date: string;
  } | null;
  quota_exceeded?: boolean;
};

function isValidDisabilityType(value: string): value is HandicapType {
  return (Object.values(HandicapType) as string[]).includes(value);
}

function isValidEducationLevel(value: string): value is EducationLevel {
  return (Object.values(EducationLevel) as string[]).includes(value as EducationLevel);
}

const EDUCATION_LEVEL_LABELS: Record<EducationLevel, string> = {
  [EducationLevel.NO_DEGREE]: "No Degree",
  [EducationLevel.HIGH_SCHOOL]: "High School",
  [EducationLevel.VOCATIONAL_TRAINING]: "Vocational Training",
  [EducationLevel.BACHELORS]: "Bachelors",
  [EducationLevel.MASTERS]: "Masters",
  [EducationLevel.ENGINEERING_DEGREE]: "Engineering Degree",
  [EducationLevel.DOCTORATE]: "Doctorate",
  [EducationLevel.OTHER]: "Other",
};

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
    accountType: "Choose account type",
    accountTypeHint:
      "Next, upload your disability card and résumé — we’ll read them and fill most of the form for you.",
    smartStart: "Drop your documents",
    smartStartDesc:
      "Upload your disability card and your résumé (PDF). The résumé fills name, contact, education, job title, skills, and experience; the card adds disability type and ID details. Everything stays editable.",
    disabilityCardUpload: "Disability card",
    almostThere: "Review & finish",
    almostThereDesc:
      "Add a profile photo if you like, describe any extra accessibility needs, then create your account.",
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
    accountType: "Type de compte",
    accountTypeHint:
      "Ensuite, téléchargez votre carte de handicap et votre CV — nous remplirons la majeure partie du formulaire.",
    smartStart: "Déposez vos documents",
    smartStartDesc:
      "Carte de handicap (image ou PDF) et CV (PDF). OCR + IA : nom, date de naissance, type de handicap, titre, compétences et expérience — modifiable ensuite.",
    disabilityCardUpload: "Carte de handicap",
    almostThere: "Vérifier et terminer",
    almostThereDesc:
      "Photo de profil optionnelle, besoins d’accessibilité, puis création du compte.",
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
    accountType: "نوع الحساب",
    accountTypeHint:
      "بعدها ارفع بطاقة الإعاقة والسيرة الذاتية — سنملأ معظم الحقول تلقائياً.",
    smartStart: "ارفع مستنداتك",
    smartStartDesc:
      "بطاقة الإعاقة (صورة أو PDF) والسيرة (PDF). الذكاء الاصطناعي يملأ الاسم وتاريخ الميلاد ونوع الإعاقة والمهارات والخبرة — يمكن التعديل لاحقاً.",
    disabilityCardUpload: "بطاقة الإعاقة",
    almostThere: "مراجعة وإنهاء",
    almostThereDesc:
      "صورة شخصية اختيارية، ثم وصف احتياجاتك، ثم إنشاء الحساب.",
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

const ACCOMMODATIONS = [
  { label: "Ergonomic Furniture",  icon: "🪑", desc: "Adjustable chairs & desks" },
  { label: "Physical Accessibility", icon: "♿", desc: "Ramps, elevators, restrooms" },
  { label: "Digital Assistance",   icon: "💻", desc: "Screen readers, magnification" },
  { label: "Flexible Work Model",  icon: "⏰", desc: "Remote or custom schedules" },
  { label: "Visual Aid Equipment", icon: "👁",  desc: "Braille, large displays" },
  { label: "Hearing Support",      icon: "🎧", desc: "Sign language, captions" },
  { label: "Quiet Workspace",      icon: "🤫", desc: "Low-stimulus environment" },
  { label: "Mental Health Support",icon: "🧠", desc: "Counseling, flexible breaks" },
  { label: "Transport Assistance", icon: "🚌", desc: "Parking, shuttle access" },
  { label: "Personal Assistant",   icon: "🤝", desc: "On-site support person" },
  { label: "Adapted Equipment",    icon: "⌨️", desc: "Specialized keyboards, mice" },
  { label: "Medical Break Time",   icon: "💊", desc: "Time for medication/therapy" },
];

const AI_MESSAGES = [
  "Reading your documents...",
  "Extracting skills with Gemini AI...",
  "Analyzing work experience...",
  "Detecting accessibility needs...",
  "Building your profile...",
  "Almost ready...",
];

function AiLoadingMessages() {
  const [idx, setIdx] = React.useState(0);
  React.useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % AI_MESSAGES.length), 2200);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="h-14 flex flex-col items-center justify-center">
      <p className="text-lg font-bold text-white mb-1" style={{ animation: "fadeMsg 2.2s ease-in-out infinite" }}>
        {AI_MESSAGES[idx]}
      </p>
      <p className="text-xs text-white/50 font-medium">OCR + Gemini AI • Please wait</p>
    </div>
  );
}

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
  const [docExtractBusy, setDocExtractBusy] = useState(false);
  const [skillInput, setSkillInput] = React.useState("");
  const [disabilityCardExtract, setDisabilityCardExtract] = useState<{
    card_number: string;
    expiry_date: string;
  } | null>(null);
  /** Avoid showing default "male" in step-2 preview before résumé supplied gender */
  const [genderFromResumeExtract, setGenderFromResumeExtract] = useState(false);

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

  const totalSteps = role === UserRole.CANDIDATE ? 6 : 3;

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

  const extractDocuments = async (files: {
    resume?: File;
    disability_card?: File;
  }) => {
    if (!files.resume && !files.disability_card) return;
    if (!files.resume) setGenderFromResumeExtract(false);
    setDocExtractBusy(true);
    try {
      const formData = new FormData();
      if (files.resume) formData.append("resume", files.resume);
      if (files.disability_card)
        formData.append("disability_card", files.disability_card);
      const response = await apiClient.post<ExtractDocumentsResponse>(
        "/users/candidates/extract-documents",
        formData,
        { validateStatus: () => true }
      );
      if (response.status < 200 || response.status >= 300) {
        showToast(
          readErrorDetailFromResponseLike(response.data, response.statusText),
          "error"
        );
        return;
      }
      const data = response.data;
      let appliedSomething = false;
      if (data.resume) {
        const r = data.resume;
        const bdRaw = r.birth_date?.trim().slice(0, 10) ?? "";
        const validBd = /^\d{4}-\d{2}-\d{2}$/.test(bdRaw) ? bdRaw : "";
        const eduRaw = r.education_level?.trim() ?? "";
        const validEdu = isValidEducationLevel(eduRaw) ? eduRaw : null;
        const genRaw = r.gender?.trim().toLowerCase();
        const validGen =
          genRaw === "male" || genRaw === "female" ? genRaw : null;
        const hasTitle = !!r.profile_title?.trim();
        const hasSkills = (r.key_skills?.length ?? 0) > 0;
        const y = r.years_of_experience;
        const resumeFillsSomething =
          !!(
            r.first_name?.trim() ||
            r.last_name?.trim() ||
            validBd ||
            r.email?.trim() ||
            r.phone_number?.trim() ||
            r.address?.trim() ||
            r.industry?.trim() ||
            validEdu ||
            validGen ||
            hasTitle ||
            hasSkills ||
            (typeof y === "number" && y > 0)
          );
        if (resumeFillsSomething) appliedSomething = true;
        setGenderFromResumeExtract(!!validGen);
        setCandidateData((prev) => {
          const hasYears =
            typeof y === "number" && (y > 0 || prev.years_of_experience === 0);
          const next = { ...prev };
          if (r.first_name?.trim()) next.first_name = r.first_name.trim();
          if (r.last_name?.trim()) next.last_name = r.last_name.trim();
          if (validBd) next.birth_date = validBd;
          if (r.email?.trim()) next.email = r.email.trim();
          if (r.phone_number?.trim()) next.phone_number = r.phone_number.trim();
          if (r.address?.trim()) next.address = r.address.trim();
          if (r.industry?.trim()) next.industry = r.industry.trim();
          if (validEdu) next.education_level = validEdu;
          if (validGen) next.gender = validGen;
          if (hasTitle) next.profile_title = r.profile_title.trim();
          if (hasSkills) next.key_skills = r.key_skills;
          if (hasYears) next.years_of_experience = y;
          return next;
        });
      }
      if (data.disability_card) {
        const d = data.disability_card;
        const fn = d.first_name?.trim();
        const ln = d.last_name?.trim();
        const bdRaw = d.birth_date?.trim().slice(0, 10) ?? "";
        const validBd = /^\d{4}-\d{2}-\d{2}$/.test(bdRaw) ? bdRaw : "";
        const dt = d.disability_type?.trim();
        const hasDt = dt && isValidDisabilityType(dt);
        if (fn || ln || validBd || hasDt) {
          appliedSomething = true;
          setCandidateData((prev) => ({
            ...prev,
            ...(fn ? { first_name: fn } : {}),
            ...(ln ? { last_name: ln } : {}),
            ...(validBd ? { birth_date: validBd } : {}),
            ...(hasDt ? { disability_type: dt } : {}),
          }));
        }
        const cn = d.card_number?.trim() ?? "";
        const ex = d.expiry_date?.trim() ?? "";
        if (cn || ex) {
          setDisabilityCardExtract({ card_number: cn, expiry_date: ex });
          appliedSomething = true;
        } else if (!fn && !ln && !validBd && !hasDt) {
          setDisabilityCardExtract(null);
        }
      }
      if (data.quota_exceeded) {
        showToast(
          "AI extraction unavailable right now — your OCR data was saved. You can add skills manually.",
          "warning"
        );
      } else {
        showToast(
          appliedSomething
            ? "Form auto-filled from your documents."
            : "Documents received; no fields could be extracted (try clearer scans or check API key).",
          appliedSomething ? "success" : "info"
        );
      }
    } catch {
      showToast("Could not analyze documents. Is the API running?", "error");
    } finally {
      setDocExtractBusy(false);
    }
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

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const response = await apiClient.post(
        "/users/login/",
        { email: loginEmail, password: loginPassword },
        { validateStatus: () => true }
      );
      if (response.status < 200 || response.status >= 300) {
        showToast(
          readErrorDetailFromResponseLike(response.data, response.statusText),
          "error"
        );
        return;
      }
      const data = response.data as {
        access_token: string;
        role: string;
        id: string | number;
      };
      useAuthStore
        .getState()
        .setAuth(data.access_token, data.role, String(data.id));
      showToast("Successfully logged in! Welcome back.", "success");
      if (data.role === UserRole.CANDIDATE) {
        navigate("dashboard-candidate-home");
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
          ? "/users/candidates/"
          : "/users/recruiters/";

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

      const response = await apiClient.post(endpoint, formData, {
        validateStatus: () => true,
      });

      if (response.status < 200 || response.status >= 300) {
        showToast(
          readErrorDetailFromResponseLike(response.data, response.statusText),
          "error"
        );
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
    <div
      className="min-h-[80vh] flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-bg-page"
      dir={isRtl ? "rtl" : "ltr"}
    >
      
      {/* Language & View Toggle Controls */}
      <div className="w-full max-w-xl flex justify-between items-center mb-8">
        <div className="flex bg-white p-1 rounded-xl border border-border shadow-sm">
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
                  : "text-gray-500 hover:text-gray-900"
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
          <div className="bg-white text-gray-900 p-8 sm:p-10 rounded-[2.5rem] shadow-lg border border-border animate-in fade-in slide-in-from-bottom-6">
            <h1
              tabIndex={-1}
              ref={headingRef}
              className="text-4xl font-black mb-2 text-gray-900 outline-none text-left"
            >
              {t.welcome}
            </h1>
            <p className="text-gray-500 mb-10 text-left">
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

              <Button
                type="submit"
                className="w-full py-4 text-lg bg-primary text-white hover:bg-primary-dark"
                disabled={isLoading}
              >
                <LogIn size={22} /> {isLoading ? "…" : t.signIn}
              </Button>

              <div className="relative py-2 flex items-center">
                <div className="flex-grow border-t border-gray-200"></div>
                <span className="flex-shrink mx-4 text-gray-500 text-sm font-bold uppercase tracking-widest">
                  {t.or}
                </span>
                <div className="flex-grow border-t border-gray-200"></div>
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
          <div className="bg-white text-gray-900 p-8 sm:p-10 rounded-[2.5rem] shadow-lg border border-border transition-all duration-500 animate-in fade-in slide-in-from-right-6">
            <ProgressBar current={step} total={totalSteps} />

            <div className="mb-10 text-left">
              <h2
                tabIndex={-1}
                ref={headingRef}
                className="text-3xl font-black text-gray-900 outline-none mb-2"
              >
                {role === UserRole.CANDIDATE ? (
                  <>
                    {step === 1 && t.accountType}
                    {step === 2 && t.smartStart}
                    {step === 3 && t.basicInfo}
                    {step === 4 && t.medicalProfile}
                    {step === 5 && t.professionalExp}
                    {step === 6 && t.almostThere}
                  </>
                ) : (
                  <>
                    {step === 1 && t.basicInfo}
                    {step === 2 && t.companyInfra}
                    {step === 3 && t.instCommit}
                  </>
                )}
              </h2>
              <p className="text-gray-500">
                {role === UserRole.CANDIDATE ? (
                  <>
                    {step === 1 && t.accountTypeHint}
                    {step === 2 && t.smartStartDesc}
                    {step === 3 &&
                      (lang === Language.AR
                        ? "أخبرنا من أنت لتخصيص تجربتك."
                        : lang === Language.FR
                          ? "Dites-nous qui vous êtes pour personnaliser votre expérience."
                          : "Tell us who you are to personalize your experience.")}
                    {step === 4 &&
                      (lang === Language.AR
                        ? "ساعدنا في فهم احتياجات مكان العمل الخاصة بك."
                        : "Help us understand your workplace needs.")}
                    {step === 5 &&
                      (lang === Language.AR
                        ? "أكمل ملفك الشخصي لمطابقة أفضل."
                        : "Finalize your profile for better matching.")}
                    {step === 6 && t.almostThereDesc}
                  </>
                ) : (
                  <>
                    {step === 1 &&
                      (lang === Language.AR
                        ? "أخبرنا من أنت لتخصيص تجربتك."
                        : lang === Language.FR
                          ? "Dites-nous qui vous êtes pour personnaliser votre expérience."
                          : "Tell us who you are to personalize your experience.")}
                    {step === 2 &&
                      (lang === Language.AR
                        ? "أخبرنا عن إمكانية الوصول المادي والرقمي لديك."
                        : "Tell us about your physical and digital accessibility.")}
                    {step === 3 &&
                      (lang === Language.AR
                        ? "أكمل ملفك الشخصي لمطابقة أفضل."
                        : "Finalize your profile for better matching.")}
                  </>
                )}
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
                        ? "border-primary bg-primary/5 ring-4 ring-primary/20" 
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div
                      className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-3 ${
                        role === UserRole.CANDIDATE ? "bg-primary text-white" : "bg-gray-100 text-gray-400"
                      }`}
                    >
                      <UserPlus size={28} />
                    </div>
                    <span className="font-black text-sm">
                      {t.candidate}
                    </span>
                  </button>
                  <button
                    onClick={() => setRole(UserRole.COMPANY)}
                    aria-checked={role === UserRole.COMPANY}
                    role="radio"
                    className={`p-5 rounded-3xl border-2 transition-all text-center flex flex-col items-center justify-center ${
                      role === UserRole.COMPANY 
                        ? "border-primary bg-primary/5 ring-4 ring-primary/20" 
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div
                      className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-3 ${
                        role === UserRole.COMPANY ? "bg-primary text-white" : "bg-gray-100 text-gray-400"
                      }`}
                    >
                      <Building2 size={28} />
                    </div>
                    <span className="font-black text-sm">
                      {t.company}
                    </span>
                  </button>
                </div>

                {role === UserRole.COMPANY && (
                  <div className="space-y-4">
                    <Input
                      label={t.compName}
                      placeholder={t.placeholderComp}
                      autoComplete="organization"
                      value={companyData.company_name}
                      onChange={(e) =>
                        setCompanyData({ ...companyData, company_name: e.target.value })
                      }
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Input
                        label={t.email}
                        type="email"
                        placeholder={t.placeholderEmail}
                        autoComplete="email"
                        value={companyData.email}
                        onChange={(e) =>
                          setCompanyData({ ...companyData, email: e.target.value })
                        }
                      />
                      <Input
                        label={t.phone}
                        type="tel"
                        placeholder={t.placeholderPhone}
                        autoComplete="tel"
                        value={companyData.phone_number}
                        onChange={(e) =>
                          setCompanyData({
                            ...companyData,
                            phone_number: e.target.value,
                          })
                        }
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Input
                        label="Location"
                        placeholder="e.g., Tunis, Tunisia"
                        value={companyData.location}
                        onChange={(e) =>
                          setCompanyData({ ...companyData, location: e.target.value })
                        }
                      />
                      <Input
                        label="Founded Year"
                        type="number"
                        placeholder="e.g., 2010"
                        value={companyData.founded_year.toString()}
                        onChange={(e) =>
                          setCompanyData({
                            ...companyData,
                            founded_year: parseInt(e.target.value) || 0,
                          })
                        }
                      />
                    </div>

                    <Input
                      label={t.password}
                      type="password"
                      placeholder={t.placeholderPass}
                      value={companyData.password}
                      onChange={(e) =>
                        setCompanyData({ ...companyData, password: e.target.value })
                      }
                    />
                  </div>
                )}
              </div>
            )}

            {step === 2 && role === UserRole.CANDIDATE && (
              <div className="space-y-8 text-left">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <label className="block text-sm font-black text-gray-800">
                      {t.disabilityCardUpload}
                    </label>
                    <input
                      type="file"
                      id="disability-card-upload-step2"
                      className="hidden"
                      accept="image/*,.pdf"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const next = {
                            ...candidateFiles,
                            disability_card: file,
                          };
                          setCandidateFiles(next);
                          setDisabilityCardExtract(null);
                          void extractDocuments({
                            disability_card: file,
                            resume: next.resume ?? undefined,
                          });
                        }
                      }}
                    />
                    <label
                      htmlFor="disability-card-upload-step2"
                      className="block min-h-[160px] p-6 border-2 border-dashed border-primary/30 rounded-2xl bg-primary/5 text-center cursor-pointer hover:bg-primary/10 transition-all focus-within:ring-4 ring-primary/20 flex flex-col items-center justify-center"
                    >
                      <Upload className="text-primary mb-2" size={28} />
                      <span className="font-black text-sm text-primary-dark">
                        {candidateFiles.disability_card
                          ? candidateFiles.disability_card.name
                          : "PNG, JPG, or PDF"}
                      </span>
                    </label>
                  </div>
                  <div className="space-y-3">
                    <label className="block text-sm font-black text-gray-800">
                      {t.resumeUpload}
                    </label>
                    <input
                      type="file"
                      id="cv-upload-step2"
                      className="hidden"
                      accept=".pdf,application/pdf"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const next = { ...candidateFiles, resume: file };
                          setCandidateFiles(next);
                          if (
                            file.type === "text/plain" ||
                            file.name.toLowerCase().endsWith(".txt")
                          ) {
                            handleFileUpload(e);
                          } else if (file.name.toLowerCase().endsWith(".pdf")) {
                            void extractDocuments({
                              resume: file,
                              disability_card: next.disability_card ?? undefined,
                            });
                          }
                        }
                      }}
                    />
                    <label
                      htmlFor="cv-upload-step2"
                      className="block min-h-[160px] p-6 border-2 border-dashed border-primary/30 rounded-2xl bg-primary/5 text-center cursor-pointer hover:bg-primary/10 transition-all focus-within:ring-4 ring-primary/20 flex flex-col items-center justify-center"
                    >
                      <Upload className="text-primary mb-2" size={28} />
                      <span className="font-black text-sm text-primary-dark">
                        {candidateFiles.resume
                          ? candidateFiles.resume.name
                          : "PDF résumé"}
                      </span>
                      <span className="text-xs text-gray-500 mt-2 px-2">
                        {t.resumeDesc}
                      </span>
                    </label>
                  </div>
                </div>

                {docExtractBusy && (
                  <div className="relative overflow-hidden rounded-3xl bg-linear-to-br from-slate-900 via-indigo-950 to-slate-900 p-8 text-white shadow-2xl">
                    <div className="absolute top-0 right-0 w-40 h-40 bg-teal-500/20 rounded-full blur-3xl pointer-events-none" />
                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

                    <div className="relative z-10 flex flex-col items-center text-center">
                      <div className="relative w-24 h-24 mb-6">
                        <div className="absolute inset-0 rounded-full border-2 border-teal-400/30" style={{ animation: "spin 3s linear infinite" }} />
                        <div className="absolute inset-2 rounded-full border-2 border-indigo-400/40" style={{ animation: "spin 2s linear infinite reverse" }} />
                        <div className="absolute inset-4 rounded-full border-2 border-purple-400/50" style={{ animation: "spin 1.5s linear infinite" }} />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-10 h-10 rounded-full bg-linear-to-br from-teal-400 to-indigo-500 flex items-center justify-center shadow-lg" style={{ animation: "pulse 2s ease-in-out infinite" }}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
                            </svg>
                          </div>
                        </div>
                      </div>

                      <AiLoadingMessages />

                      <div className="flex gap-2 mt-4">
                        {[0, 150, 300].map((delay) => (
                          <div key={delay} className="w-2 h-2 rounded-full bg-teal-400" style={{ animation: "bounce 1s ease-in-out infinite", animationDelay: `${delay}ms` }} />
                        ))}
                      </div>
                    </div>

                    <style>{`
                      @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                      @keyframes pulse { 0%,100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.1); opacity: 0.8; } }
                      @keyframes bounce { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
                      @keyframes fadeMsg { 0%,100% { opacity: 0; transform: translateY(4px); } 15%,85% { opacity: 1; transform: translateY(0); } }
                    `}</style>
                  </div>
                )}

                <div className="rounded-3xl border border-teal-100 bg-linear-to-br from-teal-50/80 to-indigo-50/50 p-6">
                  {/* Header */}
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-9 h-9 rounded-xl bg-teal-500 flex items-center justify-center shadow-sm shrink-0">
                      <CheckCircle size={18} className="text-white" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 text-sm">Profile Auto-Filled</p>
                      <p className="text-xs text-slate-500">Extracted by Gemini AI • Review before continuing</p>
                    </div>
                    <div className="ml-auto bg-teal-100 text-teal-700 rounded-full px-3 py-1 text-xs font-bold shrink-0">✓ AI</div>
                  </div>

                  {/* Grid of extracted fields */}
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { icon: "👤", label: "Name", value: `${candidateData.first_name || ""} ${candidateData.last_name || ""}`.trim() },
                      { icon: "🎂", label: "Birth Date", value: candidateData.birth_date || "" },
                      { icon: "📧", label: "Email", value: candidateData.email || "" },
                      { icon: "📞", label: "Phone", value: candidateData.phone_number || "" },
                      { icon: "📍", label: "Address", value: candidateData.address || "" },
                      { icon: "🏭", label: "Industry", value: candidateData.industry || "" },
                      { icon: "🎓", label: "Education", value: isValidEducationLevel(candidateData.education_level) ? EDUCATION_LEVEL_LABELS[candidateData.education_level as EducationLevel] : "" },
                      { icon: "💼", label: "Job Title", value: candidateData.profile_title || "" },
                      { icon: "♿", label: "Disability", value: t.disabilities[candidateData.disability_type as HandicapType] ?? candidateData.disability_type ?? "" },
                      { icon: "📅", label: "Card Expiry", value: disabilityCardExtract?.expiry_date || "" },
                      { icon: "🪪", label: "Card No.", value: disabilityCardExtract?.card_number || "" },
                      { icon: "⚧", label: "Gender", value: genderFromResumeExtract && (candidateData.gender === "male" || candidateData.gender === "female") ? (candidateData.gender === "male" ? "Male" : "Female") : "" },
                    ].filter((f) => f.value && f.value.trim()).map((field) => (
                      <div key={field.label} className="bg-white/70 rounded-2xl p-3 border border-white">
                        <p className="text-xs text-slate-400 mb-1">{field.icon} {field.label}</p>
                        <p className="text-sm font-semibold text-slate-800 truncate">{field.value}</p>
                      </div>
                    ))}
                  </div>

                  {/* Skills preview */}
                  {(candidateData.key_skills?.length ?? 0) > 0 && (
                    <div className="mt-3 bg-white/70 rounded-2xl p-3 border border-white">
                      <p className="text-xs text-slate-400 mb-2">⚡ Skills extracted</p>
                      <div className="flex flex-wrap gap-1.5">
                        {candidateData.key_skills.slice(0, 8).map((skill, i) => (
                          <span key={i} className="bg-indigo-50 text-indigo-700 rounded-full px-2.5 py-0.5 text-xs font-medium">{skill}</span>
                        ))}
                        {candidateData.key_skills.length > 8 && (
                          <span className="bg-slate-100 text-slate-500 rounded-full px-2.5 py-0.5 text-xs font-medium">+{candidateData.key_skills.length - 8} more</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {step === 3 && role === UserRole.CANDIDATE && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="First Name"
                    placeholder="e.g., Alex"
                    autoComplete="given-name"
                    value={candidateData.first_name}
                    onChange={(e) =>
                      setCandidateData({
                        ...candidateData,
                        first_name: e.target.value,
                      })
                    }
                  />
                  <Input
                    label="Last Name"
                    placeholder="e.g., Johnson"
                    autoComplete="family-name"
                    value={candidateData.last_name}
                    onChange={(e) =>
                      setCandidateData({
                        ...candidateData,
                        last_name: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label={t.email}
                    type="email"
                    placeholder={t.placeholderEmail}
                    autoComplete="email"
                    value={candidateData.email}
                    onChange={(e) =>
                      setCandidateData({ ...candidateData, email: e.target.value })
                    }
                  />
                  <Input
                    label={t.phone}
                    type="tel"
                    placeholder={t.placeholderPhone}
                    autoComplete="tel"
                    value={candidateData.phone_number}
                    onChange={(e) =>
                      setCandidateData({
                        ...candidateData,
                        phone_number: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Birth Date"
                    type="date"
                    value={candidateData.birth_date}
                    onChange={(e) =>
                      setCandidateData({
                        ...candidateData,
                        birth_date: e.target.value,
                      })
                    }
                  />
                  <div className="space-y-1">
                    <label className="block text-sm font-bold text-gray-700">
                      Gender
                    </label>
                    <select
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-primary/20 focus:border-primary transition-all outline-none bg-white"
                      value={candidateData.gender}
                      onChange={(e) =>
                        setCandidateData({ ...candidateData, gender: e.target.value })
                      }
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
                  onChange={(e) =>
                    setCandidateData({ ...candidateData, address: e.target.value })
                  }
                />
                <Input
                  label={t.password}
                  type="password"
                  placeholder={t.placeholderPass}
                  value={candidateData.password}
                  onChange={(e) =>
                    setCandidateData({ ...candidateData, password: e.target.value })
                  }
                />
              </div>
            )}

            {step === 4 && role === UserRole.CANDIDATE && (
              <div className="space-y-6 text-left">
                <div>
                  <label className="block text-sm font-black text-gray-700 mb-4">
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
                            : "border-gray-200 text-gray-600 hover:border-primary/30"
                        }`}
                      >
                        <div
                          className={`w-3 h-3 rounded-full ${
                            candidateData.disability_type === type ? "bg-white" : "bg-gray-300"
                          }`}
                        ></div>
                        {t.disabilities[type]}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-6 border-t border-gray-100">
                  <label className="block text-sm font-black text-gray-700 mb-1">{t.accommodations}</label>
                  <p className="text-xs text-slate-500 mb-4">Select all that apply — you can update these later</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {ACCOMMODATIONS.map((item) => {
                      const selected = candidateData.work_accommodations.includes(item.label);
                      return (
                        <button
                          key={item.label}
                          type="button"
                          onClick={() => {
                            if (selected) {
                              setCandidateData({ ...candidateData, work_accommodations: candidateData.work_accommodations.filter((a) => a !== item.label) });
                            } else {
                              setCandidateData({ ...candidateData, work_accommodations: [...candidateData.work_accommodations, item.label] });
                            }
                          }}
                          className={`relative flex flex-col items-start gap-1 p-3.5 rounded-2xl border-2 text-left transition-all duration-150 cursor-pointer ${
                            selected
                              ? "bg-teal-500 border-teal-500 text-white shadow-md shadow-teal-500/25 scale-[1.02]"
                              : "bg-white border-gray-100 hover:border-teal-300 hover:bg-teal-50/50 text-gray-700"
                          }`}
                        >
                          <span className="text-xl leading-none">{item.icon}</span>
                          <span className={`text-xs font-bold leading-tight ${selected ? "text-white" : "text-slate-800"}`}>{item.label}</span>
                          <span className={`text-xs leading-tight ${selected ? "text-white/75" : "text-slate-400"}`}>{item.desc}</span>
                          {selected && (
                            <span className="absolute top-2 right-2 w-4 h-4 bg-white rounded-full flex items-center justify-center">
                              <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="#0d9488" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  {candidateData.work_accommodations.length > 0 && (
                    <p className="mt-3 text-xs text-teal-600 font-semibold">
                      ✓ {candidateData.work_accommodations.length} accommodation{candidateData.work_accommodations.length > 1 ? "s" : ""} selected
                    </p>
                  )}
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

            {step === 5 && role === UserRole.CANDIDATE && (
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
                    <label className="block text-sm font-bold text-gray-700">
                      Education Level
                    </label>
                    <select 
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-primary/20 focus:border-primary transition-all outline-none bg-white"
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
                    <label className="block text-sm font-bold text-gray-700">
                      Work Preference
                    </label>
                    <select 
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-primary/20 focus:border-primary transition-all outline-none bg-white"
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
                    <label className="block text-sm font-bold text-gray-700">
                      Availability Status
                    </label>
                    <select 
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-primary/20 focus:border-primary transition-all outline-none bg-white"
                      value={candidateData.availability_status}
                      onChange={(e) => setCandidateData({...candidateData, availability_status: e.target.value})}
                    >
                      <option value="actively_looking">Actively Looking</option>
                      <option value="unavailable">Unavailable</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-black text-gray-700 mb-2">Key Skills</label>

                  {candidateData.key_skills.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3 p-3 bg-slate-50 rounded-2xl border border-slate-100 min-h-12">
                      {candidateData.key_skills.filter((s) => s).map((skill, idx) => (
                        <span key={idx} className="inline-flex items-center gap-1.5 bg-white border border-indigo-100 text-indigo-700 rounded-full pl-3 pr-1.5 py-1 text-xs font-semibold shadow-sm">
                          {skill}
                          <button
                            type="button"
                            onClick={() => setCandidateData({ ...candidateData, key_skills: candidateData.key_skills.filter((_, i) => i !== idx) })}
                            className="w-4 h-4 rounded-full bg-indigo-100 hover:bg-red-100 hover:text-red-600 flex items-center justify-center transition-colors text-indigo-400"
                            aria-label={`Remove ${skill}`}
                          >
                            <svg width="8" height="8" viewBox="0 0 12 12" fill="none"><path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                          </button>
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <input
                      type="text"
                      className="flex-1 px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none bg-white text-sm"
                      placeholder="Type a skill and press Enter or +"
                      value={skillInput}
                      onChange={(e) => setSkillInput(e.target.value)}
                      onKeyDown={(e) => {
                        if ((e.key === "Enter" || e.key === ",") && skillInput.trim()) {
                          e.preventDefault();
                          const newSkill = skillInput.trim().replace(/,$/, "");
                          if (newSkill && !candidateData.key_skills.includes(newSkill)) {
                            setCandidateData({ ...candidateData, key_skills: [...candidateData.key_skills, newSkill] });
                          }
                          setSkillInput("");
                        }
                        if (e.key === "Backspace" && !skillInput && candidateData.key_skills.length > 0) {
                          setCandidateData({ ...candidateData, key_skills: candidateData.key_skills.slice(0, -1) });
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const newSkill = skillInput.trim();
                        if (newSkill && !candidateData.key_skills.includes(newSkill)) {
                          setCandidateData({ ...candidateData, key_skills: [...candidateData.key_skills, newSkill] });
                        }
                        setSkillInput("");
                      }}
                      className="w-10 h-10 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center transition-colors font-bold text-lg"
                    >+</button>
                  </div>
                  <p className="text-xs text-slate-400 mt-1.5">Press Enter or comma to add • Backspace to remove last</p>
                </div>
              </div>
            )}

            {step === 6 && role === UserRole.CANDIDATE && (
              <div className="space-y-8 text-left">
                <div>
                  <label className="block text-sm font-black text-gray-700 mb-2">
                    Accessibility Needs
                  </label>
                  <textarea
                    className="w-full px-5 py-4 border-2 border-gray-200 rounded-3xl focus:ring-4 focus:ring-primary/20 focus:border-primary transition-all outline-none bg-white min-h-30"
                    placeholder="Describe any specific accommodations you need..."
                    value={candidateData.accessibility_needs}
                    onChange={(e) =>
                      setCandidateData({
                        ...candidateData,
                        accessibility_needs: e.target.value,
                      })
                    }
                  ></textarea>
                </div>

                <div className="relative group max-w-md">
                  <input
                    type="file"
                    id="profile-pic-upload"
                    className="hidden"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setCandidateFiles({ ...candidateFiles, logo: file });
                      }
                    }}
                  />
                  <label
                    htmlFor="profile-pic-upload"
                    className="block p-8 border-2 border-dashed border-primary/30 rounded-4xl bg-primary/5 text-center cursor-pointer hover:bg-primary/10 hover:border-primary/50 transition-all focus-within:ring-4 ring-primary/20"
                  >
                    <div className="w-16 h-16 bg-white rounded-3xl shadow-lg flex items-center justify-center mx-auto mb-4 text-primary group-hover:rotate-6 transition-transform">
                      <Upload size={32} />
                    </div>
                    <span className="block font-black text-lg text-primary-dark mb-1">
                      {candidateFiles.logo
                        ? candidateFiles.logo.name
                        : "Profile Picture"}
                    </span>
                    <span className="text-xs text-primary/70">
                      PNG, JPG up to 5MB
                    </span>
                  </label>
                </div>

                {(candidateFiles.resume || candidateFiles.disability_card) && (
                  <div className="rounded-xl border border-gray-200 bg-gray-50/80 px-4 py-3 text-xs text-gray-600 space-y-1">
                    <p className="font-bold text-gray-700">
                      Documents for your account
                    </p>
                    {candidateFiles.disability_card && (
                      <p>Disability card: {candidateFiles.disability_card.name}</p>
                    )}
                    {candidateFiles.resume && (
                      <p>Résumé: {candidateFiles.resume.name}</p>
                    )}
                    <p className="text-gray-500 pt-1">
                      Go back to step 2 if you need to replace a file.
                    </p>
                  </div>
                )}

                <div aria-live="polite" className="min-h-20">
                  <div className="space-y-3">
                    <label className="block text-sm font-black text-gray-700">{t.extractedSkills}</label>

                    {candidateData.key_skills.length > 0 ? (
                      <div className="flex flex-wrap gap-2 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                        {candidateData.key_skills.filter((s) => s).map((skill, idx) => (
                          <span key={idx} className="inline-flex items-center gap-1.5 bg-white border border-indigo-100 text-indigo-700 rounded-full pl-3 pr-1.5 py-1 text-xs font-semibold shadow-sm">
                            {skill}
                            <button
                              type="button"
                              onClick={() => setCandidateData({ ...candidateData, key_skills: candidateData.key_skills.filter((_, i) => i !== idx) })}
                              className="w-4 h-4 rounded-full bg-indigo-100 hover:bg-red-100 hover:text-red-600 flex items-center justify-center transition-colors text-indigo-400"
                              aria-label={`Remove ${skill}`}
                            >
                              <svg width="8" height="8" viewBox="0 0 12 12" fill="none"><path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                            </button>
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-400 italic text-sm py-2">{t.uploadPrompt}</p>
                    )}

                    <div className="flex gap-2">
                      <input
                        type="text"
                        className="flex-1 px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none bg-white text-sm"
                        placeholder="Add a missing skill..."
                        value={skillInput}
                        onChange={(e) => setSkillInput(e.target.value)}
                        onKeyDown={(e) => {
                          if ((e.key === "Enter" || e.key === ",") && skillInput.trim()) {
                            e.preventDefault();
                            const newSkill = skillInput.trim().replace(/,$/, "");
                            if (newSkill && !candidateData.key_skills.includes(newSkill)) {
                              setCandidateData({ ...candidateData, key_skills: [...candidateData.key_skills, newSkill] });
                            }
                            setSkillInput("");
                          }
                          if (e.key === "Backspace" && !skillInput && candidateData.key_skills.length > 0) {
                            setCandidateData({ ...candidateData, key_skills: candidateData.key_skills.slice(0, -1) });
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const newSkill = skillInput.trim();
                          if (newSkill && !candidateData.key_skills.includes(newSkill)) {
                            setCandidateData({ ...candidateData, key_skills: [...candidateData.key_skills, newSkill] });
                          }
                          setSkillInput("");
                        }}
                        className="w-10 h-10 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center transition-colors font-bold text-lg"
                      >+</button>
                    </div>
                    <p className="text-xs text-slate-400">Press Enter or comma to add • Backspace to remove last</p>
                  </div>
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
                  <label className="block text-sm font-black text-gray-700">
                    Tell us more about your inclusion strategy
                  </label>
                  <textarea
                    className="w-full px-5 py-4 border-2 border-gray-200 rounded-3xl outline-none bg-white min-h-25 focus:ring-4 focus:ring-primary/20 focus:border-primary transition-all"
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
                    className="block p-8 border-2 border-dashed border-primary/30 rounded-4xl bg-primary/5 text-center cursor-pointer hover:bg-primary/10 hover:border-primary/50 transition-all focus-within:ring-4 ring-primary/20"
                  >
                    <div className="w-16 h-16 bg-white rounded-3xl shadow-lg flex items-center justify-center mx-auto mb-4 text-primary group-hover:rotate-6 transition-transform">
                      <Upload size={32} />
                    </div>
                    <span className="block font-black text-lg text-primary-dark mb-1">
                      {companyFiles.logo ? companyFiles.logo.name : "Upload Company Logo"}
                    </span>
                    <span className="text-xs text-primary/70">
                      PNG, JPG up to 5MB
                    </span>
                  </label>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between mt-12 pt-10 border-t border-gray-200">
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
