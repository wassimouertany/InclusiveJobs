import { useState } from 'react';
import { motion } from 'motion/react';
import { Briefcase, User, Settings, Bell, FileText, CheckCircle, Clock, XCircle } from 'lucide-react';
import { useToast } from '../context/ToastContext';

const applications = [
  { id: 1, role: "Senior Frontend Developer", company: "TechTunisia", status: "Interview", date: "2023-10-25", color: "text-blue-600 bg-blue-50" },
  { id: 2, role: "UX Designer", company: "Vermeg", status: "Applied", date: "2023-10-28", color: "text-yellow-600 bg-yellow-50" },
  { id: 3, role: "Product Manager", company: "Instadeep", status: "Rejected", date: "2023-10-20", color: "text-red-600 bg-red-50" },
];

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'applications' | 'profile'>('overview');
  const { showToast } = useToast();

  return (
    <div className="min-h-screen bg-bg-page py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-4 gap-8">
          
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-sm border border-border p-6 sticky top-24">
              <div className="flex items-center space-x-4 mb-8">
                <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-white font-bold text-xl">
                  JD
                </div>
                <div>
                  <h3 className="font-bold text-text-primary">John Doe</h3>
                  <p className="text-sm text-text-secondary">Candidate</p>
                </div>
              </div>
              
              <nav className="space-y-2">
                <button 
                  onClick={() => setActiveTab('overview')}
                  className={`w-full flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === 'overview' ? 'bg-primary text-white shadow-md shadow-primary/20' : 'text-text-secondary hover:bg-gray-50'}`}
                >
                  <Briefcase className="w-5 h-5 mr-3" />
                  Overview
                </button>
                <button 
                  onClick={() => setActiveTab('applications')}
                  className={`w-full flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === 'applications' ? 'bg-primary text-white shadow-md shadow-primary/20' : 'text-text-secondary hover:bg-gray-50'}`}
                >
                  <FileText className="w-5 h-5 mr-3" />
                  My Applications
                </button>
                <button 
                  onClick={() => setActiveTab('profile')}
                  className={`w-full flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === 'profile' ? 'bg-primary text-white shadow-md shadow-primary/20' : 'text-text-secondary hover:bg-gray-50'}`}
                >
                  <User className="w-5 h-5 mr-3" />
                  Profile & Accessibility
                </button>
                <button 
                  className="w-full flex items-center px-4 py-3 rounded-xl text-sm font-medium text-text-secondary hover:bg-gray-50 transition-colors"
                >
                  <Settings className="w-5 h-5 mr-3" />
                  Settings
                </button>
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  {/* Stats Cards */}
                  <div className="grid sm:grid-cols-3 gap-6">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-border">
                      <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-blue-50 rounded-xl text-blue-600">
                          <FileText className="w-6 h-6" />
                        </div>
                        <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">+2 this week</span>
                      </div>
                      <h4 className="text-3xl font-bold text-text-primary mb-1">12</h4>
                      <p className="text-sm text-text-secondary">Total Applications</p>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-border">
                      <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-purple-50 rounded-xl text-purple-600">
                          <Bell className="w-6 h-6" />
                        </div>
                        <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-1 rounded-full">3 new</span>
                      </div>
                      <h4 className="text-3xl font-bold text-text-primary mb-1">5</h4>
                      <p className="text-sm text-text-secondary">Interview Requests</p>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-border">
                      <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-green-50 rounded-xl text-green-600">
                          <CheckCircle className="w-6 h-6" />
                        </div>
                      </div>
                      <h4 className="text-3xl font-bold text-text-primary mb-1">85%</h4>
                      <p className="text-sm text-text-secondary">Profile Completeness</p>
                    </div>
                  </div>

                  {/* Recent Activity */}
                  <div className="bg-white rounded-2xl shadow-sm border border-border p-6">
                    <h3 className="font-bold text-lg text-text-primary mb-6">Recent Applications</h3>
                    <div className="space-y-4">
                      {applications.map((app) => (
                        <div key={app.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100 hover:border-primary/30 transition-colors">
                          <div className="flex items-center space-x-4">
                            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center font-bold text-gray-700 shadow-sm">
                              {app.company.charAt(0)}
                            </div>
                            <div>
                              <h4 className="font-bold text-text-primary">{app.role}</h4>
                              <p className="text-sm text-text-secondary">{app.company}</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${app.color}`}>
                              {app.status}
                            </span>
                            <span className="text-xs text-text-secondary hidden sm:block">{app.date}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    <button className="w-full mt-6 py-2 text-sm font-medium text-primary hover:bg-primary/5 rounded-lg transition-colors">
                      View All Applications
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'applications' && (
                <div className="bg-white rounded-2xl shadow-sm border border-border p-6">
                  <h3 className="font-bold text-lg text-text-primary mb-6">My Applications</h3>
                  <p className="text-text-secondary">Detailed list of all your job applications would go here.</p>
                </div>
              )}

              {activeTab === 'profile' && (
                <div className="bg-white rounded-2xl shadow-sm border border-border p-6">
                  <h3 className="font-bold text-lg text-text-primary mb-6">Profile & Accessibility Settings</h3>
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-2">Full Name</label>
                      <input type="text" value="John Doe" className="w-full px-4 py-2 border border-border rounded-lg bg-gray-50" readOnly />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-2">Accessibility Needs</label>
                      <div className="flex flex-wrap gap-2">
                        <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium">Screen Reader</span>
                        <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium">High Contrast</span>
                        <button 
                          onClick={() => showToast('Settings updated', 'success')}
                          className="px-3 py-1 border border-dashed border-gray-300 text-gray-500 rounded-full text-sm hover:border-primary hover:text-primary transition-colors"
                        >
                          + Add Need
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
