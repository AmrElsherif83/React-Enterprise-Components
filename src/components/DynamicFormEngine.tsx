import React, { useState, useEffect, useCallback } from 'react';
import { AlertCircle, CheckCircle, Save, RefreshCw, Eye, EyeOff } from 'lucide-react';

// ── Schema types ──────────────────────────────────────────────────────────────
type FieldType = 'text' | 'email' | 'select' | 'number' | 'textarea' | 'checkbox' | 'radio';

interface ValidationRule {
  type: 'required' | 'minLength' | 'maxLength' | 'pattern' | 'min' | 'max' | 'crossField';
  value?: unknown;
  message: string;
  dependsOn?: string;
  dependsValue?: unknown;
}

interface FieldSchema {
  id: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  options?: { value: string; label: string }[];
  validations?: ValidationRule[];
  conditional?: { field: string; value: unknown; operator?: 'eq' | 'neq' | 'in' };
  hiddenFromSubmit?: boolean;
  defaultValue?: unknown;
  helpText?: string;
}

interface SectionSchema {
  id: string;
  title: string;
  fields: FieldSchema[];
  conditional?: { field: string; value: unknown };
}

interface FormSchema {
  version: string;
  title: string;
  sections: SectionSchema[];
}

// ── Schema v2.1 ───────────────────────────────────────────────────────────────
const SCHEMA: FormSchema = {
  version: '2.1',
  title: 'Vendor Onboarding Request',
  sections: [
    {
      id: 'basic',
      title: 'Company Details',
      fields: [
        {
          id: 'companyName',
          label: 'Company Name',
          type: 'text',
          placeholder: 'e.g. Meridian Logistics Ltd.',
          validations: [
            { type: 'required', message: 'Company name is required' },
            { type: 'minLength', value: 3, message: 'Must be at least 3 characters' },
          ],
        },
        {
          id: 'vendorType',
          label: 'Vendor Category',
          type: 'select',
          options: [
            { value: '', label: '— Select category —' },
            { value: 'manufacturer', label: 'Manufacturer' },
            { value: 'distributor', label: 'Distributor' },
            { value: 'services', label: 'Professional Services' },
            { value: 'technology', label: 'Technology Provider' },
          ],
          validations: [{ type: 'required', message: 'Please select a vendor category' }],
        },
        {
          id: 'annualRevenue',
          label: 'Annual Revenue (USD)',
          type: 'select',
          options: [
            { value: '', label: '— Select range —' },
            { value: 'under_1m', label: 'Under $1M' },
            { value: '1m_10m', label: '$1M – $10M' },
            { value: '10m_100m', label: '$10M – $100M' },
            { value: 'over_100m', label: 'Over $100M' },
          ],
          validations: [{ type: 'required', message: 'Annual revenue range is required' }],
        },
      ],
    },
    {
      id: 'manufacturing',
      title: 'Manufacturing Details',
      conditional: { field: 'vendorType', value: 'manufacturer' },
      fields: [
        {
          id: 'isoNumber',
          label: 'ISO Certification Number',
          type: 'text',
          placeholder: 'e.g. ISO-9001-2024-12345',
          validations: [
            { type: 'required', message: 'ISO number is required for manufacturers' },
            {
              type: 'pattern',
              value: '^ISO-[0-9]{4}-[0-9]{4}-[0-9]+$',
              message: 'Format: ISO-NNNN-YYYY-NNNNN',
            },
          ],
        },
        {
          id: 'capacityUnits',
          label: 'Monthly Production Capacity (units)',
          type: 'number',
          validations: [
            { type: 'required', message: 'Production capacity is required' },
            { type: 'min', value: 1, message: 'Capacity must be at least 1' },
          ],
        },
      ],
    },
    {
      id: 'financial',
      title: 'Financial & Compliance',
      fields: [
        {
          id: 'paymentTerms',
          label: 'Preferred Payment Terms',
          type: 'radio',
          options: [
            { value: 'net30', label: 'Net 30' },
            { value: 'net60', label: 'Net 60' },
            { value: 'net90', label: 'Net 90' },
          ],
          validations: [{ type: 'required', message: 'Please select payment terms' }],
        },
        {
          id: 'taxId',
          label: 'Tax Identification Number',
          type: 'text',
          placeholder: 'EIN / TIN',
          validations: [
            { type: 'required', message: 'Tax ID is required' },
            {
              type: 'pattern',
              value: '^[0-9]{2}-[0-9]{7}$',
              message: 'Format: XX-XXXXXXX',
            },
          ],
        },
        {
          id: 'sanctionsConfirm',
          label: 'I confirm this entity is not on OFAC sanctions lists',
          type: 'checkbox',
          validations: [
            {
              type: 'required',
              message: 'Sanctions confirmation is mandatory',
            },
          ],
        },
        // Cross-field: large vendors (>100m) must provide a contact email
        {
          id: 'enterpriseEmail',
          label: 'Enterprise Account Email',
          type: 'email',
          placeholder: 'accounts@company.com',
          helpText: 'Required for vendors with revenue over $100M',
          conditional: { field: 'annualRevenue', value: 'over_100m' },
          validations: [
            { type: 'required', message: 'Enterprise email required for large vendors' },
            {
              type: 'pattern',
              value: '^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$',
              message: 'Enter a valid email address',
            },
          ],
        },
        {
          id: '_internalReferralCode',
          label: 'Internal Referral Code',
          type: 'text',
          hiddenFromSubmit: true,
          defaultValue: 'AUTO-2025',
        },
      ],
    },
    {
      id: 'notes',
      title: 'Additional Notes',
      fields: [
        {
          id: 'notes',
          label: 'Special Requirements or Comments',
          type: 'textarea',
          placeholder: 'Optional — describe any special handling requirements...',
          validations: [{ type: 'maxLength', value: 500, message: 'Max 500 characters' }],
        },
      ],
    },
  ],
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function isSectionVisible(section: SectionSchema, values: Record<string, unknown>): boolean {
  if (!section.conditional) return true;
  return values[section.conditional.field] === section.conditional.value;
}

function isFieldVisible(field: FieldSchema, values: Record<string, unknown>): boolean {
  if (!field.conditional) return true;
  const { operator = 'eq' } = field.conditional;
  const actual = values[field.conditional.field];
  if (operator === 'in') return (field.conditional.value as unknown[]).includes(actual);
  if (operator === 'neq') return actual !== field.conditional.value;
  return actual === field.conditional.value;
}

function validateField(
  field: FieldSchema,
  value: unknown,
  allValues: Record<string, unknown>,
): string | null {
  if (!field.validations) return null;
  for (const rule of field.validations) {
    const v = value as string;
    if (rule.type === 'required') {
      if (field.type === 'checkbox' && !value) return rule.message;
      if (!v || v === '') return rule.message;
    }
    if (rule.type === 'minLength' && v && v.length < (rule.value as number)) return rule.message;
    if (rule.type === 'maxLength' && v && v.length > (rule.value as number)) return rule.message;
    if (rule.type === 'min' && Number(v) < (rule.value as number)) return rule.message;
    if (rule.type === 'max' && Number(v) > (rule.value as number)) return rule.message;
    if (rule.type === 'pattern' && v) {
      const re = new RegExp(rule.value as string);
      if (!re.test(v)) return rule.message;
    }
    if (rule.type === 'crossField' && rule.dependsOn) {
      const depVal = allValues[rule.dependsOn];
      if (depVal === rule.dependsValue && !v) return rule.message;
    }
  }
  return null;
}

function buildInitialValues(schema: FormSchema): Record<string, unknown> {
  const vals: Record<string, unknown> = {};
  schema.sections.forEach((s) =>
    s.fields.forEach((f) => {
      vals[f.id] = f.defaultValue ?? (f.type === 'checkbox' ? false : '');
    }),
  );
  return vals;
}

const DRAFT_KEY = 'enterprise-showcase:form-draft';

// ── Component ─────────────────────────────────────────────────────────────────
export function DynamicFormEngine() {
  const [values, setValues] = useState<Record<string, unknown>>(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      return saved ? JSON.parse(saved) : buildInitialValues(SCHEMA);
    } catch {
      return buildInitialValues(SCHEMA);
    }
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitted, setSubmitted] = useState(false);
  const [submittedPayload, setSubmittedPayload] = useState<Record<string, unknown> | null>(null);
  const [showCode, setShowCode] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);

  // Auto-save draft
  useEffect(() => {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(values));
    setHasDraft(true);
  }, [values]);

  const setValue = useCallback((id: string, val: unknown) => {
    setValues((prev) => ({ ...prev, [id]: val }));
    setTouched((prev) => ({ ...prev, [id]: true }));
    setSubmitted(false);
  }, []);

  const runValidation = useCallback(
    (formValues: Record<string, unknown>) => {
      const errs: Record<string, string> = {};
      SCHEMA.sections.forEach((section) => {
        if (!isSectionVisible(section, formValues)) return;
        section.fields.forEach((field) => {
          if (field.hiddenFromSubmit) return;
          if (!isFieldVisible(field, formValues)) return;
          const err = validateField(field, formValues[field.id], formValues);
          if (err) errs[field.id] = err;
        });
      });
      return errs;
    },
    [],
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const allTouched: Record<string, boolean> = {};
    SCHEMA.sections.forEach((s) => s.fields.forEach((f) => (allTouched[f.id] = true)));
    setTouched(allTouched);
    const errs = runValidation(values);
    setErrors(errs);
    if (Object.keys(errs).length === 0) {
      // Build submission payload — exclude hiddenFromSubmit fields
      const payload: Record<string, unknown> = {};
      SCHEMA.sections.forEach((section) => {
        if (!isSectionVisible(section, values)) return;
        section.fields.forEach((field) => {
          if (field.hiddenFromSubmit) return;
          if (!isFieldVisible(field, values)) return;
          payload[field.id] = values[field.id];
        });
      });
      setSubmittedPayload(payload);
      setSubmitted(true);
      localStorage.removeItem(DRAFT_KEY);
      setHasDraft(false);
    }
  };

  const handleReset = () => {
    setValues(buildInitialValues(SCHEMA));
    setErrors({});
    setTouched({});
    setSubmitted(false);
    setSubmittedPayload(null);
    localStorage.removeItem(DRAFT_KEY);
    setHasDraft(false);
  };

  const getErr = (id: string) => (touched[id] ? errors[id] : undefined);

  const renderField = (field: FieldSchema) => {
    if (!isFieldVisible(field, values)) return null;
    if (field.hiddenFromSubmit) return null;
    const err = getErr(field.id);
    const val = values[field.id];

    const labelEl = (
      <div className="flex items-center justify-between mb-1">
        <label className="block text-sm font-medium text-gray-700">
          {field.label}
          {field.validations?.some((v) => v.type === 'required') && (
            <span className="text-red-500 ml-1">*</span>
          )}
        </label>
        {field.helpText && <span className="text-xs text-blue-600">{field.helpText}</span>}
      </div>
    );

    const baseClass = `w-full px-3 py-2 border rounded-lg text-sm transition-colors focus:outline-none focus:ring-2 ${
      err
        ? 'border-red-400 focus:ring-red-300 bg-red-50'
        : 'border-gray-300 focus:ring-blue-300 bg-white'
    }`;

    let input: React.ReactNode;
    if (field.type === 'select') {
      input = (
        <select
          className={baseClass}
          value={val as string}
          onChange={(e) => setValue(field.id, e.target.value)}
        >
          {field.options?.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      );
    } else if (field.type === 'textarea') {
      input = (
        <textarea
          className={baseClass + ' resize-none'}
          rows={3}
          placeholder={field.placeholder}
          value={val as string}
          onChange={(e) => setValue(field.id, e.target.value)}
        />
      );
    } else if (field.type === 'checkbox') {
      return (
        <div key={field.id} className="flex items-start gap-3 py-2">
          <input
            type="checkbox"
            id={field.id}
            className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            checked={val as boolean}
            onChange={(e) => setValue(field.id, e.target.checked)}
          />
          <div>
            <label htmlFor={field.id} className="text-sm text-gray-700 cursor-pointer">
              {field.label}
              <span className="text-red-500 ml-1">*</span>
            </label>
            {err && (
              <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                <AlertCircle size={12} />
                {err}
              </p>
            )}
          </div>
        </div>
      );
    } else if (field.type === 'radio') {
      return (
        <div key={field.id} className="space-y-1">
          {labelEl}
          <div className="flex gap-4 flex-wrap">
            {field.options?.map((o) => (
              <label key={o.value} className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="radio"
                  name={field.id}
                  value={o.value}
                  checked={val === o.value}
                  onChange={() => setValue(field.id, o.value)}
                  className="text-blue-600"
                />
                {o.label}
              </label>
            ))}
          </div>
          {err && (
            <p className="text-xs text-red-600 flex items-center gap-1">
              <AlertCircle size={12} />
              {err}
            </p>
          )}
        </div>
      );
    } else {
      input = (
        <input
          type={field.type}
          className={baseClass}
          placeholder={field.placeholder}
          value={val as string}
          onChange={(e) => setValue(field.id, e.target.value)}
        />
      );
    }

    return (
      <div key={field.id} className="space-y-1">
        {labelEl}
        {input}
        {err && (
          <p className="text-xs text-red-600 flex items-center gap-1">
            <AlertCircle size={12} />
            {err}
          </p>
        )}
      </div>
    );
  };

  if (submitted && submittedPayload) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
          <CheckCircle className="mx-auto text-green-500 mb-3" size={40} />
          <h3 className="text-xl font-semibold text-green-800 mb-2">Submission Successful</h3>
          <p className="text-sm text-green-700 mb-4">Schema v{SCHEMA.version} · Draft cleared</p>
          <div className="bg-white rounded-lg border border-green-200 p-4 text-left">
            <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Submission Payload (hidden fields excluded)</p>
            <pre className="text-xs text-gray-700 overflow-auto max-h-48 code-highlight">
              {JSON.stringify(submittedPayload, null, 2)}
            </pre>
          </div>
          <button
            onClick={handleReset}
            className="mt-4 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700"
          >
            Start New Request
          </button>
        </div>
      </div>
    );
  }

  const errorCount = Object.keys(runValidation(values)).length;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{SCHEMA.title}</h2>
          <p className="text-xs text-gray-500">Schema v{SCHEMA.version} · Auto-saves draft to localStorage</p>
        </div>
        <div className="flex items-center gap-2">
          {hasDraft && (
            <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 border border-amber-200 px-2 py-1 rounded-full">
              <Save size={11} />
              Draft saved
            </span>
          )}
          <button
            onClick={handleReset}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 px-2 py-1 border border-gray-200 rounded-lg"
          >
            <RefreshCw size={11} />
            Reset
          </button>
          <button
            onClick={() => setShowCode((v) => !v)}
            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 px-2 py-1 border border-blue-200 rounded-lg"
          >
            {showCode ? <EyeOff size={11} /> : <Eye size={11} />}
            {showCode ? 'Hide' : 'View'} implementation
          </button>
        </div>
      </div>

      {showCode && (
        <div className="mb-4 bg-gray-900 rounded-xl p-4 overflow-auto max-h-72 text-xs code-highlight leading-relaxed">
          <div className="text-gray-400 mb-2 text-xs">// DynamicFormEngine.tsx — schema + validation core</div>
          <div><span className="kw">interface</span> <span className="type">FieldSchema</span> {'{'}</div>
          <div className="pl-4"><span className="fn">id</span>: <span className="type">string</span>;</div>
          <div className="pl-4"><span className="fn">type</span>: <span className="type">FieldType</span>;</div>
          <div className="pl-4"><span className="fn">conditional</span>?: {'{'} <span className="fn">field</span>: <span className="type">string</span>; <span className="fn">value</span>: <span className="type">unknown</span> {'}'};</div>
          <div className="pl-4"><span className="fn">hiddenFromSubmit</span>?: <span className="type">boolean</span>;</div>
          <div className="pl-4"><span className="fn">validations</span>?: <span className="type">ValidationRule</span>[];</div>
          <div>{'}'}</div>
          <div className="mt-2"><span className="cm">// Conditional visibility — pure function, no side-effects</span></div>
          <div><span className="kw">function</span> <span className="fn">isSectionVisible</span>(section, values) {'{'}</div>
          <div className="pl-4"><span className="kw">if</span> (!section.conditional) <span className="kw">return</span> <span className="num">true</span>;</div>
          <div className="pl-4"><span className="kw">return</span> values[section.conditional.field] === section.conditional.value;</div>
          <div>{'}'}</div>
          <div className="mt-2"><span className="cm">// Submission strips hidden fields</span></div>
          <div><span className="kw">const</span> payload = Object.<span className="fn">fromEntries</span>(</div>
          <div className="pl-4">Object.<span className="fn">entries</span>(values).<span className="fn">filter</span>(([key]) =&gt; !</div>
          <div className="pl-8">schema.<span className="fn">find</span>(f =&gt; f.id === key)?.hiddenFromSubmit</div>
          <div className="pl-4">)</div>
          <div>);</div>
          <div className="mt-2"><span className="cm">// Draft persisted to localStorage on every change</span></div>
          <div><span className="fn">useEffect</span>(() =&gt; {'{'}</div>
          <div className="pl-4">localStorage.<span className="fn">setItem</span>(<span className="str">'form-draft'</span>, JSON.<span className="fn">stringify</span>(values));</div>
          <div>{'}'}, [values]);</div>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        {SCHEMA.sections.map((section) => {
          if (!isSectionVisible(section, values)) return null;
          return (
            <div key={section.id} className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-sm font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-100">
                {section.title}
                {section.conditional && (
                  <span className="ml-2 text-xs font-normal text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                    Conditional section
                  </span>
                )}
              </h3>
              <div className="space-y-4">
                {section.fields.map(renderField)}
              </div>
            </div>
          );
        })}

        <div className="flex items-center justify-between pt-2">
          {errorCount > 0 && Object.keys(touched).length > 0 ? (
            <p className="text-sm text-red-600 flex items-center gap-1">
              <AlertCircle size={14} />
              {errorCount} validation {errorCount === 1 ? 'error' : 'errors'} to fix
            </p>
          ) : (
            <div />
          )}
          <button
            type="submit"
            className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700 transition-colors shadow-sm"
          >
            Submit Request
          </button>
        </div>
      </form>
    </div>
  );
}
