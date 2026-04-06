import { motion } from "motion/react";
import { Building, ChevronLeft, MapPin, Sparkles } from "lucide-react";
import { Button } from "../../components/UI";
import { useToast } from "../../context/ToastContext";
import { useCandidateDashboard } from "./CandidateDashboardContext";
import { formatEnumLabel, splitAccommodations } from "./shared";

export default function CandidateJobDetail() {
  const { showToast } = useToast();
  const { selectedJob, setSelectedJob } = useCandidateDashboard();

  if (!selectedJob) return null;

  const accommodations = splitAccommodations(selectedJob.possibleAccommodations);
  const skills = selectedJob.keySkills ?? [];

  const handleApply = () => {
    showToast(
      "Application submitted — full apply flow coming soon.",
      "success"
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="bg-white p-8 rounded-2xl border border-border shadow-sm animate-in fade-in zoom-in-95 duration-200"
    >
      <button
        type="button"
        onClick={() => setSelectedJob(null)}
        className="text-primary font-bold flex items-center gap-2 mb-6 hover:underline"
      >
        <ChevronLeft size={20} /> Back
      </button>

      <div className="flex justify-between items-start mb-8 flex-wrap gap-4">
        <div>
          <h2 className="text-3xl font-black text-gray-900">{selectedJob.title}</h2>
          <div className="flex flex-wrap items-center gap-4 text-gray-500 mt-2">
            <span className="flex items-center gap-1">
              <Building size={18} /> {selectedJob.company}
            </span>
            <span className="flex items-center gap-1">
              <MapPin size={18} /> {selectedJob.location}
            </span>
          </div>
          {selectedJob.contractType ? (
            <p className="text-sm text-gray-600 mt-2">
              <span className="font-semibold text-gray-800">Contract: </span>
              {formatEnumLabel(selectedJob.contractType)}
            </p>
          ) : null}
          {selectedJob.workingConditions?.trim() ? (
            <p className="text-sm text-gray-600 mt-2 max-w-2xl">
              <span className="font-semibold text-gray-800">Work arrangement: </span>
              <span className="whitespace-pre-wrap">{selectedJob.workingConditions.trim()}</span>
            </p>
          ) : null}
        </div>
        <div className="text-right flex flex-col items-end gap-2">
          {selectedJob.match != null && selectedJob.match > 0 ? (
            <span className="px-3 py-1 bg-green-100 text-green-800 rounded-lg text-sm font-bold inline-block">
              {selectedJob.match}% AI match
            </span>
          ) : null}
          <Button onClick={handleApply}>Apply Now</Button>
        </div>
      </div>

      <div className="space-y-6 text-gray-700">
        <div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Job description</h3>
          <p className="leading-relaxed whitespace-pre-wrap">
            {selectedJob.description?.trim() ||
              "No description was provided for this role yet."}
          </p>
        </div>

        {skills.length > 0 && (
          <div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Key skills</h3>
            <ul className="list-disc pl-5 space-y-1">
              {skills.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </div>
        )}

        <div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Accommodations</h3>
          {accommodations.length > 0 ? (
            <ul className="list-disc pl-5 space-y-1">
              {accommodations.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500 text-sm">
              No specific accommodations listed for this role.
            </p>
          )}
        </div>

        {(selectedJob.aiExplanation?.trim() ||
          (selectedJob.aiStrengths && selectedJob.aiStrengths.length > 0)) && (
          <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-5">
            <h3 className="text-xl font-bold text-indigo-950 mb-3 flex items-center gap-2">
              <Sparkles className="shrink-0 text-indigo-600" size={22} />
              AI insights
            </h3>
            {selectedJob.aiExplanation?.trim() ? (
              <p className="text-gray-800 leading-relaxed whitespace-pre-wrap mb-4">
                {selectedJob.aiExplanation}
              </p>
            ) : null}
            {selectedJob.aiStrengths && selectedJob.aiStrengths.length > 0 ? (
              <div>
                <p className="text-sm font-semibold text-gray-900 mb-2">Strengths</p>
                <ul className="list-disc pl-5 space-y-1 text-gray-800">
                  {selectedJob.aiStrengths.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </motion.div>
  );
}
