import { useState, useRef, useCallback } from 'react';
import { Upload, Pause, Play, X, RotateCcw, CheckCircle, AlertTriangle, WifiOff, Eye, EyeOff, FileText, FileSpreadsheet, FileImage } from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────
type UploadStatus = 'queued' | 'uploading' | 'paused' | 'error' | 'complete' | 'cancelled';

interface UploadFile {
  id: string;
  name: string;
  size: number;
  type: string;
  totalChunks: number;
  completedChunks: number;
  status: UploadStatus;
  errorMessage?: string;
  speed?: number; // bytes/sec simulated
  simulatedFailAtChunk?: number; // chunk index to fail at
}

const CHUNK_SIZE = 512 * 1024; // 512 KB
const CHUNK_INTERVAL_MS = 200; // simulated time per chunk

// ── Synthetic demo files ──────────────────────────────────────────────────────
function createDemoFile(name: string, sizeBytes: number, failAtChunk?: number): UploadFile {
  const totalChunks = Math.ceil(sizeBytes / CHUNK_SIZE);
  return {
    id: `file-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name,
    size: sizeBytes,
    type: name.endsWith('.xlsx') ? 'spreadsheet' : name.endsWith('.pdf') ? 'pdf' : 'image',
    totalChunks,
    completedChunks: 0,
    status: 'queued',
    simulatedFailAtChunk: failAtChunk,
  };
}

const DEMO_FILES: Omit<UploadFile, 'id'>[] = [
  { ...createDemoFile('Q4-2025-Financial-Report.pdf', 4.2 * 1024 * 1024), status: 'queued' },
  { ...createDemoFile('Vendor-Contracts-Export.xlsx', 1.8 * 1024 * 1024, 4), status: 'queued' }, // will fail at chunk 4
  { ...createDemoFile('Compliance-Audit-Photos.zip', 8.7 * 1024 * 1024), status: 'queued' },
];

function formatBytes(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}

function FileIcon({ type }: { type: string }) {
  if (type === 'pdf') return <FileText size={18} className="text-red-400" />;
  if (type === 'spreadsheet') return <FileSpreadsheet size={18} className="text-green-500" />;
  return <FileImage size={18} className="text-blue-400" />;
}

const STATUS_LABEL: Record<UploadStatus, string> = {
  queued: 'Queued',
  uploading: 'Uploading…',
  paused: 'Paused',
  error: 'Failed',
  complete: 'Complete',
  cancelled: 'Cancelled',
};

const STATUS_COLOR: Record<UploadStatus, string> = {
  queued: 'text-gray-400',
  uploading: 'text-blue-500',
  paused: 'text-amber-500',
  error: 'text-red-500',
  complete: 'text-green-600',
  cancelled: 'text-gray-400',
};

// ── Component ─────────────────────────────────────────────────────────────────
export function ResumableUpload() {
  const [files, setFiles] = useState<UploadFile[]>(() =>
    DEMO_FILES.map((f) => ({ ...f, id: `file-${Math.random().toString(36).slice(2, 8)}` })),
  );
  const [showCode, setShowCode] = useState(false);
  const [simulateNetworkFailure, setSimulateNetworkFailure] = useState(false);
  const timersRef = useRef<Map<string, ReturnType<typeof setInterval>>>(new Map());

  const updateFile = useCallback((id: string, patch: Partial<UploadFile>) => {
    setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  }, []);

  const startUpload = useCallback((fileId: string) => {
    setFiles((prev) => {
      const file = prev.find((f) => f.id === fileId);
      if (!file || file.status === 'complete' || file.status === 'cancelled') return prev;
      return prev.map((f) => (f.id === fileId ? { ...f, status: 'uploading' } : f));
    });

    const tick = () => {
      setFiles((prev) => {
        const file = prev.find((f) => f.id === fileId);
        if (!file || file.status !== 'uploading') return prev;

        // Simulate network failure
        if (simulateNetworkFailure && Math.random() < 0.15) {
          clearInterval(timersRef.current.get(fileId));
          timersRef.current.delete(fileId);
          return prev.map((f) =>
            f.id === fileId
              ? { ...f, status: 'error', errorMessage: 'Network timeout — completed chunks preserved' }
              : f,
          );
        }

        // Simulate per-file failure at specific chunk
        if (file.simulatedFailAtChunk !== undefined && file.completedChunks >= file.simulatedFailAtChunk) {
          clearInterval(timersRef.current.get(fileId));
          timersRef.current.delete(fileId);
          return prev.map((f) =>
            f.id === fileId
              ? {
                  ...f,
                  status: 'error',
                  errorMessage: `Server rejected chunk ${file.completedChunks + 1} — retry will resume from chunk ${file.completedChunks + 1}`,
                }
              : f,
          );
        }

        const next = file.completedChunks + 1;
        if (next >= file.totalChunks) {
          clearInterval(timersRef.current.get(fileId));
          timersRef.current.delete(fileId);
          return prev.map((f) => (f.id === fileId ? { ...f, status: 'complete', completedChunks: f.totalChunks } : f));
        }

        const speed = 512 * 1024 * (0.7 + Math.random() * 0.6); // 350–700 KB/s simulated
        return prev.map((f) =>
          f.id === fileId ? { ...f, completedChunks: next, speed } : f,
        );
      });
    };

    const interval = setInterval(tick, CHUNK_INTERVAL_MS);
    timersRef.current.set(fileId, interval);
  }, [simulateNetworkFailure]);

  const pauseUpload = (fileId: string) => {
    clearInterval(timersRef.current.get(fileId));
    timersRef.current.delete(fileId);
    updateFile(fileId, { status: 'paused' });
  };

  const resumeUpload = (fileId: string) => {
    updateFile(fileId, { status: 'uploading', errorMessage: undefined });
    setTimeout(() => startUpload(fileId), 10);
  };

  const cancelUpload = (fileId: string) => {
    clearInterval(timersRef.current.get(fileId));
    timersRef.current.delete(fileId);
    updateFile(fileId, { status: 'cancelled', completedChunks: 0 });
  };

  const retryUpload = (fileId: string) => {
    // Resume from last completed chunk — do NOT reset completedChunks
    updateFile(fileId, { status: 'uploading', errorMessage: undefined });
    setTimeout(() => startUpload(fileId), 10);
  };

  const startAll = () => {
    files.filter((f) => f.status === 'queued').forEach((f) => startUpload(f.id));
  };

  const addDemoFile = () => {
    const names = ['Due-Diligence-Pack.pdf', 'Budget-Forecast-2026.xlsx', 'Site-Photos.zip'];
    const sizes = [2.1, 0.9, 5.4].map((m) => Math.round(m * 1024 * 1024));
    const i = Math.floor(Math.random() * 3);
    setFiles((prev) => [
      ...prev,
      { ...createDemoFile(names[i], sizes[i]), id: `file-${Math.random().toString(36).slice(2, 8)}`, status: 'queued' },
    ]);
  };

  const totalSize = files.reduce((s, f) => s + f.size, 0);
  const uploadedBytes = files.reduce((s, f) => s + (f.completedChunks / f.totalChunks) * f.size, 0);
  const overallPct = totalSize > 0 ? Math.round((uploadedBytes / totalSize) * 100) : 0;

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Resumable Upload Workspace</h2>
          <p className="text-xs text-gray-500">Chunked upload — pause, resume, retry · Simulated backend</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowCode((v) => !v)} className="flex items-center gap-1 text-xs text-blue-600 border border-blue-200 px-2 py-1 rounded-lg">
            {showCode ? <EyeOff size={11} /> : <Eye size={11} />}
            {showCode ? 'Hide' : 'View'} implementation
          </button>
        </div>
      </div>

      {/* Simulated backend notice */}
      <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
        <AlertTriangle size={13} className="shrink-0" />
        <span>
          <strong>Simulated backend</strong> — chunk upload, server responses, and network failures are all browser-side simulations.
          Chunk state persists in React state (not <code className="bg-amber-100 px-1 rounded">localStorage</code>).
          Production implementation would use <code className="bg-amber-100 px-1 rounded">tus-js-client</code> or a custom chunked multipart API.
        </span>
      </div>

      {showCode && (
        <div className="bg-gray-900 rounded-xl p-4 overflow-auto max-h-64 text-xs code-highlight leading-relaxed">
          <div className="text-gray-400 mb-2">// ResumableUpload.tsx — chunked upload with resume</div>
          <div><span className="kw">const</span> CHUNK_SIZE = <span className="num">512 * 1024</span>; <span className="cm">// 512 KB per chunk</span></div>
          <div className="mt-2"><span className="cm">// Resume: keep completedChunks — start from next chunk</span></div>
          <div><span className="kw">const</span> <span className="fn">retryUpload</span> = (fileId) =&gt; {'{'}</div>
          <div className="pl-4"><span className="fn">updateFile</span>(fileId, {'{'} status: <span className="str">'uploading'</span>, errorMessage: <span className="kw">undefined</span> {'}'});</div>
          <div className="pl-4"><span className="cm">// Does NOT reset completedChunks — resumes from checkpoint</span></div>
          <div className="pl-4"><span className="fn">setTimeout</span>(() =&gt; <span className="fn">startUpload</span>(fileId), <span className="num">10</span>);</div>
          <div>{'}'}</div>
          <div className="mt-2"><span className="cm">// Production: PUT /upload/{'{fileId}'}/chunks/{'{chunkIndex}'}</span></div>
          <div><span className="cm">// with Content-Range: bytes {'{start}'}-{'{end}'}/{'{total}'}</span></div>
          <div><span className="cm">// Server responds 308 Resume Incomplete or 200 Complete</span></div>
          <div className="mt-2"><span className="cm">// Pause: cancel setInterval, preserve completedChunks</span></div>
          <div><span className="kw">const</span> <span className="fn">pauseUpload</span> = (fileId) =&gt; {'{'}</div>
          <div className="pl-4"><span className="fn">clearInterval</span>(timers.<span className="fn">get</span>(fileId));</div>
          <div className="pl-4"><span className="fn">updateFile</span>(fileId, {'{'} status: <span className="str">'paused'</span> {'}'});</div>
          <div>{'}'}</div>
        </div>
      )}

      {/* Network failure toggle */}
      <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-xl">
        <div className="flex items-center gap-2 text-xs">
          <WifiOff size={13} className={simulateNetworkFailure ? 'text-red-500' : 'text-gray-400'} />
          <span className={simulateNetworkFailure ? 'text-red-600 font-medium' : 'text-gray-600'}>
            Simulate random network failures
          </span>
          {simulateNetworkFailure && <span className="text-red-500 text-[10px]">(~15% chunk fail rate)</span>}
        </div>
        <button
          onClick={() => setSimulateNetworkFailure((v) => !v)}
          className={`relative w-10 h-5 rounded-full transition-colors ${simulateNetworkFailure ? 'bg-red-500' : 'bg-gray-300'}`}
        >
          <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${simulateNetworkFailure ? 'translate-x-5' : 'translate-x-0.5'}`} />
        </button>
      </div>

      {/* Overall progress */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-gray-600">Overall progress</span>
          <span className="text-xs font-mono text-gray-500">
            {formatBytes(Math.round(uploadedBytes))} / {formatBytes(totalSize)}
          </span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2 mb-3">
          <div
            className="h-2 rounded-full bg-blue-500 transition-all duration-200"
            style={{ width: `${overallPct}%` }}
          />
        </div>
        <div className="flex gap-2">
          <button onClick={startAll} className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700">
            <Upload size={12} />
            Start all queued
          </button>
          <button onClick={addDemoFile} className="flex items-center gap-1 px-3 py-1.5 border border-gray-200 text-gray-600 rounded-lg text-xs hover:bg-gray-50">
            + Add file
          </button>
        </div>
      </div>

      {/* File list */}
      <div className="space-y-2">
        {files.map((file) => {
          const pct = file.totalChunks > 0 ? Math.round((file.completedChunks / file.totalChunks) * 100) : 0;
          const uploadedSoFar = (file.completedChunks / file.totalChunks) * file.size;
          return (
            <div key={file.id} className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="flex items-start gap-3 mb-3">
                <FileIcon type={file.type} />
                <div className="flex-1 overflow-hidden">
                  <p className="text-sm font-medium text-gray-800 truncate">{file.name}</p>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-gray-400">{formatBytes(file.size)}</span>
                    <span className="text-gray-300">·</span>
                    <span className="text-gray-400">{file.totalChunks} chunks × {formatBytes(CHUNK_SIZE)}</span>
                    <span className="text-gray-300">·</span>
                    <span className={STATUS_COLOR[file.status]}>{STATUS_LABEL[file.status]}</span>
                    {file.status === 'uploading' && file.speed && (
                      <>
                        <span className="text-gray-300">·</span>
                        <span className="text-blue-400">{formatBytes(file.speed)}/s</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {file.status === 'queued' && (
                    <button onClick={() => startUpload(file.id)} className="p-1.5 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200">
                      <Play size={12} />
                    </button>
                  )}
                  {file.status === 'uploading' && (
                    <button onClick={() => pauseUpload(file.id)} className="p-1.5 bg-amber-100 text-amber-600 rounded-lg hover:bg-amber-200">
                      <Pause size={12} />
                    </button>
                  )}
                  {(file.status === 'paused' || file.status === 'error') && (
                    <button onClick={() => resumeUpload(file.id)} className="p-1.5 bg-green-100 text-green-600 rounded-lg hover:bg-green-200">
                      <Play size={12} />
                    </button>
                  )}
                  {file.status === 'error' && (
                    <button onClick={() => retryUpload(file.id)} className="p-1.5 bg-orange-100 text-orange-600 rounded-lg hover:bg-orange-200">
                      <RotateCcw size={12} />
                    </button>
                  )}
                  {file.status === 'complete' && <CheckCircle size={18} className="text-green-500" />}
                  {(file.status === 'uploading' || file.status === 'paused' || file.status === 'queued') && (
                    <button onClick={() => cancelUpload(file.id)} className="p-1.5 bg-gray-100 text-gray-400 rounded-lg hover:bg-red-50 hover:text-red-400">
                      <X size={12} />
                    </button>
                  )}
                </div>
              </div>

              {/* Progress bar */}
              {file.status !== 'cancelled' && (
                <div>
                  <div className="flex justify-between text-xs text-gray-400 mb-1">
                    <span>{file.completedChunks}/{file.totalChunks} chunks</span>
                    <span>{formatBytes(Math.round(uploadedSoFar))} / {formatBytes(file.size)} ({pct}%)</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full transition-all duration-200 ${
                        file.status === 'error' ? 'bg-red-400' :
                        file.status === 'complete' ? 'bg-green-500' :
                        file.status === 'paused' ? 'bg-amber-400' : 'bg-blue-500'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )}

              {file.errorMessage && (
                <p className="mt-2 text-xs text-red-600 flex items-center gap-1">
                  <AlertTriangle size={11} />
                  {file.errorMessage}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
