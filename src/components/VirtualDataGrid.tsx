import { useState, useRef, useMemo } from 'react';
import { Search, ArrowUpDown, ArrowUp, ArrowDown, Edit2, Save, X, Eye, EyeOff, RefreshCw } from 'lucide-react';

// ── Synthetic data ────────────────────────────────────────────────────────────
const DEPARTMENTS = ['Engineering', 'Product', 'Finance', 'Operations', 'Legal', 'HR', 'Sales', 'Marketing'];
const STATUS_OPTIONS = ['Active', 'On Leave', 'Remote', 'Contractor'];
const LOCATIONS = ['New York', 'London', 'Singapore', 'Toronto', 'Berlin', 'Sydney', 'Tokyo'];
const FIRST_NAMES = ['James', 'Sarah', 'Michael', 'Emily', 'David', 'Laura', 'Robert', 'Mia', 'Carlos', 'Priya'];
const LAST_NAMES = ['Chen', 'Okafor', 'Müller', 'Patel', 'Tanaka', 'Rossi', 'Smith', 'Garcia', 'Kim', 'Johansson'];

function seededRandom(seed: number) {
  const x = Math.sin(seed + 1) * 10000;
  return x - Math.floor(x);
}

interface Employee {
  id: number;
  name: string;
  email: string;
  department: string;
  role: string;
  location: string;
  status: string;
  salary: number;
  startDate: string;
  headcount: number;
}

function generateEmployees(count: number): Employee[] {
  return Array.from({ length: count }, (_, i) => {
    const r = (offset: number) => seededRandom(i * 13 + offset);
    const first = FIRST_NAMES[Math.floor(r(0) * FIRST_NAMES.length)];
    const last = LAST_NAMES[Math.floor(r(1) * LAST_NAMES.length)];
    const dept = DEPARTMENTS[Math.floor(r(2) * DEPARTMENTS.length)];
    const year = 2015 + Math.floor(r(3) * 10);
    const month = String(Math.floor(r(4) * 12) + 1).padStart(2, '0');
    const day = String(Math.floor(r(5) * 28) + 1).padStart(2, '0');
    return {
      id: i + 1,
      name: `${first} ${last}`,
      email: `${first.toLowerCase()}.${last.toLowerCase()}${i}@enterprise.com`,
      department: dept,
      role: dept === 'Engineering' ? ['Sr. Engineer', 'Staff Engineer', 'Principal'][Math.floor(r(6) * 3)]
        : dept === 'Finance' ? ['Analyst', 'Controller', 'Director'][Math.floor(r(6) * 3)]
        : ['Manager', 'Lead', 'Specialist'][Math.floor(r(6) * 3)],
      location: LOCATIONS[Math.floor(r(7) * LOCATIONS.length)],
      status: STATUS_OPTIONS[Math.floor(r(8) * STATUS_OPTIONS.length)],
      salary: Math.round((60000 + r(9) * 120000) / 1000) * 1000,
      startDate: `${year}-${month}-${day}`,
      headcount: Math.floor(r(10) * 20) + 1,
    };
  });
}

const ALL_ROWS = generateEmployees(1000);

const ROW_HEIGHT = 44;
const OVERSCAN = 5;

type SortDir = 'asc' | 'desc' | null;

interface ColDef {
  key: keyof Employee;
  label: string;
  width: number;
  editable?: boolean;
  format?: (v: unknown) => string;
}

const COLUMNS: ColDef[] = [
  { key: 'id', label: 'ID', width: 60 },
  { key: 'name', label: 'Name', width: 160, editable: true },
  { key: 'department', label: 'Department', width: 130 },
  { key: 'role', label: 'Role', width: 150, editable: true },
  { key: 'location', label: 'Location', width: 110 },
  { key: 'status', label: 'Status', width: 100 },
  { key: 'salary', label: 'Salary', width: 100, format: (v) => `$${Number(v).toLocaleString()}` },
  { key: 'startDate', label: 'Start Date', width: 100 },
];

const STATUS_COLOR: Record<string, string> = {
  Active: 'bg-green-100 text-green-700',
  'On Leave': 'bg-yellow-100 text-yellow-700',
  Remote: 'bg-blue-100 text-blue-700',
  Contractor: 'bg-purple-100 text-purple-700',
};

