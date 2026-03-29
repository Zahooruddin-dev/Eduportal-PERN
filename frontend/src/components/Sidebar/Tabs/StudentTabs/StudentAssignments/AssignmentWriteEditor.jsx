import { useRef, useEffect, useState, useCallback } from 'react';
import {
  Bold, Italic, Underline, Strikethrough,
  List, ListOrdered, AlignLeft, AlignCenter, AlignRight,
  Heading1, Heading2, Quote, Minus, RotateCcw, RotateCw,
  Type,
} from 'lucide-react';

// ─── Toolbar Button ────────────────────────────────────────────────────────────
function ToolBtn({ icon: Icon, label, onClick, active, disabled }) {
  return (
    <button
      type="button"
      title={label}
      disabled={disabled}
      onMouseDown={(e) => {
        e.preventDefault(); // keep focus in editor
        onClick();
      }}
      className={`p-1.5 rounded-md transition-colors text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-border)] disabled:opacity-30 disabled:pointer-events-none ${
        active ? 'bg-[var(--color-primary)]/15 text-[var(--color-primary)]' : ''
      }`}
    >
      <Icon size={14} strokeWidth={2} />
    </button>
  );
}

function Divider() {
  return <span className="w-px h-5 bg-[var(--color-border)] mx-0.5 shrink-0" />;
}

// ─── Font Size Select ──────────────────────────────────────────────────────────
function FontSizeSelect({ onChange }) {
  return (
    <select
      title="Font size"
      defaultValue=""
      onChange={(e) => {
        const v = e.target.value;
        if (v) onChange(v);
        e.target.value = '';
      }}
      onMouseDown={(e) => e.stopPropagation()}
      className="h-7 text-xs bg-[var(--color-input-bg)] border border-[var(--color-border)] rounded-md px-1 text-[var(--color-text-secondary)] focus:outline-none cursor-pointer"
    >
      <option value="" disabled>Size</option>
      {['1','2','3','4','5','6','7'].map((s) => (
        <option key={s} value={s}>{['8','10','12','14','18','24','36'][+s-1]}px</option>
      ))}
    </select>
  );
}

