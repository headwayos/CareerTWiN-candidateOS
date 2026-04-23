import { WorkspaceManager, IngestionEngine, TrackerEngine } from "@careertwin/engine";
import { LucideFileText, LucideUser, LucideBriefcase, LucideShieldCheck } from "lucide-react";
import path from "path";

export const dynamic = 'force-dynamic';

export default async function Dashboard() {
  const cwd = process.cwd();
  // Ensure we point to the monorepo root, not apps/web
  const workspaceRoot = cwd.includes('apps/web') ? path.join(cwd, '../../') : cwd;
  const workspace = new WorkspaceManager(workspaceRoot);
  
  let profile = null;
  let manifest = null;
  let trackerSummary = null;

  try {
    const ingestion = new IngestionEngine(workspace);
    const tracker = new TrackerEngine(workspace);
    profile = await ingestion.loadProfile();
    manifest = await workspace.getManifest();
    trackerSummary = await tracker.summary();
  } catch (error) {
    console.warn("Workspace not fully initialized yet:", error);
  }

  return (
    <main className="p-8 max-w-7xl mx-auto">
      <header className="mb-12 flex justify-between items-end">
        <div>
          <h1 className="text-3xl mb-2 text-[#0369A1]">CareerTwin Candidate OS</h1>
          <p className="text-sky-600 font-mono">v0.1.0 // Local Artifact Inspector</p>
        </div>
        <div className="flex gap-4">
          <div className="px-4 py-2 glass-card flex items-center gap-2">
            <LucideShieldCheck className="w-4 h-4 text-green-500" />
            <span className="text-xs font-mono uppercase tracking-wider">Passport Ready</span>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Profile Summary */}
        <section className="md:col-span-1 space-y-6">
          <div className="glass-card p-6">
            <div className="flex items-center gap-2 mb-4 text-[#0369A1]">
              <LucideUser className="w-5 h-5" />
              <h2 className="text-lg uppercase tracking-tight">Candidate Profile</h2>
            </div>
            {profile ? (
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] uppercase font-bold text-sky-400 block mb-1">Name</label>
                  <p className="text-lg font-medium">{profile.bio.name}</p>
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-sky-400 block mb-1">Summary</label>
                  <p className="text-sm leading-relaxed">{profile.bio.summary}</p>
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-sky-400 block mb-1">Skills</label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {profile.skills.map(s => (
                      <span key={s} className="px-2 py-1 bg-sky-100 text-sky-700 text-xs font-mono rounded">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm italic text-sky-400">No profile ingested. Use 'ct profile ingest' in the CLI.</p>
            )}
          </div>
        </section>

        {/* Artifacts & Pipeline */}
        <section className="md:col-span-2 space-y-8">
          <div className="glass-card p-6">
            <div className="flex items-center gap-2 mb-6 text-[#0369A1]">
              <LucideFileText className="w-5 h-5" />
              <h2 className="text-lg uppercase tracking-tight">Artifact Manifest</h2>
            </div>
            <div className="space-y-3">
              {manifest.artifacts.length > 0 ? manifest.artifacts.map(art => (
                <div key={art.id} className="flex justify-between items-center p-3 border border-sky-50 rounded bg-sky-50/30 hover:bg-sky-50 transition-colors cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-white flex items-center justify-center border border-sky-100">
                      <LucideFileText className="w-4 h-4 text-sky-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{art.name}</p>
                      <p className="text-[10px] text-sky-400 font-mono uppercase">{art.type}</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-sky-300">{new Date(art.createdAt).toLocaleDateString()}</span>
                </div>
              )) : (
                <div className="text-center py-12 border-2 border-dashed border-sky-100 rounded-lg">
                  <p className="text-sm text-sky-300">No artifacts generated yet.</p>
                </div>
              )}
            </div>
          </div>

          <div className="glass-card p-6">
            <div className="flex items-center gap-2 mb-4 text-[#0369A1]">
              <LucideBriefcase className="w-5 h-5" />
              <h2 className="text-lg uppercase tracking-tight">Application Pipeline</h2>
            </div>
            <div className="grid grid-cols-4 gap-4">
              {['Evaluated', 'Applied', 'Interview', 'Offer'].map(stage => (
                <div key={stage} className="p-4 bg-sky-50/50 rounded-lg border border-sky-100 text-center">
                  <p className="text-[10px] uppercase font-bold text-sky-400 mb-1">{stage}</p>
                  <p className="text-2xl font-mono text-[#0369A1]">0</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
