import { useCallback, useEffect, useRef, useState } from 'react';
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

    try {
      await updateResourceComment(classId, resourceId, commentId, {
        content: editContent,
      });
      setEditing(null);
      await fetchComments();
      setSuccess('Comment updated');
    } catch {
      setError('Failed to update comment');
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm('Delete this comment?')) return;

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

  comments.forEach((comment) => {
    commentMap.set(comment.id, { ...comment, replies: [] });
  });

  comments.forEach((comment) => {
    if (comment.parent_comment_id) {
      const parent = commentMap.get(comment.parent_comment_id);
      if (parent) parent.replies.push(commentMap.get(comment.id));
    } else {
      rootComments.push(commentMap.get(comment.id));
    }
  });

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4'>
      <div
        ref={dialogRef}
        role='dialog'
        aria-modal='true'
        aria-labelledby='comment-dialog-title'
        className='max-h-[80vh] w-full max-w-2xl overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl'
      >
        <div className='flex items-center justify-between border-b border-[var(--color-border)] p-4'>
          <h2 id='comment-dialog-title' className='text-xl font-semibold text-[var(--color-text-primary)]'>
            Comments
          </h2>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            className='rounded-md p-1 text-[var(--color-text-muted)] hover:bg-[var(--color-border)]/50 hover:text-[var(--color-text-primary)]'
            aria-label='Close comments dialog'
          >
            ✕
          </button>
        </div>

        <div className='max-h-[calc(80vh-8.5rem)] overflow-y-auto p-4'>
          {loading ? (
            <div className='flex h-28 items-center justify-center'>
              <SpinnerIcon />
            </div>
          ) : (
            <>
              {error && <AlertBox message={error} />}
              {success && <div className='mb-2 text-center text-sm text-[var(--color-success)]'>{success}</div>}

              {rootComments.length === 0 ? (
                <div className='py-8 text-center'>
                  <p className='text-[var(--color-text-muted)]'>No comments yet. Be the first!</p>
                </div>
              ) : (
                <div className='space-y-6'>
                  {rootComments.map((comment) => (
                    <div key={comment.id} className='space-y-3'>
                      <div className='flex gap-3'>
                        <div className='flex-shrink-0'>
                          {comment.profile_pic ? (
                            <img
                              src={comment.profile_pic}
                              alt={comment.username}
                              className='h-10 w-10 rounded-full object-cover'
                            />
                          ) : (
                            <div className='flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-primary)]/20 font-medium text-[var(--color-primary)]'>
                              {comment.username.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>

                        <div className='flex-1'>
                          <div className='rounded-2xl bg-[var(--color-border)]/20 p-3'>
                            <div className='flex items-baseline gap-2'>
                              <span className='font-semibold text-[var(--color-text-primary)]'>{comment.username}</span>
                              <span className='text-xs text-[var(--color-text-muted)]'>
                                {new Date(comment.created_at).toLocaleString()}
                                {comment.updated_at !== comment.created_at && ' (edited)'}
                              </span>
                            </div>

                            {editing === comment.id ? (
                              <div className='mt-2'>
                                <textarea
                                  value={editContent}
                                  onChange={(event) => setEditContent(event.target.value)}
                                  className='w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3 py-2 text-sm text-[var(--color-text-primary)]'
                                  rows='2'
                                  autoFocus
                                />
                                <div className='mt-1 flex gap-2'>
                                  <button onClick={() => handleUpdateComment(comment.id)} className='text-xs text-[var(--color-primary)]'>
                                    Save
                                  </button>
                                  <button onClick={() => setEditing(null)} className='text-xs text-[var(--color-text-muted)]'>
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <p className='mt-1 text-[var(--color-text-secondary)]'>{comment.content}</p>
                            )}
                          </div>

                          <div className='ml-1 mt-1 flex gap-3'>
                            <button
                              onClick={() => setReplyTo(comment)}
                              className='text-xs text-[var(--color-text-muted)] hover:text-[var(--color-primary)]'
                            >
                              Reply
                            </button>
                            {comment.user_id === user?.id && (
                              <>
                                <button
                                  onClick={() => {
                                    setEditing(comment.id);
                                    setEditContent(comment.content);
                                  }}
                                  className='text-xs text-[var(--color-text-muted)] hover:text-[var(--color-primary)]'
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleDeleteComment(comment.id)}
                                  className='text-xs text-[var(--color-danger)]'
                                >
                                  Delete
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {comment.replies.length > 0 && (
                        <div className='ml-12 space-y-3'>
                          {comment.replies.map((reply) => (
                            <div key={reply.id} className='flex gap-3'>
                              <div className='flex-shrink-0'>
                                {reply.profile_pic ? (
                                  <img
                                    src={reply.profile_pic}
                                    alt={reply.username}
                                    className='h-8 w-8 rounded-full object-cover'
                                  />
                                ) : (
                                  <div className='flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-border)] text-xs text-[var(--color-text-muted)]'>
                                    {reply.username.charAt(0).toUpperCase()}
                                  </div>
                                )}
                              </div>

                              <div className='flex-1'>
                                <div className='rounded-2xl bg-[var(--color-border)]/10 p-3'>
                                  <div className='flex items-baseline gap-2'>
                                    <span className='text-sm font-medium text-[var(--color-text-primary)]'>
                                      {reply.username}
                                    </span>
                                    <span className='text-xs text-[var(--color-text-muted)]'>
                                      {new Date(reply.created_at).toLocaleString()}
                                    </span>
                                  </div>

                                  {editing === reply.id ? (
                                    <div className='mt-2'>
                                      <textarea
                                        value={editContent}
                                        onChange={(event) => setEditContent(event.target.value)}
                                        className='w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3 py-2 text-sm text-[var(--color-text-primary)]'
                                        rows='2'
                                        autoFocus
                                      />
                                      <div className='mt-1 flex gap-2'>
                                        <button
                                          onClick={() => handleUpdateComment(reply.id)}
                                          className='text-xs text-[var(--color-primary)]'
                                        >
                                          Save
                                        </button>
                                        <button onClick={() => setEditing(null)} className='text-xs text-[var(--color-text-muted)]'>
                                          Cancel
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <p className='mt-1 text-sm text-[var(--color-text-secondary)]'>
                                      {reply.content}
                                    </p>
                                  )}
                                </div>

                                {reply.user_id === user?.id && (
                                  <div className='ml-1 mt-1 flex gap-3'>
                                    <button
                                      onClick={() => {
                                        setEditing(reply.id);
                                        setEditContent(reply.content);
                                      }}
                                      className='text-xs text-[var(--color-text-muted)] hover:text-[var(--color-primary)]'
                                    >
                                      Edit
                                    </button>
                                    <button
                                      onClick={() => handleDeleteComment(reply.id)}
                                      className='text-xs text-[var(--color-danger)]'
                                    >
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

        <div className='border-t border-[var(--color-border)] bg-[var(--color-surface)] p-4'>
          {replyTo && (
            <div className='mb-2 flex items-center justify-between text-sm text-[var(--color-text-muted)]'>
              <span>Replying to {replyTo.username}</span>
              <button onClick={() => setReplyTo(null)} className='text-[var(--color-danger)] hover:underline'>
                Cancel
              </button>
            </div>
          )}

          <form onSubmit={handleSubmitComment} className='flex gap-3'>
            <div className='flex-shrink-0'>
              {user?.profile ? (
                <img
                  src={user.profile}
                  alt={user.username}
                  className='h-10 w-10 rounded-full object-cover'
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
                className='w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-input-bg)] px-4 py-2 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20'
                rows='2'
              />

              <div className='mt-2 flex justify-end'>
                <button
                  type='submit'
                  disabled={submitting || !newComment.trim()}
                  className='rounded-lg bg-[var(--color-primary)] px-4 py-1.5 text-sm text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-50'
                >
                  {submitting ? <SpinnerIcon /> : 'Post'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
