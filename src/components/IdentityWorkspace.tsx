import { useState } from 'react';
import { Building2, Shield, ChevronDown, CheckCircle, XCircle, Eye, EyeOff, Lock, Unlock, LogIn } from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────
type Role = 'admin' | 'finance_manager' | 'auditor' | 'viewer';

interface OrgUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatar: string;
}

interface Organisation {
  id: string;
  name: string;
  industry: string;
  plan: 'Enterprise' | 'Professional' | 'Starter';
  user: OrgUser;
  cachedData: { contracts: number; pendingReviews: number; budget: string };
}

const ORGS: Organisation[] = [
  {
    id: 'org-northridge',
    name: 'Northridge Capital',
    industry: 'Financial Services',
    plan: 'Enterprise',
    user: { id: 'u1', name: 'Priya Sharma', email: 'p.sharma@northridge.com', role: 'admin', avatar: 'PS' },
    cachedData: { contracts: 142, pendingReviews: 8, budget: '$12.4M' },
  },
  {
    id: 'org-veridian',
    name: 'Veridian Manufacturing',
    industry: 'Industrial',
    plan: 'Professional',
    user: { id: 'u2', name: 'Marcus Webb', email: 'm.webb@veridian.com', role: 'finance_manager', avatar: 'MW' },
    cachedData: { contracts: 67, pendingReviews: 3, budget: '$5.1M' },
  },
  {
    id: 'org-solaris',
    name: 'Solaris Health Group',
    industry: 'Healthcare',
    plan: 'Enterprise',
    user: { id: 'u3', name: 'Tomoko Arai', email: 't.arai@solarishealth.com', role: 'auditor', avatar: 'TA' },
    cachedData: { contracts: 213, pendingReviews: 17, budget: '$31.2M' },
  },
  {
    id: 'org-axiom',
    name: 'Axiom Retail Group',
    industry: 'Retail',
    plan: 'Starter',
    user: { id: 'u4', name: 'Carlos Diaz', email: 'c.diaz@axiomretail.com', role: 'viewer', avatar: 'CD' },
    cachedData: { contracts: 24, pendingReviews: 1, budget: '$890K' },
  },
];

// ── RBAC permission matrix ────────────────────────────────────────────────────
type Action =
  | 'view_contracts'
  | 'create_contract'
  | 'approve_contract'
  | 'delete_contract'
  | 'view_financials'
  | 'export_financials'
  | 'manage_users'
  | 'view_audit_log'
  | 'configure_integrations';

const PERMISSIONS: Record<Role, Set<Action>> = {
  admin: new Set(['view_contracts', 'create_contract', 'approve_contract', 'delete_contract', 'view_financials', 'export_financials', 'manage_users', 'view_audit_log', 'configure_integrations']),
  finance_manager: new Set(['view_contracts', 'create_contract', 'approve_contract', 'view_financials', 'export_financials', 'view_audit_log']),
  auditor: new Set(['view_contracts', 'view_financials', 'view_audit_log']),
  viewer: new Set(['view_contracts']),
};

function can(role: Role, action: Action): boolean {
  return PERMISSIONS[role].has(action);
}

const ACTION_GROUPS: { group: string; actions: { action: Action; label: string; description: string }[] }[] = [
  {
    group: 'Contracts',
    actions: [
      { action: 'view_contracts', label: 'View contracts', description: 'Read contract list and details' },
      { action: 'create_contract', label: 'Create contract', description: 'Draft new contract records' },
      { action: 'approve_contract', label: 'Approve contract', description: 'Move contract to Active status' },
      { action: 'delete_contract', label: 'Delete contract', description: 'Permanently remove draft contracts' },
    ],
  },
  {
    group: 'Financials',
    actions: [
      { action: 'view_financials', label: 'View financials', description: 'Access budget and spend data' },
      { action: 'export_financials', label: 'Export financials', description: 'Download CSV/Excel reports' },
    ],
  },
  {
    group: 'Administration',
    actions: [
      { action: 'manage_users', label: 'Manage users', description: 'Invite, suspend, change roles' },
      { action: 'view_audit_log', label: 'View audit log', description: 'Access full activity history' },
      { action: 'configure_integrations', label: 'Configure integrations', description: 'Set up ERP, SSO, webhooks' },
    ],
  },
];