// ─── Main Editor ───────────────────────────────────────────────────────────────
export default function AssignmentWriteEditor({ value, onChange, placeholder = 'Start writing your assignment here…', minHeight = 320 }) {
  const editorRef = useRef(null);
  const [activeFormats, setActiveFormats] = useState({});
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  // Sync initial value into DOM (only on mount)
  useEffect(() => {
    if (editorRef.current && value && !editorRef.current.innerHTML) {
      editorRef.current.innerHTML = value;
      updateCounts(editorRef.current.innerText || '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateCounts = (text) => {
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    setWordCount(words);
    setCharCount(text.replace(/\n/g, '').length);
  };

  const checkActiveFormats = useCallback(() => {
    try {
      setActiveFormats({
        bold: document.queryCommandState('bold'),
        italic: document.queryCommandState('italic'),
        underline: document.queryCommandState('underline'),
        strikeThrough: document.queryCommandState('strikeThrough'),
        insertUnorderedList: document.queryCommandState('insertUnorderedList'),
        insertOrderedList: document.queryCommandState('insertOrderedList'),
        justifyLeft: document.queryCommandState('justifyLeft'),
        justifyCenter: document.queryCommandState('justifyCenter'),
        justifyRight: document.queryCommandState('justifyRight'),
      });
    } catch {}
  }, []);

  const exec = useCallback((cmd, value = null) => {
    editorRef.current?.focus();
    document.execCommand(cmd, false, value);
    checkActiveFormats();
    if (editorRef.current) {
      onChange?.(editorRef.current.innerHTML);
    }
  }, [checkActiveFormats, onChange]);

  const handleInput = () => {
    if (editorRef.current) {
      onChange?.(editorRef.current.innerHTML);
      updateCounts(editorRef.current.innerText || '');
    }
  };

  const handleKeyUp = () => checkActiveFormats();
  const handleMouseUp = () => checkActiveFormats();

  // Keyboard shortcuts
  const handleKeyDown = (e) => {
    if (e.ctrlKey || e.metaKey) {
      switch (e.key.toLowerCase()) {
        case 'b': e.preventDefault(); exec('bold'); break;
        case 'i': e.preventDefault(); exec('italic'); break;
        case 'u': e.preventDefault(); exec('underline'); break;
        case 'z': e.preventDefault(); exec(e.shiftKey ? 'redo' : 'undo'); break;
        case 'y': e.preventDefault(); exec('redo'); break;
        default: break;
      }
    }
    // Tab → insert spaces instead of leaving editor
    if (e.key === 'Tab') {
      e.preventDefault();
      exec('insertHTML', '&nbsp;&nbsp;&nbsp;&nbsp;');
    }
  };

  const insertHR = () => exec('insertHTML', '<hr style="border:none;border-top:1px solid var(--color-border);margin:12px 0"/>');
  const insertBlockquote = () => exec('formatBlock', 'blockquote');
  const insertH1 = () => exec('formatBlock', 'h1');
  const insertH2 = () => exec('formatBlock', 'h2');
  const insertP  = () => exec('formatBlock', 'p');

  // Show placeholder via CSS when empty
  const handleBlur = () => {
    if (editorRef.current && !editorRef.current.innerText.trim()) {
      editorRef.current.innerHTML = '';
    }
  };

  return (
    <div className="flex flex-col rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden focus-within:ring-2 focus-within:ring-[var(--color-primary)]/30 focus-within:border-[var(--color-primary)]/50 transition-all">

      {/* ── Toolbar ── */}
      <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b border-[var(--color-border)] bg-[var(--color-input-bg)]/60 sticky top-0 z-10">

        {/* History */}
        <ToolBtn icon={RotateCcw} label="Undo (Ctrl+Z)" onClick={() => exec('undo')} />
        <ToolBtn icon={RotateCw}  label="Redo (Ctrl+Y)"  onClick={() => exec('redo')} />
        <Divider />

        {/* Block format */}
        <ToolBtn icon={Type}     label="Paragraph"  onClick={insertP}  />
        <ToolBtn icon={Heading1} label="Heading 1"  onClick={insertH1} />
        <ToolBtn icon={Heading2} label="Heading 2"  onClick={insertH2} />
        <Divider />

        {/* Inline format */}
        <ToolBtn icon={Bold}          label="Bold (Ctrl+B)"        onClick={() => exec('bold')}          active={activeFormats.bold} />
        <ToolBtn icon={Italic}        label="Italic (Ctrl+I)"      onClick={() => exec('italic')}        active={activeFormats.italic} />
        <ToolBtn icon={Underline}     label="Underline (Ctrl+U)"   onClick={() => exec('underline')}     active={activeFormats.underline} />
        <ToolBtn icon={Strikethrough} label="Strikethrough"        onClick={() => exec('strikeThrough')} active={activeFormats.strikeThrough} />
        <Divider />

        {/* Font size */}
        <FontSizeSelect onChange={(v) => exec('fontSize', v)} />
        <Divider />

        {/* Lists */}
        <ToolBtn icon={List}         label="Bullet list"   onClick={() => exec('insertUnorderedList')} active={activeFormats.insertUnorderedList} />
        <ToolBtn icon={ListOrdered}  label="Numbered list" onClick={() => exec('insertOrderedList')}  active={activeFormats.insertOrderedList} />
        <Divider />

        {/* Alignment */}
        <ToolBtn icon={AlignLeft}   label="Align left"   onClick={() => exec('justifyLeft')}   active={activeFormats.justifyLeft} />
        <ToolBtn icon={AlignCenter} label="Align center" onClick={() => exec('justifyCenter')} active={activeFormats.justifyCenter} />
        <ToolBtn icon={AlignRight}  label="Align right"  onClick={() => exec('justifyRight')}  active={activeFormats.justifyRight} />
        <Divider />

        {/* Block elements */}
        <ToolBtn icon={Quote} label="Blockquote" onClick={insertBlockquote} />
        <ToolBtn icon={Minus} label="Divider"    onClick={insertHR} />
      </div>

      {/* ── Editor area ── */}
      <div className="relative flex-1">
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          onKeyUp={handleKeyUp}
          onMouseUp={handleMouseUp}
          onBlur={handleBlur}
          data-placeholder={placeholder}
          className="assignment-editor outline-none px-5 py-4 text-[var(--color-text-primary)] text-sm leading-relaxed overflow-y-auto"
          style={{ minHeight }}
        />
      </div>

      {/* ── Footer: word / char count ── */}
      <div className="flex items-center justify-end gap-4 px-4 py-1.5 border-t border-[var(--color-border)] bg-[var(--color-input-bg)]/40">
        <span className="text-xs text-[var(--color-text-muted)]">
          {wordCount} {wordCount === 1 ? 'word' : 'words'}
        </span>
        <span className="text-xs text-[var(--color-text-muted)]">
          {charCount} {charCount === 1 ? 'char' : 'chars'}
        </span>
      </div>

      {/* ── Scoped styles ── */}
      <style>{`
        .assignment-editor:empty:before {
          content: attr(data-placeholder);
          color: var(--color-text-muted);
          pointer-events: none;
        }
        .assignment-editor h1 {
          font-size: 1.5rem;
          font-weight: 700;
          margin: 0.75rem 0 0.4rem;
          color: var(--color-text-primary);
          line-height: 1.3;
        }
        .assignment-editor h2 {
          font-size: 1.2rem;
          font-weight: 600;
          margin: 0.6rem 0 0.35rem;
          color: var(--color-text-primary);
          line-height: 1.35;
        }
        .assignment-editor p {
          margin: 0.3rem 0;
        }
        .assignment-editor ul {
          list-style: disc;
          margin: 0.4rem 0;
          padding-left: 1.5rem;
        }
        .assignment-editor ol {
          list-style: decimal;
          margin: 0.4rem 0;
          padding-left: 1.5rem;
        }
        .assignment-editor li {
          margin: 0.15rem 0;
        }
        .assignment-editor blockquote {
          border-left: 3px solid var(--color-primary);
          margin: 0.6rem 0;
          padding: 0.4rem 0.75rem;
          color: var(--color-text-secondary);
          background: var(--color-input-bg);
          border-radius: 0 6px 6px 0;
          font-style: italic;
        }
        .assignment-editor b, .assignment-editor strong { font-weight: 700; }
        .assignment-editor i, .assignment-editor em     { font-style: italic; }
        .assignment-editor u                            { text-decoration: underline; }
        .assignment-editor s, .assignment-editor strike { text-decoration: line-through; }
        .assignment-editor hr {
          border: none;
          border-top: 1px solid var(--color-border);
          margin: 12px 0;
        }
        .assignment-editor a {
          color: var(--color-primary);
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
}