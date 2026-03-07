import { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabaseClient';
import './index.css';

// ── Constants ──────────────────────────────────────────────────────────────
const DEFAULT_SPECIALTIES = ['General Surgery','Colorectal','Hepatobiliary','Foregut','Endocrine','Trauma','Vascular','Thoracic','Other'];
const SERVICE_INFO_CATEGORIES = ['Expectations','Follow-up Visits','Post-op Imaging','Post-op Labs','Dot Phrases','Consult Tips','Floor Management','Other'];
const DEFAULT_PREF_CATEGORIES = ['Positioning','Prep & Drape','Port Placement','Instrument Preference','Dissection Technique','Critical Steps','Closure','Pet Peeves','Post-op Orders','Other'];
const RESOURCE_CATEGORIES = ['Video','Atlas / Images','Guidelines','Article','Textbook','Other'];
const DEFAULT_PROCEDURES = [
  'Lap Cholecystectomy','Lap Appendectomy','Inguinal Hernia Repair','Ventral Hernia Repair',
  'Hemicolectomy','Low Anterior Resection','Whipple','Lap Nissen','Thyroidectomy',
  'Parathyroidectomy','Splenectomy','Adrenalectomy','Lap Gastric Sleeve','Roux-en-Y Gastric Bypass',
  'Exploratory Laparotomy','Small Bowel Resection',"Hartmann's Procedure",'Proctectomy'
];

// ── Styles ─────────────────────────────────────────────────────────────────
const S = {
  primaryBtn: { background: 'var(--gold-dim)', border: '1px solid var(--border-hover)', color: 'var(--gold)', padding: '11px 20px', borderRadius: 'var(--radius)', fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', width: '100%', transition: 'all 0.15s' },
  secondaryBtn: { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)', color: 'var(--text-dim)', padding: '10px 16px', borderRadius: 'var(--radius)', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', whiteSpace: 'nowrap', transition: 'all 0.15s' },
  ghostBtn: { background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 11, letterSpacing: '0.06em', fontFamily: 'var(--font-mono)', padding: '4px 0' },
  backBtn: { background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 12, letterSpacing: '0.06em', padding: 0, marginBottom: 20 },
  label: { display: 'block', fontSize: 10, letterSpacing: '0.2em', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginBottom: 6, textTransform: 'uppercase' },
  sectionHead: { fontSize: 20, fontWeight: 300, color: 'var(--text)', margin: '0 0 6px', letterSpacing: '0.02em', fontFamily: 'var(--font-serif)' },
  card: { background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '14px 18px', transition: 'border-color 0.15s' },
  tag: { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', color: 'var(--text-muted)', padding: '5px 10px', borderRadius: 3, fontSize: 11, letterSpacing: '0.05em', fontFamily: 'var(--font-mono)', cursor: 'pointer', transition: 'all 0.15s' },
  tagActive: { background: 'var(--gold-dim)', borderColor: 'var(--border-hover)', color: 'var(--gold)' },
  miniTag: { fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', letterSpacing: '0.04em' },
  divider: { borderBottom: '1px solid rgba(255,255,255,0.06)', marginBottom: 16, paddingBottom: 4, fontSize: 10, letterSpacing: '0.18em', color: '#7a8a6a', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' },
};

// ── Helper components ──────────────────────────────────────────────────────
function Field({ label, children }) {
  return <div style={{ marginBottom: 2 }}><label style={S.label}>{label}</label>{children}</div>;
}

function Spinner() {
  return <div style={{ width: 18, height: 18, border: '2px solid rgba(200,168,64,0.2)', borderTopColor: 'var(--gold)', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />;
}

function Flash({ flash }) {
  if (!flash) return null;
  const isErr = flash.type === 'error';
  return (
    <div style={{ position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', background: isErr ? '#3a1010' : '#0f2a1a', border: `1px solid ${isErr ? 'var(--red)' : 'var(--green)'}`, color: isErr ? '#e06050' : '#5aba8a', padding: '10px 24px', borderRadius: 4, fontSize: 12, fontFamily: 'var(--font-mono)', zIndex: 1000, letterSpacing: '0.05em', boxShadow: 'var(--shadow)', whiteSpace: 'nowrap' }}>
      {flash.msg}
    </div>
  );
}

// ── Archive helper ─────────────────────────────────────────────────────────
const archiveItem = async (type, label, data) => {
  try {
    await supabase.from('archive').insert([{ type, label, data }]);
  } catch (e) { console.error('Archive failed', e); }
};

// ── Admin password modal ───────────────────────────────────────────────────
function AdminModal({ onSuccess, onCancel }) {
  const [input, setInput] = useState('');
  const [error, setError] = useState(false);

  const handleSubmit = () => {
    if (input === process.env.REACT_APP_ADMIN_PASSWORD) {
      onSuccess();
    } else {
      setError(true);
      setInput('');
      setTimeout(() => setError(false), 2000);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, padding: 28, width: '100%', maxWidth: 360, boxShadow: '0 8px 40px rgba(0,0,0,0.6)' }}>
        <div style={{ fontSize: 14, color: 'var(--text)', fontFamily: 'var(--font-serif)', marginBottom: 6 }}>Admin Access Required</div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginBottom: 20 }}>Enter the admin password to continue.</div>
        <input
          type="password" value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          placeholder="Password" autoFocus
          style={{ marginBottom: 8, borderColor: error ? 'var(--red)' : undefined }}
        />
        {error && <div style={{ fontSize: 11, color: 'var(--red)', fontFamily: 'var(--font-mono)', marginBottom: 8 }}>Incorrect password</div>}
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button onClick={onCancel} style={{ ...S.secondaryBtn, flex: 1 }}>Cancel</button>
          <button onClick={handleSubmit} style={{ ...S.primaryBtn, flex: 2 }}>Unlock</button>
        </div>
      </div>
    </div>
  );
}

// ── Main App ───────────────────────────────────────────────────────────────
export default function App() {
  const [view, setView] = useState('list');
  const [attendings, setAttendings] = useState([]);
  const [customProcedures, setCustomProcedures] = useState([]);
  const [customSpecialties, setCustomSpecialties] = useState([]);
  const [customPrefCategories, setCustomPrefCategories] = useState([]);
  const [selectedAttending, setSelectedAttending] = useState(null);
  const [selectedProcedure, setSelectedProcedure] = useState(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [flash, setFlash] = useState(null);
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [pendingAdminAction, setPendingAdminAction] = useState(null);

  const requireAdmin = (action) => {
    if (adminUnlocked) { action(); return; }
    setPendingAdminAction(() => action);
    setShowAdminModal(true);
  };

  const handleAdminSuccess = () => {
    setAdminUnlocked(true);
    setShowAdminModal(false);
    if (pendingAdminAction) { pendingAdminAction(); setPendingAdminAction(null); }
  };

  const hiddenDefaults = customProcedures.filter(p => p.name.startsWith('__HIDDEN__')).map(p => p.name.replace('__HIDDEN__', ''));
  const allProcedures = [...new Set([...DEFAULT_PROCEDURES.filter(p => !hiddenDefaults.includes(p)), ...customProcedures.filter(p => !p.name.startsWith('__HIDDEN__')).map(p => p.name)])].sort();
  const allSpecialties = [...new Set([...DEFAULT_SPECIALTIES, ...customSpecialties.map(s => s.name)])].sort();
  const allPrefCategories = [...new Set([...DEFAULT_PREF_CATEGORIES, ...customPrefCategories.map(c => c.name)])];

  const showFlash = useCallback((msg, type = 'success') => {
    setFlash({ msg, type });
    setTimeout(() => setFlash(null), 2500);
  }, []);

  // ── Load data ──
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: att }, { data: prefs }, { data: cp }, { data: cs }, { data: cpc }] = await Promise.all([
        supabase.from('attendings').select('*').order('name'),
        supabase.from('preferences').select('*').order('created_at'),
        supabase.from('custom_procedures').select('*').order('name'),
        supabase.from('custom_specialties').select('*').order('name'),
        supabase.from('custom_pref_categories').select('*').order('name'),
      ]);
      const attendingsWithPrefs = (att || []).map(a => ({
        ...a,
        prefs: (prefs || []).filter(p => p.attending_id === a.id)
      }));
      setAttendings(attendingsWithPrefs);
      setCustomProcedures(cp || []);
      setCustomSpecialties(cs || []);
      setCustomPrefCategories(cpc || []);
    } catch (e) {
      showFlash('Error loading data', 'error');
    }
    setLoading(false);
  }, [showFlash]);

  useEffect(() => { loadData(); }, [loadData]);

  // Keep selectedAttending in sync after reloads
  useEffect(() => {
    if (selectedAttending) {
      const updated = attendings.find(a => a.id === selectedAttending.id);
      if (updated) setSelectedAttending(updated);
    }
  }, [attendings]); // eslint-disable-line

  const navTo = (v, attending = null, procedure = null) => {
    setView(v);
    if (attending !== null) setSelectedAttending(attending);
    if (procedure !== null) setSelectedProcedure(procedure);
  };

  const filtered = attendings.filter(a =>
    a.name.toLowerCase().includes(search.toLowerCase()) ||
    (a.specialty || '').toLowerCase().includes(search.toLowerCase())
  );

  const getProceduresForAttending = (a) => [...new Set((a?.prefs || []).map(p => p.procedure))];
  const getPrefsForProcedure = (a, proc) => (a?.prefs || []).filter(p => p.procedure === proc);

  // ── Export / Import ──
  const handleExport = async () => {
    try {
      const [{ data: att }, { data: prefs }, { data: cp }, { data: res }] = await Promise.all([
        supabase.from('attendings').select('*'),
        supabase.from('preferences').select('*'),
        supabase.from('custom_procedures').select('*'),
        supabase.from('resources').select('*'),
      ]);
      const blob = new Blob([JSON.stringify({ attendings: att, preferences: prefs, custom_procedures: cp, resources: res, exported_at: new Date().toISOString() }, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `surgery-pref-log-${new Date().toISOString().slice(0,10)}.json`; a.click();
      URL.revokeObjectURL(url);
      showFlash('Data exported');
    } catch (e) { showFlash('Export failed', 'error'); }
  };

  const handleImport = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (data.attendings) await supabase.from('attendings').upsert(data.attendings);
      if (data.preferences) await supabase.from('preferences').upsert(data.preferences);
      if (data.custom_procedures) await supabase.from('custom_procedures').upsert(data.custom_procedures);
      if (data.resources) await supabase.from('resources').upsert(data.resources);
      await loadData();
      showFlash('Data imported successfully');
    } catch (e) { showFlash('Import failed — check file format', 'error'); }
    e.target.value = '';
  };

  const TABS = [
    { key: 'list', label: 'Attendings' },
    { key: 'resources', label: 'Resources' },
    { key: 'opNote', label: 'Op Note' },
    { key: 'procedures', label: 'Procedures' },
    { key: 'serviceInfo', label: 'Service Info' },
    { key: 'phoneBook', label: 'Phone Book' },
    { key: 'archive', label: 'Archive' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', position: 'relative' }}>
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse at 15% 60%, rgba(180,120,40,0.05) 0%, transparent 55%), radial-gradient(ellipse at 85% 15%, rgba(40,80,160,0.06) 0%, transparent 50%)', zIndex: 0 }} />

      <Flash flash={flash} />
      {showAdminModal && <AdminModal onSuccess={handleAdminSuccess} onCancel={() => { setShowAdminModal(false); setPendingAdminAction(null); }} />}

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 800, margin: '0 auto', padding: '0 16px 80px' }}>

        {/* Header */}
        <div style={{ padding: '32px 0 0', borderBottom: '1px solid var(--border)', marginBottom: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, paddingBottom: 16 }}>
            <div>
              <div style={{ fontSize: 10, letterSpacing: '0.28em', color: '#6a7a5a', fontFamily: 'var(--font-mono)', marginBottom: 5, textTransform: 'uppercase' }}>THAA General Surgery Residency</div>
              <h1 style={{ fontSize: 28, fontWeight: 300, color: 'var(--text)', letterSpacing: '0.02em', fontFamily: 'var(--font-serif)' }}>Attending Preference Log</h1>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <button onClick={handleExport} style={{ ...S.secondaryBtn, fontSize: 10 }}>↓ Export</button>
              <label style={{ ...S.secondaryBtn, display: 'inline-block', fontSize: 10 }}>
                ↑ Import
                <input type="file" accept=".json" onChange={handleImport} style={{ display: 'none' }} />
              </label>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', paddingLeft: 4 }}>
                {attendings.length} attendings · {attendings.reduce((n,a) => n + a.prefs.length, 0)} notes
              </div>
            </div>
          </div>

          {/* Tabs — always visible */}
          <div style={{ display: 'flex', gap: 0, overflowX: 'auto' }}>
            {TABS.map(t => (
              <button key={t.key} onClick={() => setView(t.key)} style={{ background: 'none', border: 'none', borderBottom: (t.key === 'list' ? ['list','detail','addAttending','addNote'].includes(view) : t.key === 'serviceInfo' ? view === 'serviceInfo' : view === t.key) ? '2px solid var(--gold)' : '2px solid transparent', color: (t.key === 'list' ? ['list','detail','addAttending','addNote'].includes(view) : t.key === 'serviceInfo' ? view === 'serviceInfo' : view === t.key) ? 'var(--gold)' : 'var(--text-muted)', padding: '10px 16px', fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: -1, transition: 'all 0.15s', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ paddingTop: 28 }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}><Spinner /></div>
          ) : (
            <>
              {view === 'list' && <ListView attendings={filtered} search={search} setSearch={setSearch} navTo={navTo} showFlash={showFlash} loadData={loadData} allProcedures={allProcedures} />}
              {view === 'addAttending' && <AddAttendingView navTo={navTo} showFlash={showFlash} loadData={loadData} allSpecialties={allSpecialties} customSpecialties={customSpecialties} />}
              {view === 'detail' && selectedAttending && <DetailView attending={selectedAttending} selectedProcedure={selectedProcedure} setSelectedProcedure={setSelectedProcedure} navTo={navTo} showFlash={showFlash} loadData={loadData} getProceduresForAttending={getProceduresForAttending} getPrefsForProcedure={getPrefsForProcedure} allProcedures={allProcedures} allSpecialties={allSpecialties} customSpecialties={customSpecialties} allPrefCategories={allPrefCategories} />}
              {view === 'addNote' && selectedAttending && <AddNoteView attending={selectedAttending} selectedProcedure={selectedProcedure} navTo={navTo} showFlash={showFlash} loadData={loadData} allProcedures={allProcedures} allPrefCategories={allPrefCategories} />}
              {view === 'resources' && <ResourcesView allProcedures={allProcedures} showFlash={showFlash} />}
              {view === 'opNote' && <OpNoteView allProcedures={allProcedures} attendings={attendings} getPrefsForProcedure={getPrefsForProcedure} />}
              {view === 'procedures' && <ProceduresView customProcedures={customProcedures} loadData={loadData} showFlash={showFlash} allProcedures={allProcedures} attendings={attendings} />}
              {view === 'archive' && <ArchiveView showFlash={showFlash} loadData={loadData} requireAdmin={requireAdmin} />}
              {view === 'serviceInfo' && <ServiceInfoView showFlash={showFlash} />}
              {view === 'phoneBook' && <PhoneBookView showFlash={showFlash} />}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── List View ──────────────────────────────────────────────────────────────
function ListView({ attendings, search, setSearch, navTo, showFlash, loadData }) {
  return (
    <div className="fade-in">
      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search attendings or specialty..." style={{ flex: 1 }} />
        <button onClick={() => navTo('addAttending')} style={S.secondaryBtn}>+ Add</button>
      </div>
      {attendings.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 12, border: '1px dashed rgba(255,255,255,0.07)', borderRadius: 6 }}>
          No attendings yet. Add your first one.
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {attendings.map(a => {
          const critCount = (a.prefs || []).filter(p => p.critical).length;
          const procCount = [...new Set((a.prefs || []).map(p => p.procedure))].length;
          return (
            <div key={a.id} onClick={() => navTo('detail', a, null)}
              style={{ ...S.card, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-hover)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                  <span style={{ fontSize: 17, color: 'var(--text)', fontFamily: 'var(--font-serif)' }}>Dr. {a.name}</span>
                  {a.nickname && <span style={{ fontSize: 11, color: '#8a7a5a', fontFamily: 'var(--font-mono)' }}>"{a.nickname}"</span>}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', letterSpacing: '0.04em' }}>
                  {a.specialty}
                  {procCount > 0 && <span style={{ color: '#5a7a5a' }}> · {procCount} procedure{procCount !== 1 ? 's' : ''}</span>}
                  {critCount > 0 && <span style={{ color: '#8a4a3a' }}> · {critCount} critical</span>}
                </div>
              </div>
              <span style={{ fontSize: 20, color: 'rgba(180,148,80,0.25)' }}>›</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Specialty Picker (reusable) ────────────────────────────────────────────
function SpecialtyPicker({ selected, onChange, allSpecialties, loadData, showFlash }) {
  const [newSpec, setNewSpec] = useState('');
  const [addingNew, setAddingNew] = useState(false);
  const toggle = (s) => onChange(selected.includes(s) ? selected.filter(x => x !== s) : [...selected, s]);
  const handleAddNew = async () => {
    const trimmed = newSpec.trim();
    if (!trimmed || allSpecialties.includes(trimmed)) { setAddingNew(false); setNewSpec(''); return; }
    const { error } = await supabase.from('custom_specialties').insert([{ name: trimmed }]);
    if (error) { showFlash('Error adding specialty', 'error'); return; }
    await loadData();
    onChange([...selected, trimmed]);
    setNewSpec(''); setAddingNew(false);
    showFlash(`"${trimmed}" added`);
  };
  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
        {allSpecialties.map(s => (
          <button key={s} onClick={() => toggle(s)} style={{ ...S.tag, ...(selected.includes(s) ? S.tagActive : {}) }}>{s}</button>
        ))}
      </div>
      {addingNew ? (
        <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
          <input value={newSpec} onChange={e => setNewSpec(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddNew()} placeholder="New specialty name..." autoFocus style={{ flex: 1 }} />
          <button onClick={handleAddNew} style={S.secondaryBtn}>Add</button>
          <button onClick={() => { setAddingNew(false); setNewSpec(''); }} style={{ ...S.secondaryBtn, color: 'var(--text-muted)' }}>Cancel</button>
        </div>
      ) : (
        <button onClick={() => setAddingNew(true)} style={{ ...S.ghostBtn, fontSize: 11, marginTop: 4 }}>+ Add new specialty</button>
      )}
    </div>
  );
}

// ── Add Attending ──────────────────────────────────────────────────────────
function AddAttendingView({ navTo, showFlash, loadData, allSpecialties, customSpecialties }) {
  const [form, setForm] = useState({ name: '', specialties: [], nickname: '', notes: '' });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    const { error } = await supabase.from('attendings').insert([{ ...form, specialty: form.specialties.join(', ') }]);
    setSaving(false);
    if (error) { showFlash('Error saving attending', 'error'); return; }
    await loadData();
    showFlash('Attending added');
    navTo('list');
  };

  return (
    <div className="fade-in">
      <button onClick={() => navTo('list')} style={S.backBtn}>← Back</button>
      <h2 style={S.sectionHead}>Add Attending</h2>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24, fontStyle: 'italic' }}>Visible to all residents in your program.</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Field label="Last Name *"><input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="e.g. Patel" /></Field>
        <Field label="Nickname / OR Persona"><input value={form.nickname} onChange={e => setForm({...form, nickname: e.target.value})} placeholder='e.g. "The Whipple King"' /></Field>
        <Field label="Specialties (select all that apply)">
          <SpecialtyPicker selected={form.specialties} onChange={v => setForm({...form, specialties: v})} allSpecialties={allSpecialties} loadData={loadData} showFlash={showFlash} />
        </Field>
        <Field label="General Notes"><textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} placeholder="Personality, communication style, general things to know..." rows={3} /></Field>
        <button onClick={handleSave} style={S.primaryBtn} disabled={saving}>
          {saving ? <Spinner /> : 'Save Attending'}
        </button>
      </div>
    </div>
  );
}

// ── Procedure Resources Inline ─────────────────────────────────────────────
function ProcedureResourcesInline({ procedure }) {
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!procedure) { setResources([]); setLoading(false); return; }
    const load = async () => {
      setLoading(true);
      const { data } = await supabase.from('resources').select('*').eq('procedure', procedure).order('category');
      setResources(data || []);
      setLoading(false);
    };
    load();
  }, [procedure]);

  if (!procedure) return null;

  const categoryColors = { 'Video': '#4a7a9a', 'Atlas / Images': '#7a6a9a', 'Guidelines': '#4a8a6a', 'Article': '#8a7a4a', 'Textbook': '#6a6a8a', 'Other': '#5a6a7a' };
  const grouped = resources.reduce((acc, r) => {
    if (!acc[r.category]) acc[r.category] = [];
    acc[r.category].push(r);
    return acc;
  }, {});

  return (
    <div style={{ marginTop: 24, padding: '16px 18px', background: 'rgba(60,90,130,0.07)', border: '1px solid rgba(60,90,160,0.2)', borderRadius: 'var(--radius)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ fontSize: 10, letterSpacing: '0.18em', color: '#6a8a9a', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>
          Resources — {procedure}
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '10px 0' }}><Spinner /></div>
      ) : resources.length === 0 ? (
        <div style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic', fontFamily: 'var(--font-serif)' }}>
          No resources added for this procedure yet. Add them in the Resources tab.
        </div>
      ) : (
        Object.entries(grouped).map(([cat, items]) => (
          <div key={cat} style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 10, letterSpacing: '0.14em', color: categoryColors[cat] || 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginBottom: 6, textTransform: 'uppercase' }}>{cat}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {items.map(r => (
                <div key={r.id} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <a href={r.url} target="_blank" rel="noopener noreferrer"
                    style={{ color: '#7aacca', fontSize: 14, fontFamily: 'var(--font-serif)', textDecoration: 'none', borderBottom: '1px solid rgba(122,172,202,0.25)' }}
                    onMouseEnter={e => e.currentTarget.style.borderBottomColor = 'rgba(122,172,202,0.7)'}
                    onMouseLeave={e => e.currentTarget.style.borderBottomColor = 'rgba(122,172,202,0.25)'}
                  >{r.title} ↗</a>
                  {r.notes && <div style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>{r.notes}</div>}
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

// ── Detail View ────────────────────────────────────────────────────────────
function DetailView({ attending, selectedProcedure, setSelectedProcedure, navTo, showFlash, loadData, getProceduresForAttending, getPrefsForProcedure, allProcedures, allSpecialties, customSpecialties, allPrefCategories }) {
  const [deleting, setDeleting] = useState(false);
  const [editingAttending, setEditingAttending] = useState(false);
  const [editingPref, setEditingPref] = useState(null); // pref object being edited
  const [editForm, setEditForm] = useState({ name: '', specialties: [], nickname: '', notes: '' });
  const [editPrefForm, setEditPrefForm] = useState({ procedure: '', category: '', note: '', critical: false });
  const [saving, setSaving] = useState(false);
  const procedures = getProceduresForAttending(attending);

  const openEditAttending = () => {
    const specs = attending.specialty ? attending.specialty.split(', ').filter(Boolean) : [];
    setEditForm({ name: attending.name, specialties: specs, nickname: attending.nickname || '', notes: attending.notes || '' });
    setEditingAttending(true);
  };

  const saveAttending = async () => {
    setSaving(true);
    await supabase.from('attendings').update({
      name: editForm.name, nickname: editForm.nickname,
      notes: editForm.notes, specialty: editForm.specialties.join(', ')
    }).eq('id', attending.id);
    setSaving(false);
    await loadData();
    showFlash('Attending updated');
    setEditingAttending(false);
  };

  const openEditPref = (p) => {
    setEditingPref(p);
    setEditPrefForm({ procedure: p.procedure, category: p.category, note: p.note, critical: p.critical });
  };

  const savePref = async () => {
    setSaving(true);
    await supabase.from('preferences').update(editPrefForm).eq('id', editingPref.id);
    setSaving(false);
    await loadData();
    showFlash('Preference updated');
    setEditingPref(null);
  };

  const handleDelete = async () => {
    if (!window.confirm(`Remove Dr. ${attending.name} and all their notes?`)) return;
    setDeleting(true);
    await archiveItem('attending', `Dr. ${attending.name} (${attending.specialty})`, { attending, prefs: attending.prefs || [] });
    await supabase.from('attendings').delete().eq('id', attending.id);
    await loadData();
    showFlash('Attending removed — saved to Archive', 'error');
    navTo('list');
  };

  const handleDeletePref = async (pref) => {
    await archiveItem('preference', `${pref.procedure} — ${pref.category} (Dr. ${attending.name})`, { pref, attending_name: attending.name });
    await supabase.from('preferences').delete().eq('id', pref.id);
    await loadData();
  };

  const displayedPrefs = selectedProcedure ? getPrefsForProcedure(attending, selectedProcedure) : (attending.prefs || []);
  const grouped = displayedPrefs.reduce((acc, p) => {
    const key = selectedProcedure ? p.category : p.procedure;
    if (!acc[key]) acc[key] = [];
    acc[key].push(p);
    return acc;
  }, {});

  return (
    <div className="fade-in">
      {/* Edit Pref Modal */}
      {editingPref && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, padding: 24, width: '100%', maxWidth: 500, boxShadow: '0 8px 40px rgba(0,0,0,0.6)' }}>
            <div style={{ fontSize: 14, color: 'var(--text)', fontFamily: 'var(--font-serif)', marginBottom: 20 }}>Edit Preference</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Field label="Procedure">
                <select value={editPrefForm.procedure} onChange={e => setEditPrefForm({...editPrefForm, procedure: e.target.value})}>
                  {allProcedures.map(p => <option key={p}>{p}</option>)}
                </select>
              </Field>
              <Field label="Category">
                <select value={editPrefForm.category} onChange={e => setEditPrefForm({...editPrefForm, category: e.target.value})}>
                  {allPrefCategories.map(c => <option key={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="Note">
                <textarea value={editPrefForm.note} onChange={e => setEditPrefForm({...editPrefForm, note: e.target.value})} rows={4} />
              </Field>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                <input type="checkbox" checked={editPrefForm.critical} onChange={e => setEditPrefForm({...editPrefForm, critical: e.target.checked})} style={{ width: 14, height: 14, accentColor: 'var(--red)', margin: 0 }} />
                <span style={{ fontSize: 13, color: 'var(--red)', fontFamily: 'var(--font-mono)', letterSpacing: '0.04em' }}>Critical / pet peeve</span>
              </label>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button onClick={() => setEditingPref(null)} style={{ ...S.secondaryBtn, flex: 1 }}>Cancel</button>
              <button onClick={savePref} style={{ ...S.primaryBtn, flex: 2 }} disabled={saving}>{saving ? <Spinner /> : 'Save Changes'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Attending Modal */}
      {editingAttending && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, padding: 24, width: '100%', maxWidth: 500, boxShadow: '0 8px 40px rgba(0,0,0,0.6)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ fontSize: 14, color: 'var(--text)', fontFamily: 'var(--font-serif)', marginBottom: 20 }}>Edit Dr. {attending.name}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Field label="Last Name"><input value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} /></Field>
              <Field label="Nickname"><input value={editForm.nickname} onChange={e => setEditForm({...editForm, nickname: e.target.value})} /></Field>
              <Field label="Specialties">
                <SpecialtyPicker selected={editForm.specialties} onChange={v => setEditForm({...editForm, specialties: v})} allSpecialties={allSpecialties} loadData={loadData} showFlash={showFlash} />
              </Field>
              <Field label="General Notes"><textarea value={editForm.notes} onChange={e => setEditForm({...editForm, notes: e.target.value})} rows={3} /></Field>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button onClick={() => setEditingAttending(false)} style={{ ...S.secondaryBtn, flex: 1 }}>Cancel</button>
              <button onClick={saveAttending} style={{ ...S.primaryBtn, flex: 2 }} disabled={saving}>{saving ? <Spinner /> : 'Save Changes'}</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <button onClick={() => navTo('list')} style={S.backBtn}>← All Attendings</button>
        <div style={{ display: 'flex', gap: 16 }}>
          <button onClick={() => navTo('opNote')} style={{ ...S.ghostBtn, color: '#6a8a7a' }}>Op Note ↗</button>
          <button onClick={openEditAttending} style={{ ...S.ghostBtn, color: '#6a8a9a' }}>Edit</button>
          <button onClick={handleDelete} disabled={deleting} style={{ ...S.ghostBtn, color: '#7a4a3a' }}>Remove</button>
        </div>
      </div>

      <div style={{ marginBottom: 24 }}>
        <h2 style={{ ...S.sectionHead, fontSize: 24, marginBottom: 4 }}>
          Dr. {attending.name}
          {attending.nickname && <span style={{ fontSize: 15, color: '#8a7a5a', marginLeft: 10, fontStyle: 'italic' }}>"{attending.nickname}"</span>}
        </h2>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{attending.specialty}</div>
        {attending.notes && (
          <div style={{ marginTop: 12, padding: '12px 16px', background: 'rgba(180,140,60,0.05)', border: '1px solid rgba(180,140,60,0.15)', borderRadius: 'var(--radius)', fontSize: 14, color: '#b0a078', lineHeight: 1.7, fontStyle: 'italic' }}>
            {attending.notes}
          </div>
        )}
      </div>

      {procedures.length > 0 && (
        <div style={{ marginBottom: 22 }}>
          <div style={S.divider}>Procedures</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            <button onClick={() => setSelectedProcedure(null)} style={{ ...S.tag, ...(selectedProcedure === null ? S.tagActive : {}) }}>All</button>
            {procedures.map(p => (
              <button key={p} onClick={() => setSelectedProcedure(p)} style={{ ...S.tag, ...(selectedProcedure === p ? S.tagActive : {}) }}>{p}</button>
            ))}
          </div>
        </div>
      )}

      {(attending.prefs || []).length === 0 ? (
        <div style={{ textAlign: 'center', padding: '36px 20px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 12, border: '1px dashed rgba(255,255,255,0.07)', borderRadius: 6, marginBottom: 16 }}>
          No preferences logged yet.
        </div>
      ) : (
        <div style={{ marginBottom: 16 }}>
          {Object.entries(grouped).map(([groupName, prefs]) => (
            <div key={groupName} style={{ marginBottom: 20 }}>
              <div style={S.divider}>{groupName}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {prefs.map(p => (
                  <div key={p.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '11px 14px', background: p.critical ? 'var(--red-dim)' : 'rgba(255,255,255,0.02)', border: `1px solid ${p.critical ? 'rgba(192,80,58,0.28)' : 'rgba(255,255,255,0.06)'}`, borderRadius: 'var(--radius)' }}>
                    {p.critical && <span style={{ fontSize: 11, color: 'var(--red)', marginTop: 1, flexShrink: 0 }}>⚠</span>}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, color: '#d8d0b8', lineHeight: 1.65, fontFamily: 'var(--font-serif)' }}>{p.note}</div>
                      <div style={{ marginTop: 5, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {!selectedProcedure && <span style={S.miniTag}>{p.category}</span>}
                        <span style={{ ...S.miniTag, color: '#3a4a3a' }}>{new Date(p.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <button onClick={() => openEditPref(p)} style={{ background: 'none', border: 'none', color: '#4a6a7a', cursor: 'pointer', fontSize: 11, fontFamily: 'var(--font-mono)', padding: '0 6px', flexShrink: 0 }}>edit</button>
                    <button onClick={() => handleDeletePref(p)} style={{ background: 'none', border: 'none', color: '#3a3a3a', fontSize: 16, padding: 0, lineHeight: 1, flexShrink: 0, transition: 'color 0.15s' }} onMouseEnter={e => e.currentTarget.style.color='#8a4a3a'} onMouseLeave={e => e.currentTarget.style.color='#3a3a3a'}>×</button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Inline resources — only shown when a specific procedure is selected */}
      <ProcedureResourcesInline procedure={selectedProcedure} />

      <div style={{ marginTop: 16 }}>
        <button onClick={() => navTo('addNote', attending, selectedProcedure || null)} style={S.primaryBtn}>+ Log Preference</button>
      </div>
    </div>
  );
}

// ── Add Note ───────────────────────────────────────────────────────────────
function AddNoteView({ attending, selectedProcedure, navTo, showFlash, loadData, allProcedures, allPrefCategories }) {
  const [newCategory, setNewCategory] = useState('');
  const [addingCategory, setAddingCategory] = useState(false);
  const [savingCategory, setSavingCategory] = useState(false);
  const [form, setForm] = useState({ procedure: selectedProcedure || '', category: (allPrefCategories && allPrefCategories[0]) || 'Positioning', note: '', critical: false });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!form.procedure || !form.note.trim()) return;
    setSaving(true);
    const { error } = await supabase.from('preferences').insert([{ ...form, attending_id: attending.id }]);
    setSaving(false);
    if (error) { showFlash('Error saving note', 'error'); return; }
    await loadData();
    showFlash('Preference saved');
    navTo('detail', attending, form.procedure);
  };

  return (
    <div className="fade-in">
      <button onClick={() => navTo('detail', attending, selectedProcedure)} style={S.backBtn}>← Back to Dr. {attending.name}</button>
      <h2 style={S.sectionHead}>Log Preference</h2>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24, fontStyle: 'italic' }}>This note will be visible to all residents.</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Field label="Procedure *">
          <select value={form.procedure} onChange={e => setForm({...form, procedure: e.target.value})}>
            <option value="">Select procedure...</option>
            {allProcedures.map(p => <option key={p}>{p}</option>)}
          </select>
        </Field>
        <Field label="Category">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <select value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
              {allPrefCategories.map(c => <option key={c}>{c}</option>)}
            </select>
            {addingCategory ? (
              <div style={{ display: 'flex', gap: 8 }}>
                <input value={newCategory} onChange={e => setNewCategory(e.target.value)}
                  onKeyDown={async e => {
                    if (e.key === 'Enter') {
                      const trimmed = newCategory.trim();
                      if (!trimmed || allPrefCategories.includes(trimmed)) { setAddingCategory(false); setNewCategory(''); return; }
                      setSavingCategory(true);
                      await supabase.from('custom_pref_categories').insert([{ name: trimmed }]);
                      await loadData();
                      setForm(f => ({...f, category: trimmed}));
                      setSavingCategory(false); setAddingCategory(false); setNewCategory('');
                    }
                  }}
                  placeholder="New category name..." autoFocus style={{ flex: 1 }} />
                <button onClick={async () => {
                  const trimmed = newCategory.trim();
                  if (!trimmed || allPrefCategories.includes(trimmed)) { setAddingCategory(false); setNewCategory(''); return; }
                  setSavingCategory(true);
                  await supabase.from('custom_pref_categories').insert([{ name: trimmed }]);
                  await loadData();
                  setForm(f => ({...f, category: trimmed}));
                  setSavingCategory(false); setAddingCategory(false); setNewCategory('');
                }} style={S.secondaryBtn} disabled={savingCategory}>{savingCategory ? <Spinner /> : 'Add'}</button>
                <button onClick={() => { setAddingCategory(false); setNewCategory(''); }} style={{ ...S.secondaryBtn, color: 'var(--text-muted)' }}>Cancel</button>
              </div>
            ) : (
              <button onClick={() => setAddingCategory(true)} style={{ ...S.ghostBtn, fontSize: 11 }}>+ Add new category</button>
            )}
          </div>
        </Field>
        <Field label="Note *">
          <textarea value={form.note} onChange={e => setForm({...form, note: e.target.value})} placeholder="e.g. Always places the camera port 2cm left of the umbilicus using a Hasson technique..." rows={4} />
        </Field>
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
          <input type="checkbox" checked={form.critical} onChange={e => setForm({...form, critical: e.target.checked})} style={{ width: 14, height: 14, accentColor: 'var(--red)', margin: 0 }} />
          <span style={{ fontSize: 13, color: 'var(--red)', fontFamily: 'var(--font-mono)', letterSpacing: '0.04em' }}>Mark as critical / pet peeve</span>
        </label>
        <button onClick={handleSave} style={S.primaryBtn} disabled={saving}>
          {saving ? <Spinner /> : 'Save Note'}
        </button>
      </div>
    </div>
  );
}

// ── Resources View ─────────────────────────────────────────────────────────
function ResourcesView({ allProcedures, showFlash }) {
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProc, setSelectedProc] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ procedure: '', title: '', url: '', category: RESOURCE_CATEGORIES[0], notes: '' });
  const [saving, setSaving] = useState(false);

  const loadResources = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('resources').select('*').order('procedure').order('category');
    setResources(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { loadResources(); }, [loadResources]);

  const handleAdd = async () => {
    if (!form.procedure || !form.title.trim() || !form.url.trim()) return;
    let url = form.url.trim();
    if (!url.startsWith('http')) url = 'https://' + url;
    setSaving(true);
    const { error } = await supabase.from('resources').insert([{ ...form, url }]);
    setSaving(false);
    if (error) { showFlash('Error saving resource', 'error'); return; }
    await loadResources();
    showFlash('Resource added');
    setForm({ procedure: '', title: '', url: '', category: RESOURCE_CATEGORIES[0], notes: '' });
    setShowAdd(false);
  };

  const handleDelete = async (r) => {
    await archiveItem('resource', `${r.procedure} — ${r.title}`, { resource: r });
    await supabase.from('resources').delete().eq('id', r.id);
    await loadResources();
  };

  const procedures = [...new Set(resources.map(r => r.procedure))].sort();
  const displayedResources = selectedProc ? resources.filter(r => r.procedure === selectedProc) : resources;
  const groupedByProc = displayedResources.reduce((acc, r) => {
    if (!acc[r.procedure]) acc[r.procedure] = {};
    if (!acc[r.procedure][r.category]) acc[r.procedure][r.category] = [];
    acc[r.procedure][r.category].push(r);
    return acc;
  }, {});

  const categoryColors = { 'Video': '#4a7a9a', 'Atlas / Images': '#7a6a9a', 'Guidelines': '#4a8a6a', 'Article': '#8a7a4a', 'Textbook': '#6a6a8a', 'Other': '#5a6a7a' };

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
        <div>
          <h2 style={S.sectionHead}>Procedure Resources</h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20, fontStyle: 'italic' }}>Videos, atlas images, guidelines, and articles — shared across your program.</p>
        </div>
        <button onClick={() => setShowAdd(!showAdd)} style={{ ...S.secondaryBtn, flexShrink: 0 }}>{showAdd ? '× Cancel' : '+ Add Resource'}</button>
      </div>

      {showAdd && (
        <div style={{ ...S.card, marginBottom: 24, background: 'var(--bg3)' }}>
          <div style={{ fontSize: 10, letterSpacing: '0.18em', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginBottom: 14, textTransform: 'uppercase' }}>New Resource</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Procedure *">
                <select value={form.procedure} onChange={e => setForm({...form, procedure: e.target.value})}>
                  <option value="">Select...</option>
                  {allProcedures.map(p => <option key={p}>{p}</option>)}
                </select>
              </Field>
              <Field label="Category">
                <select value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
                  {RESOURCE_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </Field>
            </div>
            <Field label="Title *"><input value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="e.g. CVS demonstration — SAGES 2022" /></Field>
            <Field label="URL *"><input value={form.url} onChange={e => setForm({...form, url: e.target.value})} placeholder="e.g. youtube.com/watch?v=..." /></Field>
            <Field label="Notes (optional)"><input value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} placeholder="e.g. Best demonstration of critical view of safety" /></Field>
            <button onClick={handleAdd} style={S.primaryBtn} disabled={saving}>{saving ? <Spinner /> : 'Save Resource'}</button>
          </div>
        </div>
      )}

      {procedures.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            <button onClick={() => setSelectedProc('')} style={{ ...S.tag, ...(selectedProc === '' ? S.tagActive : {}) }}>All</button>
            {procedures.map(p => (
              <button key={p} onClick={() => setSelectedProc(p)} style={{ ...S.tag, ...(selectedProc === p ? S.tagActive : {}) }}>{p}</button>
            ))}
          </div>
        </div>
      )}

      {loading ? <div style={{ textAlign: 'center', padding: 40 }}><Spinner /></div> : (
        Object.keys(groupedByProc).length === 0 ? (
          <div style={{ textAlign: 'center', padding: '50px 20px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 12, border: '1px dashed rgba(255,255,255,0.07)', borderRadius: 6 }}>
            No resources yet. Add the first one for your program.
          </div>
        ) : (
          Object.entries(groupedByProc).map(([proc, cats]) => (
            <div key={proc} style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 15, color: 'var(--text)', fontFamily: 'var(--font-serif)', marginBottom: 12, paddingBottom: 6, borderBottom: '1px solid var(--border)' }}>{proc}</div>
              {Object.entries(cats).map(([cat, items]) => (
                <div key={cat} style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 10, letterSpacing: '0.15em', color: categoryColors[cat] || 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginBottom: 8, textTransform: 'uppercase' }}>{cat}</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {items.map(r => (
                      <div key={r.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 14px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 'var(--radius)' }}>
                        <div style={{ flex: 1 }}>
                          <a href={r.url} target="_blank" rel="noopener noreferrer" style={{ color: '#7aacca', fontSize: 14, fontFamily: 'var(--font-serif)', textDecoration: 'none', borderBottom: '1px solid rgba(122,172,202,0.3)' }}
                            onMouseEnter={e => e.currentTarget.style.borderBottomColor='rgba(122,172,202,0.8)'}
                            onMouseLeave={e => e.currentTarget.style.borderBottomColor='rgba(122,172,202,0.3)'}
                          >{r.title} ↗</a>
                          {r.notes && <div style={{ marginTop: 3, fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>{r.notes}</div>}
                        </div>
                        <button onClick={() => handleDelete(r)} style={{ background: 'none', border: 'none', color: '#3a3a3a', fontSize: 16, padding: 0, lineHeight: 1, flexShrink: 0, transition: 'color 0.15s' }} onMouseEnter={e => e.currentTarget.style.color='#8a4a3a'} onMouseLeave={e => e.currentTarget.style.color='#3a3a3a'}>×</button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ))
        )
      )}
    </div>
  );
}

// ── Op Note View ───────────────────────────────────────────────────────────
function OpNoteView({ allProcedures, attendings, getPrefsForProcedure }) {
  const [form, setForm] = useState({
    procedure: '', surgeon: '', assistant: 'PGY-[X] resident',
    anesthesia: 'General endotracheal anesthesia', position: '',
    prep: '', indication: '', findings: '', drains: 'None',
    ebl: '', specimens: 'None', complications: 'None',
    disposition: 'Extubated and taken to PACU in stable condition',
    customFields: []
  });
  const [qfProcedure, setQfProcedure] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);

  const quickFill = (attendingId) => {
    const a = attendings.find(x => x.id === attendingId);
    if (!a) return;
    const prefs = getPrefsForProcedure(a, qfProcedure);
    const pos = prefs.find(p => p.category === 'Positioning');
    const prep = prefs.find(p => p.category === 'Prep & Drape');
    setForm(f => ({ ...f, procedure: qfProcedure || f.procedure, surgeon: a.name, position: pos?.note || f.position, prep: prep?.note || f.prep }));
  };

  const getNoteText = () => [
    'OPERATIVE NOTE', '',
    `DATE: ${new Date().toLocaleDateString()}`,
    `SURGEON: Dr. ${form.surgeon || '[Surgeon]'}`,
    `ASSISTANT: ${form.assistant || '[Assistant]'}`,
    `ANESTHESIA: ${form.anesthesia}`, '',
    `PROCEDURE: ${form.procedure || '[Procedure]'}`, '',
    'PREOPERATIVE DIAGNOSIS: [Diagnosis]',
    'POSTOPERATIVE DIAGNOSIS: [Diagnosis]', '',
    'INDICATION:',
    form.indication || '[Indication for surgery]', '',
    'DESCRIPTION OF PROCEDURE:',
    `The patient was taken to the operating room and placed in ${form.position || '[position]'} position. ${form.anesthesia} was administered without difficulty. The patient was prepped and draped in the usual sterile fashion${form.prep ? ` using ${form.prep}` : ''}.`, '',
    '[Operative steps here]', '',
    'FINDINGS:',
    form.findings || '[Intraoperative findings]', '',
    `ESTIMATED BLOOD LOSS: ${form.ebl || '[EBL]'} mL`,
    `DRAINS: ${form.drains}`,
    `SPECIMENS: ${form.specimens}`,
    `COMPLICATIONS: ${form.complications}`, '',
    `DISPOSITION: ${form.disposition}`,
    ...form.customFields.flatMap(f => f.label && f.value ? ['', `${f.label.toUpperCase()}: ${f.value}`] : [])
  ].join('\n');

  const handleCopy = () => {
    navigator.clipboard.writeText(getNoteText()).then(() => {
      setCopySuccess(true); setTimeout(() => setCopySuccess(false), 2000);
    });
  };

  const addCustomField = () => setForm(f => ({ ...f, customFields: [...f.customFields, { id: Date.now().toString(), label: '', value: '' }] }));
  const updateField = (id, k, v) => setForm(f => ({ ...f, customFields: f.customFields.map(x => x.id === id ? { ...x, [k]: v } : x) }));
  const removeField = (id) => setForm(f => ({ ...f, customFields: f.customFields.filter(x => x.id !== id) }));

  return (
    <div className="fade-in">
      <h2 style={S.sectionHead}>Operative Note Boilerplate</h2>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 22, fontStyle: 'italic' }}>Fill in the fields and copy the formatted note into Epic or your EMR.</p>

      {/* Quick Fill */}
      <div style={{ ...S.card, marginBottom: 22, background: 'var(--bg3)', borderColor: 'rgba(60,100,160,0.25)' }}>
        <div style={{ ...S.divider, marginBottom: 12 }}>Quick Fill from Attending Preferences</div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <select value={qfProcedure} onChange={e => setQfProcedure(e.target.value)} style={{ flex: 1, minWidth: 140 }}>
            <option value="">Select procedure...</option>
            {allProcedures.map(p => <option key={p}>{p}</option>)}
          </select>
          <select onChange={e => quickFill(e.target.value)} style={{ flex: 1, minWidth: 140 }} defaultValue="">
            <option value="">Select attending to fill...</option>
            {attendings.map(a => <option key={a.id} value={a.id}>Dr. {a.name}</option>)}
          </select>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Procedure">
            <select value={form.procedure} onChange={e => setForm({...form, procedure: e.target.value})}>
              <option value="">Select...</option>
              {allProcedures.map(p => <option key={p}>{p}</option>)}
            </select>
          </Field>
          <Field label="Surgeon (Last Name)"><input value={form.surgeon} onChange={e => setForm({...form, surgeon: e.target.value})} placeholder="e.g. Smith" /></Field>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Assistant"><input value={form.assistant} onChange={e => setForm({...form, assistant: e.target.value})} /></Field>
          <Field label="Anesthesia"><input value={form.anesthesia} onChange={e => setForm({...form, anesthesia: e.target.value})} /></Field>
        </div>
        <Field label="Patient Position"><input value={form.position} onChange={e => setForm({...form, position: e.target.value})} placeholder="e.g. supine with arms tucked, split-leg" /></Field>
        <Field label="Prep & Drape"><input value={form.prep} onChange={e => setForm({...form, prep: e.target.value})} placeholder="e.g. ChloraPrep, standard laparotomy drape" /></Field>
        <Field label="Indication"><textarea value={form.indication} onChange={e => setForm({...form, indication: e.target.value})} placeholder="e.g. Patient is a [age] year-old presenting with..." rows={2} /></Field>
        <Field label="Intraoperative Findings"><textarea value={form.findings} onChange={e => setForm({...form, findings: e.target.value})} placeholder="e.g. Acutely inflamed appendix without perforation..." rows={2} /></Field>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          <Field label="EBL (mL)"><input value={form.ebl} onChange={e => setForm({...form, ebl: e.target.value})} placeholder="e.g. 50" /></Field>
          <Field label="Drains"><input value={form.drains} onChange={e => setForm({...form, drains: e.target.value})} /></Field>
          <Field label="Specimens"><input value={form.specimens} onChange={e => setForm({...form, specimens: e.target.value})} /></Field>
        </div>
        <Field label="Complications"><input value={form.complications} onChange={e => setForm({...form, complications: e.target.value})} /></Field>
        <Field label="Disposition"><input value={form.disposition} onChange={e => setForm({...form, disposition: e.target.value})} /></Field>

        {form.customFields.map(f => (
          <div key={f.id} style={{ display: 'grid', gridTemplateColumns: '1fr 2fr auto', gap: 8, alignItems: 'end' }}>
            <Field label="Custom Label"><input value={f.label} onChange={e => updateField(f.id, 'label', e.target.value)} placeholder="e.g. IV Access" /></Field>
            <Field label="Value"><input value={f.value} onChange={e => updateField(f.id, 'value', e.target.value)} placeholder="e.g. 18g PIV x2" /></Field>
            <button onClick={() => removeField(f.id)} style={{ background: 'none', border: '1px solid rgba(255,255,255,0.1)', color: '#6a4a3a', borderRadius: 'var(--radius)', padding: '10px 12px', marginBottom: 0 }}>×</button>
          </div>
        ))}
        <button onClick={addCustomField} style={{ ...S.secondaryBtn, width: '100%', textAlign: 'center' }}>+ Add Custom Field</button>
      </div>

      {/* Preview */}
      <div style={{ marginTop: 24 }}>
        <div style={S.divider}>Preview</div>
        <pre style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 'var(--radius)', padding: 16, fontSize: 12, color: '#9ab0a0', fontFamily: 'var(--font-mono)', lineHeight: 1.75, whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: 380, overflowY: 'auto' }}>
          {getNoteText()}
        </pre>
        <button onClick={handleCopy} style={{ ...S.primaryBtn, marginTop: 10, ...(copySuccess ? { background: 'rgba(40,120,60,0.2)', borderColor: 'rgba(60,180,80,0.4)', color: '#4aba7a' } : {}) }}>
          {copySuccess ? '✓ Copied to Clipboard' : 'Copy Op Note'}
        </button>
      </div>
    </div>
  );
}

// ── Procedures View ────────────────────────────────────────────────────────
function ProceduresView({ customProcedures, loadData, showFlash, allProcedures, attendings }) {
  const [newProc, setNewProc] = useState('');
  const [saving, setSaving] = useState(false);
  // Edit modal state
  const [editTarget, setEditTarget] = useState(null); // { name, isDefault }
  const [editMode, setEditMode] = useState('rename'); // 'rename' | 'split'
  const [renameTo, setRenameTo] = useState('');
  const [splitNames, setSplitNames] = useState(['', '']);
  const [editSaving, setEditSaving] = useState(false);

  const handleAdd = async () => {
    const trimmed = newProc.trim();
    if (!trimmed) return;
    if (allProcedures.includes(trimmed)) { showFlash('Procedure already exists', 'error'); return; }
    setSaving(true);
    const { error } = await supabase.from('custom_procedures').insert([{ name: trimmed }]);
    setSaving(false);
    if (error) { showFlash('Error adding procedure', 'error'); return; }
    await loadData();
    showFlash(`"${trimmed}" added`);
    setNewProc('');
  };

  const handleDelete = async (id) => {
    await supabase.from('custom_procedures').delete().eq('id', id);
    await loadData();
    showFlash('Procedure removed', 'error');
  };

  // For default procedures, we track deletions in a separate DB table so they
  // stay hidden across all sessions. We also clean up any linked prefs/resources.
  const [hiddenDefaults, setHiddenDefaults] = useState([]);

  useEffect(() => {
    const loadHidden = async () => {
      const { data } = await supabase.from('custom_procedures').select('name').like('name', '__HIDDEN__%');
      setHiddenDefaults((data || []).map(d => d.name.replace('__HIDDEN__', '')));
    };
    loadHidden();
  }, [customProcedures]);

  const handleDeleteDefault = async (procName) => {
    if (!window.confirm(`Remove "${procName}" from the procedure list? Any linked preference notes and resources will also be deleted.`)) return;
    // Mark as hidden by inserting a sentinel record
    await supabase.from('custom_procedures').insert([{ name: `__HIDDEN__${procName}` }]);
    // Clean up linked data
    await supabase.from('preferences').delete().eq('procedure', procName);
    await supabase.from('resources').delete().eq('procedure', procName);
    await loadData();
    showFlash(`"${procName}" removed`, 'error');
  };

  const visibleDefaults = DEFAULT_PROCEDURES.filter(p => !hiddenDefaults.includes(p));

  const openEdit = (procName, isDefault) => {
    setEditTarget({ name: procName, isDefault });
    setEditMode('rename');
    setRenameTo(procName);
    setSplitNames(['', '']);
  };

  const closeEdit = () => setEditTarget(null);

  // Rename: update all preferences and resources that reference this procedure name
  const handleRename = async () => {
    const newName = renameTo.trim();
    if (!newName || newName === editTarget.name) { closeEdit(); return; }
    if (allProcedures.includes(newName)) { showFlash('That name already exists', 'error'); return; }
    setEditSaving(true);
    try {
      // Update preferences
      await supabase.from('preferences').update({ procedure: newName }).eq('procedure', editTarget.name);
      // Update resources
      await supabase.from('resources').update({ procedure: newName }).eq('procedure', editTarget.name);
      // If it's a custom procedure, rename in custom_procedures table
      if (!editTarget.isDefault) {
        const cp = customProcedures.find(p => p.name === editTarget.name);
        if (cp) await supabase.from('custom_procedures').update({ name: newName }).eq('id', cp.id);
      } else {
        // Default procedure being renamed — save as custom with new name
        // (defaults are hardcoded; renaming one means we track the override as custom)
        await supabase.from('custom_procedures').insert([{ name: newName }]);
      }
      await loadData();
      showFlash(`Renamed to "${newName}"`);
      closeEdit();
    } catch (e) {
      showFlash('Error renaming procedure', 'error');
    }
    setEditSaving(false);
  };

  // Split: duplicate all prefs/resources for each new name, then remove old
  const handleSplit = async () => {
    const names = splitNames.map(n => n.trim()).filter(Boolean);
    if (names.length < 2) { showFlash('Enter at least 2 procedure names to split into', 'error'); return; }
    const dupes = names.filter(n => allProcedures.includes(n) && n !== editTarget.name);
    if (dupes.length) { showFlash(`"${dupes[0]}" already exists`, 'error'); return; }
    setEditSaving(true);
    try {
      // Get all prefs and resources for the original procedure
      const { data: prefs } = await supabase.from('preferences').select('*').eq('procedure', editTarget.name);
      const { data: resources } = await supabase.from('resources').select('*').eq('procedure', editTarget.name);

      for (const name of names) {
        // Add as custom procedure if not already existing
        if (!allProcedures.includes(name)) {
          await supabase.from('custom_procedures').insert([{ name }]);
        }
        // Duplicate prefs for each new name
        if (prefs && prefs.length > 0) {
          const newPrefs = prefs.map(({ id, created_at, ...rest }) => ({ ...rest, procedure: name }));
          await supabase.from('preferences').insert(newPrefs);
        }
        // Duplicate resources for each new name
        if (resources && resources.length > 0) {
          const newRes = resources.map(({ id, created_at, ...rest }) => ({ ...rest, procedure: name }));
          await supabase.from('resources').insert(newRes);
        }
      }

      // Remove original prefs and resources
      await supabase.from('preferences').delete().eq('procedure', editTarget.name);
      await supabase.from('resources').delete().eq('procedure', editTarget.name);
      // Remove original custom procedure entry if it exists
      if (!editTarget.isDefault) {
        const cp = customProcedures.find(p => p.name === editTarget.name);
        if (cp) await supabase.from('custom_procedures').delete().eq('id', cp.id);
      }

      await loadData();
      showFlash(`Split into ${names.length} procedures`);
      closeEdit();
    } catch (e) {
      showFlash('Error splitting procedure', 'error');
    }
    setEditSaving(false);
  };

  const addSplitField = () => setSplitNames(n => [...n, '']);
  const removeSplitField = (i) => setSplitNames(n => n.filter((_, idx) => idx !== i));
  const updateSplitField = (i, val) => setSplitNames(n => n.map((x, idx) => idx === i ? val : x));

  return (
    <div className="fade-in">
      <h2 style={S.sectionHead}>Procedure List</h2>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 22, fontStyle: 'italic' }}>
        Add, rename, or split procedures. Changes propagate to all linked preference notes and resources.
      </p>

      {/* Add new */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 28 }}>
        <input value={newProc} onChange={e => setNewProc(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAdd()} placeholder="e.g. Robotic Low Anterior Resection" style={{ flex: 1 }} />
        <button onClick={handleAdd} style={S.secondaryBtn} disabled={saving}>{saving ? <Spinner /> : 'Add'}</button>
      </div>

      {/* Edit modal */}
      {editTarget && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, padding: 24, width: '100%', maxWidth: 480, boxShadow: '0 8px 40px rgba(0,0,0,0.6)' }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginBottom: 4 }}>Editing</div>
            <div style={{ fontSize: 18, color: 'var(--text)', fontFamily: 'var(--font-serif)', marginBottom: 20 }}>{editTarget.name}</div>

            {/* Mode toggle */}
            <div style={{ display: 'flex', gap: 0, marginBottom: 20, border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
              {['rename', 'split'].map(m => (
                <button key={m} onClick={() => setEditMode(m)} style={{ flex: 1, background: editMode === m ? 'var(--gold-dim)' : 'transparent', border: 'none', borderRight: m === 'rename' ? '1px solid var(--border)' : 'none', color: editMode === m ? 'var(--gold)' : 'var(--text-muted)', padding: '9px 0', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', transition: 'all 0.15s' }}>
                  {m === 'rename' ? '✎ Rename' : '⑂ Split into Multiple'}
                </button>
              ))}
            </div>

            {editMode === 'rename' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <Field label="New Name">
                  <input value={renameTo} onChange={e => setRenameTo(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleRename()} autoFocus />
                </Field>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>All existing preference notes and resources will be updated to the new name.</p>
              </div>
            )}

            {editMode === 'split' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic', marginBottom: 4 }}>
                  Existing notes and resources will be copied to each new procedure. The original will be removed.
                </p>
                {splitNames.map((name, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input value={name} onChange={e => updateSplitField(i, e.target.value)} placeholder={`Procedure ${i + 1} name...`} style={{ flex: 1 }} autoFocus={i === 0} />
                    {splitNames.length > 2 && (
                      <button onClick={() => removeSplitField(i)} style={{ background: 'none', border: 'none', color: '#6a4a3a', fontSize: 16, cursor: 'pointer', flexShrink: 0 }}>×</button>
                    )}
                  </div>
                ))}
                <button onClick={addSplitField} style={{ ...S.ghostBtn, fontSize: 11, color: 'var(--text-muted)', textAlign: 'left' }}>+ Add another</button>
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button onClick={closeEdit} style={{ ...S.secondaryBtn, flex: 1 }}>Cancel</button>
              <button onClick={editMode === 'rename' ? handleRename : handleSplit} style={{ ...S.primaryBtn, flex: 2 }} disabled={editSaving}>
                {editSaving ? <Spinner /> : editMode === 'rename' ? 'Save Rename' : 'Split Procedure'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom procedures */}
      {customProcedures.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <div style={S.divider}>Custom Procedures</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {customProcedures.map(p => (
              <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'rgba(180,140,60,0.05)', border: '1px solid rgba(180,140,60,0.16)', borderRadius: 'var(--radius)' }}>
                <span style={{ fontSize: 14, color: 'var(--text)', fontFamily: 'var(--font-serif)' }}>{p.name}</span>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <button onClick={() => openEdit(p.name, false)} style={{ ...S.ghostBtn, fontSize: 11, color: 'var(--text-muted)' }}>edit</button>
                  <button onClick={() => handleDelete(p.id)} style={{ background: 'none', border: 'none', color: '#5a3a2a', fontSize: 16, padding: 0, cursor: 'pointer', transition: 'color 0.15s' }} onMouseEnter={e => e.currentTarget.style.color='var(--red)'} onMouseLeave={e => e.currentTarget.style.color='#5a3a2a'}>×</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Default procedures */}
      <div>
        <div style={S.divider}>Default Procedures <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>— edit to rename or split</span></div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {visibleDefaults.map(p => (
            <div key={p} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 14px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 'var(--radius)' }}>
              <span style={{ fontSize: 13, color: '#6a7a8a', fontFamily: 'var(--font-serif)' }}>{p}</span>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <button onClick={() => openEdit(p, true)} style={{ ...S.ghostBtn, fontSize: 11 }}>edit</button>
                <button onClick={() => handleDeleteDefault(p)} style={{ background: 'none', border: 'none', color: '#5a3a2a', fontSize: 16, padding: 0, cursor: 'pointer', transition: 'color 0.15s' }} onMouseEnter={e => e.currentTarget.style.color='var(--red)'} onMouseLeave={e => e.currentTarget.style.color='#5a3a2a'}>×</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Archive View ───────────────────────────────────────────────────────────
function ArchiveView({ showFlash, loadData, requireAdmin }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [restoring, setRestoring] = useState(null);

  const loadArchive = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('archive').select('*').order('deleted_at', { ascending: false });
    setItems(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { loadArchive(); }, [loadArchive]);

  const handleRestore = async (item) => {
    setRestoring(item.id);
    try {
      if (item.type === 'attending') {
        const { attending, prefs } = item.data;
        const { data: newAtt } = await supabase.from('attendings').insert([{
          name: attending.name, specialty: attending.specialty,
          nickname: attending.nickname, notes: attending.notes
        }]).select().single();
        if (prefs && prefs.length > 0 && newAtt) {
          const restoredPrefs = prefs.map(({ id, created_at, attending_id, ...rest }) => ({ ...rest, attending_id: newAtt.id }));
          await supabase.from('preferences').insert(restoredPrefs);
        }
      } else if (item.type === 'preference') {
        const { pref } = item.data;
        const { id, created_at, ...rest } = pref;
        await supabase.from('preferences').insert([rest]);
      } else if (item.type === 'resource') {
        const { resource } = item.data;
        const { id, created_at, ...rest } = resource;
        await supabase.from('resources').insert([rest]);
      }
      await supabase.from('archive').delete().eq('id', item.id);
      await loadArchive();
      await loadData();
      showFlash(`"${item.label}" restored`);
    } catch (e) {
      showFlash('Restore failed', 'error');
    }
    setRestoring(null);
  };

  const handleClearArchive = async () => {
    if (!window.confirm('Permanently delete all archived items? This cannot be undone.')) return;
    await supabase.from('archive').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await loadArchive();
    showFlash('Archive cleared', 'error');
  };

  const typeColors = { attending: '#8a6a3a', preference: '#4a7a6a', resource: '#6a4a8a' };
  const typeLabels = { attending: 'Attending', preference: 'Preference Note', resource: 'Resource' };
  const filtered = filter === 'all' ? items : items.filter(i => i.type === filter);

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
        <div>
          <h2 style={S.sectionHead}>Archive</h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20, fontStyle: 'italic' }}>
            All deleted attendings, preference notes, and resources are saved here and can be restored.
          </p>
        </div>
        {items.length > 0 && (
          <button onClick={() => requireAdmin(handleClearArchive)} style={{ ...S.secondaryBtn, flexShrink: 0, color: 'var(--red)', borderColor: 'rgba(192,80,58,0.3)', fontSize: 10 }}>
            🔒 Clear Archive
          </button>
        )}
      </div>

      {items.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 20 }}>
          {['all', 'attending', 'preference', 'resource'].map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{ ...S.tag, ...(filter === f ? S.tagActive : {}) }}>
              {f === 'all' ? `All (${items.length})` : `${typeLabels[f]}s (${items.filter(i => i.type === f).length})`}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}><Spinner /></div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '50px 20px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 12, border: '1px dashed rgba(255,255,255,0.07)', borderRadius: 6 }}>
          {items.length === 0 ? 'No deleted items yet. The archive is empty.' : 'No items of this type in the archive.'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map(item => (
            <div key={item.id} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '12px 16px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 'var(--radius)' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 10, letterSpacing: '0.12em', color: typeColors[item.type] || 'var(--text-muted)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', flexShrink: 0 }}>
                    {typeLabels[item.type]}
                  </span>
                  <span style={{ fontSize: 14, color: 'var(--text)', fontFamily: 'var(--font-serif)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.label}</span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                  Deleted {new Date(item.deleted_at).toLocaleDateString()} at {new Date(item.deleted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
              <button onClick={() => handleRestore(item)} disabled={restoring === item.id}
                style={{ ...S.secondaryBtn, fontSize: 10, flexShrink: 0, color: '#5aba8a', borderColor: 'rgba(90,186,138,0.3)' }}>
                {restoring === item.id ? <Spinner /> : '↩ Restore'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Service Info View ──────────────────────────────────────────────────────
function ServiceInfoView({ showFlash }) {
  const [items, setItems] = useState([]);
  const [services, setServices] = useState([]);
  const [serviceCategories, setServiceCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeService, setActiveService] = useState(null);
  const [activeCategory, setActiveCategory] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [form, setForm] = useState({ title: '', body: '', category: '', service_id: '' });
  const [saving, setSaving] = useState(false);

  // Manage services
  const [managingServices, setManagingServices] = useState(false);
  const [newServiceName, setNewServiceName] = useState('');
  const [savingService, setSavingService] = useState(false);

  // Manage categories
  const [managingCategories, setManagingCategories] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [savingCategory, setSavingCategory] = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    const [{ data: svc }, { data: cats }, { data: itms }] = await Promise.all([
      supabase.from('services').select('*').order('name'),
      supabase.from('custom_service_categories').select('*').order('name'),
      supabase.from('service_info').select('*').order('created_at'),
    ]);
    const svcs = svc || [];
    const allCats = cats && cats.length > 0 ? cats.map(c => c.name) : SERVICE_INFO_CATEGORIES;
    setServices(svcs);
    setServiceCategories(allCats);
    setItems(itms || []);
    // Set defaults
    if (svcs.length > 0) setActiveService(s => s || svcs[0].id);
    setActiveCategory(c => c || allCats[0]);
    setLoading(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  // Ensure custom_service_categories is seeded with defaults if empty
  useEffect(() => {
    const seed = async () => {
      const { data } = await supabase.from('custom_service_categories').select('id');
      if (!data || data.length === 0) {
        await supabase.from('custom_service_categories').insert(
          SERVICE_INFO_CATEGORIES.map(name => ({ name }))
        );
        await loadAll();
      }
    };
    seed();
  }, []); // eslint-disable-line

  const handleSave = async () => {
    if (!form.title.trim() || !form.body.trim() || !form.service_id || !form.category) return;
    setSaving(true);
    if (editingItem) {
      await supabase.from('service_info').update({ title: form.title, body: form.body, category: form.category, service_id: form.service_id }).eq('id', editingItem.id);
      showFlash('Entry updated');
    } else {
      await supabase.from('service_info').insert([form]);
      showFlash('Entry added');
    }
    setSaving(false);
    await loadAll();
    setForm({ title: '', body: '', category: activeCategory, service_id: activeService });
    setShowAdd(false);
    setEditingItem(null);
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setForm({ title: item.title, body: item.body, category: item.category, service_id: item.service_id });
    setShowAdd(true);
  };

  const handleDelete = async (item) => {
    const svcName = services.find(s => s.id === item.service_id)?.name || '';
    await archiveItem('service_info', `${svcName} / ${item.category} — ${item.title}`, { item });
    await supabase.from('service_info').delete().eq('id', item.id);
    await loadAll();
    showFlash('Entry removed — saved to Archive', 'error');
  };

  const handleCancel = () => {
    setShowAdd(false);
    setEditingItem(null);
    setForm({ title: '', body: '', category: activeCategory, service_id: activeService });
  };

  // Add service
  const handleAddService = async () => {
    const trimmed = newServiceName.trim();
    if (!trimmed || services.find(s => s.name === trimmed)) return;
    setSavingService(true);
    await supabase.from('services').insert([{ name: trimmed }]);
    await loadAll();
    setSavingService(false);
    setNewServiceName('');
    showFlash(`"${trimmed}" added`);
  };

  const handleDeleteService = async (svc) => {
    if (!window.confirm(`Remove "${svc.name}" service? All its entries will also be deleted.`)) return;
    await supabase.from('service_info').delete().eq('service_id', svc.id);
    await supabase.from('services').delete().eq('id', svc.id);
    await loadAll();
    if (activeService === svc.id) setActiveService(services.find(s => s.id !== svc.id)?.id || null);
    showFlash(`"${svc.name}" removed`, 'error');
  };

  // Add category
  const handleAddCategory = async () => {
    const trimmed = newCategoryName.trim();
    if (!trimmed || serviceCategories.includes(trimmed)) return;
    setSavingCategory(true);
    await supabase.from('custom_service_categories').insert([{ name: trimmed }]);
    await loadAll();
    setSavingCategory(false);
    setNewCategoryName('');
    showFlash(`"${trimmed}" added`);
  };

  const handleDeleteCategory = async (cat) => {
    if (!window.confirm(`Remove "${cat}" category? Entries in this category will not be deleted but will lose their category label.`)) return;
    await supabase.from('custom_service_categories').delete().eq('name', cat);
    await loadAll();
    if (activeCategory === cat) setActiveCategory(serviceCategories.find(c => c !== cat) || null);
    showFlash(`"${cat}" removed`, 'error');
  };

  const catColors = [
    '#8a6a3a','#4a7a6a','#6a4a8a','#4a6a8a','#7a6a4a','#6a8a4a','#8a4a6a','#5a6a7a',
    '#7a4a4a','#4a7a8a','#8a7a4a','#5a8a6a','#7a5a8a','#6a7a4a','#4a6a7a'
  ];
  const getCatColor = (cat) => {
    const idx = serviceCategories.indexOf(cat);
    return catColors[idx % catColors.length] || '#5a6a7a';
  };

  const activeServiceObj = services.find(s => s.id === activeService);
  const catItems = items.filter(i => i.service_id === activeService && i.category === activeCategory);

  return (
    <div className="fade-in">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
        <div>
          <h2 style={S.sectionHead}>Service Info</h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16, fontStyle: 'italic' }}>
            Service-specific expectations, protocols, dot phrases, and more.
          </p>
        </div>
        {!showAdd && activeService && (
          <button onClick={() => { setShowAdd(true); setForm({ title: '', body: '', category: activeCategory, service_id: activeService }); }}
            style={{ ...S.secondaryBtn, flexShrink: 0 }}>+ Add Entry</button>
        )}
      </div>

      {loading ? <div style={{ textAlign: 'center', padding: 40 }}><Spinner /></div> : (<>

      {/* Service selector row */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, flex: 1 }}>
            {services.map(svc => (
              <button key={svc.id} onClick={() => setActiveService(svc.id)} style={{
                ...S.tag, ...(activeService === svc.id ? S.tagActive : {}), fontSize: 12, padding: '6px 14px'
              }}>{svc.name}</button>
            ))}
          </div>
          <button onClick={() => setManagingServices(v => !v)} style={{ ...S.ghostBtn, fontSize: 10, color: 'var(--text-muted)', flexShrink: 0 }}>
            {managingServices ? 'done' : '⚙ services'}
          </button>
        </div>

        {/* Manage services panel */}
        {managingServices && (
          <div style={{ marginTop: 12, padding: '14px 16px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 'var(--radius)' }}>
            <div style={{ fontSize: 10, letterSpacing: '0.15em', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginBottom: 10, textTransform: 'uppercase' }}>Manage Services</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
              {services.map(svc => (
                <div key={svc.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 10px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 4 }}>
                  <span style={{ fontSize: 13, color: 'var(--text)', fontFamily: 'var(--font-serif)' }}>{svc.name}</span>
                  <button onClick={() => handleDeleteService(svc)} style={{ background: 'none', border: 'none', color: '#5a3a2a', fontSize: 15, padding: 0, cursor: 'pointer', transition: 'color 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.color = 'var(--red)'}
                    onMouseLeave={e => e.currentTarget.style.color = '#5a3a2a'}>×</button>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input value={newServiceName} onChange={e => setNewServiceName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddService()}
                placeholder="New service name..." style={{ flex: 1 }} />
              <button onClick={handleAddService} style={S.secondaryBtn} disabled={savingService}>{savingService ? <Spinner /> : 'Add'}</button>
            </div>
          </div>
        )}
      </div>

      {activeServiceObj && (<>
        {/* Category tabs */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 0, borderBottom: '1px solid var(--border)', marginBottom: 22 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', flex: 1, overflowX: 'auto' }}>
            {serviceCategories.map(cat => (
              <button key={cat} onClick={() => setActiveCategory(cat)} style={{
                background: 'none', border: 'none',
                borderBottom: activeCategory === cat ? `2px solid ${getCatColor(cat)}` : '2px solid transparent',
                color: activeCategory === cat ? getCatColor(cat) : 'var(--text-muted)',
                padding: '8px 14px', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase',
                marginBottom: -1, cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.15s',
                fontFamily: 'var(--font-mono)'
              }}>
                {cat}
                {items.filter(i => i.service_id === activeService && i.category === cat).length > 0 && (
                  <span style={{ marginLeft: 5, fontSize: 10, opacity: 0.6 }}>
                    {items.filter(i => i.service_id === activeService && i.category === cat).length}
                  </span>
                )}
              </button>
            ))}
          </div>
          <button onClick={() => setManagingCategories(v => !v)} style={{ ...S.ghostBtn, fontSize: 10, color: 'var(--text-muted)', padding: '8px 8px', marginBottom: 2, flexShrink: 0 }}>
            {managingCategories ? 'done' : '⚙ tabs'}
          </button>
        </div>

        {/* Manage categories panel */}
        {managingCategories && (
          <div style={{ marginBottom: 20, padding: '14px 16px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 'var(--radius)' }}>
            <div style={{ fontSize: 10, letterSpacing: '0.15em', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginBottom: 10, textTransform: 'uppercase' }}>Manage Category Tabs</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
              {serviceCategories.map(cat => (
                <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 3 }}>
                  <span style={{ fontSize: 12, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>{cat}</span>
                  <button onClick={() => handleDeleteCategory(cat)} style={{ background: 'none', border: 'none', color: '#5a3a2a', fontSize: 14, padding: '0 0 0 4px', cursor: 'pointer', lineHeight: 1, transition: 'color 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.color = 'var(--red)'}
                    onMouseLeave={e => e.currentTarget.style.color = '#5a3a2a'}>×</button>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddCategory()}
                placeholder="New tab name..." style={{ flex: 1 }} />
              <button onClick={handleAddCategory} style={S.secondaryBtn} disabled={savingCategory}>{savingCategory ? <Spinner /> : 'Add'}</button>
            </div>
          </div>
        )}

        {/* Add / Edit form */}
        {showAdd && (
          <div style={{ ...S.card, marginBottom: 24, background: 'var(--bg3)', borderColor: 'rgba(180,140,60,0.2)' }}>
            <div style={{ fontSize: 10, letterSpacing: '0.18em', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginBottom: 14, textTransform: 'uppercase' }}>
              {editingItem ? 'Edit Entry' : `New Entry — ${activeServiceObj.name}`}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
                <Field label="Title *">
                  <input value={form.title} onChange={e => setForm({...form, title: e.target.value})}
                    placeholder={form.category === 'Dot Phrases' ? 'e.g. .lapchole postop' : form.category === 'Expectations' ? 'e.g. Rounding expectations' : 'Title...'} />
                </Field>
                <Field label="Category">
                  <select value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
                    {serviceCategories.map(c => <option key={c}>{c}</option>)}
                  </select>
                </Field>
              </div>
              {editingItem && (
                <Field label="Service">
                  <select value={form.service_id} onChange={e => setForm({...form, service_id: e.target.value})}>
                    {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </Field>
              )}
              <Field label={form.category === 'Dot Phrases' ? 'Dot Phrase Text *' : 'Details *'}>
                <textarea value={form.body} onChange={e => setForm({...form, body: e.target.value})}
                  placeholder={
                    form.category === 'Dot Phrases' ? 'Paste the full dot phrase text here...'
                    : form.category === 'Follow-up Visits' ? 'e.g. All patients follow up in clinic 2 weeks post-op...'
                    : form.category === 'Expectations' ? 'e.g. Pre-round on all surgical patients before 6am...'
                    : 'Details...'
                  }
                  rows={form.category === 'Dot Phrases' ? 8 : 4}
                  style={{ fontFamily: form.category === 'Dot Phrases' ? 'var(--font-mono)' : undefined, fontSize: form.category === 'Dot Phrases' ? 12 : undefined }}
                />
              </Field>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={handleCancel} style={{ ...S.secondaryBtn, flex: 1 }}>Cancel</button>
                <button onClick={handleSave} style={{ ...S.primaryBtn, flex: 3 }} disabled={saving}>
                  {saving ? <Spinner /> : editingItem ? 'Save Changes' : 'Add Entry'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Items list */}
        {catItems.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '50px 20px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 12, border: '1px dashed rgba(255,255,255,0.07)', borderRadius: 6 }}>
            No entries yet for {activeServiceObj.name} / {activeCategory}. Add the first one.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {catItems.map(item => (
              <div key={item.id} style={{ ...S.card, borderLeft: `3px solid ${getCatColor(item.category)}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div style={{ fontSize: 15, color: 'var(--text)', fontFamily: 'var(--font-serif)', flex: 1 }}>{item.title}</div>
                  <div style={{ display: 'flex', gap: 12, flexShrink: 0, marginLeft: 12 }}>
                    <button onClick={() => handleEdit(item)} style={{ ...S.ghostBtn, fontSize: 11, color: '#4a6a7a' }}>edit</button>
                    <button onClick={() => handleDelete(item)} style={{ background: 'none', border: 'none', color: '#5a3a2a', fontSize: 16, padding: 0, cursor: 'pointer', transition: 'color 0.15s' }}
                      onMouseEnter={e => e.currentTarget.style.color = 'var(--red)'}
                      onMouseLeave={e => e.currentTarget.style.color = '#5a3a2a'}>×</button>
                  </div>
                </div>
                <pre style={{
                  margin: 0, fontSize: item.category === 'Dot Phrases' ? 12 : 13,
                  color: item.category === 'Dot Phrases' ? '#8ab0a0' : '#b0a880',
                  fontFamily: item.category === 'Dot Phrases' ? 'var(--font-mono)' : 'var(--font-serif)',
                  lineHeight: 1.7, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                  background: item.category === 'Dot Phrases' ? 'rgba(0,0,0,0.2)' : 'transparent',
                  padding: item.category === 'Dot Phrases' ? '10px 12px' : 0,
                  borderRadius: item.category === 'Dot Phrases' ? 4 : 0
                }}>{item.body}</pre>
                <div style={{ marginTop: 8, fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                  Added {new Date(item.created_at).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </>)}
      </>)}
    </div>
  );
}

// ── Phone Book View ────────────────────────────────────────────────────────
const SEED_CONTACTS = [
  // Surgery Services/Admin
  { name: 'Chief on call', number: '29990', category: 'Surgery Services' },
  { name: 'ED Resident', number: '28929', category: 'Surgery Services' },
  { name: 'Intern on call / Orange Jr', number: '29868', category: 'Surgery Services' },
  { name: 'Green', number: '29869', category: 'Surgery Services' },
  { name: 'Gold (ACS1) Jr', number: '29898', category: 'Surgery Services' },
  { name: 'Red Chief', number: '29870', category: 'Surgery Services' },
  { name: 'Red Jr', number: '29855', category: 'Surgery Services' },
  { name: 'SICU Chief', number: '29867', category: 'Surgery Services' },
  { name: 'Trauma Chief', number: '29859', category: 'Surgery Services' },
  { name: 'Trauma Jr', number: '29858', category: 'Surgery Services' },
  { name: 'Kayla (ACS1/Gold NP)', number: '28917', category: 'Surgery Services' },
  { name: 'Kristen (ACS2/Blue NP)', number: '28918', category: 'Surgery Services' },
  { name: 'Erin Madden', number: '27352', category: 'Surgery Services' },
  { name: 'ASP/Trauma Clinic', number: '23971', category: 'Surgery Services' },
  { name: 'Paging', number: '28888', category: 'Surgery Services' },
  { name: 'Med Staff Support', number: '29000', category: 'Surgery Services' },
  // Ancillary Services
  { name: 'Bob Hoover, IPR', number: '28674', category: 'Ancillary Services' },
  { name: 'CM Weekend', number: '22671', category: 'Ancillary Services' },
  { name: 'Cole Mepham, CM', number: '20837', category: 'Ancillary Services' },
  { name: 'Colleen Clark, CM', number: '20839', category: 'Ancillary Services' },
  { name: 'Great Lakes Orthotics', number: '24576', category: 'Ancillary Services' },
  { name: 'Janet Weisz, 2E Nutrition', number: '26224', category: 'Ancillary Services' },
  { name: 'Jason Hecht, SICU PRH', number: '26223', category: 'Ancillary Services' },
  { name: 'Joan Zurkan, 8E Nutrition', number: '26846', category: 'Ancillary Services' },
  { name: 'Kara Brockhaus, 2E/8E PRH', number: '26847', category: 'Ancillary Services' },
  { name: 'PT/OT/SLP', number: '22365', category: 'Ancillary Services' },
  { name: 'Rachel Lang, SW', number: '26470', category: 'Ancillary Services' },
  { name: 'SW Weekend', number: '29508', category: 'Ancillary Services' },
  { name: 'Pharm – Coag RPH', number: '26719', category: 'Ancillary Services' },
  { name: 'Pharm – Renal RPH', number: '26947', category: 'Ancillary Services' },
  { name: 'Psych Access', number: '22762', category: 'Ancillary Services' },
  { name: 'ED Medication Historian', number: '29489', category: 'Ancillary Services' },
  // Imaging
  { name: 'Radiology Main Desk', number: '2-RADS', category: 'Imaging' },
  { name: 'Breast Imaging Center', number: '25907', category: 'Imaging' },
  { name: 'Cardiac Cath Lab', number: '23737', category: 'Imaging' },
  { name: 'CT Main', number: '23442', category: 'Imaging' },
  { name: 'Echo Lab', number: '28638', category: 'Imaging' },
  { name: 'IR / Angio', number: '23662 / 28697', category: 'Imaging' },
  { name: 'MRI Front', number: '24958', category: 'Imaging' },
  { name: 'MRI Tech', number: '25340', category: 'Imaging' },
  { name: 'Nuclear Medicine', number: '27130 / 21328', category: 'Imaging' },
  { name: 'Vascular Lab', number: '28606', category: 'Imaging' },
  { name: 'XR Tech', number: '23947', category: 'Imaging' },
  { name: 'XR Portable', number: '28945', category: 'Imaging' },
  // Other Services
  { name: 'Acute Pain Service RN (APS)', number: '29480', category: 'Other Services', notes: 'Weekends: call attending' },
  { name: 'Acute Pain Service Attending', number: '29827', category: 'Other Services' },
  { name: 'STAT Intubation', number: '29326', category: 'Other Services' },
  { name: 'CT Surgery APP', number: '29856', category: 'Other Services' },
  { name: 'ENT APP', number: '66055', category: 'Other Services' },
  { name: 'GI Rounder', number: '29897', category: 'Other Services' },
  { name: 'IHA Triage', number: '29332', category: 'Other Services' },
  { name: 'IHA Tech Support', number: '734-327-0388', category: 'Other Services' },
  { name: 'MICU Resident', number: '29321', category: 'Other Services' },
  { name: 'Neurosurgery APP', number: '20832', category: 'Other Services' },
  { name: 'OB Chief', number: '29937', category: 'Other Services' },
  { name: 'Ortho APP', number: '29589', category: 'Other Services' },
  { name: 'Ortho Resident', number: '29441', category: 'Other Services' },
  { name: 'PICC Team', number: '25759', category: 'Other Services' },
  { name: 'STAT RN', number: '20801', category: 'Other Services' },
  { name: 'Urology APP', number: '26569', category: 'Other Services' },
  { name: 'Cardiology Rounder', number: '29811', category: 'Other Services' },
  // Departments
  { name: 'Anesthesia In Charge (AIC)', number: '20747', category: 'Departments' },
  { name: 'Blood Bank', number: '23158 / 23189', category: 'Departments' },
  { name: 'Central Scheduling', number: '21313', category: 'Departments' },
  { name: 'CSPD', number: '26880', category: 'Departments' },
  { name: 'Hemodialysis', number: '23476', category: 'Departments' },
  { name: 'Lab, Inpatient', number: '23141', category: 'Departments' },
  { name: 'Main OR Front Desk', number: '23860', category: 'Departments' },
  { name: 'Main OR Pre-op', number: '24044', category: 'Departments' },
  { name: 'Main OR PACU', number: '24013', category: 'Departments' },
  { name: 'Main OR Rooms', number: '239xx (x = room #)', category: 'Departments' },
  { name: 'Micro Lab', number: '24235', category: 'Departments' },
  { name: 'OSC Charge', number: '28993', category: 'Departments' },
  { name: 'OSC Pre-op', number: '21565', category: 'Departments' },
  { name: 'OSC PACU', number: '25045', category: 'Departments' },
  { name: 'OR Ted', number: '20738', category: 'Departments' },
  { name: 'Pt Resource Mgmt (PRM)', number: '24242', category: 'Departments' },
  { name: 'Pathology', number: '23326', category: 'Departments' },
  { name: 'Pharmacy, Inpatient', number: '25709', category: 'Departments' },
  { name: 'SICU Charge', number: '29230', category: 'Departments' },
  { name: 'Select', number: '734-337-1100', category: 'Departments' },
  { name: 'Short Stay', number: '28943', category: 'Departments' },
  { name: 'East Pt Floors', number: '26x01 (x = floor #)', category: 'Departments' },
  { name: '2N/SICU Clerk', number: '26251', category: 'Departments' },
  { name: '5N', number: '28570', category: 'Departments' },
  { name: '6N', number: '28580', category: 'Departments' },
  { name: 'ED Observation Center', number: '24851', category: 'Departments' },
  { name: 'ER Team 1', number: '23001', category: 'Departments' },
  { name: 'ER Team 2', number: '23002', category: 'Departments' },
  { name: 'ER Team 3', number: '23003', category: 'Departments' },
  { name: 'ER Team 5', number: '22760', category: 'Departments' },
  { name: 'MICU Desk', number: '26672 / 26651', category: 'Departments' },
];

const PHONE_CATEGORIES = ['Surgery Services', 'Ancillary Services', 'Imaging', 'Other Services', 'Departments'];

function PhoneBookView({ showFlash }) {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [showAdd, setShowAdd] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [form, setForm] = useState({ name: '', number: '', category: PHONE_CATEGORIES[0], notes: '' });
  const [saving, setSaving] = useState(false);

  const loadContacts = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('phone_book').select('*').order('category').order('name');
    if (!data || data.length === 0) {
      // Seed with St Joe's data on first load
      await supabase.from('phone_book').insert(SEED_CONTACTS);
      const { data: seeded } = await supabase.from('phone_book').select('*').order('category').order('name');
      setContacts(seeded || []);
    } else {
      setContacts(data);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadContacts(); }, [loadContacts]);

  const handleSave = async () => {
    if (!form.name.trim() || !form.number.trim()) return;
    setSaving(true);
    if (editingContact) {
      await supabase.from('phone_book').update(form).eq('id', editingContact.id);
      showFlash('Contact updated');
    } else {
      await supabase.from('phone_book').insert([form]);
      showFlash('Contact added');
    }
    setSaving(false);
    await loadContacts();
    setForm({ name: '', number: '', category: activeCategory === 'All' ? PHONE_CATEGORIES[0] : activeCategory, notes: '' });
    setShowAdd(false);
    setEditingContact(null);
  };

  const handleEdit = (c) => {
    setEditingContact(c);
    setForm({ name: c.name, number: c.number, category: c.category, notes: c.notes || '' });
    setShowAdd(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (c) => {
    await archiveItem('phone_book', `${c.name} — ${c.number}`, { contact: c });
    await supabase.from('phone_book').delete().eq('id', c.id);
    await loadContacts();
    showFlash('Contact removed — saved to Archive', 'error');
  };

  const handleCancel = () => {
    setShowAdd(false);
    setEditingContact(null);
    setForm({ name: '', number: '', category: activeCategory === 'All' ? PHONE_CATEGORIES[0] : activeCategory, notes: '' });
  };

  const allCategories = ['All', ...PHONE_CATEGORIES, ...([...new Set(contacts.map(c => c.category))].filter(c => !PHONE_CATEGORIES.includes(c)))];
  const catCounts = allCategories.reduce((acc, cat) => {
    acc[cat] = cat === 'All' ? contacts.length : contacts.filter(c => c.category === cat).length;
    return acc;
  }, {});

  const filtered = contacts.filter(c => {
    const matchCat = activeCategory === 'All' || c.category === activeCategory;
    const matchSearch = !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.number.includes(search) || (c.notes || '').toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  // Group by category for display
  const grouped = filtered.reduce((acc, c) => {
    if (!acc[c.category]) acc[c.category] = [];
    acc[c.category].push(c);
    return acc;
  }, {});

  const catColors = { 'Surgery Services': '#8a6a3a', 'Ancillary Services': '#4a7a6a', 'Imaging': '#4a6a8a', 'Other Services': '#7a6a4a', 'Departments': '#6a4a8a' };

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
        <div>
          <h2 style={S.sectionHead}>Phone Book</h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 6, fontStyle: 'italic' }}>
            St. Joe's internal directory. <span style={{ color: '#6a7a5a' }}>Dial 991 + ext for outside calls · From outside add 734-71</span>
          </p>
        </div>
        {!showAdd && (
          <button onClick={() => { setShowAdd(true); setForm({ name: '', number: '', category: activeCategory === 'All' ? PHONE_CATEGORIES[0] : activeCategory, notes: '' }); }}
            style={{ ...S.secondaryBtn, flexShrink: 0 }}>+ Add</button>
        )}
      </div>

      {/* Search */}
      <input value={search} onChange={e => setSearch(e.target.value)}
        placeholder="Search by name or number..."
        style={{ marginBottom: 16, width: '100%', boxSizing: 'border-box' }} />

      {/* Category filter tabs */}
      <div style={{ display: 'flex', gap: 0, flexWrap: 'wrap', borderBottom: '1px solid var(--border)', marginBottom: 22, overflowX: 'auto' }}>
        {allCategories.map(cat => (
          <button key={cat} onClick={() => setActiveCategory(cat)} style={{
            background: 'none', border: 'none',
            borderBottom: activeCategory === cat ? `2px solid ${catColors[cat] || 'var(--gold)'}` : '2px solid transparent',
            color: activeCategory === cat ? (catColors[cat] || 'var(--gold)') : 'var(--text-muted)',
            padding: '8px 14px', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase',
            marginBottom: -1, cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.15s',
            fontFamily: 'var(--font-mono)'
          }}>
            {cat}
            {catCounts[cat] > 0 && <span style={{ marginLeft: 5, fontSize: 10, opacity: 0.5 }}>{catCounts[cat]}</span>}
          </button>
        ))}
      </div>

      {/* Add / Edit form */}
      {showAdd && (
        <div style={{ ...S.card, marginBottom: 24, background: 'var(--bg3)', borderColor: 'rgba(180,140,60,0.2)' }}>
          <div style={{ fontSize: 10, letterSpacing: '0.18em', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginBottom: 14, textTransform: 'uppercase' }}>
            {editingContact ? 'Edit Contact' : 'New Contact'}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
              <Field label="Name *"><input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="e.g. SICU Charge" autoFocus /></Field>
              <Field label="Number *"><input value={form.number} onChange={e => setForm({...form, number: e.target.value})} placeholder="e.g. 29230" /></Field>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Category">
                <select value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
                  {allCategories.filter(c => c !== 'All').map(c => <option key={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="Notes (optional)"><input value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} placeholder="e.g. Weekends only" /></Field>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handleCancel} style={{ ...S.secondaryBtn, flex: 1 }}>Cancel</button>
              <button onClick={handleSave} style={{ ...S.primaryBtn, flex: 3 }} disabled={saving}>
                {saving ? <Spinner /> : editingContact ? 'Save Changes' : 'Add Contact'}
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}><Spinner /></div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 12, border: '1px dashed rgba(255,255,255,0.07)', borderRadius: 6 }}>
          No contacts found.
        </div>
      ) : (
        Object.entries(grouped).map(([cat, items]) => (
          <div key={cat} style={{ marginBottom: 28 }}>
            {activeCategory === 'All' && (
              <div style={{ ...S.divider, borderBottomColor: catColors[cat] ? `${catColors[cat]}44` : undefined, color: catColors[cat] || 'var(--text-muted)' }}>{cat}</div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {items.map(c => (
                <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 14px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 'var(--radius)', borderLeft: `3px solid ${catColors[c.category] || '#4a5a6a'}` }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, color: 'var(--text)', fontFamily: 'var(--font-serif)' }}>{c.name}</div>
                    {c.notes && <div style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic', marginTop: 1 }}>{c.notes}</div>}
                  </div>
                  <div style={{ fontSize: 16, color: '#7aacca', fontFamily: 'var(--font-mono)', letterSpacing: '0.06em', flexShrink: 0 }}>{c.number}</div>
                  <button onClick={() => handleEdit(c)} style={{ ...S.ghostBtn, fontSize: 11, color: '#4a6a7a', flexShrink: 0 }}>edit</button>
                  <button onClick={() => handleDelete(c)} style={{ background: 'none', border: 'none', color: '#5a3a2a', fontSize: 15, padding: 0, cursor: 'pointer', transition: 'color 0.15s', flexShrink: 0 }}
                    onMouseEnter={e => e.currentTarget.style.color = 'var(--red)'}
                    onMouseLeave={e => e.currentTarget.style.color = '#5a3a2a'}>×</button>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