const ROLE_LABELS: Record<Role, string> = {
  admin: 'Administrator',
  finance_manager: 'Finance Manager',
  auditor: 'Auditor',
  viewer: 'Viewer',
};

const ROLE_COLORS: Record<Role, string> = {
  admin: 'bg-purple-100 text-purple-700',
  finance_manager: 'bg-blue-100 text-blue-700',
  auditor: 'bg-amber-100 text-amber-700',
  viewer: 'bg-gray-100 text-gray-600',
};

// ── Component ─────────────────────────────────────────────────────────────────
export function IdentityWorkspace() {
  const [selectedOrgId, setSelectedOrgId] = useState(ORGS[0].id);
  const [showOrgMenu, setShowOrgMenu] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const [attemptedAction, setAttemptedAction] = useState<{ action: Action; label: string; allowed: boolean } | null>(null);
  // Simulated auth state — in production: useMsal() hook provides this

  const org = ORGS.find((o) => o.id === selectedOrgId)!;
  const { user } = org;

  const tryAction = (action: Action, label: string) => {
    const allowed = can(user.role, action);
    setAttemptedAction({ action, label, allowed });
    setTimeout(() => setAttemptedAction(null), 3000);
  };

  const switchOrg = (orgId: string) => {
    setSelectedOrgId(orgId);
    setShowOrgMenu(false);
    setAttemptedAction(null);
    // Note: per-org cached data is isolated in the ORGS array — switching clears current org context
  };

  return (
    <div className="flex h-[520px] rounded-xl overflow-hidden border border-gray-200 shadow-sm">
      {/* Sidebar */}
      <div className="w-56 bg-slate-800 text-white flex flex-col shrink-0">
        <div className="p-3 border-b border-slate-700">
          <div className="relative">
            <button
              onClick={() => setShowOrgMenu((v) => !v)}
              className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-slate-700 text-left"
            >
              <Building2 size={16} className="text-slate-400 shrink-0" />
              <div className="flex-1 overflow-hidden">
                <p className="text-xs font-semibold truncate">{org.name}</p>
                <p className="text-[10px] text-slate-400">{org.industry} · {org.plan}</p>
              </div>
              <ChevronDown size={12} className="text-slate-400 shrink-0" />
            </button>
            {showOrgMenu && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-slate-700 rounded-lg border border-slate-600 py-1 z-10 shadow-lg">
                <p className="px-3 py-1 text-[10px] text-slate-400 uppercase tracking-wide font-semibold">Switch organisation</p>
                {ORGS.map((o) => (
                  <button
                    key={o.id}
                    onClick={() => switchOrg(o.id)}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-slate-600 ${o.id === selectedOrgId ? 'text-blue-300' : 'text-white'}`}
                  >
                    <Building2 size={12} className="shrink-0" />
                    <div className="text-left">
                      <p className="font-medium">{o.name}</p>
                      <p className="text-slate-400 text-[10px]">{ROLE_LABELS[o.user.role]}</p>
                    </div>
                    {o.id === selectedOrgId && <CheckCircle size={10} className="ml-auto text-blue-400" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* User info */}
        <div className="p-3 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold shrink-0">
              {user.avatar}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-medium truncate">{user.name}</p>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${ROLE_COLORS[user.role]}`}>
                {ROLE_LABELS[user.role]}
              </span>
            </div>
          </div>
        </div>

        {/* Org data summary */}
        <div className="p-3 space-y-2 flex-1">
          <p className="text-[10px] text-slate-400 uppercase tracking-wide font-semibold">Organisation data</p>
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Contracts</span>
              <span className="text-white font-medium">{org.cachedData.contracts}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Pending reviews</span>
              <span className="text-white font-medium">{org.cachedData.pendingReviews}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Budget</span>
              <span className="text-white font-medium">{org.cachedData.budget}</span>
            </div>
          </div>
          <p className="text-[10px] text-slate-500 mt-2">Data isolated per org — switching clears cache</p>
        </div>

        {/* Auth simulation */}
        <div className="p-3 border-t border-slate-700">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <LogIn size={11} />
            <span>MSAL simulation active</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-1">No credentials — see implementation notes</p>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col bg-white overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Permission-Aware Actions</h3>
            <p className="text-xs text-gray-500">Role: <strong>{ROLE_LABELS[user.role]}</strong> — click actions to test access</p>
          </div>
          <button onClick={() => setShowCode((v) => !v)} className="flex items-center gap-1 text-xs text-blue-600 border border-blue-200 px-2 py-1 rounded-lg">
            {showCode ? <EyeOff size={11} /> : <Eye size={11} />}
            {showCode ? 'Hide' : 'View'} implementation
          </button>
        </div>

        {/* MSAL disclaimer */}
        <div className="mx-4 mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800 flex gap-2">
          <Shield size={13} className="shrink-0 mt-0.5" />
          <div>
            <strong>Identity simulation</strong> — This demo uses hardcoded org/role data to illustrate MSAL / Azure AD B2C integration patterns.
            In production: <code className="bg-blue-100 px-1 rounded">@azure/msal-browser</code> acquires tokens; the backend validates claims and enforces authorization.
            <strong> UI permissions are not a security boundary.</strong>
          </div>
        </div>

        {showCode && (
          <div className="mx-4 mt-2 bg-gray-900 rounded-xl p-3 overflow-auto max-h-44 text-xs code-highlight leading-relaxed">
            <div className="text-gray-400 mb-1">// RBAC — permission matrix + can() helper</div>
            <div><span className="kw">const</span> PERMISSIONS: Record&lt;<span className="type">Role</span>, Set&lt;<span className="type">Action</span>&gt;&gt; = {'{'}</div>
            <div className="pl-4">admin: <span className="kw">new</span> <span className="fn">Set</span>([<span className="str">'view_contracts'</span>, <span className="str">'create_contract'</span>, <span className="str">'approve_contract'</span>, ...]),</div>
            <div className="pl-4">auditor: <span className="kw">new</span> <span className="fn">Set</span>([<span className="str">'view_contracts'</span>, <span className="str">'view_financials'</span>, <span className="str">'view_audit_log'</span>]),</div>
            <div className="pl-4">viewer: <span className="kw">new</span> <span className="fn">Set</span>([<span className="str">'view_contracts'</span>]),</div>
            <div>{'}'};</div>
            <div className="mt-1"><span className="kw">function</span> <span className="fn">can</span>(role: <span className="type">Role</span>, action: <span className="type">Action</span>) {'{'}</div>
            <div className="pl-4"><span className="kw">return</span> PERMISSIONS[role].<span className="fn">has</span>(action);</div>
            <div>{'}'}</div>
            <div className="mt-1"><span className="cm">// Org cache isolation — each org has independent data context</span></div>
            <div><span className="cm">// Switching org ID triggers re-render from that org's cachedData</span></div>
            <div><span className="cm">{'// Production: useMsal().acquireToken(options)'}</span></div>
          </div>
        )}

        {/* Action toast */}
        {attemptedAction && (
          <div className={`mx-4 mt-2 flex items-center gap-2 p-2.5 rounded-lg text-sm border ${attemptedAction.allowed ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
            {attemptedAction.allowed ? <CheckCircle size={14} /> : <XCircle size={14} />}
            <span>
              <strong>{attemptedAction.label}</strong>{' '}
              {attemptedAction.allowed ? '— allowed for your role' : '— denied: insufficient permissions (UI gate; backend also enforces this)'}
            </span>
          </div>
        )}

        {/* Action groups */}
        <div className="flex-1 overflow-auto p-4">
          <div className="space-y-4">
            {ACTION_GROUPS.map(({ group, actions }) => (
              <div key={group}>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">{group}</p>
                <div className="grid grid-cols-2 gap-2">
                  {actions.map(({ action, label, description }) => {
                    const allowed = can(user.role, action);
                    return (
                      <button
                        key={action}
                        onClick={() => tryAction(action, label)}
                        className={`flex items-start gap-2 p-2.5 rounded-lg border text-left transition-colors ${
                          allowed
                            ? 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                            : 'border-gray-100 opacity-60 cursor-pointer hover:border-red-200 hover:bg-red-50'
                        }`}
                      >
                        <div className="mt-0.5">
                          {allowed ? <Unlock size={13} className="text-green-500" /> : <Lock size={13} className="text-red-400" />}
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-800">{label}</p>
                          <p className="text-[10px] text-gray-400">{description}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
