import { motion } from "motion/react";
import { Loader2, RefreshCw, Upload } from "lucide-react";
import { Button } from "../../components/UI";
import { useCandidateDashboard } from "./CandidateDashboardContext";
import {
  formatEnumLabel,
  ProfileField,
  ProfileLabeledPills,
} from "./shared";

export default function CandidateProfile() {
  const {
    profile,
    profileLoading,
    profileError,
    loadProfile,
    avatarBlobUrl,
    avatarLoadFailed,
    setAvatarLoadFailed,
  } = useCandidateDashboard();

  if (profileLoading && !profile) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="flex flex-col items-center justify-center py-20 gap-4 text-gray-500"
      >
        <Loader2 className="animate-spin text-primary" size={40} />
        <p className="font-medium">Loading your profile…</p>
      </motion.div>
    );
  }

  if (profileError && !profile) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="bg-white p-8 rounded-2xl border border-red-200 text-center space-y-4 shadow-sm"
      >
        <p className="text-red-600 font-medium">{profileError}</p>
        <Button onClick={() => loadProfile()} className="inline-flex gap-2">
          <RefreshCw size={18} /> Retry
        </Button>
      </motion.div>
    );
  }

  if (!profile) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-8"
    >
      <div className="flex justify-end">
        <Button
          variant="outline"
          className="gap-2 py-2 px-4 text-sm"
          onClick={() => loadProfile()}
          disabled={profileLoading}
        >
          {profileLoading ? (
            <Loader2 className="animate-spin" size={16} />
          ) : (
            <RefreshCw size={16} />
          )}
          Refresh
        </Button>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-border shadow-sm">
        <h3 className="text-xl font-bold text-gray-900 mb-6">
          Professional profile
        </h3>
        <p className="text-sm text-gray-500 mb-6">
          Data from your registration (read-only). Profile editing will connect
          to the API in a future update.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ProfileField label="First name" value={profile.first_name} />
          <ProfileField label="Last name" value={profile.last_name} />
          <ProfileField label="Email" value={profile.email} />
          <ProfileField label="Birth date" value={profile.birth_date} />
          <ProfileField label="Phone" value={profile.phone_number} />
          <ProfileField label="Address" value={profile.address} />
          <ProfileField
            label="Gender"
            value={formatEnumLabel(profile.gender)}
          />
          <ProfileField label="Job title" value={profile.profile_title} />
          <ProfileField label="Industry" value={profile.industry} />
          <ProfileField
            label="Years of experience"
            value={
              profile.years_of_experience != null
                ? String(profile.years_of_experience)
                : "—"
            }
          />
          <ProfileField
            label="Education level"
            value={formatEnumLabel(profile.education_level)}
          />
          <ProfileLabeledPills label="Key skills" raw={profile.key_skills} />
          <ProfileField
            label="Work preference"
            value={formatEnumLabel(profile.work_preference)}
          />
          <ProfileField
            label="Availability"
            value={formatEnumLabel(profile.availability_status)}
          />
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-border shadow-sm">
        <h3 className="text-xl font-bold text-gray-900 mb-6">
          Accessibility & documents
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <ProfileField
            label="Disability type"
            value={formatEnumLabel(profile.disability_type)}
          />
          <ProfileLabeledPills
            label="Work accommodations"
            raw={profile.work_accommodations}
          />
        </div>
        <div className="space-y-2 mb-6">
          <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
            Accessibility needs
          </p>
          <p className="text-gray-900 whitespace-pre-wrap">
            {profile.accessibility_needs?.trim() || "—"}
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
          <div className="p-4 rounded-xl bg-gray-50 border border-border">
            <p className="font-bold text-gray-700 mb-1">Resume (PDF)</p>
            <p className="text-gray-500">
              {profile.resume_id ? "Uploaded (stored)" : "Not uploaded"}
            </p>
          </div>
          <div className="p-4 rounded-xl bg-gray-50 border border-border">
            <p className="font-bold text-gray-700 mb-1">Profile photo</p>
            {!profile.logo_id ? (
              <p className="text-gray-500">Not uploaded</p>
            ) : avatarBlobUrl && !avatarLoadFailed ? (
              <img
                src={avatarBlobUrl}
                alt=""
                className="mt-2 w-20 h-20 rounded-lg object-cover border border-gray-200"
                onError={() => setAvatarLoadFailed(true)}
              />
            ) : avatarLoadFailed ? (
              <p className="text-gray-500">Could not load preview</p>
            ) : (
              <p className="text-gray-500 text-sm mt-1">Loading preview…</p>
            )}
          </div>
          <div className="p-4 rounded-xl bg-gray-50 border border-border">
            <p className="font-bold text-gray-700 mb-1">Disability card</p>
            <p className="text-gray-500">
              {profile.disability_card_id ? "Uploaded (stored)" : "Not uploaded"}
            </p>
          </div>
        </div>

        <div className="border-2 border-dashed border-gray-300 rounded-2xl p-8 text-center mt-6 opacity-60">
          <Upload className="mx-auto text-gray-400 mb-4" size={32} />
          <p className="font-bold text-gray-700">Replace CV (coming soon)</p>
          <p className="text-sm text-gray-500 mt-2">
            Upload will be available when the update profile API is added.
          </p>
        </div>

        <Button
          className="mt-6"
          variant="outline"
          disabled
          title="Update API not implemented yet"
        >
          Save changes (soon)
        </Button>
      </div>
    </motion.div>
  );
}
