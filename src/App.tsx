import React, { useState } from 'react';
import { DynamicFormEngine } from './components/DynamicFormEngine';
import { VirtualDataGrid } from './components/VirtualDataGrid';
import { ConflictResolution } from './components/ConflictResolution';
import { IdentityWorkspace } from './components/IdentityWorkspace';
import { ResumableUpload } from './components/ResumableUpload';
import { WorkflowBuilder } from './components/WorkflowBuilder';
import { FileText, Table2, GitMerge, Shield, Upload, Workflow } from 'lucide-react';

interface Demo {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  tag: string;
  component: React.ReactNode;
}

const DEMOS: Demo[] = [
  {
    id: 'form',
    label: 'Dynamic Form Engine',
    description: 'Schema-driven forms with conditional sections, cross-field validation, draft persistence, and versioned schemas.',
    icon: <FileText size={18} />,
    tag: 'Schema · Validation · Persistence',
    component: <DynamicFormEngine />,
  },
  {
    id: 'grid',
    label: 'High-Volume Data Grid',
    description: 'Virtual-scroll grid rendering 1,000 rows with inline editing, search, filter, sort, and unsaved-edit preservation.',
    icon: <Table2 size={18} />,
    tag: 'Virtualisation · Editing · Performance',
    component: <VirtualDataGrid />,
  },
  {
    id: 'conflict',
    label: 'Conflict Resolution',
    description: 'ETag-based optimistic locking with field-level diff view, conflict detection, and merge resolution.',
    icon: <GitMerge size={18} />,
    tag: 'ETags · Diff · Merge',
    component: <ConflictResolution />,
  },
  {
    id: 'identity',
    label: 'Identity & Permissions',
    description: 'Multi-org workspace with RBAC, isolated cache per organisation, and MSAL / Azure AD B2C integration pattern.',
    icon: <Shield size={18} />,
    tag: 'MSAL · RBAC · Multi-org',
    component: <IdentityWorkspace />,
  },
  {
    id: 'upload',
    label: 'Resumable Uploads',
    description: 'Chunked multi-file upload with pause, resume, cancel, retry, and simulated connection failure recovery.',
    icon: <Upload size={18} />,
    tag: 'Chunked · Resumable · Recovery',
    component: <ResumableUpload />,
  },
  {
    id: 'workflow',
    label: 'Workflow Builder',
    description: 'Visual approval workflow editor with drag-and-drop, cycle detection, undo/redo, and publish validation.',
    icon: <Workflow size={18} />,
    tag: 'DAG · Cycles · Validation',
    component: <WorkflowBuilder />,
  },
];

export default function App() {
  const [active, setActive] = useState('form');
  const current = DEMOS.find((d) => d.id === active)!;

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col shrink-0">
        <div className="p-5 border-b border-slate-800">
          <h1 className="text-base font-bold text-white tracking-tight">Enterprise Components</h1>
          <p className="text-xs text-slate-400 mt-0.5">React + TypeScript Showcase</p>
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-auto">
          {DEMOS.map((demo, i) => (
            <button
              key={demo.id}
              onClick={() => setActive(demo.id)}
              className={`w-full flex items-start gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${
                active === demo.id
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <span className={`mt-0.5 shrink-0 ${active === demo.id ? 'text-blue-200' : 'text-slate-400'}`}>
                {demo.icon}
              </span>
              <div>
                <p className="text-sm font-medium leading-snug">{demo.label}</p>
                <p className={`text-[10px] mt-0.5 ${active === demo.id ? 'text-blue-200' : 'text-slate-500'}`}>
                  {demo.tag}
                </p>
              </div>
              <span className={`ml-auto shrink-0 text-[10px] font-mono px-1 rounded ${active === demo.id ? 'bg-blue-500 text-blue-100' : 'bg-slate-800 text-slate-500'}`}>
                0{i + 1}
              </span>
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-slate-800">
          <p className="text-[10px] text-slate-500 leading-relaxed">
            Newly built demonstrations. Each component is production-grade and independently deployable.
          </p>
          <p className="text-[10px] text-slate-600 mt-1">Amr Elsherif · Solution Architect</p>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4 shrink-0">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-blue-500">{current.icon}</span>
                <h2 className="text-lg font-semibold text-gray-900">{current.label}</h2>
              </div>
              <p className="text-sm text-gray-500 mt-1 max-w-2xl">{current.description}</p>
            </div>
            <div className="flex gap-1 flex-wrap justify-end max-w-xs">
              {current.tag.split(' · ').map((t) => (
                <span key={t} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                  {t}
                </span>
              ))}
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {current.component}
        </div>
      </main>
    </div>
  );
}
