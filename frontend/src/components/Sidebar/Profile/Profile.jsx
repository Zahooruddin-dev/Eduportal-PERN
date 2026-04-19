import { createElement, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/useAuth';
import {
  updateUsername,
  changePassword,
  deleteUser,
  getRegisterOptions,
  getTeacherProfile,
  updateTeacherProfile,
} from '../../../api/authApi';
import { SpinnerIcon, EyeIcon } from '../../Icons/Icon';
import {
  User,
  Key,
  Trash2,
  Camera,
  GraduationCap,
  Users,
  ArrowRight,
  ChevronDown,
} from 'lucide-react';
import ConfirmModal from '../../../components/ConfirmModal';
import Toast from '../../../components/Toast';

const ROLE_MIN_PASSWORD_LENGTH = {
  admin: 12,
  teacher: 12,
  student: 10,
  parent: 10,
};

const TEACHER_DEFAULT_FORM = {
  subjects: '',
  selectedClassId: '',
  otherGrade: '',
  bio: '',
  officeHours: '',
  meetingLink: '',
  focusAreas: '',
};

function getRoleMinPasswordLength(role) {
  const normalizedRole = String(role || '').trim().toLowerCase();
  return ROLE_MIN_PASSWORD_LENGTH[normalizedRole] || 10;
}

function parseCommaSeparatedList(value) {
  const parts = String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  const unique = [];
  for (let i = 0; i < parts.length; i += 1) {
    if (!unique.includes(parts[i])) {
      unique.push(parts[i]);
    }
  }
  return unique;
}

function validatePasswordAgainstPolicy(password, role) {
  const value = String(password || '');
  const minLength = getRoleMinPasswordLength(role);

  if (!value) return 'Password is required.';
  if (value.length < minLength) {
    return `Password must be at least ${minLength} characters.`;
  }
  if (value.length > 72) {
    return 'Password must be at most 72 characters.';
  }
  if (!/[a-z]/.test(value) || !/[A-Z]/.test(value) || !/[0-9]/.test(value) || !/[^A-Za-z0-9]/.test(value)) {
    return 'Password must include uppercase, lowercase, number, and special character.';
  }

  return null;
}

function FieldRow({ label, htmlFor, hint, children }) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-6 sm:items-start py-5 border-b border-[var(--color-border)] last:border-0">
      <div className="sm:pt-2">
        <label htmlFor={htmlFor} className="block text-sm font-medium text-[var(--color-text-secondary)]">
          {label}
        </label>
        {hint && <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">{hint}</p>}
      </div>
      <div className="sm:col-span-2">{children}</div>
    </div>
  );
}

function TextInput({ id, name, value, onChange, required, type = 'text', className = '', ...rest }) {
  return (
    <input
      id={id}
      name={name}
      type={type}
      value={value}
      onChange={onChange}
      required={required}
      aria-required={required}
      className={`block w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-input-bg)] px-4 py-2.5 text-sm text-[var(--color-text-primary)] outline-none transition focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20 ${className}`}
      {...rest}
    />
  );
}

function TextArea({ id, name, value, onChange, rows = 4, className = '', ...rest }) {
  return (
    <textarea
      id={id}
      name={name}
      value={value}
      onChange={onChange}
      rows={rows}
      className={`block w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-input-bg)] px-4 py-2.5 text-sm text-[var(--color-text-primary)] outline-none transition focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20 ${className}`}
      {...rest}
    />
  );
}

