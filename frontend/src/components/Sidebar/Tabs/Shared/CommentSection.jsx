import { useCallback, useEffect, useRef, useState } from 'react';
import { MessageSquare, Pencil, Reply, SendHorizontal, Trash2, X } from 'lucide-react';
import { useAuth } from '../../../../context/AuthContext';
import {
  getResourceComments,
  createResourceComment,
  updateResourceComment,
  deleteResourceComment,
} from '../../../../api/api';
import { SpinnerIcon, AlertBox } from '../../../Icons/Icon';

function getFocusableElements(root) {
  if (!root) return [];
  const selector =
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
  return Array.from(root.querySelectorAll(selector)).filter(
    (element) => !element.hasAttribute('disabled') && element.getAttribute('aria-hidden') !== 'true',
  );
}

function formatCommentDate(value) {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--';
  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function CommentSection({ classId, resourceId, onClose }) {
  const { user } = useAuth();
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [editing, setEditing] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const dialogRef = useRef(null);
  const closeButtonRef = useRef(null);
  const lastFocusedElementRef = useRef(null);

  const fetchComments = useCallback(async () => {
    setError('');
    setLoading(true);
    try {
      const res = await getResourceComments(classId, resourceId);
      setComments(res.data || []);
    } catch {
      setError('Failed to load comments');
    } finally {
      setLoading(false);
    }
  }, [classId, resourceId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  useEffect(() => {
    if (!success) return undefined;
    const timeoutId = window.setTimeout(() => {
      setSuccess('');
    }, 2200);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [success]);

  useEffect(() => {
    lastFocusedElementRef.current = document.activeElement;
    document.body.style.overflow = 'hidden';

    window.setTimeout(() => {
      closeButtonRef.current?.focus();
    }, 0);

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== 'Tab') return;

      const focusable = getFocusableElements(dialogRef.current);
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (event.shiftKey) {
        if (active === first || !dialogRef.current?.contains(active)) {
          event.preventDefault();
          last.focus();
        }
      } else if (active === last || !dialogRef.current?.contains(active)) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'auto';
      const previous = lastFocusedElementRef.current;
      if (previous && typeof previous.focus === 'function') {
        previous.focus();
      }
    };
  }, [onClose]);

  const handleSubmitComment = async (event) => {
    event.preventDefault();
    if (!newComment.trim()) return;

    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      await createResourceComment(classId, resourceId, {
        content: newComment,
        parentCommentId: replyTo?.id,
      });
      setNewComment('');
      setReplyTo(null);
      await fetchComments();
      setSuccess('Comment added');
    } catch {
      setError('Failed to post comment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateComment = async (commentId) => {
    if (!editContent.trim()) return;

    setError('');
    setSuccess('');
    try {
      await updateResourceComment(classId, resourceId, commentId, {
        content: editContent,
      });
      setEditing(null);
      setEditContent('');
      await fetchComments();
      setSuccess('Comment updated');
    } catch {
      setError('Failed to update comment');
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm('Delete this comment?')) return;

    setError('');
    setSuccess('');
    try {
      await deleteResourceComment(classId, resourceId, commentId);
      await fetchComments();
      setSuccess('Comment deleted');
    } catch {
      setError('Failed to delete comment');
    }
  };

  const commentMap = new Map();
  const rootComments = [];

  const sortedComments = [...comments].sort(
    (first, second) => new Date(first.created_at).getTime() - new Date(second.created_at).getTime(),
  );

  sortedComments.forEach((comment) => {
    commentMap.set(comment.id, { ...comment, replies: [] });
  });

  sortedComments.forEach((comment) => {
    if (comment.parent_comment_id) {
      const parent = commentMap.get(comment.parent_comment_id);
      if (parent) parent.replies.push(commentMap.get(comment.id));
    } else {
      rootComments.push(commentMap.get(comment.id));
    }
  });

  const totalComments = comments.length;
  const actionButtonClass =
    'inline-flex items-center gap-1 rounded-md border border-[var(--color-border)] px-2 py-1 text-[11px] text-[var(--color-text-secondary)] transition hover:bg-[var(--color-border)]/40';
  const currentUserProfile = user?.profile || user?.profile_pic;

  return (
    <div
      className='overlay-fade fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-3 backdrop-blur-sm sm:p-4'
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role='dialog'
        aria-modal='true'
        aria-labelledby='comment-dialog-title'
        className='fade-scale-in flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl'
      >
        <div className='flex items-start justify-between gap-3 border-b border-[var(--color-border)] p-4 sm:p-5'>
          <div>
            <p className='text-xs font-medium uppercase tracking-[0.12em] text-[var(--color-text-muted)]'>Discussion</p>
            <h2 id='comment-dialog-title' className='mt-1 flex items-center gap-2 text-xl font-semibold text-[var(--color-text-primary)]'>
              <MessageSquare size={20} />
              Comments
            </h2>
            <p className='mt-1 text-xs text-[var(--color-text-muted)]'>{totalComments} total comments</p>
          </div>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            className='rounded-md border border-[var(--color-border)] p-1.5 text-[var(--color-text-muted)] transition hover:bg-[var(--color-border)]/40 hover:text-[var(--color-text-primary)]'
            aria-label='Close comments dialog'
          >
            <X size={16} />
          </button>
        </div>

        <div className='min-h-0 flex-1 overflow-y-auto p-4 sm:p-5'>
          {loading ? (
            <div className='flex h-36 flex-col items-center justify-center gap-2 text-sm text-[var(--color-text-muted)]'>
              <SpinnerIcon />
              Loading comments...
            </div>
          ) : (
            <>
              {error && <div className='mb-3'><AlertBox message={error} /></div>}
              {success && (
                <div className='mb-3 rounded-lg border border-[var(--color-success)]/35 bg-[var(--color-success)]/10 px-3 py-2 text-center text-sm text-[var(--color-success)]'>
                  {success}
                </div>
              )}

              {rootComments.length === 0 ? (
                <div className='flex h-52 flex-col items-center justify-center rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-input-bg)] py-8 text-center'>
                  <div className='mb-2 rounded-full bg-[var(--color-primary)]/12 p-2 text-[var(--color-primary)]'>
                    <MessageSquare size={20} />
                  </div>
                  <p className='font-medium text-[var(--color-text-primary)]'>No comments yet</p>
                  <p className='text-sm text-[var(--color-text-muted)]'>Be the first one to start this discussion.</p>
                </div>
              ) : (
                <div className='space-y-5'>
                  {rootComments.map((comment) => (
                    <div key={comment.id} className='rounded-2xl border border-[var(--color-border)] bg-[var(--color-input-bg)] p-3 shadow-sm sm:p-4'>
                      <div className='flex gap-3'>
                        <div className='flex-shrink-0'>
                          {comment.profile_pic ? (
                            <img
                              src={comment.profile_pic}
                              alt={comment.username}
                              className='h-10 w-10 rounded-full object-cover ring-2 ring-[var(--color-surface)]'
                            />
                          ) : (
                            <div className='flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-primary)]/20 text-sm font-medium text-[var(--color-primary)]'>
                              {String(comment.username || '?').charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>

                        <div className='min-w-0 flex-1'>
                          <div className='rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3'>
                            <div className='flex flex-wrap items-center gap-x-2 gap-y-1'>
                              <span className='font-semibold text-[var(--color-text-primary)]'>
                                {comment.username || 'User'}
                              </span>
                              <span className='text-xs text-[var(--color-text-muted)]'>
                                {formatCommentDate(comment.created_at)}
                                {comment.updated_at !== comment.created_at && ' (edited)'}
                              </span>
                            </div>

                            {editing === comment.id ? (
                              <div className='mt-2'>
                                <textarea
                                  value={editContent}
                                  onChange={(event) => setEditContent(event.target.value)}
                                  className='w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20'
                                  rows='2'
                                  autoFocus
                                />
                                <div className='mt-2 flex flex-wrap gap-2'>
                                  <button
                                    type='button'
                                    onClick={() => handleUpdateComment(comment.id)}
                                    className={actionButtonClass}
                                  >
                                    <Pencil size={12} /> Save
                                  </button>
                                  <button
                                    type='button'
                                    onClick={() => {
                                      setEditing(null);
                                      setEditContent('');
                                    }}
                                    className={actionButtonClass}
                                  >
                                    <X size={12} /> Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <p className='mt-1 whitespace-pre-wrap text-[var(--color-text-secondary)]'>{comment.content}</p>
                            )}
                          </div>

                          <div className='mt-2 flex flex-wrap gap-1.5'>
                            <button
                              type='button'
                              onClick={() => setReplyTo(comment)}
                              className={actionButtonClass}
                            >
                              <Reply size={12} />
                              Reply
                            </button>
                            {comment.user_id === user?.id && (
                              <>
                                <button
                                  type='button'
                                  onClick={() => {
                                    setEditing(comment.id);
                                    setEditContent(comment.content);
                                  }}
                                  className={actionButtonClass}
                                >
                                  <Pencil size={12} />
                                  Edit
                                </button>
                                <button
                                  type='button'
                                  onClick={() => handleDeleteComment(comment.id)}
                                  className='inline-flex items-center gap-1 rounded-md border border-red-200 px-2 py-1 text-[11px] text-[var(--color-danger)] transition hover:bg-red-50 dark:border-red-900/40 dark:hover:bg-red-500/10'
                                >
                                  <Trash2 size={12} />
                                  Delete
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {comment.replies.length > 0 && (
                        <div className='mt-3 ml-12 space-y-3 border-l border-[var(--color-border)] pl-4'>
                          {comment.replies.map((reply) => (
                            <div key={reply.id} className='flex gap-3'>
                              <div className='flex-shrink-0'>
                                {reply.profile_pic ? (
                                  <img
                                    src={reply.profile_pic}
                                    alt={reply.username}
                                    className='h-8 w-8 rounded-full object-cover ring-2 ring-[var(--color-surface)]'
                                  />
                                ) : (
                                  <div className='flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-primary)]/12 text-xs text-[var(--color-primary)]'>
                                    {String(reply.username || '?').charAt(0).toUpperCase()}
                                  </div>
                                )}
                              </div>

                              <div className='flex-1'>
                                <div className='rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3'>
                                  <div className='flex flex-wrap items-center gap-x-2 gap-y-1'>
                                    <span className='text-sm font-medium text-[var(--color-text-primary)]'>
                                      {reply.username || 'User'}
                                    </span>
                                    <span className='text-xs text-[var(--color-text-muted)]'>
                                      {formatCommentDate(reply.created_at)}
                                    </span>
                                  </div>

                                  {editing === reply.id ? (
                                    <div className='mt-2'>
                                      <textarea
                                        value={editContent}
                                        onChange={(event) => setEditContent(event.target.value)}
                                        className='w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20'
                                        rows='2'
                                        autoFocus
                                      />
                                      <div className='mt-2 flex flex-wrap gap-2'>
                                        <button
                                          type='button'
                                          onClick={() => handleUpdateComment(reply.id)}
                                          className={actionButtonClass}
                                        >
                                          <Pencil size={12} /> Save
                                        </button>
                                        <button
                                          type='button'
                                          onClick={() => {
                                            setEditing(null);
                                            setEditContent('');
                                          }}
                                          className={actionButtonClass}
                                        >
                                          <X size={12} /> Cancel
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <p className='mt-1 whitespace-pre-wrap text-sm text-[var(--color-text-secondary)]'>
                                      {reply.content}
                                    </p>
                                  )}
                                </div>

                                {reply.user_id === user?.id && (
                                  <div className='mt-2 flex flex-wrap gap-1.5'>
                                    <button
                                      type='button'
                                      onClick={() => {
                                        setEditing(reply.id);
                                        setEditContent(reply.content);
                                      }}
                                      className={actionButtonClass}
                                    >
                                      <Pencil size={12} />
                                      Edit
                                    </button>
                                    <button
                                      type='button'
                                      onClick={() => handleDeleteComment(reply.id)}
                                      className='inline-flex items-center gap-1 rounded-md border border-red-200 px-2 py-1 text-[11px] text-[var(--color-danger)] transition hover:bg-red-50 dark:border-red-900/40 dark:hover:bg-red-500/10'
                                    >
                                      <Trash2 size={12} />
                                      Delete
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        <div className='border-t border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:p-5'>
          {replyTo && (
            <div className='mb-3 flex items-start justify-between gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3 py-2 text-sm text-[var(--color-text-muted)]'>
              <span className='truncate'>Replying to {replyTo.username || 'User'}</span>
              <button
                type='button'
                onClick={() => setReplyTo(null)}
                className='shrink-0 text-[var(--color-danger)] hover:underline'
              >
                Clear
              </button>
            </div>
          )}

          <form onSubmit={handleSubmitComment} className='flex flex-col gap-3 sm:flex-row sm:items-start'>
            <div className='flex-shrink-0'>
              {currentUserProfile ? (
                <img
                  src={currentUserProfile}
                  alt={user.username}
                  className='h-10 w-10 rounded-full object-cover ring-2 ring-[var(--color-surface)]'
                />
              ) : (
                <div className='flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-primary)]/20 font-medium text-[var(--color-primary)]'>
                  {user?.username?.charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            <div className='flex-1'>
              <textarea
                value={newComment}
                onChange={(event) => setNewComment(event.target.value)}
                placeholder='Write a comment...'
                className='min-h-[86px] w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-input-bg)] px-4 py-2 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20'
                rows='2'
              />

              <div className='mt-2 flex items-center justify-between gap-3'>
                <p className='text-xs text-[var(--color-text-muted)]'>{newComment.trim().length} characters</p>
                <button
                  type='submit'
                  disabled={submitting || !newComment.trim()}
                  className='inline-flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--color-primary-hover)] disabled:cursor-not-allowed disabled:opacity-50'
                >
                  {submitting ? <SpinnerIcon /> : <SendHorizontal size={14} />}
                  {submitting ? 'Posting...' : 'Post comment'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
