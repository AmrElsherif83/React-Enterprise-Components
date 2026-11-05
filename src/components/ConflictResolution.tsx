import { useState } from 'react';
import { AlertTriangle, CheckCircle, User, RefreshCw, Eye, EyeOff, GitMerge, RotateCcw } from 'lucide-react';

interface ContractRecord {
  id: string;
  etag: string;
  title: string;
  vendor: string;
  value: number;
  expiryDate: string;
  status: 'Draft' | 'Active' | 'Under Review' | 'Expired';
  owner: string;
  notes: string;
}

const BASE_RECORD: ContractRecord = {
  id: 'CTR-2025-0042',
  etag: 'v3',
  title: 'Enterprise Software Licensing Agreement',
  vendor: 'Meridian Systems Inc.',
  value: 485000,
  expiryDate: '2026-08-31',
  status: 'Under Review',
  owner: 'Alex Thornton',
  notes: 'Annual renewal with 3-year lock-in. Legal review pending.',
};

type Phase = 'idle' | 'editing' | 'conflict' | 'resolved';

interface FieldDiff {
  key: keyof ContractRecord;
  label: string;
  local: unknown;
  server: unknown;
  hasConflict: boolean;
}

function formatVal(key: keyof ContractRecord, val: unknown): string {
  if (key === 'value') return `$${Number(val).toLocaleString()}`;
  return String(val);
}

