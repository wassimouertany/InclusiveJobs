import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  Building,
  Briefcase,
  Users,
  Search,
  PlusCircle,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Star,
  Filter,
  Eye,
  ChevronLeft,
} from "lucide-react";
import { Button, Input } from './UI';
import { useToast } from '../context/ToastContext';

export default function RecruiterDashboard() {
  const [activeTab, setActiveTab] = useState("jobs");
  const [isCreatingJob, setIsCreatingJob] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const { showToast } = useToast();

  const renderProfile = () => (
    <div className="space-y-8">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Company Profile</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input label="Company Name" defaultValue="TechCorp Inc." />
          <Input label="Industry Sector" defaultValue="Technology" />
          <Input label="Location" defaultValue="Tunis, Tunisia" />
          <Input label="Website" defaultValue="https://techcorp.com" />
        </div>
        <div className="mt-6 space-y-2">
          <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">Company Presentation</label>
          <textarea 
            className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 dark:text-white min-h-[120px] focus:border-primary outline-none"
            defaultValue="We are a leading technology company committed to inclusive hiring and building diverse teams."
          />
        </div>
        <Button className="mt-6" onClick={() => showToast('Company profile updated', 'success')}>Save Changes</Button>
      </div>
    </div>
  );

  const renderJobs = () => {
    if (isCreatingJob) {
      return (
        <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm animate-in fade-in zoom-in-95 duration-200">
          <button onClick={() => setIsCreatingJob(false)} className="text-primary font-bold flex items-center gap-2 mb-6 hover:underline">
            <ChevronLeft size={20} /> Back to jobs
          </button>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Create New Job Offer</h3>
          <div className="space-y-6">
            <Input label="Job Title" placeholder="e.g., Senior Frontend Developer" />
            <div className="space-y-2">
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">Mission Description</label>
              <textarea className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 dark:text-white min-h-[100px] focus:border-primary outline-none" />
            </div>
            <Input label="Required Skills" placeholder="e.g., React, Node.js (comma separated)" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input label="Working Conditions" placeholder="e.g., Remote, Hybrid" />
              <Input label="Contract Type" placeholder="e.g., Full-time, Part-time" />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">Possible Accommodations / Constraints</label>
              <textarea className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 dark:text-white min-h-[100px] focus:border-primary outline-none" placeholder="Describe any physical constraints of the job or accommodations you can provide (e.g., Screen reader software available, Wheelchair accessible office)." />
            </div>
            <div className="flex justify-end gap-4 mt-8">
              <Button variant="outline" onClick={() => setIsCreatingJob(false)}>Cancel</Button>
              <Button onClick={() => { showToast('Job offer published!', 'success'); setIsCreatingJob(false); }}>Publish Offer</Button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">Manage Job Offers</h3>
          <Button className="flex items-center gap-2" onClick={() => setIsCreatingJob(true)}><PlusCircle size={20} /> Create New Offer</Button>
        </div>

        <div className="grid gap-4">
          {[
            { title: "Senior Frontend Developer", status: "Active", applicants: 12 },
            { title: "UX/UI Designer", status: "Draft", applicants: 0 },
            { title: "Product Manager", status: "Closed", applicants: 45 },
          ].map((job, i) => (
            <div key={i} className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex justify-between items-center">
              <div>
                <h4 className="font-bold text-lg text-gray-900 dark:text-white">{job.title}</h4>
                <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mt-2">
                  <span className={`px-2 py-1 rounded-md text-xs font-bold ${
                    job.status === 'Active' ? 'bg-green-100 text-green-700' : 
                    job.status === 'Draft' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-700'
                  }`}>{job.status}</span>
                  <span className="flex items-center gap-1"><Users size={16} /> {job.applicants} Applicants</span>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="p-2"><Edit size={18} /></Button>
                <Button variant="outline" className="p-2 text-red-500 hover:bg-red-50 border-red-200"><Trash2 size={18} /></Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderMatches = () => {
    if (selectedMatch) {
      return (
        <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm animate-in fade-in zoom-in-95 duration-200">
          <button onClick={() => setSelectedMatch(null)} className="text-primary font-bold flex items-center gap-2 mb-6 hover:underline">
            <ChevronLeft size={20} /> Back to matches
          </button>
          
          <div className="flex items-start gap-6 mb-8">
            <div className="w-24 h-24 rounded-full border-4 border-primary/20 flex items-center justify-center text-3xl font-bold text-primary bg-primary/5">
              {selectedMatch.score}%
            </div>
            <div>
              <h2 className="text-3xl font-black text-gray-900 dark:text-white">{selectedMatch.name}</h2>
              <p className="text-lg text-gray-500 dark:text-gray-400">{selectedMatch.role}</p>
              <div className="flex gap-2 mt-3">
                {selectedMatch.accessible && <span className="px-3 py-1 bg-green-100 text-green-700 rounded-lg text-sm font-bold flex items-center gap-1"><CheckCircle size={16} /> Accommodations Match</span>}
                {!selectedMatch.accessible && <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-lg text-sm font-bold flex items-center gap-1"><XCircle size={16} /> Needs Review</span>}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-primary/5 border border-primary/20 p-6 rounded-xl">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2"><Star size={20} className="text-primary" /> AI Analysis</h3>
              <p className="text-gray-700 dark:text-gray-300">
                {selectedMatch.name} is a strong fit for the Frontend Developer role. Their skills in React and TypeScript align perfectly with your requirements. 
                {selectedMatch.accessible 
                  ? " Furthermore, your company's remote work policy and flexible hours perfectly accommodate their needs." 
                  : " However, they require screen reader software which is not currently listed in your provided accommodations. Please review if this can be arranged."}
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-bold text-gray-900 dark:text-white mb-2">Matched Skills</h4>
                <div className="flex flex-wrap gap-2">
                  <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-md text-sm font-medium">React</span>
                  <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-md text-sm font-medium">TypeScript</span>
                  <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-md text-sm font-medium">Tailwind CSS</span>
                </div>
              </div>
              <div>
                <h4 className="font-bold text-gray-900 dark:text-white mb-2">Accessibility Needs</h4>
                <ul className="list-disc pl-5 text-gray-700 dark:text-gray-300">
                  {selectedMatch.accessible ? (
                    <>
                      <li>Remote Work (Supported)</li>
                      <li>Flexible Hours (Supported)</li>
                    </>
                  ) : (
                    <>
                      <li>Screen Reader Software (Review Needed)</li>
                      <li>Remote Work (Supported)</li>
                    </>
                  )}
                </ul>
              </div>
            </div>
            
            <div className="flex justify-end gap-4 mt-8 pt-6 border-t border-gray-100 dark:border-gray-700">
              <Button variant="outline">Reject</Button>
              <Button onClick={() => showToast('Interview invitation sent!', 'success')}>Invite to Interview</Button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">AI Candidate Matches</h3>
          <select className="px-4 py-2 border-2 border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 dark:text-white outline-none">
            <option>All Jobs</option>
            <option>Senior Frontend Developer</option>
            <option>UX/UI Designer</option>
          </select>
        </div>

        <div className="grid gap-4">
          {[
            { name: "Alex Johnson", role: "Frontend Developer", score: 95, accessible: true },
            { name: "Sarah Smith", role: "React Developer", score: 88, accessible: true },
            { name: "Mike Brown", role: "UI Engineer", score: 76, accessible: false },
          ].map((candidate, i) => (
            <div key={i} className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex justify-between items-center">
              <div className="flex items-center gap-6">
                <div className="relative">
                  <div className="w-16 h-16 rounded-full border-4 border-primary/20 flex items-center justify-center text-xl font-bold text-primary">
                    {candidate.score}%
                  </div>
                </div>
                <div>
                  <h4 className="font-bold text-lg text-gray-900 dark:text-white">{candidate.name}</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{candidate.role}</p>
                  <div className="flex gap-2 mt-2">
                    {candidate.accessible && <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-md text-xs font-bold flex items-center gap-1"><CheckCircle size={12} /> Needs Met</span>}
                    <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-md text-xs font-bold">React, TS</span>
                  </div>
                </div>
              </div>
              <Button variant="outline" className="flex items-center gap-2" onClick={() => setSelectedMatch(candidate)}><Eye size={16} /> View AI Analysis</Button>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderSearch = () => (
    <div className="space-y-6">
      <div className="flex gap-4">
        <div className="flex-grow relative">
          <Search className="absolute left-4 top-3.5 text-gray-400" size={20} />
          <input 
            type="text" 
            placeholder="Search candidates by skills, experience, or keywords..." 
            className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 dark:text-white focus:border-primary outline-none"
          />
        </div>
        <Button variant="outline" className="flex items-center gap-2"><Filter size={20} /> Filters</Button>
      </div>

      <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm text-center">
        <Users className="mx-auto text-gray-400 mb-4" size={48} />
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Global Talent Pool</h3>
        <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">Use the search bar above to find specific profiles across our entire database of inclusive talent.</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-4 gap-8">
          
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 sticky top-24">
              <div className="flex items-center space-x-4 mb-8">
                <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center text-white font-bold text-xl">
                  TC
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white">TechCorp</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Recruiter Account</p>
                </div>
              </div>
              
              <nav className="space-y-2">
                <button 
                  onClick={() => setActiveTab('jobs')}
                  className={`w-full flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === 'jobs' ? 'bg-primary text-white shadow-md' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                >
                  <Briefcase className="w-5 h-5 mr-3" /> Manage Offers
                </button>
                <button 
                  onClick={() => setActiveTab('matches')}
                  className={`w-full flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === 'matches' ? 'bg-primary text-white shadow-md' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                >
                  <Star className="w-5 h-5 mr-3" /> AI Matches
                </button>
                <button 
                  onClick={() => setActiveTab('search')}
                  className={`w-full flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === 'search' ? 'bg-primary text-white shadow-md' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                >
                  <Search className="w-5 h-5 mr-3" /> Global Search
                </button>
                <button 
                  onClick={() => setActiveTab('profile')}
                  className={`w-full flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === 'profile' ? 'bg-primary text-white shadow-md' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                >
                  <Building className="w-5 h-5 mr-3" /> Company Profile
                </button>
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <motion.div
              key={activeTab + (isCreatingJob ? '-create' : '') + (selectedMatch ? '-match' : '')}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'profile' && renderProfile()}
              {activeTab === 'jobs' && renderJobs()}
              {activeTab === 'matches' && renderMatches()}
              {activeTab === 'search' && renderSearch()}
            </motion.div>
          </div>

        </div>
      </div>
    </div>
  );
}