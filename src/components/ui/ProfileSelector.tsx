"use client";



import { useState, useRef, useEffect } from "react";

import { User, ChevronDown } from "lucide-react";



interface ProfileSelectorProps {

  value: string;

  onChange: (profile: string) => void;

  compact?: boolean;

}



const PROFILES = [

  { id: "", name: "Default (Bob)", description: "CEO - orchestrates, delegates" },

  { id: "qa-engineer", name: "QA Engineer", description: "Quality assurance, bug fixing, testing" },

  { id: "devops-engineer", name: "DevOps Engineer", description: "Infrastructure, deployment, CI/CD" },

  { id: "swe-engineer", name: "SWE Engineer", description: "Feature development, code improvement" },

  { id: "data-engineer", name: "Data Engineer", description: "Data pipelines, ETL, schemas" },

  { id: "data-scientist", name: "Data Scientist", description: "ML models, analytics, experiments" },

  { id: "ops-director", name: "Operations Director", description: "Strategy, finance, market research" },

  { id: "creative-lead", name: "Creative Lead", description: "Content, design, marketing" },

  { id: "support-agent", name: "Support Agent", description: "Research, legal, security" },

];



export default function ProfileSelector({ value, onChange, compact = false }: ProfileSelectorProps) {

  const [open, setOpen] = useState(false);

  const ref = useRef<HTMLDivElement>(null);



  const selected = PROFILES.find((p) => p.id === value) || PROFILES[0];



  useEffect(() => {

    const handler = (e: MouseEvent) => {

      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);

    };

    document.addEventListener("mousedown", handler);

    return () => document.removeEventListener("mousedown", handler);

  }, []);



  if (compact) {

    return (

      <button

        onClick={() => setOpen(!open)}

        className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] font-mono text-white/60 hover:border-neon-purple/50 hover:text-neon-purple transition-colors relative"

        title={`Agent: ${selected.name}`}

      >

        <User className="w-3 h-3" />

        {selected.name.split(" - ")[0]}

        {open && (

          <div ref={ref} className="absolute top-full left-0 mt-1 z-50 w-56 bg-dark-900 border border-white/10 rounded-lg shadow-xl overflow-hidden max-h-80 overflow-y-auto">

            {PROFILES.map((p) => (

              <button

                key={p.id}

                onClick={(e) => { e.stopPropagation(); onChange(p.id); setOpen(false); }}

                className={`w-full text-left px-3 py-2 text-xs hover:bg-white/5 ${value === p.id ? "text-neon-purple" : "text-white/60"}`}

              >

                <div className="font-medium">{p.name}</div>

                <div className="text-[10px] text-white/30 mt-0.5">{p.description}</div>

              </button>

            ))}

          </div>

        )}

      </button>

    );

  }



  return (

    <div ref={ref} className="relative">

      <button

        onClick={() => setOpen(!open)}

        className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-sm text-white hover:border-white/30 transition-colors"

      >

        <div className="flex items-center gap-2">

          <User className="w-4 h-4 text-neon-purple" />

          <div className="text-left">

            <div className="font-medium">{selected.name}</div>

            <div className="text-[10px] text-white/40">{selected.description}</div>

          </div>

        </div>

        <ChevronDown className={`w-4 h-4 text-white/30 transition-transform ${open ? "rotate-180" : ""}`} />

      </button>

      {open && (

        <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-dark-900 border border-white/10 rounded-lg shadow-xl overflow-hidden max-h-80 overflow-y-auto">

          {PROFILES.map((p) => (

            <button

              key={p.id}

              onClick={() => { onChange(p.id); setOpen(false); }}

              className={`w-full text-left px-3 py-2.5 text-sm hover:bg-white/5 ${value === p.id ? "text-neon-purple bg-neon-purple/5" : "text-white/70"}`}

            >

              <div className="flex items-center gap-2">

                <div className={`w-2 h-2 rounded-full ${value === p.id ? "bg-neon-purple" : "bg-white/20"}`} />

                <span className="font-medium">{p.name}</span>

              </div>

              <div className="text-xs text-white/40 mt-0.5 ml-4">{p.description}</div>

            </button>

          ))}

        </div>

      )}

    </div>

  );

}

