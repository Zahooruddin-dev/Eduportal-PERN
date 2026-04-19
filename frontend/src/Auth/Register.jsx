import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getRegisterOptions, registerUser } from '../api/authApi';
import { acceptAdminInvite } from '../api/adminApi';
import { SpinnerIcon, EyeIcon } from '../components/Icons/Icon';
import { StrengthBar } from './StrengthBar';

export default function Register() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const adminInviteToken = searchParams.get('adminInvite');
  const isAdminInviteSignup = Boolean(adminInviteToken);
  const [accountType, setAccountType] = useState(
    isAdminInviteSignup ? 'admin' : 'student',
  );

  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    confirm: '',
    teacherSubjectInput: '',
    teacherSubjects: [],
    teacherClassId: '',
    teacherOtherGrade: '',
    childFullName: '',
    childGrade: '',
    relationshipToChild: '',
    parentPhone: '',
    alternatePhone: '',
    address: '',
    notes: '',
  });
  const [show, setShow] = useState({ password: false, confirm: false });
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [registerClasses, setRegisterClasses] = useState([]);
  const [loadingRegisterOptions, setLoadingRegisterOptions] = useState(false);

  const requiredPasswordLength = useMemo(() => {
    if (isAdminInviteSignup || accountType === 'teacher') {
      return 12;
    }
    return 10;
  }, [accountType, isAdminInviteSignup]);

  useEffect(() => {
    if (isAdminInviteSignup) {
      return;
    }

    let isMounted = true;
    setLoadingRegisterOptions(true);

    getRegisterOptions()
      .then((response) => {
        if (!isMounted) return;
        setRegisterClasses(Array.isArray(response?.data?.classes) ? response.data.classes : []);
      })
      .catch(() => {
        if (!isMounted) return;
        setRegisterClasses([]);
      })
      .finally(() => {
        if (isMounted) {
          setLoadingRegisterOptions(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isAdminInviteSignup]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) setFieldErrors((prev) => ({ ...prev, [name]: '' }));
    if (error) setError('');
  };

  const addTeacherSubject = () => {
    const nextSubject = form.teacherSubjectInput.trim();
    if (!nextSubject) {
      return;
    }

    const exists = form.teacherSubjects.some(
      (subject) => subject.toLowerCase() === nextSubject.toLowerCase(),
    );
    if (exists) {
      setFieldErrors((prev) => ({ ...prev, teacherSubjects: 'Subject already added' }));
      return;
    }

    setForm((prev) => ({
      ...prev,
      teacherSubjects: [...prev.teacherSubjects, nextSubject],
      teacherSubjectInput: '',
    }));
    setFieldErrors((prev) => ({ ...prev, teacherSubjects: '', teacherSubjectInput: '' }));
  };

  const removeTeacherSubject = (subjectToRemove) => {
    setForm((prev) => ({
      ...prev,
      teacherSubjects: prev.teacherSubjects.filter((subject) => subject !== subjectToRemove),
    }));
    if (fieldErrors.teacherSubjects) {
      setFieldErrors((prev) => ({ ...prev, teacherSubjects: '' }));
    }
  };

  const validate = () => {
    const errs = {};
    if (!form.username.trim()) errs.username = 'Username is required';
    else if (form.username.length < 3) errs.username = 'At least 3 characters';
    if (!isAdminInviteSignup) {
      if (!form.email.trim()) errs.email = 'Email is required';
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
        errs.email = 'Enter a valid email';
    }
    if (!form.password) errs.password = 'Password is required';
    else if (form.password.length < requiredPasswordLength) {
      errs.password = `At least ${requiredPasswordLength} characters required`;
    } else if (form.password.length > 72) {
      errs.password = 'Password must be at most 72 characters';
    } else if (
      !/[A-Z]/.test(form.password)
      || !/[a-z]/.test(form.password)
      || !/[0-9]/.test(form.password)
      || !/[^A-Za-z0-9]/.test(form.password)
    ) {
      errs.password = 'Use uppercase, lowercase, number, and special character';
    }
    if (!form.confirm) errs.confirm = 'Please confirm your password';
    else if (form.confirm !== form.password) errs.confirm = 'Passwords do not match';

    if (!isAdminInviteSignup && accountType === 'teacher') {
      if (!form.teacherSubjects.length) {
        errs.teacherSubjects = 'At least one subject is required';
      }
      if (!form.teacherClassId) {
        errs.teacherClassId = 'Select a class or choose Other';
      }
      if (form.teacherClassId === 'other' && !form.teacherOtherGrade.trim()) {
        errs.teacherOtherGrade = 'Please enter the class/grade';
      }
    }

    if (!isAdminInviteSignup && accountType === 'parent') {
      if (!form.childFullName.trim()) errs.childFullName = 'Child full name is required';
      if (!form.childGrade.trim()) errs.childGrade = 'Child grade is required';
      if (!form.relationshipToChild.trim()) errs.relationshipToChild = 'Relationship is required';
      if (!form.parentPhone.trim()) errs.parentPhone = 'Primary phone is required';
    }

    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) {
      setFieldErrors(errs);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const payload = isAdminInviteSignup
        ? {
            token: adminInviteToken,
            username: form.username,
            password: form.password,
          }
        : {
            username: form.username,
            email: form.email,
            password: form.password,
            role: accountType,
            ...(accountType === 'teacher'
              ? {
                  teacherProfile: {
                    subjects: form.teacherSubjects,
                    selectedClassId:
                      form.teacherClassId && form.teacherClassId !== 'other'
                        ? form.teacherClassId
                        : null,
                    otherGrade: form.teacherClassId === 'other' ? form.teacherOtherGrade : '',
                  },
                }
              : {}),
            ...(accountType === 'parent'
              ? {
                  parentProfile: {
                    childFullName: form.childFullName,
                    childGrade: form.childGrade,
                    relationshipToChild: form.relationshipToChild,
                    parentPhone: form.parentPhone,
                    alternatePhone: form.alternatePhone,
                    address: form.address,
                    notes: form.notes,
                  },
                }
              : {}),
          };
      const res = isAdminInviteSignup ? await acceptAdminInvite(payload) : await registerUser(payload);
      login(res.data.token);
      navigate('/dashboard');
    } catch (err) {
      setError(err?.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  const field = (name, label, type, placeholder, autoComplete, extra) => (
    <div>
      <label
        htmlFor={name}
        className='block text-sm font-medium text-[var(--color-text-secondary)] mb-1.5'
      >
        {label}
      </label>
      <div className='relative'>
        <input
          id={name}
          name={name}
          type={extra ? (show[name] ? 'text' : 'password') : type}
          autoComplete={autoComplete}
          required
          value={form[name]}
          onChange={handleChange}
          placeholder={placeholder}
          aria-invalid={!!fieldErrors[name]}
          aria-describedby={fieldErrors[name] ? `${name}-error` : undefined}
          className={`w-full rounded-xl border bg-[var(--color-input-bg)] px-3.5 py-2.5 ${
            extra ? 'pr-10' : ''
          } text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] outline-none transition-all focus:ring-2 disabled:opacity-50 ${
            fieldErrors[name]
              ? 'border-red-400 focus:border-red-400 focus:ring-red-400/20'
              : 'border-[var(--color-border)] focus:border-[var(--color-primary)] focus:ring-[var(--color-primary)]/20'
          }`}
        />
        {extra && (
          <button
            type='button'
            onClick={() => setShow((v) => ({ ...v, [name]: !v[name] }))}
            className='absolute inset-y-0 right-0 flex items-center px-3 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] rounded-r-xl'
            aria-label={
              show[name] ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`
            }
            aria-pressed={show[name]}
          >
            <EyeIcon open={show[name]} />
          </button>
        )}
      </div>
      {fieldErrors[name] && (
        <p id={`${name}-error`} role='alert' className='mt-1.5 text-xs text-red-500'>
          {fieldErrors[name]}
        </p>
      )}
      {name === 'password' && <StrengthBar password={form.password} minLength={requiredPasswordLength} />}
    </div>
  );

  return (
    <main className='min-h-screen bg-[var(--color-bg)] flex items-center justify-center px-4 py-12'>
      <div className='w-full max-w-lg'>
        <div className='mb-8 text-center'>
          <div className='inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[var(--color-primary)] mb-5'>
            <svg
              xmlns='http://www.w3.org/2000/svg'
              viewBox='0 0 24 24'
              fill='none'
              stroke='white'
              strokeWidth='2'
              strokeLinecap='round'
              strokeLinejoin='round'
              className='w-6 h-6'
              aria-hidden='true'
            >
              <path d='M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2' />
              <circle cx='9' cy='7' r='4' />
              <line x1='19' x2='19' y1='8' y2='14' />
              <line x1='22' x2='16' y1='11' y2='11' />
            </svg>
          </div>
          <h1 className='text-2xl font-semibold text-[var(--color-text-primary)] tracking-tight'>
            {isAdminInviteSignup ? 'Accept admin invitation' : 'Create an account'}
          </h1>
          <p className='mt-1.5 text-sm text-[var(--color-text-muted)]'>
            {isAdminInviteSignup
              ? 'Set your admin username and password to join your institute'
              : 'Choose account type and create your profile'}
          </p>
        </div>

        <div className='bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] shadow-sm p-8'>
          {error && (
            <div
              role='alert'
              className='mb-5 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400'
            >
              <svg
                xmlns='http://www.w3.org/2000/svg'
                viewBox='0 0 24 24'
                fill='none'
                stroke='currentColor'
                strokeWidth='2'
                strokeLinecap='round'
                strokeLinejoin='round'
                className='mt-0.5 w-4 h-4 shrink-0'
                aria-hidden='true'
              >
                <circle cx='12' cy='12' r='10' />
                <line x1='12' x2='12' y1='8' y2='12' />
                <line x1='12' x2='12.01' y1='16' y2='16' />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className='space-y-5'>
            {field('username', 'Username', 'text', 'johndoe', 'username', false)}
            {!isAdminInviteSignup && field('email', 'Email address', 'email', 'you@example.com', 'email', false)}

            {!isAdminInviteSignup && (
              <div>
                <label
                  htmlFor='accountType'
                  className='block text-sm font-medium text-[var(--color-text-secondary)] mb-1.5'
                >
                  Account type
                </label>
                <select
                  id='accountType'
                  value={accountType}
                  onChange={(e) => {
                    const nextType = e.target.value;
                    setAccountType(nextType);
                    setFieldErrors({});
                    if (nextType !== 'teacher') {
                      setForm((prev) => ({
                        ...prev,
                        teacherSubjectInput: '',
                        teacherSubjects: [],
                        teacherClassId: '',
                        teacherOtherGrade: '',
                      }));
                    }
                  }}
                  className={`w-full rounded-xl border bg-[var(--color-input-bg)] px-3.5 py-2.5 text-sm text-[var(--color-text-primary)] outline-none transition-all focus:ring-2 ${
                    fieldErrors.accountType
                      ? 'border-red-400 focus:border-red-400 focus:ring-red-400/20'
                      : 'border-[var(--color-border)] focus:border-[var(--color-primary)] focus:ring-[var(--color-primary)]/20'
                  }`}
                >
                  <option value='student'>Student</option>
                  <option value='teacher'>Teacher</option>
                  <option value='parent'>Parent</option>
                </select>
                {fieldErrors.accountType && (
                  <p role='alert' className='mt-1.5 text-xs text-red-500'>
                    {fieldErrors.accountType}
                  </p>
                )}
                <p className='mt-1.5 text-xs text-[var(--color-text-muted)]'>
                  Parent accounts require child details so your institute can verify guardianship quickly.
                </p>
              </div>
            )}

            {!isAdminInviteSignup && accountType === 'teacher' && (
              <div className='rounded-xl border border-[var(--color-border)] bg-[var(--color-input-bg)] p-4 space-y-4'>
                <h2 className='text-sm font-semibold text-[var(--color-text-primary)]'>Teaching Profile</h2>

                <div>
                  <label
                    htmlFor='teacherSubjectInput'
                    className='block text-sm font-medium text-[var(--color-text-secondary)] mb-1.5'
                  >
                    Subjects
                  </label>
                  <div className='flex gap-2'>
                    <input
                      id='teacherSubjectInput'
                      name='teacherSubjectInput'
                      value={form.teacherSubjectInput}
                      onChange={handleChange}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ',') {
                          event.preventDefault();
                          addTeacherSubject();
                        }
                      }}
                      placeholder='Math'
                      className='w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-2.5 text-sm text-[var(--color-text-primary)] outline-none transition-all focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20'
                    />
                    <button
                      type='button'
                      onClick={addTeacherSubject}
                      className='rounded-xl border border-[var(--color-border)] px-3 py-2.5 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-border)]/40'
                    >
                      Add
                    </button>
                  </div>
                  {(fieldErrors.teacherSubjects || fieldErrors.teacherSubjectInput) && (
                    <p role='alert' className='mt-1.5 text-xs text-red-500'>
                      {fieldErrors.teacherSubjects || fieldErrors.teacherSubjectInput}
                    </p>
                  )}
                  {form.teacherSubjects.length > 0 && (
                    <div className='mt-2 flex flex-wrap gap-2'>
                      {form.teacherSubjects.map((subject) => (
                        <span
                          key={subject}
                          className='inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1 text-xs text-[var(--color-text-secondary)]'
                        >
                          {subject}
                          <button
                            type='button'
                            onClick={() => removeTeacherSubject(subject)}
                            className='text-[var(--color-text-muted)] hover:text-red-500'
                            aria-label={`Remove ${subject}`}
                          >
                            x
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label
                    htmlFor='teacherClassId'
                    className='block text-sm font-medium text-[var(--color-text-secondary)] mb-1.5'
                  >
                    Preferred class
                  </label>
                  <select
                    id='teacherClassId'
                    name='teacherClassId'
                    value={form.teacherClassId}
                    onChange={(event) => {
                      handleChange(event);
                      if (event.target.value !== 'other') {
                        setForm((prev) => ({ ...prev, teacherOtherGrade: '' }));
                        setFieldErrors((prev) => ({ ...prev, teacherOtherGrade: '' }));
                      }
                    }}
                    className={`w-full rounded-xl border bg-[var(--color-surface)] px-3.5 py-2.5 text-sm text-[var(--color-text-primary)] outline-none transition-all focus:ring-2 ${
                      fieldErrors.teacherClassId
                        ? 'border-red-400 focus:border-red-400 focus:ring-red-400/20'
                        : 'border-[var(--color-border)] focus:border-[var(--color-primary)] focus:ring-[var(--color-primary)]/20'
                    }`}
                  >
                    <option value=''>Select a class</option>
                    {registerClasses.map((classItem) => (
                      <option key={classItem.id} value={classItem.id}>
                        {classItem.class_name}
                      </option>
                    ))}
                    <option value='other'>Other</option>
                  </select>
                  {fieldErrors.teacherClassId && (
                    <p role='alert' className='mt-1.5 text-xs text-red-500'>
                      {fieldErrors.teacherClassId}
                    </p>
                  )}
                  <p className='mt-1.5 text-xs text-[var(--color-text-muted)]'>
                    {loadingRegisterOptions
                      ? 'Loading class options...'
                      : 'Pick an existing class or choose Other to enter a free-text grade.'}
                  </p>
                </div>

                {form.teacherClassId === 'other' && (
                  <div>
                    <label
                      htmlFor='teacherOtherGrade'
                      className='block text-sm font-medium text-[var(--color-text-secondary)] mb-1.5'
                    >
                      Class/grade
                    </label>
                    <input
                      id='teacherOtherGrade'
                      name='teacherOtherGrade'
                      value={form.teacherOtherGrade}
                      onChange={handleChange}
                      placeholder='Grade 11 - Commerce'
                      className={`w-full rounded-xl border bg-[var(--color-surface)] px-3.5 py-2.5 text-sm text-[var(--color-text-primary)] outline-none transition-all focus:ring-2 ${
                        fieldErrors.teacherOtherGrade
                          ? 'border-red-400 focus:border-red-400 focus:ring-red-400/20'
                          : 'border-[var(--color-border)] focus:border-[var(--color-primary)] focus:ring-[var(--color-primary)]/20'
                      }`}
                    />
                    {fieldErrors.teacherOtherGrade && (
                      <p role='alert' className='mt-1.5 text-xs text-red-500'>
                        {fieldErrors.teacherOtherGrade}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {!isAdminInviteSignup && accountType === 'parent' && (
              <div className='rounded-xl border border-[var(--color-border)] bg-[var(--color-input-bg)] p-4 space-y-4'>
                <h2 className='text-sm font-semibold text-[var(--color-text-primary)]'>Child and Contact Details</h2>
                <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                  <div className='sm:col-span-2'>
                    <label htmlFor='childFullName' className='block text-sm font-medium text-[var(--color-text-secondary)] mb-1.5'>
                      Child full name
                    </label>
                    <input
                      id='childFullName'
                      name='childFullName'
                      value={form.childFullName}
                      onChange={handleChange}
                      placeholder='Ali Khan'
                      className={`w-full rounded-xl border bg-[var(--color-surface)] px-3.5 py-2.5 text-sm text-[var(--color-text-primary)] outline-none transition-all focus:ring-2 ${
                        fieldErrors.childFullName
                          ? 'border-red-400 focus:border-red-400 focus:ring-red-400/20'
                          : 'border-[var(--color-border)] focus:border-[var(--color-primary)] focus:ring-[var(--color-primary)]/20'
                      }`}
                    />
                    {fieldErrors.childFullName && (
                      <p className='mt-1.5 text-xs text-red-500'>{fieldErrors.childFullName}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor='childGrade' className='block text-sm font-medium text-[var(--color-text-secondary)] mb-1.5'>
                      Child grade
                    </label>
                    <input
                      id='childGrade'
                      name='childGrade'
                      value={form.childGrade}
                      onChange={handleChange}
                      placeholder='Grade 8'
                      className={`w-full rounded-xl border bg-[var(--color-surface)] px-3.5 py-2.5 text-sm text-[var(--color-text-primary)] outline-none transition-all focus:ring-2 ${
                        fieldErrors.childGrade
                          ? 'border-red-400 focus:border-red-400 focus:ring-red-400/20'
                          : 'border-[var(--color-border)] focus:border-[var(--color-primary)] focus:ring-[var(--color-primary)]/20'
                      }`}
                    />
                    {fieldErrors.childGrade && (
                      <p className='mt-1.5 text-xs text-red-500'>{fieldErrors.childGrade}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor='relationshipToChild' className='block text-sm font-medium text-[var(--color-text-secondary)] mb-1.5'>
                      Relationship
                    </label>
                    <input
                      id='relationshipToChild'
                      name='relationshipToChild'
                      value={form.relationshipToChild}
                      onChange={handleChange}
                      placeholder='Mother, Father, Guardian'
                      className={`w-full rounded-xl border bg-[var(--color-surface)] px-3.5 py-2.5 text-sm text-[var(--color-text-primary)] outline-none transition-all focus:ring-2 ${
                        fieldErrors.relationshipToChild
                          ? 'border-red-400 focus:border-red-400 focus:ring-red-400/20'
                          : 'border-[var(--color-border)] focus:border-[var(--color-primary)] focus:ring-[var(--color-primary)]/20'
                      }`}
                    />
                    {fieldErrors.relationshipToChild && (
                      <p className='mt-1.5 text-xs text-red-500'>{fieldErrors.relationshipToChild}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor='parentPhone' className='block text-sm font-medium text-[var(--color-text-secondary)] mb-1.5'>
                      Primary phone
                    </label>
                    <input
                      id='parentPhone'
                      name='parentPhone'
                      value={form.parentPhone}
                      onChange={handleChange}
                      placeholder='+92 300 0000000'
                      className={`w-full rounded-xl border bg-[var(--color-surface)] px-3.5 py-2.5 text-sm text-[var(--color-text-primary)] outline-none transition-all focus:ring-2 ${
                        fieldErrors.parentPhone
                          ? 'border-red-400 focus:border-red-400 focus:ring-red-400/20'
                          : 'border-[var(--color-border)] focus:border-[var(--color-primary)] focus:ring-[var(--color-primary)]/20'
                      }`}
                    />
                    {fieldErrors.parentPhone && (
                      <p className='mt-1.5 text-xs text-red-500'>{fieldErrors.parentPhone}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor='alternatePhone' className='block text-sm font-medium text-[var(--color-text-secondary)] mb-1.5'>
                      Alternate phone (optional)
                    </label>
                    <input
                      id='alternatePhone'
                      name='alternatePhone'
                      value={form.alternatePhone}
                      onChange={handleChange}
                      placeholder='+92 301 0000000'
                      className='w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-2.5 text-sm text-[var(--color-text-primary)] outline-none transition-all focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20'
                    />
                  </div>

                  <div className='sm:col-span-2'>
                    <label htmlFor='address' className='block text-sm font-medium text-[var(--color-text-secondary)] mb-1.5'>
                      Address (optional)
                    </label>
                    <input
                      id='address'
                      name='address'
                      value={form.address}
                      onChange={handleChange}
                      placeholder='House 22, Street 7, City'
                      className='w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-2.5 text-sm text-[var(--color-text-primary)] outline-none transition-all focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20'
                    />
                  </div>

                  <div className='sm:col-span-2'>
                    <label htmlFor='notes' className='block text-sm font-medium text-[var(--color-text-secondary)] mb-1.5'>
                      Notes (optional)
                    </label>
                    <textarea
                      id='notes'
                      name='notes'
                      rows={2}
                      value={form.notes}
                      onChange={handleChange}
                      placeholder='Any additional details for admin verification'
                      className='w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-2.5 text-sm text-[var(--color-text-primary)] outline-none transition-all focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20 resize-y'
                    />
                  </div>
                </div>
              </div>
            )}

            {field('password', 'Password', 'password', '••••••••', 'new-password', true)}
            {field('confirm', 'Confirm password', 'password', '••••••••', 'new-password', true)}

            <button
              type='submit'
              disabled={loading}
              className='w-full flex items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-[var(--color-primary-hover)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed mt-1'
              aria-busy={loading}
            >
              {loading && <SpinnerIcon />}
              {loading
                ? 'Creating account…'
                : isAdminInviteSignup
                  ? 'Join as admin'
                  : `Create ${accountType} account`}
            </button>

            <p className='text-xs text-[var(--color-text-muted)]'>
              Password must be {requiredPasswordLength}+ characters and include uppercase, lowercase, number, and special character.
            </p>
          </form>
        </div>

        <p className='mt-5 text-center text-sm text-[var(--color-text-muted)]'>
          Already have an account?{' '}
          <Link
            to='/login'
            className='font-medium text-[var(--color-primary)] hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] rounded'
          >
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}