function PasswordInput({ id, name, value, onChange, show, onToggle, label, minLength }) {
  return (
    <div className="relative">
      <TextInput
        id={id}
        name={name}
        type={show ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        required
        minLength={minLength}
        className="pr-10"
        aria-label={label}
      />
      <button
        type="button"
        onClick={onToggle}
        aria-label={show ? `Hide ${label}` : `Show ${label}`}
        aria-pressed={show}
        className="absolute inset-y-0 right-0 flex items-center px-3 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] focus:outline-none focus:text-[var(--color-primary)]"
      >
        <EyeIcon open={show} />
      </button>
    </div>
  );
}

function PrimaryButton({ loading, loadingText, children, ...rest }) {
  return (
    <button
      type="submit"
      disabled={loading}
      aria-busy={loading}
      className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[var(--color-primary-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2 disabled:opacity-50"
      {...rest}
    >
      {loading && <SpinnerIcon />}
      {loading ? loadingText : children}
    </button>
  );
}

export default function Profile() {
  const { user, login, logout } = useAuth();
  const navigate = useNavigate();
  const role = String(user?.role || 'student').toLowerCase();
  const roleMinPasswordLength = useMemo(() => getRoleMinPasswordLength(role), [role]);

  const [desktopTab, setDesktopTab] = useState('profile');
  const [mobileOpenSection, setMobileOpenSection] = useState('profile');

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showDeletePassword, setShowDeletePassword] = useState(false);

  const [profileSaving, setProfileSaving] = useState(false);
  const [teacherSaving, setTeacherSaving] = useState(false);
  const [teacherBootLoading, setTeacherBootLoading] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [profileForm, setProfileForm] = useState({ username: user?.username || '', image: null });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '' });
  const [deleteForm, setDeleteForm] = useState({ password: '' });
  const [teacherForm, setTeacherForm] = useState(TEACHER_DEFAULT_FORM);
  const [registrationClasses, setRegistrationClasses] = useState([]);

  const [avatarPreview, setAvatarPreview] = useState(user?.profile || null);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [toast, setToast] = useState({ isOpen: false, type: 'success', message: '' });

  const fileInputRef = useRef(null);

  const sections = useMemo(() => {
    const items = [{ id: 'profile', label: 'Profile', Icon: User }];

    if (role === 'teacher') {
      items.push({ id: 'teaching', label: 'Teaching', Icon: GraduationCap });
    }

    if (role === 'parent') {
      items.push({ id: 'family', label: 'Family', Icon: Users });
    }

    items.push({ id: 'security', label: 'Security', Icon: Key });
    items.push({ id: 'account', label: 'Account', Icon: Trash2 });

    return items;
  }, [role]);

  useEffect(() => {
    setProfileForm({ username: user?.username || '', image: null });
    setAvatarPreview(user?.profile || null);
  }, [user?.username, user?.profile]);

  useEffect(() => {
    if (!sections.some((section) => section.id === desktopTab)) {
      setDesktopTab(sections[0].id);
    }
    if (!sections.some((section) => section.id === mobileOpenSection)) {
      setMobileOpenSection(sections[0].id);
    }
  }, [desktopTab, mobileOpenSection, sections]);

  useEffect(() => {
    if (role !== 'teacher') {
      setTeacherForm(TEACHER_DEFAULT_FORM);
      setRegistrationClasses([]);
      return;
    }

    let mounted = true;

    const loadTeacherData = async () => {
      setTeacherBootLoading(true);
      try {
        const [optionsResponse, teacherResponse] = await Promise.all([
          getRegisterOptions(),
          getTeacherProfile().catch((error) => {
            if (error?.response?.status === 404) {
              return { data: null };
            }
            throw error;
          }),
        ]);

        if (!mounted) return;

        const classes = Array.isArray(optionsResponse?.data?.classes)
          ? optionsResponse.data.classes
          : [];
        setRegistrationClasses(classes);

        const teacherProfile = teacherResponse?.data;
        if (!teacherProfile) {
          setTeacherForm((prev) => ({
            ...prev,
            selectedClassId: prev.selectedClassId || '',
          }));
          return;
        }

        const preferredClassId = String(teacherProfile.preferred_class_id || '').trim();
        const preferredGradeLabel = String(teacherProfile.preferred_grade_label || '').trim();

        setTeacherForm({
          subjects: Array.isArray(teacherProfile.subjects)
            ? teacherProfile.subjects.join(', ')
            : '',
          selectedClassId: preferredClassId || (preferredGradeLabel ? 'other' : ''),
          otherGrade: preferredGradeLabel,
          bio: String(teacherProfile.bio || ''),
          officeHours: String(teacherProfile.office_hours || ''),
          meetingLink: String(teacherProfile.meeting_link || ''),
          focusAreas: Array.isArray(teacherProfile.focus_areas)
            ? teacherProfile.focus_areas.join(', ')
            : '',
        });
      } catch (error) {
        if (mounted) {
          setToast({
            isOpen: true,
            type: 'error',
            message: error?.response?.data?.message || 'Failed to load teacher profile.',
          });
        }
      } finally {
        if (mounted) {
          setTeacherBootLoading(false);
        }
      }
    };

    loadTeacherData();

    return () => {
      mounted = false;
    };
  }, [role]);

  const showToast = (type, message) => setToast({ isOpen: true, type, message });

  const handleProfileChange = (event) => {
    const { name, value, files } = event.target;

    if (name === 'image') {
      const file = files?.[0] || null;
      setProfileForm((prev) => ({ ...prev, image: file }));

      if (!file) {
        setAvatarPreview(user?.profile || null);
        return;
      }

      const reader = new FileReader();
      reader.onload = () => setAvatarPreview(reader.result);
      reader.readAsDataURL(file);
      return;
    }

    setProfileForm((prev) => ({ ...prev, [name]: value }));
  };

  const handlePasswordChange = (event) => {
    const { name, value } = event.target;
    setPasswordForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleDeletePasswordChange = (event) => {
    const { value } = event.target;
    setDeleteForm({ password: value });
  };

  const handleTeacherChange = (event) => {
    const { name, value } = event.target;
    setTeacherForm((prev) => ({
      ...prev,
      [name]: value,
      ...(name === 'selectedClassId' && value !== 'other' ? { otherGrade: '' } : {}),
    }));
  };

  const handleProfileSubmit = async (event) => {
    event.preventDefault();
    setProfileSaving(true);

    const formData = new FormData();
    formData.append('newUsername', profileForm.username);
    if (profileForm.image) {
      formData.append('image', profileForm.image);
    }

    try {
      const response = await updateUsername(formData);
      login(response?.data?.token);
      setProfileForm((prev) => ({
        ...prev,
        username: response?.data?.user?.username || prev.username,
        image: null,
      }));
      if (response?.data?.user?.profile) {
        setAvatarPreview(response.data.user.profile);
      }
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      showToast('success', 'Profile updated successfully.');
    } catch (error) {
      showToast('error', error?.response?.data?.message || 'Update failed.');
    } finally {
      setProfileSaving(false);
    }
  };

  const handleTeacherSubmit = async (event) => {
    event.preventDefault();

    const subjects = parseCommaSeparatedList(teacherForm.subjects);
    if (!subjects.length) {
      showToast('error', 'At least one subject is required.');
      return;
    }

    if (!teacherForm.selectedClassId) {
      showToast('error', 'Select a class or choose Other.');
      return;
    }

    if (teacherForm.selectedClassId === 'other' && !teacherForm.otherGrade.trim()) {
      showToast('error', 'Please enter a class or grade label.');
      return;
    }

    setTeacherSaving(true);
    try {
      const payload = {
        subjects,
        classId: teacherForm.selectedClassId === 'other' ? null : teacherForm.selectedClassId,
        otherGrade:
          teacherForm.selectedClassId === 'other' ? teacherForm.otherGrade.trim() : '',
        bio: teacherForm.bio.trim(),
        officeHours: teacherForm.officeHours.trim(),
        meetingLink: teacherForm.meetingLink.trim(),
        focusAreas: parseCommaSeparatedList(teacherForm.focusAreas),
      };

      const response = await updateTeacherProfile(payload);
      const nextProfile = response?.data?.teacherProfile || null;

      if (nextProfile) {
        const preferredClassId = String(nextProfile.preferred_class_id || '').trim();
        const preferredGradeLabel = String(nextProfile.preferred_grade_label || '').trim();

        setTeacherForm({
          subjects: Array.isArray(nextProfile.subjects) ? nextProfile.subjects.join(', ') : '',
          selectedClassId: preferredClassId || (preferredGradeLabel ? 'other' : ''),
          otherGrade: preferredGradeLabel,
          bio: String(nextProfile.bio || ''),
          officeHours: String(nextProfile.office_hours || ''),
          meetingLink: String(nextProfile.meeting_link || ''),
          focusAreas: Array.isArray(nextProfile.focus_areas)
            ? nextProfile.focus_areas.join(', ')
            : '',
        });
      }

      showToast('success', response?.data?.message || 'Teacher profile updated successfully.');
    } catch (error) {
      showToast(
        'error',
        error?.response?.data?.message || 'Failed to update teacher profile.',
      );
    } finally {
      setTeacherSaving(false);
    }
  };

  const handlePasswordSubmit = async (event) => {
    event.preventDefault();

    if (!passwordForm.currentPassword.trim()) {
      showToast('error', 'Current password is required.');
      return;
    }

    const passwordValidationError = validatePasswordAgainstPolicy(
      passwordForm.newPassword,
      role,
    );
    if (passwordValidationError) {
      showToast('error', passwordValidationError);
      return;
    }

    setPasswordSaving(true);
    try {
      const response = await changePassword(passwordForm);
      showToast('success', response?.data?.message || 'Password changed successfully.');
      setPasswordForm({ currentPassword: '', newPassword: '' });
    } catch (error) {
      showToast('error', error?.response?.data?.message || 'Password change failed.');
    } finally {
      setPasswordSaving(false);
    }
  };

  const openDeleteConfirmation = () => {
    if (!deleteForm.password.trim()) {
      showToast('error', 'Re-enter your password in this section to delete your account.');
      return;
    }
    setConfirmModalOpen(true);
  };

  const handleDeleteAccount = async () => {
    if (!deleteForm.password.trim()) {
      showToast('error', 'Password is required to delete account.');
      return false;
    }

    setDeleteLoading(true);
    try {
      await deleteUser({ email: user?.email, password: deleteForm.password });
      await logout();
      return true;
    } catch (error) {
      showToast('error', error?.response?.data?.message || 'Deletion failed.');
      return false;
    } finally {
      setDeleteLoading(false);
    }
  };

  const renderProfileSection = () => (
    <form onSubmit={handleProfileSubmit} noValidate>
      <FieldRow label="Photo" htmlFor="image" hint="JPG, PNG, GIF or AVIF">
        <div className="flex items-center gap-4">
          <div className="relative shrink-0">
            <div className="h-14 w-14 rounded-full bg-[var(--color-primary)]/10 flex items-center justify-center overflow-hidden ring-2 ring-[var(--color-border)]">
              {avatarPreview ? (
                <img src={avatarPreview} alt="" aria-hidden="true" className="h-full w-full object-cover" />
              ) : (
                <span aria-hidden="true" className="text-base font-semibold text-[var(--color-primary)]">
                  {(profileForm.username.charAt(0) || '?').toUpperCase()}
                </span>
              )}
            </div>
            <label
              htmlFor="image"
              className="absolute -bottom-1 -right-1 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full bg-[var(--color-primary)] text-white shadow transition hover:bg-[var(--color-primary-hover)] focus-within:ring-2 focus-within:ring-[var(--color-primary)] focus-within:ring-offset-1"
            >
              <Camera size={12} aria-hidden="true" />
              <span className="sr-only">Upload profile picture</span>
              <input
                ref={fileInputRef}
                type="file"
                id="image"
                name="image"
                accept="image/*"
                onChange={handleProfileChange}
                className="sr-only"
              />
            </label>
          </div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-input-bg)] px-4 py-2 text-sm font-medium text-[var(--color-text-secondary)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
          >
            Change photo
          </button>
        </div>
      </FieldRow>

      <FieldRow label="Username" htmlFor="username">
        <TextInput
          id="username"
          name="username"
          value={profileForm.username}
          onChange={handleProfileChange}
          required
          autoComplete="username"
        />
      </FieldRow>

      <div className="flex justify-end py-5">
        <PrimaryButton loading={profileSaving} loadingText="Saving...">
          Save changes
        </PrimaryButton>
      </div>
    </form>
  );

  const renderTeachingSection = () => {
    const hasSelectedClass = registrationClasses.some(
      (item) => item.id === teacherForm.selectedClassId,
    );

    return (
      <form onSubmit={handleTeacherSubmit} noValidate>
        <FieldRow
          label="Subjects"
          htmlFor="subjects"
          hint="Comma separated list, for example: Math, Physics"
        >
          <TextInput
            id="subjects"
            name="subjects"
            value={teacherForm.subjects}
            onChange={handleTeacherChange}
            required
            placeholder="Math, Physics"
          />
        </FieldRow>

        <FieldRow label="Primary class" htmlFor="selectedClassId" hint="Select from classes or choose Other">
          <select
            id="selectedClassId"
            name="selectedClassId"
            value={teacherForm.selectedClassId}
            onChange={handleTeacherChange}
            className="block w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-input-bg)] px-4 py-2.5 text-sm text-[var(--color-text-primary)] outline-none transition focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
            required
          >
            <option value="">Select class</option>
            {teacherForm.selectedClassId &&
              teacherForm.selectedClassId !== 'other' &&
              !hasSelectedClass && (
                <option value={teacherForm.selectedClassId}>Previously selected class</option>
              )}
            {registrationClasses.map((classItem) => (
              <option key={classItem.id} value={classItem.id}>
                {classItem.class_name}
              </option>
            ))}
            <option value="other">Other</option>
          </select>
        </FieldRow>

        {teacherForm.selectedClassId === 'other' && (
          <FieldRow label="Other grade" htmlFor="otherGrade">
            <TextInput
              id="otherGrade"
              name="otherGrade"
              value={teacherForm.otherGrade}
              onChange={handleTeacherChange}
              required
              placeholder="Custom grade label"
            />
          </FieldRow>
        )}

        <FieldRow label="Bio" htmlFor="bio" hint="Short intro for students and parents">
          <TextArea
            id="bio"
            name="bio"
            value={teacherForm.bio}
            onChange={handleTeacherChange}
            rows={4}
            placeholder="Write a short professional bio"
          />
        </FieldRow>

        <FieldRow label="Office hours" htmlFor="officeHours" hint="Office or online availability">
          <TextInput
            id="officeHours"
            name="officeHours"
            value={teacherForm.officeHours}
            onChange={handleTeacherChange}
            placeholder="Mon-Fri 2:00 PM - 4:00 PM"
          />
        </FieldRow>

        <FieldRow label="Meeting link" htmlFor="meetingLink" hint="Optional meeting URL">
          <TextInput
            id="meetingLink"
            name="meetingLink"
            type="url"
            value={teacherForm.meetingLink}
            onChange={handleTeacherChange}
            placeholder="https://..."
          />
        </FieldRow>

        <FieldRow
          label="Focus areas"
          htmlFor="focusAreas"
          hint="Comma separated list, for example: SAT prep, lab mentoring"
        >
          <TextInput
            id="focusAreas"
            name="focusAreas"
            value={teacherForm.focusAreas}
            onChange={handleTeacherChange}
            placeholder="SAT prep, lab mentoring"
          />
        </FieldRow>

        <div className="flex justify-end py-5">
          <PrimaryButton
            loading={teacherSaving || teacherBootLoading}
            loadingText={teacherBootLoading ? 'Loading...' : 'Saving...'}
          >
            Save teaching profile
          </PrimaryButton>
        </div>
      </form>
    );
  };

  const renderFamilySection = () => (
    <div className="py-5">
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-5">
        <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
          Parent profile center
        </h3>
        <p className="mt-2 text-sm text-[var(--color-text-secondary)] leading-relaxed">
          Your parent and linked student details stay in the dedicated Parent Profile section.
        </p>
        <button
          type="button"
          onClick={() => navigate('/dashboard/parent-profile-center')}
          className="mt-4 inline-flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-input-bg)] px-4 py-2 text-sm font-medium text-[var(--color-text-primary)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
        >
          Open parent profile center
          <ArrowRight size={15} aria-hidden="true" />
        </button>
      </div>
    </div>
  );

  const renderSecuritySection = () => (
    <form onSubmit={handlePasswordSubmit} noValidate>
      <FieldRow label="Current password" htmlFor="currentPassword">
        <PasswordInput
          id="currentPassword"
          name="currentPassword"
          value={passwordForm.currentPassword}
          onChange={handlePasswordChange}
          show={showCurrentPassword}
          onToggle={() => setShowCurrentPassword((value) => !value)}
          label="Current password"
        />
      </FieldRow>

      <FieldRow
        label="New password"
        htmlFor="newPassword"
        hint={`At least ${roleMinPasswordLength} characters with uppercase, lowercase, number, and special character`}
      >
        <PasswordInput
          id="newPassword"
          name="newPassword"
          value={passwordForm.newPassword}
          onChange={handlePasswordChange}
          show={showNewPassword}
          onToggle={() => setShowNewPassword((value) => !value)}
          label="New password"
          minLength={roleMinPasswordLength}
        />
      </FieldRow>

      <div className="flex justify-end py-5">
        <PrimaryButton loading={passwordSaving} loadingText="Changing...">
          Update password
        </PrimaryButton>
      </div>
    </form>
  );

  const renderAccountSection = () => (
    <div className="py-5">
      <div className="rounded-xl border border-red-200 bg-red-50/40 p-5">
        <div className="flex items-start gap-4">
          <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-100">
            <Trash2 size={18} className="text-red-600" aria-hidden="true" />
          </div>
          <div className="w-full">
            <h3 className="text-base font-semibold text-red-700">Delete account</h3>
            <p className="mt-1.5 text-sm text-red-700/80 leading-relaxed">
              This permanently removes your account and associated data.
            </p>

            <div className="mt-4 max-w-md">
              <label
                htmlFor="deletePassword"
                className="mb-1 block text-xs font-medium text-red-700"
              >
                Re-enter password
              </label>
              <PasswordInput
                id="deletePassword"
                name="deletePassword"
                value={deleteForm.password}
                onChange={handleDeletePasswordChange}
                show={showDeletePassword}
                onToggle={() => setShowDeletePassword((value) => !value)}
                label="Delete password"
                minLength={roleMinPasswordLength}
              />
            </div>

            <button
              type="button"
              onClick={openDeleteConfirmation}
              disabled={deleteLoading}
              className="mt-5 inline-flex items-center gap-2 rounded-lg border border-red-300 bg-white px-4 py-2.5 text-sm font-medium text-red-700 transition hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50"
            >
              <Trash2 size={15} aria-hidden="true" />
              Delete my account
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSectionContent = (sectionId) => {
    if (sectionId === 'profile') return renderProfileSection();
    if (sectionId === 'teaching') return renderTeachingSection();
    if (sectionId === 'family') return renderFamilySection();
    if (sectionId === 'security') return renderSecuritySection();
    return renderAccountSection();
  };

  const getDesktopPanelClass = (sectionId) => {
    if (sectionId === 'account') {
      return 'rounded-xl border border-red-200 bg-red-50/20 px-6';
    }
    return 'rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-6';
  };

  return (
    <main className="min-h-screen flex flex-col items-center px-4 py-12 sm:px-6">
      <div className="w-full max-w-3xl">
        <div className="flex flex-col items-center text-center gap-3 mb-8">
          <div className="h-20 w-20 rounded-full shrink-0 bg-[var(--color-primary)]/10 flex items-center justify-center overflow-hidden ring-2 ring-[var(--color-border)]">
            {avatarPreview ? (
              <img src={avatarPreview} alt="" aria-hidden="true" className="h-full w-full object-cover" />
            ) : (
              <span aria-hidden="true" className="text-2xl font-semibold text-[var(--color-primary)]">
                {(profileForm.username.charAt(0) || '?').toUpperCase()}
              </span>
            )}
          </div>
          <div>
            <p className="text-lg font-semibold text-[var(--color-text-primary)]">
              {profileForm.username || 'Your account'}
            </p>
            <p className="text-sm text-[var(--color-text-muted)]">{user?.email}</p>
          </div>
        </div>

        <div
          role="tablist"
          aria-label="Settings sections"
          className="hidden md:flex gap-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-1 mb-6"
        >
          {sections.map(({ id, label, Icon }) => (
            <button
              key={id}
              role="tab"
              type="button"
              id={`tab-${id}`}
              aria-selected={desktopTab === id}
              aria-controls={`panel-${id}`}
              onClick={() => setDesktopTab(id)}
              className={`
                flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors
                focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]
                ${desktopTab === id
                  ? 'bg-[var(--color-bg)] text-[var(--color-text-primary)] shadow-sm'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'
                }
              `}
            >
              {createElement(Icon, { size: 15, 'aria-hidden': true })}
              {label}
            </button>
          ))}
        </div>

        <div className="hidden md:block space-y-6">
          {sections.map(({ id }) => (
            <section
              key={id}
              id={`panel-${id}`}
              role="tabpanel"
              aria-labelledby={`tab-${id}`}
              hidden={desktopTab !== id}
              className={getDesktopPanelClass(id)}
            >
              {renderSectionContent(id)}
            </section>
          ))}
        </div>

        <div className="md:hidden space-y-3">
          {sections.map(({ id, label, Icon }) => {
            const isOpen = mobileOpenSection === id;
            return (
              <section
                key={id}
                className={id === 'account'
                  ? 'rounded-xl border border-red-200 bg-red-50/20 overflow-hidden'
                  : 'rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden'
                }
              >
                <button
                  type="button"
                  onClick={() => setMobileOpenSection(isOpen ? '' : id)}
                  aria-expanded={isOpen}
                  aria-controls={`mobile-panel-${id}`}
                  className="flex w-full items-center justify-between px-4 py-3 text-left"
                >
                  <span className="inline-flex items-center gap-2 text-sm font-medium text-[var(--color-text-primary)]">
                    {createElement(Icon, { size: 16, 'aria-hidden': true })}
                    {label}
                  </span>
                  <ChevronDown
                    size={16}
                    aria-hidden="true"
                    className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}
                  />
                </button>
                {isOpen && (
                  <div id={`mobile-panel-${id}`} className="px-4 pb-2">
                    {renderSectionContent(id)}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      </div>

      <ConfirmModal
        isOpen={confirmModalOpen}
        onClose={() => setConfirmModalOpen(false)}
        onConfirm={handleDeleteAccount}
        title="Delete Account"
        message="Are you absolutely sure? This action cannot be undone and all your data will be permanently removed."
        confirmText="Yes, delete my account"
        confirmLoadingText="Deleting..."
        cancelText="Cancel"
        type="danger"
      />

      <Toast
        type={toast.type}
        message={toast.message}
        isOpen={toast.isOpen}
        onClose={() => setToast((prev) => ({ ...prev, isOpen: false }))}
      />
    </main>
  );
}
