import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Trash2, RotateCcw, RotateCw, CheckCircle, AlertTriangle, Eye, EyeOff, GitBranch, Send, Zap } from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────
type NodeType = 'start' | 'approval' | 'condition' | 'notify' | 'end';

interface WFNode {
  id: string;
  type: NodeType;
  label: string;
  x: number;
  y: number;
  approver?: string;
  condition?: string;
}

interface WFEdge {
  id: string;
  from: string;
  to: string;
  label?: string;
}

interface WorkflowState {
  nodes: WFNode[];
  edges: WFEdge[];
}

// ── Initial state ─────────────────────────────────────────────────────────────
const INITIAL: WorkflowState = {
  nodes: [
    { id: 'start', type: 'start', label: 'Request Submitted', x: 60, y: 180 },
    { id: 'n1', type: 'approval', label: 'Finance Review', x: 240, y: 100, approver: 'Finance Manager' },
    { id: 'n2', type: 'condition', label: 'Value > $50K?', x: 430, y: 180, condition: 'contract.value > 50000' },
    { id: 'n3', type: 'approval', label: 'Executive Approval', x: 610, y: 80, approver: 'VP of Finance' },
    { id: 'n4', type: 'notify', label: 'Notify Requestor', x: 610, y: 280 },
    { id: 'end', type: 'end', label: 'Workflow Complete', x: 790, y: 180 },
  ],
  edges: [
    { id: 'e1', from: 'start', to: 'n1' },
    { id: 'e2', from: 'n1', to: 'n2', label: 'Approved' },
    { id: 'e3', from: 'n2', to: 'n3', label: 'Yes' },
    { id: 'e4', from: 'n2', to: 'n4', label: 'No' },
    { id: 'e5', from: 'n3', to: 'end', label: 'Approved' },
    { id: 'e6', from: 'n4', to: 'end' },
  ],
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function detectCycle(nodes: WFNode[], edges: WFEdge[]): string[] {
  const adj: Map<string, string[]> = new Map();
  nodes.forEach((n) => adj.set(n.id, []));
  edges.forEach((e) => adj.get(e.from)?.push(e.to));

  const visited = new Set<string>();
  const recStack = new Set<string>();
  const cycleNodes: string[] = [];

  function dfs(node: string): boolean {
    visited.add(node);
    recStack.add(node);
    for (const next of adj.get(node) ?? []) {
      if (!visited.has(next)) {
        if (dfs(next)) {
          cycleNodes.push(next);
          return true;
        }
      } else if (recStack.has(next)) {
        cycleNodes.push(next);
        return true;
      }
    }
    recStack.delete(node);
    return false;
  }

  nodes.forEach((n) => { if (!visited.has(n.id)) dfs(n.id); });
  return cycleNodes;
}

function validateWorkflow(state: WorkflowState): string[] {
  const errors: string[] = [];
  const { nodes, edges } = state;
  const startNodes = nodes.filter((n) => n.type === 'start');
  const endNodes = nodes.filter((n) => n.type === 'end');
  if (startNodes.length !== 1) errors.push('Workflow must have exactly one Start node');
  if (endNodes.length < 1) errors.push('Workflow must have at least one End node');

  nodes.forEach((n) => {
    if (n.type === 'approval' && !n.approver) errors.push(`"${n.label}" has no approver assigned`);
    if (n.type !== 'end') {
      const outEdges = edges.filter((e) => e.from === n.id);
      if (outEdges.length === 0) errors.push(`"${n.label}" has no outgoing connection`);
    }
    if (n.type === 'condition') {
      const outEdges = edges.filter((e) => e.from === n.id);
      if (outEdges.length < 2) errors.push(`Condition "${n.label}" needs at least 2 branches`);
    }
  });

  const cycles = detectCycle(nodes, edges);
  if (cycles.length > 0) errors.push(`Circular connection detected — remove cycles before publishing`);

  return errors;
}

const NODE_STYLES: Record<NodeType, { bg: string; border: string; text: string; icon: React.ReactNode }> = {
  start: { bg: 'bg-green-50', border: 'border-green-400', text: 'text-green-700', icon: <Zap size={12} /> },
  approval: { bg: 'bg-blue-50', border: 'border-blue-400', text: 'text-blue-700', icon: <CheckCircle size={12} /> },
  condition: { bg: 'bg-amber-50', border: 'border-amber-400', text: 'text-amber-700', icon: <GitBranch size={12} /> },
  notify: { bg: 'bg-purple-50', border: 'border-purple-400', text: 'text-purple-700', icon: <Send size={12} /> },
  end: { bg: 'bg-gray-50', border: 'border-gray-400', text: 'text-gray-600', icon: <CheckCircle size={12} /> },
};

// SVG-compatible colours (Tailwind class names don't apply to SVG attributes)
const NODE_SVG: Record<NodeType, { fill: string; stroke: string; color: string }> = {
  start:     { fill: '#f0fdf4', stroke: '#4ade80', color: '#15803d' },
  approval:  { fill: '#eff6ff', stroke: '#60a5fa', color: '#1d4ed8' },
  condition: { fill: '#fffbeb', stroke: '#fbbf24', color: '#92400e' },
  notify:    { fill: '#faf5ff', stroke: '#c084fc', color: '#6b21a8' },
  end:       { fill: '#f9fafb', stroke: '#9ca3af', color: '#374151' },
};

const NODE_W = 130;
const NODE_H = 52;

function nodeCenter(n: WFNode) {
  return { x: n.x + NODE_W / 2, y: n.y + NODE_H / 2 };
}

// ── Component ─────────────────────────────────────────────────────────────────
export function WorkflowBuilder() {
  const [history, setHistory] = useState<WorkflowState[]>([INITIAL]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const state = history[historyIndex];
  const { nodes, edges } = state;

  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [connectFrom, setConnectFrom] = useState<string | null>(null);
  const [rejectedEdge, setRejectedEdge] = useState<{ from: string; to: string } | null>(null);
  const [publishErrors, setPublishErrors] = useState<string[]>([]);
  const [published, setPublished] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const [dragging, setDragging] = useState<{ id: string; offsetX: number; offsetY: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const pushState = useCallback((next: WorkflowState) => {
    setHistory((h) => [...h.slice(0, historyIndex + 1), next]);
    setHistoryIndex((i) => i + 1);
    setPublished(false);
    setPublishErrors([]);
  }, [historyIndex]);

  const undo = () => { if (historyIndex > 0) setHistoryIndex((i) => i - 1); };
  const redo = () => { if (historyIndex < history.length - 1) setHistoryIndex((i) => i + 1); };

  const deleteNode = (id: string) => {
    if (id === 'start' || id === 'end') return;
    pushState({
      nodes: nodes.filter((n) => n.id !== id),
      edges: edges.filter((e) => e.from !== id && e.to !== id),
    });
    setSelectedNode(null);
  };

  const addNode = (type: NodeType) => {
    const newNode: WFNode = {
      id: `n${Date.now()}`,
      type,
      label: type === 'approval' ? 'New Approval' : type === 'condition' ? 'Condition' : 'Notification',
      x: 200 + Math.random() * 200,
      y: 100 + Math.random() * 150,
      approver: type === 'approval' ? '' : undefined,
    };
    pushState({ ...state, nodes: [...nodes, newNode] });
  };

  const tryConnect = (toId: string) => {
    if (!connectFrom || connectFrom === toId) { setConnectFrom(null); return; }
    const from = connectFrom;
    setConnectFrom(null);

    // Check for duplicate edge
    if (edges.some((e) => e.from === from && e.to === toId)) {
      setRejectedEdge({ from, to: toId });
      setTimeout(() => setRejectedEdge(null), 2000);
      return;
    }

    // Check if adding this edge would create a cycle
    const testEdge: WFEdge = { id: 'test', from, to: toId };
    const cycle = detectCycle(nodes, [...edges, testEdge]);
    if (cycle.length > 0) {
      setRejectedEdge({ from, to: toId });
      setTimeout(() => setRejectedEdge(null), 2500);
      return;
    }

    const fromNode = nodes.find((n) => n.id === from);
    const label = fromNode?.type === 'condition' ? 'Branch' : undefined;
    pushState({ ...state, edges: [...edges, { id: `e${Date.now()}`, from, to: toId, label }] });
  };

  const handlePublish = () => {
    const errs = validateWorkflow(state);
    setPublishErrors(errs);
    if (errs.length === 0) setPublished(true);
  };

  // Drag handlers
  const onMouseDown = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    const node = nodes.find((n) => n.id === nodeId)!;
    const rect = (e.currentTarget as HTMLElement).closest('svg')!.getBoundingClientRect();
    setDragging({ id: nodeId, offsetX: e.clientX - rect.left - node.x, offsetY: e.clientY - rect.top - node.y });
  };

  const onMouseMove = useCallback((e: MouseEvent) => {
    if (!dragging || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(860, e.clientX - rect.left - dragging.offsetX));
    const y = Math.max(0, Math.min(330, e.clientY - rect.top - dragging.offsetY));
    setHistory((h) => {
      const curr = h[historyIndex];
      return [
        ...h.slice(0, historyIndex),
        { ...curr, nodes: curr.nodes.map((n) => (n.id === dragging.id ? { ...n, x, y } : n)) },
        ...h.slice(historyIndex + 1),
      ];
    });
  }, [dragging, historyIndex]);

  const onMouseUp = useCallback(() => setDragging(null), []);

  useEffect(() => {
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => { window.removeEventListener('mousemove', onMouseMove); window.removeEventListener('mouseup', onMouseUp); };
  }, [onMouseMove, onMouseUp]);

  const selectedNodeData = nodes.find((n) => n.id === selectedNode);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Visual Workflow Builder</h2>
          <p className="text-xs text-gray-500">Drag nodes · Click + Connect to wire steps · Cycle detection built-in</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={undo} disabled={historyIndex === 0} className="p-1.5 border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50">
            <RotateCcw size={13} />
          </button>
          <button onClick={redo} disabled={historyIndex === history.length - 1} className="p-1.5 border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50">
            <RotateCw size={13} />
          </button>
          <button onClick={() => setShowCode((v) => !v)} className="flex items-center gap-1 text-xs text-blue-600 border border-blue-200 px-2 py-1 rounded-lg">
            {showCode ? <EyeOff size={11} /> : <Eye size={11} />}
            {showCode ? 'Hide' : 'View'} implementation
          </button>
        </div>
      </div>

      {showCode && (
        <div className="bg-gray-900 rounded-xl p-4 overflow-auto max-h-52 text-xs code-highlight leading-relaxed">
          <div className="text-gray-400 mb-2">// WorkflowBuilder.tsx — cycle detection + validation</div>
          <div><span className="kw">function</span> <span className="fn">detectCycle</span>(nodes, edges) {'{'}</div>
          <div className="pl-4"><span className="kw">const</span> adj = <span className="kw">new</span> <span className="fn">Map</span>(nodes.<span className="fn">map</span>(n =&gt; [n.id, []]));</div>
          <div className="pl-4">edges.<span className="fn">forEach</span>(e =&gt; adj.<span className="fn">get</span>(e.from)?.<span className="fn">push</span>(e.to));</div>
          <div className="pl-4"><span className="cm">// DFS with recursion stack — O(V + E)</span></div>
          <div className="pl-4"><span className="kw">function</span> <span className="fn">dfs</span>(node) {'{'}</div>
          <div className="pl-8">visited.<span className="fn">add</span>(node); recStack.<span className="fn">add</span>(node);</div>
          <div className="pl-8"><span className="kw">for</span> (<span className="kw">const</span> next <span className="kw">of</span> adj.<span className="fn">get</span>(node) ?? []) {'{'}</div>
          <div className="pl-12"><span className="kw">if</span> (recStack.<span className="fn">has</span>(next)) <span className="kw">return true</span>; <span className="cm">// cycle</span></div>
          <div className="pl-12"><span className="kw">if</span> (!visited.<span className="fn">has</span>(next) && <span className="fn">dfs</span>(next)) <span className="kw">return true</span>;</div>
          <div className="pl-8">{'}'}</div>
          <div className="pl-8">recStack.<span className="fn">delete</span>(node); <span className="kw">return false</span>;</div>
          <div className="pl-4">{'}'}</div>
          <div>{'}'}</div>
          <div className="mt-2"><span className="cm">// Test before adding — reject if cycle would form</span></div>
          <div><span className="kw">const</span> cycle = <span className="fn">detectCycle</span>(nodes, [...edges, newEdge]);</div>
          <div><span className="kw">if</span> (cycle.length {'>'} <span className="num">0</span>) {'{'} <span className="fn">setRejectedEdge</span>(...); <span className="kw">return</span>; {'}'}</div>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center gap-2 p-3 bg-gray-50 border border-gray-200 rounded-xl flex-wrap">
        <span className="text-xs text-gray-500 font-medium">Add node:</span>
        {(['approval', 'condition', 'notify'] as NodeType[]).map((t) => {
          const s = NODE_STYLES[t];
          return (
            <button key={t} onClick={() => addNode(t)} className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg border ${s.bg} ${s.border} ${s.text} hover:brightness-95`}>
              {s.icon}
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          );
        })}
        <div className="flex-1" />
        {connectFrom && (
          <span className="text-xs bg-blue-50 border border-blue-200 text-blue-700 px-2 py-1 rounded-full flex items-center gap-1">
            Connecting from "{nodes.find((n) => n.id === connectFrom)?.label}" — click target
          </span>
        )}
        {rejectedEdge && (
          <span className="text-xs bg-red-50 border border-red-200 text-red-700 px-2 py-1 rounded-full flex items-center gap-1">
            <AlertTriangle size={11} />
            Connection rejected — would create a cycle
          </span>
        )}
      </div>

      <div className="flex gap-3">
        {/* Canvas */}
        <div className="flex-1 border border-gray-200 rounded-xl bg-white overflow-hidden" style={{ height: 390 }}>
          <svg
            ref={svgRef}
            width="100%"
            height="100%"
            viewBox="0 0 1000 400"
            style={{ cursor: dragging ? 'grabbing' : 'default' }}
          >
            <defs>
              <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                <polygon points="0 0, 8 3, 0 6" fill="#94a3b8" />
              </marker>
              <marker id="arrowhead-reject" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                <polygon points="0 0, 8 3, 0 6" fill="#ef4444" />
              </marker>
            </defs>

            {/* Grid pattern */}
            <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#f1f5f9" strokeWidth="0.5" />
            </pattern>
            <rect width="1000" height="400" fill="url(#grid)" />

            {/* Edges */}
            {edges.map((edge) => {
              const fromNode = nodes.find((n) => n.id === edge.from);
              const toNode = nodes.find((n) => n.id === edge.to);
              if (!fromNode || !toNode) return null;
              const fc = nodeCenter(fromNode);
              const tc = nodeCenter(toNode);
              const mx = (fc.x + tc.x) / 2;
              const my = (fc.y + tc.y) / 2;
              const isRejected = rejectedEdge?.from === edge.from;
              return (
                <g key={edge.id}>
                  <line
                    x1={fc.x} y1={fc.y} x2={tc.x} y2={tc.y}
                    stroke={isRejected ? '#ef4444' : '#94a3b8'}
                    strokeWidth="1.5"
                    markerEnd={`url(#arrowhead${isRejected ? '-reject' : ''})`}
                  />
                  {edge.label && (
                    <text x={mx} y={my - 6} textAnchor="middle" fontSize="10" fill="#64748b" fontFamily="Inter, sans-serif">
                      {edge.label}
                    </text>
                  )}
                </g>
              );
            })}

            {/* Rejected edge preview */}
            {rejectedEdge && (() => {
              const fromNode = nodes.find((n) => n.id === rejectedEdge.from);
              const toNode = nodes.find((n) => n.id === rejectedEdge.to);
              if (!fromNode || !toNode) return null;
              const fc = nodeCenter(fromNode);
              const tc = nodeCenter(toNode);
              return (
                <line x1={fc.x} y1={fc.y} x2={tc.x} y2={tc.y} stroke="#ef4444" strokeWidth="2" strokeDasharray="5,3" markerEnd="url(#arrowhead-reject)" />
              );
            })()}

            {/* Nodes */}
            {nodes.map((node) => {
              const style = NODE_STYLES[node.type];
              const isSelected = selectedNode === node.id;
              const isConnectSrc = connectFrom === node.id;
              return (
                <g
                  key={node.id}
                  transform={`translate(${node.x},${node.y})`}
                  style={{ cursor: dragging?.id === node.id ? 'grabbing' : 'grab', userSelect: 'none' }}
                  onClick={() => {
                    if (connectFrom) { tryConnect(node.id); return; }
                    setSelectedNode(node.id === selectedNode ? null : node.id);
                  }}
                  onMouseDown={(e) => onMouseDown(e, node.id)}
                >
                  <rect
                    width={NODE_W}
                    height={NODE_H}
                    rx="8"
                    fill={NODE_SVG[node.type].fill}
                    stroke={isSelected || isConnectSrc ? '#3b82f6' : NODE_SVG[node.type].stroke}
                    strokeWidth={isSelected || isConnectSrc ? 2 : 1.5}
                    style={{ filter: isSelected ? 'drop-shadow(0 2px 8px rgba(59,130,246,0.3))' : 'none' }}
                  />
                  <foreignObject width={NODE_W} height={NODE_H}>
                    <div style={{ color: NODE_SVG[node.type].color }} className="flex flex-col items-center justify-center h-full px-2">
                      <div className="flex items-center gap-1">
                        {style.icon}
                        <span className="text-[10px] font-semibold truncate max-w-[90px]">{node.label}</span>
                      </div>
                      {node.approver && <span className="text-[9px] text-gray-400 truncate max-w-[110px]">{node.approver}</span>}
                    </div>
                  </foreignObject>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Inspector panel */}
        <div className="w-44 flex flex-col gap-2">
          {selectedNodeData ? (
            <div className="bg-white border border-gray-200 rounded-xl p-3 space-y-2">
              <p className="text-xs font-semibold text-gray-700">Node Inspector</p>
              <div>
                <label className="text-[10px] text-gray-400 uppercase">Label</label>
                <input
                  className="w-full border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-300"
                  value={selectedNodeData.label}
                  onChange={(e) => {
                    pushState({
                      ...state,
                      nodes: nodes.map((n) => n.id === selectedNodeData.id ? { ...n, label: e.target.value } : n),
                    });
                  }}
                />
              </div>
              {selectedNodeData.type === 'approval' && (
                <div>
                  <label className="text-[10px] text-gray-400 uppercase">Approver</label>
                  <input
                    className="w-full border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-300"
                    value={selectedNodeData.approver ?? ''}
                    onChange={(e) => {
                      pushState({
                        ...state,
                        nodes: nodes.map((n) => n.id === selectedNodeData.id ? { ...n, approver: e.target.value } : n),
                      });
                    }}
                  />
                </div>
              )}
              <div className="flex gap-1 pt-1">
                <button
                  onClick={() => setConnectFrom(selectedNodeData.id)}
                  className="flex-1 text-xs bg-blue-50 text-blue-600 border border-blue-200 rounded px-2 py-1 hover:bg-blue-100"
                >
                  Connect
                </button>
                {selectedNodeData.type !== 'start' && selectedNodeData.type !== 'end' && (
                  <button
                    onClick={() => deleteNode(selectedNodeData.id)}
                    className="p-1 bg-red-50 text-red-400 border border-red-200 rounded hover:bg-red-100"
                  >
                    <Trash2 size={11} />
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs text-gray-400 text-center">
              Click a node to inspect and connect
            </div>
          )}

          {/* Publish */}
          <button
            onClick={handlePublish}
            className={`w-full py-2 rounded-lg text-sm font-medium transition-colors ${published ? 'bg-green-500 text-white' : 'bg-slate-800 text-white hover:bg-slate-700'}`}
          >
            {published ? '✓ Published' : 'Validate & Publish'}
          </button>

          {publishErrors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-2 space-y-1">
              {publishErrors.map((e, i) => (
                <p key={i} className="text-[10px] text-red-700 flex items-start gap-1">
                  <AlertTriangle size={10} className="shrink-0 mt-0.5" />
                  {e}
                </p>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
