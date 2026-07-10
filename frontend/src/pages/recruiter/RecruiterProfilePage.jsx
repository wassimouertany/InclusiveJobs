import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button, Input } from "../../components/UI";
import { useToast } from "../../context/ToastContext";
import { apiClient } from "../../services/apiClient";

const emptyForm = {
  company_name: "",
  company_industry: "",
  location: "",
  phone_number: "",
  inclusion_strategy: "",
};

export default function RecruiterProfilePage() {
  const { showToast } = useToast();
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await apiClient.get("/users/recruiters/me");
        if (cancelled) return;
        setProfile(res.data);
        setForm({
          company_name: res.data?.company_name ?? "",
          company_industry: res.data?.company_industry ?? "",
          location: res.data?.location ?? "",
          phone_number: res.data?.phone_number ?? "",
          inclusion_strategy: res.data?.inclusion_strategy ?? "",
        });
      } catch {
        if (!cancelled) showToast("Failed to load company profile.", "error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [showToast]);

  const handleChange = (field) => (e) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSave = async () => {
    if (!form.company_name.trim()) {
      showToast("Company name cannot be empty.", "error");
      return;
    }

    const fd = new FormData();
    let hasChange = false;
    for (const key of Object.keys(emptyForm)) {
      if (form[key] !== (profile?.[key] ?? "")) {
        fd.append(key, form[key]);
        hasChange = true;
      }
    }

    if (!hasChange) {
      showToast("No changes to save.", "info");
      return;
    }

    setSaving(true);
    try {
      const res = await apiClient.patch("/users/recruiters/me", fd);
      setProfile(res.data);
      showToast("Company profile updated", "success");
    } catch {
      showToast("Failed to update company profile.", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="bg-white p-6 rounded-2xl border border-border shadow-sm">
        <h3 className="text-xl font-bold text-gray-900 mb-6">Company Profile</h3>
        {loading ? (
          <div className="flex items-center gap-2 text-gray-500 text-sm py-6">
            <Loader2 size={18} className="animate-spin" /> Loading company profile…
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="Company Name"
                value={form.company_name}
                onChange={handleChange("company_name")}
              />
              <Input
                label="Industry Sector"
                value={form.company_industry}
                onChange={handleChange("company_industry")}
              />
              <Input
                label="Location"
                value={form.location}
                onChange={handleChange("location")}
              />
              <Input
                label="Phone Number"
                value={form.phone_number}
                onChange={handleChange("phone_number")}
              />
            </div>
            <div className="mt-6 space-y-2">
              <label className="block text-sm font-bold text-gray-700">Company Presentation</label>
              <textarea
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl bg-white text-gray-900 min-h-30 focus:border-primary outline-none"
                value={form.inclusion_strategy}
                onChange={handleChange("inclusion_strategy")}
              />
            </div>
            <Button className="mt-6" onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 size={18} className="animate-spin" /> Saving…
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
