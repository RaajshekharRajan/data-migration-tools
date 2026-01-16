"use client"; // <--- THIS LINE FIXES THE CRASH

import MigrationCalculator from '@/components/MigrationCalculator';

export default function Home() {
  return (
    <main 
      className="min-h-screen bg-slate-50 text-slate-900 font-sans"
      style={{
        backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)',
        backgroundSize: '24px 24px'
      }}
    >
      {/* --- HEADER --- */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200 h-16 px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-slate-900 to-slate-700 text-white flex items-center justify-center font-bold font-mono text-sm shadow-sm">
            DMT
          </div>
          <div className="font-bold text-lg tracking-tight text-slate-900">
            ClonePartner <span className="text-slate-400 font-medium">Helpdesk Migration Planner</span>
          </div>
        </div>
        
        {/* Simple Action Button */}
        <button 
          onClick={() => window.location.reload()}
          className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-50 hover:text-slate-900 transition-colors"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.3"/></svg>
          Reset Tool
        </button>
      </header>

      {/* --- MAIN CONTENT --- */}
      <div className="max-w-6xl mx-auto py-10 px-4">
        <MigrationCalculator />
      </div>
    </main>
  );
}