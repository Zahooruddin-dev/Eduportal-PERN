const StudentTabShell = ({ title, description }) => {
  return (
    <section className='mx-auto w-full max-w-5xl rounded-2xl border border-[var(--sb-border)] bg-[var(--sb-bg-elevated)] p-6 shadow-sm backdrop-blur sm:p-8 text-[var(--app-text)]'>
      <div className='mb-4 inline-flex items-center rounded-full border border-[var(--sb-badge-student-border)] bg-[var(--sb-badge-student-bg)] px-3 py-1 text-xs font-semibold uppercase tracking-wider text-[var(--sb-badge-student-color)]'>
        Student Workspace
      </div>
      <h1 className='text-2xl font-semibold text-[var(--app-text)] sm:text-3xl'>{title}</h1>
      <p className='mt-2 max-w-2xl text-sm text-[var(--sb-text-secondary)] sm:text-base'>{description}</p>

      <div className='mt-8 grid gap-4 sm:grid-cols-2'>
        <div className='rounded-xl border border-[var(--sb-border)] bg-[var(--sb-bg)] p-4'>
          <h2 className='text-sm font-semibold text-[var(--sb-text)]'>Overview</h2>
          <p className='mt-2 text-sm text-[var(--sb-text-dim)]'>
            This section is ready for your real data and actions. For now, it follows the shared theme tokens so each student tab stays visually consistent.
          </p>
        </div>

        <div className='rounded-xl border border-[var(--sb-border)] bg-[var(--sb-bg)] p-4'>
          <h2 className='text-sm font-semibold text-[var(--sb-text)]'>Status</h2>
          <p className='mt-2 text-sm text-[var(--sb-text-dim)]'>
            Placeholder content is active. You can now build each tab feature on top of this layout.
          </p>
        </div>
      </div>
    </section>
  );
};

export default StudentTabShell;
