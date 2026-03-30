import { useEffect, useState } from 'react';
import { useAuth } from '../../../../../context/AuthContext';
import { getGradebookGrades, postGradebookGrades, uploadGradebookCsv,getMyClasses } from '../../../../../api/api';

function Stats({ grades }) {
  const numeric = grades.filter(g => typeof g.grade === 'number');
  if (!numeric.length) return null;
  const values = numeric.map(g => g.grade);
  const highest = Math.max(...values);
  const lowest = Math.min(...values);
  const passed = numeric.filter(v => v.grade >= (v.max_grade || 50)).length;
  const failed = numeric.length - passed;
  return (
    <div className='flex gap-3 items-center'>
      <div className='text-sm text-[var(--color-text-muted)]'>Highest: <span className='font-semibold text-[var(--color-text-primary)]'>{highest}</span></div>
      <div className='text-sm text-[var(--color-text-muted)]'>Lowest: <span className='font-semibold text-[var(--color-text-primary)]'>{lowest}</span></div>
      <div className='text-sm text-[var(--color-text-muted)]'>Passed: <span className='font-semibold text-[var(--color-text-primary)]'>{passed}</span></div>
      <div className='text-sm text-[var(--color-text-muted)]'>Failed: <span className='font-semibold text-[var(--color-text-primary)]'>{failed}</span></div>
    </div>
  );
}

export default function Gradebook() {
  const { user } = useAuth();
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [grades, setGrades] = useState([]);
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState(null);
  const [newGrade, setNewGrade] = useState({ student_id: '', grade: '', max_grade: '' , feedback: ''});

  useEffect(() => {
    getMyClasses().then(r => setClasses(r.data || [])).catch(()=>{});
  }, []);

  useEffect(() => {
    if (!selectedClass) return;
    setLoading(true);
    getGradebookGrades(selectedClass)
      .then(res => setGrades(res.data || []))
      .finally(() => setLoading(false));
  }, [selectedClass]);

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    setFile(f || null);
  };

  const uploadCsv = async () => {
    if (!file || !selectedClass) return;
    const text = await file.text();
    await uploadGradebookCsv({ csv: text, class_id: selectedClass, teacher_id: user?.id });
    const res = await getGradebookGrades(selectedClass);
    setGrades(res.data || []);
  };

  const addManualGrade = async () => {
    if (!selectedClass) return;
    const payload = { class_id: selectedClass, teacher_id: user?.id, grades: [{ student_id: newGrade.student_id, grade: Number(newGrade.grade), max_grade: Number(newGrade.max_grade)||100, feedback: newGrade.feedback || '', grade_type: 'manual' }] };
    await postGradebookGrades(payload);
    const res = await getGradebookGrades(selectedClass);
    setGrades(res.data || []);
    setNewGrade({ student_id: '', grade: '', max_grade: '', feedback: '' });
  };

  return (
    <div className='p-6 w-full max-w-full'>
      <div className='flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4'>
        <div className='flex gap-2 items-center'>
          <label className='text-sm text-[var(--color-text-muted)]'>Class</label>
          <select value={selectedClass||''} onChange={e => setSelectedClass(e.target.value)} className='px-3 py-2 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)]'>
            <option value=''>Select class</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.name || c.title || c.id}</option>)}
          </select>
        </div>

        <div className='flex gap-2 items-center'>
          <input type='file' accept='.csv,text/csv' onChange={handleFileChange} />
          <button onClick={uploadCsv} className='px-3 py-2 rounded-xl bg-[var(--color-primary)] text-white'>Upload CSV</button>
        </div>

      </div>

      <div className='mb-4 flex items-center justify-between'>
        <h2 className='text-lg font-semibold text-[var(--color-text-primary)]'>Gradebook</h2>
        <Stats grades={grades} />
      </div>

      <div className='mb-4 grid gap-2 grid-cols-1 md:grid-cols-4'>
        <input placeholder='Student ID' value={newGrade.student_id} onChange={e=>setNewGrade(s=>({...s, student_id:e.target.value}))} className='px-3 py-2 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)]' />
        <input placeholder='Grade' value={newGrade.grade} onChange={e=>setNewGrade(s=>({...s, grade:e.target.value}))} className='px-3 py-2 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)]' />
        <input placeholder='Max grade' value={newGrade.max_grade} onChange={e=>setNewGrade(s=>({...s, max_grade:e.target.value}))} className='px-3 py-2 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)]' />
        <button onClick={addManualGrade} className='px-3 py-2 rounded-xl bg-[var(--color-primary)] text-white'>Add Grade</button>
      </div>

      <div className='overflow-x-auto bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg'>
        <table className='w-full text-left'>
          <thead>
            <tr className='text-[var(--color-text-muted)] text-sm'>
              <th className='px-3 py-2'>Student ID</th>
              <th className='px-3 py-2'>Grade</th>
              <th className='px-3 py-2'>Max</th>
              <th className='px-3 py-2'>Type</th>
              <th className='px-3 py-2'>Feedback</th>
              <th className='px-3 py-2'>Released</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td className='px-3 py-2' colSpan={6}>Loading…</td></tr>}
            {!loading && grades.length === 0 && <tr><td className='px-3 py-2' colSpan={6}>No grades yet</td></tr>}
            {grades.map(g => (
              <tr key={g.id} className='border-t border-[var(--color-border)]'>
                <td className='px-3 py-2'>{g.student_id}</td>
                <td className='px-3 py-2'>{g.grade}</td>
                <td className='px-3 py-2'>{g.max_grade}</td>
                <td className='px-3 py-2'>{g.grade_type}</td>
                <td className='px-3 py-2 max-w-[250px] truncate'>{g.feedback}</td>
                <td className='px-3 py-2'>{g.released ? 'Yes' : 'No'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