export function VirtualDataGrid() {
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [sortKey, setSortKey] = useState<keyof Employee | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [edits, setEdits] = useState<Record<number, Partial<Employee>>>({});
  const [editingCell, setEditingCell] = useState<{ rowId: number; col: keyof Employee } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [showCode, setShowCode] = useState(false);
  const [scrollTop, setScrollTop] = useState(0);
  const [refreshCount, setRefreshCount] = useState(0);
  const viewportRef = useRef<HTMLDivElement>(null);
  const viewportHeight = 380;

  const filtered = useMemo(() => {
    let rows = ALL_ROWS;
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (r) => r.name.toLowerCase().includes(q) || r.email.toLowerCase().includes(q) || r.role.toLowerCase().includes(q),
      );
    }
    if (deptFilter) rows = rows.filter((r) => r.department === deptFilter);
    if (sortKey && sortDir) {
      rows = [...rows].sort((a, b) => {
        const av = a[sortKey], bv = b[sortKey];
        const cmp = av < bv ? -1 : av > bv ? 1 : 0;
        return sortDir === 'asc' ? cmp : -cmp;
      });
    }
    return rows;
  }, [search, deptFilter, sortKey, sortDir, refreshCount]);

  const totalHeight = filtered.length * ROW_HEIGHT;
  const startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
  const endIndex = Math.min(filtered.length, Math.ceil((scrollTop + viewportHeight) / ROW_HEIGHT) + OVERSCAN);
  const visibleRows = filtered.slice(startIndex, endIndex);

  const toggleSort = (key: keyof Employee) => {
    if (sortKey !== key) { setSortKey(key); setSortDir('asc'); }
    else if (sortDir === 'asc') setSortDir('desc');
    else { setSortKey(null); setSortDir(null); }
  };

  const toggleSelect = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const startEdit = (rowId: number, col: keyof Employee, currentVal: string) => {
    setEditingCell({ rowId, col });
    setEditValue(currentVal);
  };

  const commitEdit = () => {
    if (!editingCell) return;
    setEdits((prev) => ({
      ...prev,
      [editingCell.rowId]: { ...prev[editingCell.rowId], [editingCell.col]: editValue },
    }));
    setEditingCell(null);
  };

  const getCell = (row: Employee, key: keyof Employee): string => {
    const override = edits[row.id]?.[key];
    return String(override !== undefined ? override : row[key]);
  };

  const simulateRefresh = () => {
    setRefreshCount((c) => c + 1);
    // edits are preserved across refresh — this is intentional
  };

  const editCount = Object.keys(edits).length;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Employee Directory</h2>
          <p className="text-xs text-gray-500">
            {filtered.length.toLocaleString()} of {ALL_ROWS.length.toLocaleString()} rows · Virtual rendering (overscan={OVERSCAN}) · {editCount} unsaved edit{editCount !== 1 ? 's' : ''} preserved on refresh
          </p>
        </div>
        <div className="flex items-center gap-2">
          {editCount > 0 && (
            <span className="text-xs bg-amber-50 border border-amber-200 text-amber-700 px-2 py-1 rounded-full">
              {editCount} unsaved {editCount === 1 ? 'edit' : 'edits'}
            </span>
          )}
          <button onClick={simulateRefresh} className="flex items-center gap-1 text-xs text-gray-600 border border-gray-200 px-2 py-1 rounded-lg hover:bg-gray-50">
            <RefreshCw size={11} /> Refresh data
          </button>
          <button onClick={() => setShowCode((v) => !v)} className="flex items-center gap-1 text-xs text-blue-600 border border-blue-200 px-2 py-1 rounded-lg hover:bg-blue-50">
            {showCode ? <EyeOff size={11} /> : <Eye size={11} />}
            {showCode ? 'Hide' : 'View'} implementation
          </button>
        </div>
      </div>

      {showCode && (
        <div className="bg-gray-900 rounded-xl p-4 overflow-auto max-h-64 text-xs code-highlight leading-relaxed">
          <div className="text-gray-400 mb-2">// VirtualDataGrid.tsx — virtual scroll core</div>
          <div><span className="cm">// Only render visible window + overscan — O(viewport) not O(n)</span></div>
          <div><span className="kw">const</span> startIndex = Math.<span className="fn">max</span>(<span className="num">0</span>,</div>
          <div className="pl-4">Math.<span className="fn">floor</span>(scrollTop / ROW_HEIGHT) - OVERSCAN</div>
          <div>);</div>
          <div><span className="kw">const</span> endIndex = Math.<span className="fn">min</span>(filtered.length,</div>
          <div className="pl-4">Math.<span className="fn">ceil</span>((scrollTop + viewportHeight) / ROW_HEIGHT) + OVERSCAN</div>
          <div>);</div>
          <div><span className="kw">const</span> visibleRows = filtered.<span className="fn">slice</span>(startIndex, endIndex);</div>
          <div className="mt-2"><span className="cm">// Edits map keyed by row ID — survives data refresh</span></div>
          <div><span className="kw">const</span> [edits, setEdits] = <span className="fn">useState</span>&lt;Record&lt;<span className="type">number</span>, Partial&lt;<span className="type">Employee</span>&gt;&gt;&gt;({'{}'});</div>
          <div className="mt-2"><span className="cm">// Read cell value: edit overlay has priority</span></div>
          <div><span className="kw">const</span> <span className="fn">getCell</span> = (row, key) =&gt; {'{'}</div>
          <div className="pl-4"><span className="kw">const</span> override = edits[row.id]?.[key];</div>
          <div className="pl-4"><span className="kw">return</span> override !== <span className="kw">undefined</span> ? override : row[key];</div>
          <div>{'}'}</div>
          <div className="mt-2"><span className="cm">// 1000 rows generated with seeded deterministic random</span></div>
          <div><span className="kw">const</span> ALL_ROWS = <span className="fn">generateEmployees</span>(<span className="num">1000</span>);</div>
        </div>
      )}

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 text-gray-400" size={14} />
          <input
            className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            placeholder="Search name, email, role…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
          value={deptFilter}
          onChange={(e) => setDeptFilter(e.target.value)}
        >
          <option value="">All departments</option>
          {DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}
        </select>
        {selected.size > 0 && (
          <span className="flex items-center px-3 py-1 text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded-lg">
            {selected.size} selected
          </span>
        )}
      </div>

      <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
        {/* Header */}
        <div className="flex bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wide select-none">
          <div className="w-10 shrink-0 flex items-center justify-center py-3">
            <input type="checkbox" className="rounded" onChange={() => {}} checked={false} />
          </div>
          {COLUMNS.map((col) => (
            <div
              key={col.key}
              className="flex items-center gap-1 py-3 px-2 cursor-pointer hover:text-gray-700"
              style={{ width: col.width, minWidth: col.width }}
              onClick={() => toggleSort(col.key)}
            >
              {col.label}
              {sortKey === col.key ? (
                sortDir === 'asc' ? <ArrowUp size={11} /> : <ArrowDown size={11} />
              ) : (
                <ArrowUpDown size={11} className="opacity-30" />
              )}
            </div>
          ))}
        </div>

        {/* Virtual scroll viewport */}
        <div
          ref={viewportRef}
          style={{ height: viewportHeight, overflowY: 'auto', position: 'relative' }}
          onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
        >
          <div style={{ height: totalHeight, position: 'relative' }}>
            {visibleRows.map((row) => {
              const isSelected = selected.has(row.id);
              const hasEdit = !!edits[row.id];
              const top = (startIndex + visibleRows.indexOf(row)) * ROW_HEIGHT;
              return (
                <div
                  key={row.id}
                  style={{ position: 'absolute', top, left: 0, right: 0, height: ROW_HEIGHT }}
                  className={`flex items-center border-b border-gray-100 text-sm transition-colors ${
                    isSelected ? 'bg-blue-50' : hasEdit ? 'bg-amber-50' : 'bg-white hover:bg-gray-50'
                  }`}
                >
                  <div className="w-10 shrink-0 flex items-center justify-center">
                    <input
                      type="checkbox"
                      className="rounded"
                      checked={isSelected}
                      onChange={() => toggleSelect(row.id)}
                    />
                  </div>
                  {COLUMNS.map((col) => {
                    const rawVal = getCell(row, col.key);
                    const displayVal = col.format ? col.format(rawVal) : rawVal;
                    const isEditing = editingCell?.rowId === row.id && editingCell?.col === col.key;
                    const wasEdited = edits[row.id]?.[col.key] !== undefined;

                    return (
                      <div
                        key={col.key}
                        style={{ width: col.width, minWidth: col.width }}
                        className="px-2 py-1 overflow-hidden"
                      >
                        {isEditing ? (
                          <div className="flex items-center gap-1">
                            <input
                              autoFocus
                              className="flex-1 border border-blue-400 rounded px-1 py-0.5 text-xs focus:outline-none"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') commitEdit();
                                if (e.key === 'Escape') setEditingCell(null);
                              }}
                            />
                            <button onClick={commitEdit} className="text-green-600 hover:text-green-700"><Save size={11} /></button>
                            <button onClick={() => setEditingCell(null)} className="text-gray-400 hover:text-gray-600"><X size={11} /></button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 group">
                            {col.key === 'status' ? (
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLOR[rawVal] ?? 'bg-gray-100 text-gray-600'}`}>
                                {rawVal}
                              </span>
                            ) : (
                              <span className={`truncate text-xs ${wasEdited ? 'text-amber-700 font-medium' : 'text-gray-700'}`}>
                                {displayVal}
                              </span>
                            )}
                            {col.editable && (
                              <button
                                className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-blue-500"
                                onClick={() => startEdit(row.id, col.key, rawVal)}
                              >
                                <Edit2 size={10} />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-gray-400">
        <span>Rendering rows {startIndex + 1}–{endIndex} of {filtered.length} (viewport renders ~{endIndex - startIndex} DOM rows)</span>
        <span>Row height: {ROW_HEIGHT}px · Overscan: {OVERSCAN}</span>
      </div>
    </div>
  );
}
