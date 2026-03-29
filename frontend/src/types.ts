export type Page = 'landing' | 'login' | 'find-jobs' | 'employers' | 'dashboard';

export interface User {
  name: string;
  role: 'candidate' | 'employer';
}
