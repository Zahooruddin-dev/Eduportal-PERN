import { useMemo, useState } from 'react';
import { Search, BookOpen, ChevronDown, ChevronUp } from 'lucide-react';

export default function GlossaryTab({ resources }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedTerms, setExpandedTerms] = useState(new Set());

  const glossaryTerms = useMemo(() => {
    const terms = resources.filter(r => r.material_category === 'glossary');
    
    if (!searchQuery.trim()) {
      return terms.sort((a, b) => a.title.localeCompare(b.title));
    }

    const query = searchQuery.toLowerCase();
    return terms
      .filter(term => 
        term.title.toLowerCase().includes(query) || 
        (term.description && term.description.toLowerCase().includes(query))
      )
      .sort((a, b) => a.title.localeCompare(b.title));
  }, [resources, searchQuery]);

  const toggleExpanded = (termId) => {
    setExpandedTerms(prev => {
      const newSet = new Set(prev);
      if (newSet.has(termId)) {
        newSet.delete(termId);
      } else {
        newSet.add(termId);
      }
      return newSet;
    });
  };

  if (glossaryTerms.length === 0) {
    return (
      <div className='rounded-2xl border-2 border-dashed border-[var(--color-border)] bg-gradient-to-br from-[var(--color-surface)] to-[var(--color-surface)]/50 p-8 text-center md:p-12'>
        <div className='mb-4 inline-block rounded-2xl bg-[var(--color-primary)]/10 p-4'>
          <BookOpen size={40} className='text-[var(--color-primary)]' />
        </div>
        <p className='text-lg font-semibold text-[var(--color-text-primary)]'>
          No Glossary Terms
        </p>
        <p className='mt-2 text-[var(--color-text-muted)]'>
          No glossary terms are available for this course yet.
        </p>
      </div>
    );
  }

  return (
    <div className='space-y-6'>
      {/* Search */}
      <div className='rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm md:rounded-2xl md:p-5'>
        <div className='relative'>
          <Search
            size={18}
            className='absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]'
          />
          <input
            type='text'
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder='Search glossary terms...'
            className='w-full rounded-lg border-2 border-[var(--color-border)] bg-[var(--color-input-bg)] pl-10 pr-4 py-2.5 text-sm font-medium text-[var(--color-text-primary)] outline-none placeholder:text-[var(--color-text-muted)]/40 transition focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20 md:rounded-xl'
          />
        </div>
        <p className='mt-3 text-xs text-[var(--color-text-muted)]'>
          Showing {glossaryTerms.length} term{glossaryTerms.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Terms List */}
      <div className='grid gap-3 md:gap-4'>
        {glossaryTerms.map((term) => (
          <div
            key={term.id}
            className='rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm transition hover:border-[var(--color-primary)]/60 hover:shadow-lg md:rounded-2xl'
          >
            <button
              onClick={() => toggleExpanded(term.id)}
              className='w-full p-4 text-left md:p-5'
            >
              <div className='flex items-start justify-between gap-4'>
                <div className='flex-1 min-w-0'>
                  <h3 className='font-bold text-[var(--color-text-primary)] md:text-lg break-words'>
                    {term.title}
                  </h3>
                  {term.description && !expandedTerms.has(term.id) && (
                    <p className='mt-2 text-sm text-[var(--color-text-secondary)] line-clamp-2'>
                      {term.description}
                    </p>
                  )}
                </div>
                <div className='mt-1 flex-shrink-0 text-[var(--color-primary)]'>
                  {expandedTerms.has(term.id) ? (
                    <ChevronUp size={20} />
                  ) : (
                    <ChevronDown size={20} />
                  )}
                </div>
              </div>
            </button>

            {expandedTerms.has(term.id) && term.description && (
              <div className='border-t border-[var(--color-border)] bg-[var(--color-surface)]/50 px-4 py-3 md:px-5 md:py-4'>
                <p className='whitespace-pre-wrap text-sm text-[var(--color-text-secondary)]'>
                  {term.description}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
