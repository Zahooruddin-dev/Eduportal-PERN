const StudentTabShell = ({ title, description }) => {
  return (
    <section className='mx-auto w-full max-w-5xl rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-sm backdrop-blur sm:p-8'>
      <div className='mb-4 inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-slate-600'>
        Student Workspace
      </div>
      <h1 className='text-2xl font-semibold text-slate-900 sm:text-3xl'>{title}</h1>
      <p className='mt-2 max-w-2xl text-sm text-slate-600 sm:text-base'>{description}</p>

      <div className='mt-8 grid gap-4 sm:grid-cols-2'>
        <div className='rounded-xl border border-slate-200 bg-slate-50 p-4'>
          <h2 className='text-sm font-semibold text-slate-800'>Overview</h2>
          <p className='mt-2 text-sm text-slate-600'>
            This section is ready for your real data and actions. For now, it follows the shared Tailwind look so each student tab stays visually consistent.
          </p>
        </div>

        <div className='rounded-xl border border-slate-200 bg-slate-50 p-4'>
          <h2 className='text-sm font-semibold text-slate-800'>Status</h2>
          <p className='mt-2 text-sm text-slate-600'>
            Placeholder content is active. You can now build each tab feature on top of this layout.
          </p>
        </div>
      </div>
    </section>
  );
};

export default StudentTabShell;
