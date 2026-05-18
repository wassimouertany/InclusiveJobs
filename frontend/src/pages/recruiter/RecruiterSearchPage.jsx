import { Filter, Search, Users } from "lucide-react";
import { Button } from "../../components/UI";

export default function RecruiterSearchPage() {
  return (
    <div className="space-y-6">
      <div className="flex gap-4">
        <div className="flex-grow relative">
          <Search className="absolute left-4 top-3.5 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search candidates by skills, experience, or keywords..."
            className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl bg-white text-gray-900 focus:border-primary outline-none"
          />
        </div>
        <Button variant="outline" className="flex items-center gap-2">
          <Filter size={20} /> Filters
        </Button>
      </div>

      <div className="bg-white p-8 rounded-2xl border border-border shadow-sm text-center">
        <Users className="mx-auto text-gray-400 mb-4" size={48} />
        <h3 className="text-lg font-bold text-gray-900 mb-2">Global Talent Pool</h3>
        <p className="text-gray-500 max-w-md mx-auto">
          Use the search bar above to find specific profiles across our entire database of inclusive
          talent.
        </p>
      </div>
    </div>
  );
}
