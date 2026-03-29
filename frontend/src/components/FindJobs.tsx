import { useState } from 'react';
import { Search, MapPin, Filter, Building2, Clock, Star, ChevronDown, CheckCircle2 } from 'lucide-react';
import { motion } from 'motion/react';
import { useToast } from '../context/ToastContext';

const jobsData = [
  {
    id: 1,
    title: "Senior Frontend Developer",
    company: "TechTunisia",
    location: "Tunis (Hybrid)",
    type: "Full-time",
    salary: "3.5k - 5k TND",
    tags: ["Visual Impairment Friendly", "Screen Reader Optimized"],
    matchScore: 98,
    posted: "2 days ago",
    logo: "bg-blue-600"
  },
  {
    id: 2,
    title: "Customer Success Specialist",
    company: "Orange",
    location: "Remote",
    type: "Contract",
    salary: "2k - 3k TND",
    tags: ["Wheelchair Accessible", "Flexible Hours"],
    matchScore: 92,
    posted: "5 hours ago",
    logo: "bg-orange-500"
  },
  {
    id: 3,
    title: "Data Analyst",
    company: "Instadeep",
    location: "Sfax",
    type: "Full-time",
    salary: "4k - 6k TND",
    tags: ["Neurodiverse Friendly", "Quiet Workspace"],
    matchScore: 89,
    posted: "1 day ago",
    logo: "bg-purple-600"
  },
  {
    id: 4,
    title: "Graphic Designer",
    company: "Vermeg",
    location: "Tunis",
    type: "Part-time",
    salary: "1.5k - 2.5k TND",
    tags: ["Deaf/HoH Friendly", "Written Communication"],
    matchScore: 85,
    posted: "3 days ago",
    logo: "bg-red-600"
  },
  {
    id: 5,
    title: "HR Assistant",
    company: "Sopra HR",
    location: "Ariana",
    type: "Internship",
    salary: "800 TND",
    tags: ["Mobility Aid", "Accessible Office"],
    matchScore: 95,
    posted: "Just now",
    logo: "bg-green-600"
  }
];

const filters = [
  { name: "Job Type", options: ["Full-time", "Part-time", "Contract", "Internship"] },
  { name: "Accessibility", options: ["Visual Aid", "Hearing Aid", "Wheelchair Access", "Neurodiverse Friendly"] },
  { name: "Location", options: ["Remote", "Tunis", "Sfax", "Sousse", "Ariana"] },
];

