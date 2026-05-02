import { useMemo, useState } from 'react';
import { Download, FileText, Search } from 'lucide-react';
import { getFileViewUrl } from '../../../../../utils/fileUtils';

export default function DownloadTab({ resources, onDownloadFile }) {
  const [searchQuery, setSearchQuery] = useState('');

  const downloadableFiles = useMemo(() => {
    let files = resources.filter(r => r.type === 'file' && r.material_category === 'download');
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      files = files.filter(f =>
        f.title.toLowerCase().includes(query) ||
        (f.description && f.description.toLowerCase().includes(query))
      );
    }

    return files.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }, [resources, searchQuery]);

  const totalSize = downloadableFiles.length;

  const downloadFile = async (fileUrl, fileName) => {
    try {
      const response = await fetch(fileUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName || 'download';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      if (onDownloadFile) onDownloadFile(fileName);
    } catch (err) {
      console.error('Download failed:', err);
    }
  };

  const downloadAll = async () => {
    for (const file of downloadableFiles) {
      const fileUrl = getFileViewUrl(file.content);
      const fileName = `${file.title}`.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      await downloadFile(fileUrl, fileName);
      await new Promise(resolve => setTimeout(resolve, 300));
    }
  };

  if (downloadableFiles.length === 0) {
    return (
      <div className='rounded-2xl border-2 border-dashed border-[var(--color-border)] bg-gradient-to-br from-[var(--color-surface)] to-[var(--color-surface)]/50 p-8 text-center md:p-12'>
        <div className='mb-4 inline-block rounded-2xl bg-[var(--color-primary)]/10 p-4'>
          <FileText size={40} className='text-[var(--color-primary)]' />
        </div>
        <p className='text-lg font-semibold text-[var(--color-text-primary)]'>
          No Download Materials
        </p>
        <p className='mt-2 text-[var(--color-text-muted)]'>
          No downloadable files are available for this course yet.
        </p>
      </div>
    );
  }

  return (
    <div className='space-y-6'>
      {/* Search and Controls */}
      <div className='rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm md:rounded-2xl md:p-5'>
        <div className='grid gap-4 md:gap-5'>
          <div className='relative'>
            <Search
              size={18}
              className='absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]'
            />
            <input
              type='text'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder='Search files...'
              className='w-full rounded-lg border-2 border-[var(--color-border)] bg-[var(--color-input-bg)] pl-10 pr-4 py-2.5 text-sm font-medium text-[var(--color-text-primary)] outline-none placeholder:text-[var(--color-text-muted)]/40 transition focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20 md:rounded-xl'
            />
          </div>

          <div className='flex flex-col items-center justify-between gap-3 sm:flex-row'>
            <p className='text-xs font-semibold text-[var(--color-text-muted)]'>
              <span className='font-bold text-[var(--color-primary)]'>{downloadableFiles.length}</span> file{downloadableFiles.length !== 1 ? 's' : ''} available
            </p>
            {downloadableFiles.length > 0 && (
              <button
                onClick={downloadAll}
                className='inline-flex items-center gap-2.5 rounded-lg border-2 border-[var(--color-primary)] bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary)]/80 px-4 py-2.5 text-sm font-bold text-white shadow-lg transition hover:shadow-xl hover:scale-105 md:rounded-xl md:px-5 md:py-3'
              >
                <Download size={18} />
                Download All
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Files Grid */}
      <div className='grid gap-3 md:gap-4'>
        {downloadableFiles.map((file) => (
          <div
            key={file.id}
            className='group rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm transition hover:border-[var(--color-primary)]/60 hover:shadow-lg hover:-translate-y-1 md:rounded-2xl md:p-6'
          >
            <div className='flex flex-col items-start justify-between gap-4 md:flex-row md:items-center'>
              <div className='flex-1 min-w-0'>
                <div className='flex items-center gap-3'>
                  <div className='rounded-lg bg-[var(--color-primary)]/10 p-2 md:p-2.5 flex-shrink-0'>
                    <FileText size={20} className='text-[var(--color-primary)]' />
                  </div>
                  <div className='flex-1 min-w-0'>
                    <h3 className='font-bold text-[var(--color-text-primary)] md:text-lg truncate'>
                      {file.title}
                    </h3>
                    {file.description && (
                      <p className='mt-1 text-sm text-[var(--color-text-secondary)] line-clamp-1'>
                        {file.description}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  const fileUrl = getFileViewUrl(file.content);
                  const fileName = file.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
                  downloadFile(fileUrl, fileName);
                }}
                className='inline-flex items-center gap-2 rounded-lg border-2 border-[var(--color-primary)] bg-[var(--color-primary)]/5 px-4 py-2.5 text-sm font-bold text-[var(--color-primary)] transition hover:bg-[var(--color-primary)]/15 hover:scale-105 md:rounded-xl md:px-5 flex-shrink-0'
              >
                <Download size={18} />
                <span className='hidden sm:inline'>Download</span>
              </button>
            </div>

            {file.tags && file.tags.length > 0 && (
              <div className='mt-3 flex flex-wrap gap-2'>
                {file.tags.map((tag, index) => (
                  <span
                    key={`${tag}-${index}`}
                    className='rounded-full bg-[var(--color-border)]/60 px-3 py-1 text-xs font-semibold text-[var(--color-text-secondary)]'
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
