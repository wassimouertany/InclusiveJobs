export type Page =
  | "landing"
  | "login"
  | "find-jobs"
  | "employers"
  | "dashboard"
  | "dashboard-recruiter"
  | "dashboard-candidate";

export interface User {
  name: string;
  role: 'candidate' | 'employer';
}

export enum UserRole {
  CANDIDATE = 'CANDIDATE',
  COMPANY = 'RECRUITER',
  ADMIN = 'ADMIN'
}

export enum Gender {
  MALE = "male",
  FEMALE = "female"
}

export enum EducationLevel {
  NO_DEGREE = "no_degree",
  VOCATIONAL_TRAINING = "vocational_training",
  HIGH_SCHOOL = "high_school",
  BACHELORS = "bachelors",
  MASTERS = "masters",
  ENGINEERING_DEGREE = "engineering_degree",
  DOCTORATE = "doctorate",
  OTHER = "other"
}

export enum HandicapType {
  MOTOR = "motor",
  VISUAL = "visual",
  HEARING = "hearing",
  COGNITIVE = "cognitive",
  PSYCHOLOGICAL = "psychological",
  OTHER = "other"
}

export enum WorkPreference {
  FULLY_REMOTE = "fully_remote",
  HYBRID = "hybrid",
  ON_SITE = "on_site",
  FLEXIBLE_HOURS = "flexible_hours",
  PART_TIME = "part_time"
}

export enum AvailabilityStatus {
  ACTIVELY_LOOKING = "actively_looking",
  UNAVAILABLE = "unavailable"
}

export enum ContractType {
  PERMANENT = "permanent",
  FIXED_TERM = "fixed_term",
  CIVP = "civp",
  KARAMA = "karama",
  INTERNSHIP = "internship"
}

export enum OfferStatus {
  OPEN = "open",
  CLOSED = "closed",
  ARCHIVED = "archived"
}

export enum Language {
  EN = 'en',
  FR = 'fr',
  AR = 'ar'
}

export type AppView = 'LOGIN' | 'REGISTER';
