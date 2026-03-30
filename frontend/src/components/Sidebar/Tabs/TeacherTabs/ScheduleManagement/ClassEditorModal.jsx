import { useMemo, useState } from 'react';
import ScheduleBlocksEditor from '../../Shared/ScheduleBlocksEditor';
import { getScheduleBlocksFromClass } from '../../../../../utils/scheduleUtils';

function buildInitialState(initialData) {
  return {
    class_name: initialData?.class_name || '',
    grade_level: initialData?.grade_level || '',
    subject: initialData?.subject || '',
    room_number: initialData?.room_number || '',
    max_students: initialData?.max_students || 30,
    meeting_link: initialData?.meeting_link || '',
    schedule_timezone: initialData?.schedule_timezone || 'UTC',
    description: initialData?.description || '',
    schedule_blocks: getScheduleBlocksFromClass(initialData),
  };
}

function hasInvalidBlock(block) {
  if (!block?.day || !block?.start_time || !block?.end_time) return true;
  return block.start_time >= block.end_time;
}

export default function ClassEditorModal({
  isOpen,
  mode,
  initialData,
  onClose,
  onSubmit,
  submitting,
}) {
  const [formData, setFormData] = useState(buildInitialState(initialData));
  const [error, setError] = useState('');

  const title = useMemo(() => {
    if (mode === 'edit') return 'Edit Class';
    return 'Create New Class';
  }, [mode]);

  if (!isOpen) return null;

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (!formData.class_name.trim()) {
      setError('Class name is required.');
      return;
    }

    if (!Array.isArray(formData.schedule_blocks) || formData.schedule_blocks.length === 0) {
      setError('Add at least one schedule block.');
      return;
    }

    if (formData.schedule_blocks.some(hasInvalidBlock)) {
      setError('Each schedule block needs a day, start time, and an end time after start time.');
      return;
    }

    if (formData.meeting_link) {
      try {
        const parsed = new URL(formData.meeting_link);
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
          setError('Meeting link must start with http:// or https://');
          return;
        }
      } catch {
        setError('Meeting link must be a valid URL.');
        return;
      }
    }

    await onSubmit({
      ...formData,
      class_name: formData.class_name.trim(),
      max_students: Number(formData.max_students) || 30,
      meeting_link: formData.meeting_link.trim(),
      description: formData.description.trim(),
    });
  };

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4'>
      <div className='w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-6'>
        <div className='flex items-center justify-between gap-4 mb-4'>
          <h2 className='text-xl font-semibold text-[var(--color-text-primary)]'>{title}</h2>
          <button
            type='button'
            onClick={onClose}
            className='rounded-lg border border-[var(--color-border)] px-3 py-1 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-border)]/60'
          >
            Close
          </button>
        </div>

        <form onSubmit={handleSubmit} className='space-y-4'>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
            <div>
              <label className='block text-sm text-[var(--color-text-secondary)] mb-1'>Class Name</label>
              <input
                type='text'
                name='class_name'
                value={formData.class_name}
                onChange={handleChange}
                className='w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3.5 py-2.5 text-sm text-[var(--color-text-primary)]'
              />
            </div>
            <div>
              <label className='block text-sm text-[var(--color-text-secondary)] mb-1'>Subject</label>
              <input
                type='text'
                name='subject'
                value={formData.subject}
                onChange={handleChange}
                className='w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3.5 py-2.5 text-sm text-[var(--color-text-primary)]'
              />
            </div>
          </div>

          <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
            <div>
              <label className='block text-sm text-[var(--color-text-secondary)] mb-1'>Grade Level</label>
              <input
                type='text'
                name='grade_level'
                value={formData.grade_level}
                onChange={handleChange}
                className='w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3.5 py-2.5 text-sm text-[var(--color-text-primary)]'
              />
            </div>
            <div>
              <label className='block text-sm text-[var(--color-text-secondary)] mb-1'>Room Number</label>
              <input
                type='text'
                name='room_number'
                value={formData.room_number}
                onChange={handleChange}
                className='w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3.5 py-2.5 text-sm text-[var(--color-text-primary)]'
              />
            </div>
          </div>

          <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
            <div>
              <label className='block text-sm text-[var(--color-text-secondary)] mb-1'>Max Students</label>
              <input
                type='number'
                name='max_students'
                min='1'
                value={formData.max_students}
                onChange={handleChange}
                className='w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3.5 py-2.5 text-sm text-[var(--color-text-primary)]'
              />
            </div>
            <div>
              <label className='block text-sm text-[var(--color-text-secondary)] mb-1'>Time Zone</label>
              <input
                type='text'
                name='schedule_timezone'
                value={formData.schedule_timezone}
                onChange={handleChange}
                placeholder='UTC'
                className='w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3.5 py-2.5 text-sm text-[var(--color-text-primary)]'
              />
            </div>
          </div>

          <div>
            <label className='block text-sm text-[var(--color-text-secondary)] mb-1'>Meeting Link</label>
            <input
              type='url'
              name='meeting_link'
              value={formData.meeting_link}
              onChange={handleChange}
              placeholder='https://...'
              className='w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3.5 py-2.5 text-sm text-[var(--color-text-primary)]'
            />
          </div>

          <div>
            <label className='block text-sm text-[var(--color-text-secondary)] mb-2'>Detailed Schedule</label>
            <ScheduleBlocksEditor
              value={formData.schedule_blocks}
              onChange={(nextValue) =>
                setFormData((current) => ({ ...current, schedule_blocks: nextValue }))
              }
            />
          </div>

          <div>
            <label className='block text-sm text-[var(--color-text-secondary)] mb-1'>Description</label>
            <textarea
              name='description'
              rows='3'
              value={formData.description}
              onChange={handleChange}
              className='w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3.5 py-2.5 text-sm text-[var(--color-text-primary)]'
            />
          </div>

          {error && <p className='text-sm text-[var(--color-danger)]'>{error}</p>}

          <div className='flex flex-wrap justify-end gap-2'>
            <button
              type='button'
              onClick={onClose}
              className='rounded-xl border border-[var(--color-border)] px-4 py-2 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-border)]/50'
            >
              Cancel
            </button>
            <button
              type='submit'
              disabled={submitting}
              className='rounded-xl bg-[var(--color-primary)] px-4 py-2 text-sm text-white disabled:opacity-60 disabled:cursor-not-allowed hover:bg-[var(--color-primary-hover)]'
            >
              {submitting ? 'Saving...' : mode === 'edit' ? 'Update Class' : 'Create Class'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
