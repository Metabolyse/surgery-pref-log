import { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabaseClient';
import './index.css';

// ── Constants ──────────────────────────────────────────────────────────────
const SPECIALTIES = ['General Surgery','Colorectal','Hepatobiliary','Foregut','Endocrine','Trauma','Vascular','Thoracic','Other'];
const PREF_CATEGORIES = ['Positioning','Prep & Drape','Port Placement','Instrument Preference','Dissection Technique','Critical Steps','Closure','Pet Peeves','Post-op Orders','Other'];
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

// ── Main App ───────────────────────────────────────────────────────────────
export default function App() {
  const [view, setView] = useState('list');
  const [attendings, setAttendings] = useState([]);
  const [customProcedures, setCustomProcedures] = useState([]);
  const [selectedAttending, setSelectedAttending] = useState(null);
  const [selectedProcedure, setSelectedProcedure] = useState(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [flash, setFlash] = useState(null);

  const allProcedures = [...new Set([...DEFAULT_PROCEDURES, ...customProcedures.map(p => p.name)])].sort();

  const showFlash = useCallback((msg, type = 'success') => {
    setFlash({ msg, type });
    setTimeout(() => setFlash(null), 2500);
  }, []);

  // ── Load data ──
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: att }, { data: prefs }, { data: cp }] = await Promise.all([
        supabase.from('attendings').select('*').order('name'),
        supabase.from('preferences').select('*').order('created_at'),
        supabase.from('custom_procedures').select('*').order('name'),
      ]);
      const attendingsWithPrefs = (att || []).map(a => ({
        ...a,
        prefs: (prefs || []).filter(p => p.attending_id === a.id)
      }));
      setAttendings(attendingsWithPrefs);
      setCustomProcedures(cp || []);
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
  ];
  const topLevel = ['list','resources','opNote','procedures'];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', position: 'relative' }}>
      {/* Background atmosphere */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse at 15% 60%, rgba(180,120,40,0.05) 0%, transparent 55%), radial-gradient(ellipse at 85% 15%, rgba(40,80,160,0.06) 0%, transparent 50%)', zIndex: 0 }} />

      <Flash flash={flash} />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 800, margin: '0 auto', padding: '0 16px 80px' }}>

        {/* Header */}
        <div style={{ padding: '32px 0 0', borderBottom: '1px solid var(--border)', marginBottom: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, paddingBottom: 16 }}>
            <div>
              <div style={{ fontSize: 10, letterSpacing: '0.28em', color: '#6a7a5a', fontFamily: 'var(--font-mono)', marginBottom: 5, textTransform: 'uppercase' }}>General Surgery Residency</div>
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

          {/* Tabs */}
          {topLevel.includes(view) && (
            <div style={{ display: 'flex', gap: 0 }}>
              {TABS.map(t => (
                <button key={t.key} onClick={() => setView(t.key)} style={{ background: 'none', border: 'none', borderBottom: view === t.key ? '2px solid var(--gold)' : '2px solid transparent', color: view === t.key ? 'var(--gold)' : 'var(--text-muted)', padding: '10px 16px', fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: -1, transition: 'all 0.15s' }}>
                  {t.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div style={{ paddingTop: 28 }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}><Spinner /></div>
          ) : (
            <>
              {view === 'list' && <ListView attendings={filtered} search={search} setSearch={setSearch} navTo={navTo} showFlash={showFlash} loadData={loadData} allProcedures={allProcedures} />}
              {view === 'addAttending' && <AddAttendingView navTo={navTo} showFlash={showFlash} loadData={loadData} />}
              {view === 'detail' && selectedAttending && <DetailView attending={selectedAttending} selectedProcedure={selectedProcedure} setSelectedProcedure={setSelectedProcedure} navTo={navTo} showFlash={showFlash} loadData={loadData} getProceduresForAttending={getProceduresForAttending} getPrefsForProcedure={getPrefsForProcedure} allProcedures={allProcedures} />}
              {view === 'addNote' && selectedAttending && <AddNoteView attending={selectedAttending} selectedProcedure={selectedProcedure} navTo={navTo} showFlash={showFlash} loadData={loadData} allProcedures={allProcedures} />}
              {view === 'resources' && <ResourcesView allProcedures={allProcedures} showFlash={showFlash} />}
              {view === 'opNote' && <OpNoteView allProcedures={allProcedures} attendings={attendings} getPrefsForProcedure={getPrefsForProcedure} />}
              {view === 'procedures' && <ProceduresView customProcedures={customProcedures} loadData={loadData} showFlash={showFlash} allProcedures={allProcedures} />}
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

// ── Add Attending ──────────────────────────────────────────────────────────
function AddAttendingView({ navTo, showFlash, loadData }) {
  const [form, setForm] = useState({ name: '', specialty: 'General Surgery', nickname: '', notes: '' });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    const { error } = await supabase.from('attendings').insert([form]);
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
        <Field label="Specialty">
          <select value={form.specialty} onChange={e => setForm({...form, specialty: e.target.value})}>
            {SPECIALTIES.map(s => <option key={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="General Notes"><textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} placeholder="Personality, communication style, general things to know..." rows={3} /></Field>
        <button onClick={handleSave} style={S.primaryBtn} disabled={saving}>
          {saving ? <Spinner /> : 'Save Attending'}
        </button>
      </div>
    </div>
  );
}

// ── Detail View ────────────────────────────────────────────────────────────
function DetailView({ attending, selectedProcedure, setSelectedProcedure, navTo, showFlash, loadData, getProceduresForAttending, getPrefsForProcedure, allProcedures }) {
  const [deleting, setDeleting] = useState(false);
  const procedures = getProceduresForAttending(attending);

  const handleDelete = async () => {
    if (!window.confirm(`Remove Dr. ${attending.name} and all their notes?`)) return;
    setDeleting(true);
    await supabase.from('attendings').delete().eq('id', attending.id);
    await loadData();
    showFlash('Attending removed', 'error');
    navTo('list');
  };

  const handleDeletePref = async (prefId) => {
    await supabase.from('preferences').delete().eq('id', prefId);
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <button onClick={() => navTo('list')} style={S.backBtn}>← All Attendings</button>
        <div style={{ display: 'flex', gap: 16 }}>
          <button onClick={() => navTo('opNote')} style={{ ...S.ghostBtn, color: '#6a8a7a' }}>Op Note ↗</button>
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
                    <button onClick={() => handleDeletePref(p.id)} style={{ background: 'none', border: 'none', color: '#3a3a3a', fontSize: 16, padding: 0, lineHeight: 1, flexShrink: 0, transition: 'color 0.15s' }} onMouseEnter={e => e.currentTarget.style.color='#8a4a3a'} onMouseLeave={e => e.currentTarget.style.color='#3a3a3a'}>×</button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <button onClick={() => navTo('addNote', attending, selectedProcedure || null)} style={S.primaryBtn}>+ Log Preference</button>
    </div>
  );
}

// ── Add Note ───────────────────────────────────────────────────────────────
function AddNoteView({ attending, selectedProcedure, navTo, showFlash, loadData, allProcedures }) {
  const [form, setForm] = useState({ procedure: selectedProcedure || '', category: PREF_CATEGORIES[0], note: '', critical: false });
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
          <select value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
            {PREF_CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
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

  const handleDelete = async (id) => {
    await supabase.from('resources').delete().eq('id', id);
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
                        <button onClick={() => handleDelete(r.id)} style={{ background: 'none', border: 'none', color: '#3a3a3a', fontSize: 16, padding: 0, lineHeight: 1, flexShrink: 0, transition: 'color 0.15s' }} onMouseEnter={e => e.currentTarget.style.color='#8a4a3a'} onMouseLeave={e => e.currentTarget.style.color='#3a3a3a'}>×</button>
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
function ProceduresView({ customProcedures, loadData, showFlash, allProcedures }) {
  const [newProc, setNewProc] = useState('');
  const [saving, setSaving] = useState(false);

  const handleAdd = async () => {
    const trimmed = newProc.trim();
    if (!trimmed || allProcedures.includes(trimmed)) { if (allProcedures.includes(trimmed)) showFlash('Procedure already exists', 'error'); return; }
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
  };

  return (
    <div className="fade-in">
      <h2 style={S.sectionHead}>Procedure List</h2>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 22, fontStyle: 'italic' }}>Add custom procedures to use across preference notes, resources, and op notes.</p>

      <div style={{ display: 'flex', gap: 10, marginBottom: 28 }}>
        <input value={newProc} onChange={e => setNewProc(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAdd()} placeholder="e.g. Robotic Low Anterior Resection" style={{ flex: 1 }} />
        <button onClick={handleAdd} style={S.secondaryBtn} disabled={saving}>{saving ? <Spinner /> : 'Add'}</button>
      </div>

      {customProcedures.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <div style={S.divider}>Custom Procedures</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {customProcedures.map(p => (
              <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'rgba(180,140,60,0.05)', border: '1px solid rgba(180,140,60,0.16)', borderRadius: 'var(--radius)' }}>
                <span style={{ fontSize: 14, color: 'var(--text)', fontFamily: 'var(--font-serif)' }}>{p.name}</span>
                <button onClick={() => handleDelete(p.id)} style={{ background: 'none', border: 'none', color: '#5a3a2a', fontSize: 16, padding: 0, cursor: 'pointer', transition: 'color 0.15s' }} onMouseEnter={e => e.currentTarget.style.color='var(--red)'} onMouseLeave={e => e.currentTarget.style.color='#5a3a2a'}>×</button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <div style={S.divider}>Default Procedures</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {DEFAULT_PROCEDURES.map(p => (
            <span key={p} style={{ fontSize: 11, color: '#3a4a5a', fontFamily: 'var(--font-mono)', padding: '4px 9px', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 3 }}>{p}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
