import PageShell from "../../components/layout/PageShell";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import { useBoStore } from "../../store/useBoStore";
import { useToast } from "../../app/ToastContext";
import type { ThemeMode, UiLanguage } from "../../types";

export default function SettingsPage() {
  const { theme, language, compactSidebar, setTheme, setLanguage, setCompactSidebar } = useBoStore();
  const { showToast } = useToast();

  return (
    <PageShell title="Settings" subtitle="Demo configuration panel (local only)">
      <section className="grid lg:grid-cols-2 gap-4">
        <Card className="p-5 space-y-5">
          <h2 className="font-bold">Interface</h2>

          <label className="block text-sm">
            <span className="text-[var(--bo-muted)]">UI language (labels)</span>
            <select
              className="bo-search mt-1 max-w-full"
              value={language}
              onChange={(e) => setLanguage(e.target.value as UiLanguage)}
            >
              <option value="en">English</option>
              <option value="fr">Français</option>
            </select>
          </label>

          <div>
            <p className="text-sm text-[var(--bo-muted)] mb-2">Theme</p>
            <div className="flex flex-wrap gap-2">
              {(["light", "dark", "invert"] as ThemeMode[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  className={`bo-chip capitalize ${theme === t ? "active" : ""}`}
                  onClick={() => setTheme(t)}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-3 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={compactSidebar}
              onChange={(e) => setCompactSidebar(e.target.checked)}
            />
            Compact sidebar
          </label>

          <Button
            onClick={() => showToast("Settings saved locally (demo)")}
          >
            Save changes (demo)
          </Button>
        </Card>

        <Card className="p-5">
          <h2 className="font-bold mb-3">About this backoffice</h2>
          <p className="text-sm text-[var(--bo-muted)] leading-relaxed">
            Standalone frontend demo for InclusiveJobs administration. Uses enriched fake data,
            Zustand local state, and simulated actions. No API or database connection.
          </p>
          <ul className="mt-4 text-sm space-y-2 text-[var(--bo-muted)]">
            <li>Run: npm run dev (port 5174)</li>
            <li>Login: Enter demo (no real auth)</li>
            <li>Themes: light, dark, high-visibility invert</li>
            <li>Kanban + tables + modals are fully client-side</li>
          </ul>
        </Card>
      </section>
    </PageShell>
  );
}
