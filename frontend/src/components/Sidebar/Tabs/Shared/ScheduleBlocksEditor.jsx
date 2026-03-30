import { Plus, Trash2 } from 'lucide-react';

const DAY_OPTIONS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

const WEEKDAY_OPTIONS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

function defaultBlock() {
  return {
    day: 'Monday',
    start_time: '09:00',
    end_time: '10:00',
  };
}

export default function ScheduleBlocksEditor({ value = [], onChange }) {
  const blocks = Array.isArray(value) && value.length > 0 ? value : [defaultBlock()];
  const canApplyWeekdays = blocks.length === 1;

  const updateBlock = (index, key, nextValue) => {
    const next = blocks.map((block, blockIndex) => {
      if (blockIndex !== index) return block;
      return { ...block, [key]: nextValue };
    });
    onChange(next);
  };

  const addBlock = () => {
    onChange([...blocks, defaultBlock()]);
  };

  const removeBlock = (index) => {
    if (blocks.length <= 1) return;
    onChange(blocks.filter((_, blockIndex) => blockIndex !== index));
  };

  const applyToWeekdays = () => {
    if (!canApplyWeekdays) return;

    const source = blocks[0] || defaultBlock();
    const start_time = source.start_time || '09:00';
    const end_time = source.end_time || '10:00';

    onChange(
      WEEKDAY_OPTIONS.map((day) => ({
        day,
        start_time,
        end_time,
      })),
    );
  };

  return (
    <div className='space-y-3'>
      {blocks.map((block, index) => (
        <div
          key={`${block.day}-${block.start_time}-${index}`}
          className='grid grid-cols-1 sm:grid-cols-4 gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-input-bg)] p-3'
        >
          <div className='sm:col-span-1'>
            <label className='block text-xs text-[var(--color-text-muted)] mb-1'>Day</label>
            <select
              value={block.day}
              onChange={(event) => updateBlock(index, 'day', event.target.value)}
              className='w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text-primary)]'
            >
              {DAY_OPTIONS.map((day) => (
                <option key={day} value={day}>
                  {day}
                </option>
              ))}
            </select>
          </div>

          <div className='sm:col-span-1'>
            <label className='block text-xs text-[var(--color-text-muted)] mb-1'>Start</label>
            <input
              type='time'
              value={block.start_time || ''}
              onChange={(event) => updateBlock(index, 'start_time', event.target.value)}
              className='w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text-primary)]'
            />
          </div>

          <div className='sm:col-span-1'>
            <label className='block text-xs text-[var(--color-text-muted)] mb-1'>End</label>
            <input
              type='time'
              value={block.end_time || ''}
              onChange={(event) => updateBlock(index, 'end_time', event.target.value)}
              className='w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text-primary)]'
            />
          </div>

          <div className='sm:col-span-1 flex items-end'>
            <button
              type='button'
              onClick={() => removeBlock(index)}
              disabled={blocks.length <= 1}
              className='w-full inline-flex items-center justify-center gap-1 rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10 disabled:opacity-40 disabled:cursor-not-allowed'
            >
              <Trash2 size={14} />
              Remove
            </button>
          </div>
        </div>
      ))}

      <div className='flex flex-wrap items-center gap-2'>
        <button
          type='button'
          onClick={addBlock}
          className='inline-flex items-center gap-2 rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-border)]/50'
        >
          <Plus size={14} />
          Add Time Block
        </button>

        <button
          type='button'
          onClick={applyToWeekdays}
          disabled={!canApplyWeekdays}
          className='inline-flex items-center gap-2 rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm text-[var(--color-primary)] hover:bg-[var(--color-border)]/50 disabled:cursor-not-allowed disabled:opacity-50'
        >
          Apply Mon-Fri Same Time
        </button>
      </div>

      <p className='text-xs text-[var(--color-text-muted)]'>
        Weekday auto-fill is only available when exactly one time block is set.
      </p>
    </div>
  );
}