export function ConflictResolution() {
  const [phase, setPhase] = useState<Phase>('idle');
  const [serverRecord, setServerRecord] = useState<ContractRecord>(BASE_RECORD);
  const [localDraft, setLocalDraft] = useState<ContractRecord>(BASE_RECORD);
  const [serverDraft, setServerDraft] = useState<ContractRecord | null>(null);
  const [resolutions, setResolutions] = useState<Record<string, 'local' | 'server'>>({});
  const [resolvedRecord, setResolvedRecord] = useState<ContractRecord | null>(null);
  const [showCode, setShowCode] = useState(false);
  const [_submitAttempts, setSubmitAttempts] = useState(0);

  // Simulate "User B" making a conflicting save while User A is editing
  const simulateUserBEdit = () => {
    const userBChanges: Partial<ContractRecord> = {
      etag: 'v4',
      value: 520000,
      status: 'Active',
      notes: 'Legal approved. Updated contract value after negotiation round 2.',
      owner: 'Jordan Reyes',
    };
    setServerDraft({ ...serverRecord, ...userBChanges });
  };

  const startEditing = () => {
    setLocalDraft({ ...serverRecord });
    setPhase('editing');
    setResolutions({});
    setResolvedRecord(null);
    // Simulate concurrent edit after 1.5s
    setTimeout(simulateUserBEdit, 1500);
  };

  const attemptSave = () => {
    setSubmitAttempts((c) => c + 1);
    if (serverDraft && serverDraft.etag !== localDraft.etag) {
      // ETag mismatch → conflict
      setPhase('conflict');
    } else {
      // No conflict
      const saved = { ...localDraft, etag: `v${parseInt(localDraft.etag.slice(1)) + 1}` };
      setServerRecord(saved);
      setResolvedRecord(saved);
      setPhase('resolved');
    }
  };

  const computeDiffs = (): FieldDiff[] => {
    if (!serverDraft) return [];
    const FIELD_LABELS: Partial<Record<keyof ContractRecord, string>> = {
      title: 'Title',
      vendor: 'Vendor',
      value: 'Contract Value',
      expiryDate: 'Expiry Date',
      status: 'Status',
      owner: 'Owner',
      notes: 'Notes',
    };
    return (Object.keys(FIELD_LABELS) as (keyof ContractRecord)[]).map((key) => ({
      key,
      label: FIELD_LABELS[key]!,
      local: localDraft[key],
      server: serverDraft[key],
      hasConflict: localDraft[key] !== serverRecord[key] && serverDraft[key] !== serverRecord[key],
    }));
  };

  const diffs = computeDiffs();

  const resolveAll = (choice: 'local' | 'server') => {
    const r: Record<string, 'local' | 'server'> = {};
    diffs.forEach((d) => { if (d.hasConflict) r[d.key] = choice; });
    setResolutions(r);
  };

  const unresolvedConflicts = diffs.filter((d) => d.hasConflict && !resolutions[d.key]).length;

  const applyResolution = () => {
    if (!serverDraft) return;
    const merged: ContractRecord = { ...serverDraft }; // start from server version
    diffs.forEach((d) => {
      if (resolutions[d.key] === 'local') {
        (merged as unknown as Record<string, unknown>)[d.key] = localDraft[d.key];
      }
      // non-conflicted local changes also applied
      if (!d.hasConflict && localDraft[d.key] !== serverRecord[d.key]) {
        (merged as unknown as Record<string, unknown>)[d.key] = localDraft[d.key];
      }
    });
    merged.etag = `v${parseInt(serverDraft.etag.slice(1)) + 1}`;
    setServerRecord(merged);
    setResolvedRecord(merged);
    setPhase('resolved');
    setServerDraft(null);
  };

  const reset = () => {
    setPhase('idle');
    setServerRecord(BASE_RECORD);
    setLocalDraft(BASE_RECORD);
    setServerDraft(null);
    setResolutions({});
    setResolvedRecord(null);
    setSubmitAttempts(0);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Concurrent Edit — Conflict Resolution</h2>
          <p className="text-xs text-gray-500">ETag-based optimistic locking · Simulated multi-user editing</p>
        </div>
        <div className="flex gap-2">
          <button onClick={reset} className="flex items-center gap-1 text-xs text-gray-500 border border-gray-200 px-2 py-1 rounded-lg hover:bg-gray-50">
            <RotateCcw size={11} /> Reset
          </button>
          <button onClick={() => setShowCode((v) => !v)} className="flex items-center gap-1 text-xs text-blue-600 border border-blue-200 px-2 py-1 rounded-lg">
            {showCode ? <EyeOff size={11} /> : <Eye size={11} />}
            {showCode ? 'Hide' : 'View'} implementation
          </button>
        </div>
      </div>

      {showCode && (
        <div className="bg-gray-900 rounded-xl p-4 overflow-auto max-h-64 text-xs code-highlight leading-relaxed">
          <div className="text-gray-400 mb-2">// ConflictResolution.tsx — ETag optimistic locking</div>
          <div><span className="cm">// Client holds ETag from initial GET; server rejects stale writes</span></div>
          <div><span className="kw">const</span> <span className="fn">attemptSave</span> = () =&gt; {'{'}</div>
          <div className="pl-4"><span className="kw">if</span> (serverRecord.etag !== localDraft.etag) {'{'}</div>
          <div className="pl-8"><span className="cm">// 412 Precondition Failed equivalent</span></div>
          <div className="pl-8"><span className="fn">setPhase</span>(<span className="str">'conflict'</span>);</div>
          <div className="pl-4">{'}'}</div>
          <div>{'}'}</div>
          <div className="mt-2"><span className="cm">// Field-level diff: both sides changed from base</span></div>
          <div><span className="kw">const</span> hasConflict = local[key] !== base[key] && server[key] !== base[key];</div>
          <div className="mt-2"><span className="cm">// Merge: start from server, apply user's local choices</span></div>
          <div><span className="kw">const</span> merged = {'{'} ...serverDraft {'}'};  <span className="cm">// server wins by default</span></div>
          <div>diffs.<span className="fn">forEach</span>(d =&gt; {'{'}</div>
          <div className="pl-4"><span className="kw">if</span> (resolutions[d.key] === <span className="str">'local'</span>) merged[d.key] = local[d.key];</div>
          <div>{'}'});</div>
          <div>merged.etag = <span className="str">{'`v${parseInt(serverDraft.etag.slice(1)) + 1}`'}</span>; <span className="cm">// bump ETag</span></div>
        </div>
      )}

      {/* Status bar */}
      <div className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs">
        <div className="flex items-center gap-2">
          <User size={14} className="text-blue-500" />
          <span className="font-medium">User A (You)</span>
          <span className="text-gray-400">editing</span>
          <span className="font-mono bg-gray-200 px-1.5 py-0.5 rounded text-gray-700">etag: {localDraft.etag}</span>
        </div>
        {serverDraft && (
          <>
            <span className="text-gray-300">|</span>
            <div className="flex items-center gap-2 text-amber-700">
              <User size={14} className="text-orange-500" />
              <span className="font-medium">User B (Jordan Reyes)</span>
              <span className="text-gray-400">saved</span>
              <span className="font-mono bg-amber-100 px-1.5 py-0.5 rounded">{serverDraft.etag}</span>
            </div>
          </>
        )}
        <span className="ml-auto font-mono text-gray-400">{BASE_RECORD.id}</span>
      </div>

      {phase === 'idle' && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 text-center">
          <RefreshCw className="mx-auto text-gray-400 mb-3" size={32} />
          <h3 className="font-medium text-gray-700 mb-1">Server Record — etag: {serverRecord.etag}</h3>
          <p className="text-xs text-gray-500 mb-4">Click "Start Editing" to open the record. A concurrent edit by User B will be triggered after 1.5 seconds.</p>
          <RecordCard record={serverRecord} />
          <button onClick={startEditing} className="mt-4 px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
            Start Editing
          </button>
        </div>
      )}

      {phase === 'editing' && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-700">Your Draft</h3>
            {serverDraft && (
              <span className="text-xs bg-orange-50 border border-orange-200 text-orange-700 px-2 py-1 rounded-full flex items-center gap-1">
                <AlertTriangle size={11} />
                Concurrent edit detected — save to see conflict
              </span>
            )}
          </div>
          <EditableRecord record={localDraft} onChange={(f, v) => setLocalDraft((r) => ({ ...r, [f]: v }))} />
          <div className="flex justify-end">
            <button onClick={attemptSave} className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
              Save Changes
            </button>
          </div>
        </div>
      )}

      {phase === 'conflict' && serverDraft && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
            <AlertTriangle size={16} />
            <span>
              <strong>Conflict detected</strong> — server is at {serverDraft.etag}, your draft was based on {BASE_RECORD.etag}.
              Review field-level differences below.
            </span>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="flex bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 px-4 py-2 gap-4">
              <span className="w-28">Field</span>
              <span className="flex-1 text-blue-600">Your version (local)</span>
              <span className="flex-1 text-orange-600">Server version (User B)</span>
              <span className="w-20 text-center">Resolve</span>
            </div>
            {diffs.map((d) => {
              const localChanged = d.local !== serverRecord[d.key];
              const serverChanged = d.server !== serverRecord[d.key];
              const chosen = resolutions[d.key];
              return (
                <div key={d.key} className={`flex items-center px-4 py-2.5 gap-4 border-b border-gray-100 text-xs ${d.hasConflict ? 'bg-red-50' : ''}`}>
                  <span className="w-28 font-medium text-gray-600 shrink-0">{d.label}</span>
                  <div className={`flex-1 font-mono rounded px-2 py-1 ${localChanged ? (d.hasConflict ? 'bg-red-100 text-red-800 border border-red-200' : 'bg-blue-50 text-blue-800') : 'text-gray-500'}`}>
                    {formatVal(d.key, d.local)}
                  </div>
                  <div className={`flex-1 font-mono rounded px-2 py-1 ${serverChanged ? (d.hasConflict ? 'bg-orange-100 text-orange-800 border border-orange-200' : 'bg-orange-50 text-orange-800') : 'text-gray-500'}`}>
                    {formatVal(d.key, d.server)}
                  </div>
                  <div className="w-20 flex items-center justify-center gap-1">
                    {d.hasConflict ? (
                      <>
                        <button
                          onClick={() => setResolutions((r) => ({ ...r, [d.key]: 'local' }))}
                          className={`px-1.5 py-0.5 rounded text-xs font-medium border ${chosen === 'local' ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 text-gray-500 hover:border-blue-400'}`}
                        >
                          Mine
                        </button>
                        <button
                          onClick={() => setResolutions((r) => ({ ...r, [d.key]: 'server' }))}
                          className={`px-1.5 py-0.5 rounded text-xs font-medium border ${chosen === 'server' ? 'bg-orange-500 text-white border-orange-500' : 'border-gray-300 text-gray-500 hover:border-orange-400'}`}
                        >
                          Server
                        </button>
                      </>
                    ) : serverChanged ? (
                      <span className="text-orange-500 text-xs">Server wins</span>
                    ) : localChanged ? (
                      <span className="text-blue-500 text-xs">Yours kept</span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <button onClick={() => resolveAll('local')} className="text-xs px-2 py-1 border border-blue-200 text-blue-600 rounded-lg hover:bg-blue-50">Accept all mine</button>
              <button onClick={() => resolveAll('server')} className="text-xs px-2 py-1 border border-orange-200 text-orange-600 rounded-lg hover:bg-orange-50">Accept all server</button>
            </div>
            <button
              disabled={unresolvedConflicts > 0}
              onClick={applyResolution}
              className="px-5 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <GitMerge size={14} />
              {unresolvedConflicts > 0 ? `${unresolvedConflicts} conflict${unresolvedConflicts > 1 ? 's' : ''} remaining` : 'Apply & save merged version'}
            </button>
          </div>
        </div>
      )}

      {phase === 'resolved' && resolvedRecord && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle className="text-green-500" size={18} />
            <span className="font-medium text-green-800">Record saved — etag: {resolvedRecord.etag}</span>
          </div>
          <RecordCard record={resolvedRecord} />
          <button onClick={reset} className="mt-3 text-xs text-green-700 border border-green-300 px-3 py-1 rounded-lg hover:bg-green-100">
            Reset demo
          </button>
        </div>
      )}
    </div>
  );
}

function RecordCard({ record }: { record: ContractRecord }) {
  return (
    <div className="grid grid-cols-2 gap-2 text-xs text-left">
      {(['title', 'vendor', 'value', 'expiryDate', 'status', 'owner', 'notes'] as (keyof ContractRecord)[]).map((k) => (
        <div key={k} className={k === 'notes' || k === 'title' ? 'col-span-2' : ''}>
          <span className="text-gray-400 uppercase tracking-wide text-[10px]">{k}</span>
          <p className="text-gray-700 font-medium">{k === 'value' ? `$${Number(record[k]).toLocaleString()}` : String(record[k])}</p>
        </div>
      ))}
    </div>
  );
}

function EditableRecord({ record, onChange }: { record: ContractRecord; onChange: (f: keyof ContractRecord, v: unknown) => void }) {
  return (
    <div className="grid grid-cols-2 gap-3 text-xs">
      {([
        ['title', 'Title', 'text'],
        ['vendor', 'Vendor', 'text'],
        ['value', 'Value (USD)', 'number'],
        ['expiryDate', 'Expiry Date', 'date'],
        ['status', 'Status', 'select'],
        ['owner', 'Owner', 'text'],
        ['notes', 'Notes', 'textarea'],
      ] as [keyof ContractRecord, string, string][]).map(([key, label, type]) => (
        <div key={key} className={key === 'notes' || key === 'title' ? 'col-span-2' : ''}>
          <label className="block text-gray-500 mb-1 uppercase tracking-wide text-[10px]">{label}</label>
          {type === 'textarea' ? (
            <textarea
              className="w-full border border-gray-200 rounded px-2 py-1 text-xs resize-none focus:outline-none focus:ring-1 focus:ring-blue-300"
              rows={2}
              value={String(record[key])}
              onChange={(e) => onChange(key, e.target.value)}
            />
          ) : type === 'select' ? (
            <select className="w-full border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none" value={String(record[key])} onChange={(e) => onChange(key, e.target.value)}>
              {['Draft', 'Active', 'Under Review', 'Expired'].map((s) => <option key={s}>{s}</option>)}
            </select>
          ) : (
            <input
              type={type}
              className="w-full border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-300"
              value={String(record[key])}
              onChange={(e) => onChange(key, type === 'number' ? Number(e.target.value) : e.target.value)}
            />
          )}
        </div>
      ))}
    </div>
  );
}
