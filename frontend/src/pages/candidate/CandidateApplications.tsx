import { motion } from "motion/react";
import { CheckCircle, Clock, XCircle } from "lucide-react";

export default function CandidateApplications() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden"
    >
      <div className="p-6 border-b border-border">
        <h3 className="text-xl font-bold text-gray-900">My Applications</h3>
      </div>
      <div className="divide-y divide-gray-100">
        {[
          {
            role: "Frontend Developer",
            company: "TechCorp",
            status: "Interview",
            date: "Oct 25, 2023",
            icon: Clock,
            color: "text-blue-500",
          },
          {
            role: "UX Designer",
            company: "DesignStudio",
            status: "Applied",
            date: "Oct 28, 2023",
            icon: CheckCircle,
            color: "text-yellow-500",
          },
          {
            role: "Product Manager",
            company: "InnovateInc",
            status: "Rejected",
            date: "Oct 20, 2023",
            icon: XCircle,
            color: "text-red-500",
          },
        ].map((app, i) => (
          <div
            key={i}
            className="p-6 flex items-center justify-between hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-xl bg-gray-100 ${app.color}`}>
                <app.icon size={24} />
              </div>
              <div>
                <h4 className="font-bold text-gray-900">{app.role}</h4>
                <p className="text-sm text-gray-500">
                  {app.company} • Applied on {app.date}
                </p>
              </div>
            </div>
            <span
              className={`px-3 py-1 rounded-full text-sm font-bold bg-gray-100 ${app.color}`}
            >
              {app.status}
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
