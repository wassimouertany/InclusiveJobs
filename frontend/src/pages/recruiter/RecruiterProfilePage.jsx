import { Button, Input } from "../../components/UI";
import { useToast } from "../../context/ToastContext";

export default function RecruiterProfilePage() {
  const { showToast } = useToast();

  return (
    <div className="space-y-8">
      <div className="bg-white p-6 rounded-2xl border border-border shadow-sm">
        <h3 className="text-xl font-bold text-gray-900 mb-6">Company Profile</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input label="Company Name" defaultValue="TechCorp Inc." />
          <Input label="Industry Sector" defaultValue="Technology" />
          <Input label="Location" defaultValue="Tunis, Tunisia" />
          <Input label="Website" defaultValue="https://techcorp.com" />
        </div>
        <div className="mt-6 space-y-2">
          <label className="block text-sm font-bold text-gray-700">Company Presentation</label>
          <textarea
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl bg-white text-gray-900 min-h-[120px] focus:border-primary outline-none"
            defaultValue="We are a leading technology company committed to inclusive hiring and building diverse teams."
          />
        </div>
        <Button className="mt-6" onClick={() => showToast("Company profile updated", "success")}>
          Save Changes
        </Button>
      </div>
    </div>
  );
}