export default function FindJobs() {
  const [selectedJob, setSelectedJob] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [locationQuery, setLocationQuery] = useState('');
  const { showToast } = useToast();

  const filteredJobs = jobsData.filter(job => {
    const matchesSearch = job.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          job.company.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesLocation = job.location.toLowerCase().includes(locationQuery.toLowerCase());
    return matchesSearch && matchesLocation;
  });

  const handleApply = (e: React.MouseEvent) => {
    e.stopPropagation();
    showToast("Application submitted successfully!", "success");
  };

  return (
    <div className="min-h-screen bg-bg-page pb-20">
      {/* Header Search Section */}
      <div className="bg-white border-b border-border sticky top-20 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-grow relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input 
                type="text" 
                placeholder="Search by job title, skill, or company..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
              />
            </div>
            <div className="flex-grow-0 md:w-1/3 relative">
              <MapPin className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input 
                type="text" 
                placeholder="Location (e.g., Tunis)" 
                value={locationQuery}
                onChange={(e) => setLocationQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
              />
            </div>
            <button 
              onClick={() => showToast(`Found ${filteredJobs.length} jobs matching your criteria`, 'info')}
              className="bg-primary text-white px-8 py-3.5 rounded-xl font-semibold hover:bg-primary-dark transition-colors shadow-lg shadow-primary/20 flex items-center justify-center active:scale-95"
            >
              Search Jobs
            </button>
          </div>
          
          {/* Quick Filters */}
          <div className="flex gap-2 mt-4 overflow-x-auto pb-2 scrollbar-hide">
            <button className="flex items-center px-4 py-2 bg-primary/10 text-primary rounded-full text-sm font-medium border border-primary/20 whitespace-nowrap">
              <Filter className="w-4 h-4 mr-2" />
              All Filters
            </button>
            {["Remote", "Full-time", "Visual Impairment Friendly", "Tech"].map((f, i) => (
              <button key={i} className="px-4 py-2 bg-white border border-gray-200 text-text-secondary rounded-full text-sm font-medium hover:border-primary hover:text-primary transition-colors whitespace-nowrap">
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-4 gap-8">
          
          {/* Sidebar Filters (Desktop) */}
          <div className="hidden lg:block space-y-8">
            <div className="bg-white p-6 rounded-2xl border border-border shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-lg">Filters</h3>
                <button className="text-sm text-primary hover:underline">Clear all</button>
              </div>
              
              {filters.map((category, idx) => (
                <div key={idx} className="mb-6 last:mb-0">
                  <h4 className="font-semibold text-sm text-text-primary mb-3 flex justify-between cursor-pointer">
                    {category.name}
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  </h4>
                  <div className="space-y-2">
                    {category.options.map((opt, i) => (
                      <label key={i} className="flex items-center space-x-3 cursor-pointer group">
                        <div className="relative flex items-center">
                          <input type="checkbox" className="peer h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary/20" />
                        </div>
                        <span className="text-sm text-text-secondary group-hover:text-text-primary transition-colors">{opt}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-gradient-to-br from-primary to-primary-dark p-6 rounded-2xl text-white shadow-lg">
              <h3 className="font-bold text-lg mb-2">Need help applying?</h3>
              <p className="text-white/80 text-sm mb-4">Our accessibility experts can review your profile.</p>
              <button className="w-full py-2 bg-white text-primary rounded-lg font-medium text-sm hover:bg-gray-50 transition-colors">
                Get Support
              </button>
            </div>
          </div>

          {/* Job List */}
          <div className="lg:col-span-3 space-y-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-bold text-xl text-text-primary">
                {filteredJobs.length} <span className="text-text-secondary font-normal">Jobs Found</span>
              </h2>
              <div className="flex items-center text-sm text-text-secondary">
                Sort by: <span className="font-medium text-text-primary ml-1 cursor-pointer">Relevance</span>
                <ChevronDown className="w-4 h-4 ml-1" />
              </div>
            </div>

            {filteredJobs.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-2xl border border-border">
                <p className="text-text-secondary text-lg">No jobs found matching your criteria.</p>
                <button 
                  onClick={() => {setSearchQuery(''); setLocationQuery('');}}
                  className="mt-4 text-primary font-medium hover:underline"
                >
                  Clear filters
                </button>
              </div>
            ) : (
              filteredJobs.map((job, index) => (
                <motion.div
                  key={job.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  onClick={() => setSelectedJob(selectedJob === job.id ? null : job.id)}
                  className={`bg-white rounded-2xl p-6 border transition-all cursor-pointer group hover:shadow-md ${
                    selectedJob === job.id ? 'border-primary ring-1 ring-primary shadow-md' : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div className="flex flex-col md:flex-row gap-4 md:items-start">
                    {/* Logo */}
                    <div className={`w-14 h-14 ${job.logo} rounded-xl flex items-center justify-center text-white font-bold text-xl flex-shrink-0 shadow-sm`}>
                      {job.company.charAt(0)}
                    </div>

                    {/* Content */}
                    <div className="flex-grow">
                      <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-2">
                        <div>
                          <h3 className="text-lg font-bold text-text-primary group-hover:text-primary transition-colors">
                            {job.title}
                          </h3>
                          <div className="flex items-center text-sm text-text-secondary mt-1 gap-3 flex-wrap">
                            <span className="flex items-center"><Building2 className="w-3.5 h-3.5 mr-1" /> {job.company}</span>
                            <span className="flex items-center"><MapPin className="w-3.5 h-3.5 mr-1" /> {job.location}</span>
                            <span className="flex items-center"><Clock className="w-3.5 h-3.5 mr-1" /> {job.posted}</span>
                          </div>
                        </div>
                        
                        {/* Match Score Badge */}
                        <div className="flex items-center bg-green-50 px-3 py-1.5 rounded-full border border-green-100">
                          <div className="w-8 h-8 rounded-full border-2 border-green-500 flex items-center justify-center mr-2 bg-white">
                            <span className="text-[10px] font-bold text-green-700">{job.matchScore}%</span>
                          </div>
                          <div className="text-xs font-medium text-green-800">
                            High Match
                          </div>
                        </div>
                      </div>

                      {/* Tags */}
                      <div className="mt-4 flex flex-wrap gap-2">
                        {job.tags.map((tag, i) => (
                          <span key={i} className="px-3 py-1 bg-gray-50 text-text-secondary text-xs font-medium rounded-md border border-gray-100">
                            {tag}
                          </span>
                        ))}
                        <span className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-md border border-blue-100">
                          {job.type}
                        </span>
                      </div>
                    </div>

                    {/* Action */}
                    <div className="flex flex-col items-end justify-between self-stretch">
                      <button className="p-2 text-gray-300 hover:text-primary transition-colors">
                        <Star className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={handleApply}
                        className="hidden md:block px-6 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-dark transition-colors shadow-sm shadow-primary/20 active:scale-95"
                      >
                        Apply Now
                      </button>
                    </div>
                  </div>

                  {/* Expanded Details (Mobile/Desktop) */}
                  {selectedJob === job.id && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      className="mt-6 pt-6 border-t border-gray-100 overflow-hidden"
                    >
                      <div className="grid md:grid-cols-2 gap-6">
                        <div>
                          <h4 className="font-semibold text-sm text-text-primary mb-2">Role Description</h4>
                          <p className="text-sm text-text-secondary leading-relaxed">
                            We are looking for a passionate individual to join our team. This role focuses on accessibility and inclusive design principles. You will work closely with our product team to ensure our services are usable by everyone.
                          </p>
                        </div>
                        <div>
                          <h4 className="font-semibold text-sm text-text-primary mb-2">Accessibility Amenities</h4>
                          <ul className="space-y-2">
                            <li className="flex items-center text-sm text-text-secondary">
                              <CheckCircle2 className="w-4 h-4 text-green-500 mr-2" />
                              Screen Reader Compatible Software
                            </li>
                            <li className="flex items-center text-sm text-text-secondary">
                              <CheckCircle2 className="w-4 h-4 text-green-500 mr-2" />
                              Wheelchair Accessible Office
                            </li>
                            <li className="flex items-center text-sm text-text-secondary">
                              <CheckCircle2 className="w-4 h-4 text-green-500 mr-2" />
                              Flexible Remote Work Policy
                            </li>
                          </ul>
                          <button 
                            onClick={handleApply}
                            className="w-full mt-4 md:hidden px-6 py-3 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-dark transition-colors"
                          >
                            Apply Now
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              ))
            )}

            {filteredJobs.length > 0 && (
              <div className="flex justify-center mt-8">
                <button className="px-6 py-3 border border-gray-200 text-text-secondary rounded-xl hover:bg-gray-50 transition-colors font-medium text-sm">
                  Load More Jobs
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
