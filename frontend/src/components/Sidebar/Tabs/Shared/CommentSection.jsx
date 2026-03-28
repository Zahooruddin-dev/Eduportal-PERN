import { useState, useEffect } from 'react';
import { useAuth } from '../../../../context/AuthContext';
import {
  getResourceComments,
  createResourceComment,
  updateResourceComment,
  deleteResourceComment,
} from '../../../../api/api';
import { SpinnerIcon, AlertBox } from '../../../Icons/Icon';

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

  const fetchComments = async () => {
    setLoading(true);
    try {
      const res = await getResourceComments(classId, resourceId);
      setComments(res.data);
    } catch (err) {
      setError('Failed to load comments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComments();
  }, [classId, resourceId]);

  const handleSubmitComment = async (e) => {
    e.preventDefault();
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
      fetchComments();
      setSuccess('Comment added');
    } catch (err) {
      setError('Failed to post comment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateComment = async (commentId) => {
    if (!editContent.trim()) return;
    try {
      await updateResourceComment(classId, resourceId, commentId, { content: editContent });
      setEditing(null);
      fetchComments();
      setSuccess('Comment updated');
    } catch (err) {
      setError('Failed to update comment');
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm('Delete this comment?')) return;
    try {
      await deleteResourceComment(classId, resourceId, commentId);
      fetchComments();
      setSuccess('Comment deleted');
    } catch (err) {
      setError('Failed to delete comment');
    }
  };

  // Build nested structure
  const commentMap = new Map();
  const rootComments = [];
  comments.forEach(comment => {
    commentMap.set(comment.id, { ...comment, replies: [] });
  });
  comments.forEach(comment => {
    if (comment.parent_comment_id) {
      const parent = commentMap.get(comment.parent_comment_id);
      if (parent) parent.replies.push(commentMap.get(comment.id));
    } else {
      rootComments.push(commentMap.get(comment.id));
    }
  });

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] max-w-2xl w-full max-h-[80vh] flex items-center justify-center">
          <SpinnerIcon />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] max-w-2xl w-full max-h-[80vh] flex flex-col shadow-xl">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-[var(--color-border)]">
          <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">
            Comments
          </h2>
          <button
            onClick={onClose}
            className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {error && <AlertBox message={error} />}
          {success && (
            <div className="text-sm text-green-600 text-center">{success}</div>
          )}

          {rootComments.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-[var(--color-text-muted)]">No comments yet. Be the first!</p>
            </div>
          ) : (
            rootComments.map(comment => (
              <div key={comment.id} className="space-y-3">
                {/* Parent comment */}
                <div className="flex gap-3">
                  {/* Avatar */}
                  <div className="flex-shrink-0">
                    {comment.profile_pic ? (
                      <img
                        src={comment.profile_pic}
                        alt={comment.username}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-[var(--color-primary)]/20 flex items-center justify-center text-[var(--color-primary)] font-medium">
                        {comment.username.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  {/* Content */}
                  <div className="flex-1">
                    <div className="bg-[var(--color-border)]/20 rounded-2xl p-3">
                      <div className="flex items-baseline gap-2">
                        <span className="font-semibold text-[var(--color-text-primary)]">
                          {comment.username}
                        </span>
                        <span className="text-xs text-[var(--color-text-muted)]">
                          {new Date(comment.created_at).toLocaleString()}
                          {comment.updated_at !== comment.created_at && ' (edited)'}
                        </span>
                      </div>
                      {editing === comment.id ? (
                        <div className="mt-2">
                          <textarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3 py-2 text-sm"
                            rows="2"
                            autoFocus
                          />
                          <div className="flex gap-2 mt-1">
                            <button
                              onClick={() => handleUpdateComment(comment.id)}
                              className="text-xs text-[var(--color-primary)]"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditing(null)}
                              className="text-xs text-[var(--color-text-muted)]"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-[var(--color-text-secondary)] mt-1">
                          {comment.content}
                        </p>
                      )}
                    </div>
                    {/* Actions */}
                    <div className="flex gap-3 mt-1 ml-1">
                      <button
                        onClick={() => setReplyTo(comment)}
                        className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-primary)]"
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
                            className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-primary)]"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteComment(comment.id)}
                            className="text-xs text-red-500"
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Replies */}
                {comment.replies.length > 0 && (
                  <div className="ml-12 space-y-3">
                    {comment.replies.map(reply => (
                      <div key={reply.id} className="flex gap-3">
                        {/* Avatar */}
                        <div className="flex-shrink-0">
                          {reply.profile_pic ? (
                            <img
                              src={reply.profile_pic}
                              alt={reply.username}
                              className="w-8 h-8 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-[var(--color-border)] flex items-center justify-center text-[var(--color-text-muted)] text-xs">
                              {reply.username.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        {/* Content */}
                        <div className="flex-1">
                          <div className="bg-[var(--color-border)]/10 rounded-2xl p-3">
                            <div className="flex items-baseline gap-2">
                              <span className="font-medium text-[var(--color-text-primary)] text-sm">
                                {reply.username}
                              </span>
                              <span className="text-xs text-[var(--color-text-muted)]">
                                {new Date(reply.created_at).toLocaleString()}
                              </span>
                            </div>
                            {editing === reply.id ? (
                              <div className="mt-2">
                                <textarea
                                  value={editContent}
                                  onChange={(e) => setEditContent(e.target.value)}
                                  className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3 py-2 text-sm"
                                  rows="2"
                                />
                                <div className="flex gap-2 mt-1">
                                  <button
                                    onClick={() => handleUpdateComment(reply.id)}
                                    className="text-xs text-[var(--color-primary)]"
                                  >
                                    Save
                                  </button>
                                  <button
                                    onClick={() => setEditing(null)}
                                    className="text-xs text-[var(--color-text-muted)]"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <p className="text-[var(--color-text-secondary)] text-sm mt-1">
                                {reply.content}
                              </p>
                            )}
                          </div>
                          <div className="flex gap-3 mt-1 ml-1">
                            {reply.user_id === user?.id && (
                              <>
                                <button
                                  onClick={() => {
                                    setEditing(reply.id);
                                    setEditContent(reply.content);
                                  }}
                                  className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-primary)]"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleDeleteComment(reply.id)}
                                  className="text-xs text-red-500"
                                >
                                  Delete
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Comment Form */}
        <div className="p-4 border-t border-[var(--color-border)] bg-[var(--color-surface)]">
          {replyTo && (
            <div className="flex justify-between items-center mb-2 text-sm text-[var(--color-text-muted)]">
              <span>Replying to {replyTo.username}</span>
              <button
                onClick={() => setReplyTo(null)}
                className="text-red-500 hover:underline"
              >
                Cancel
              </button>
            </div>
          )}
          <form onSubmit={handleSubmitComment} className="flex gap-3">
            {/* User avatar */}
            <div className="flex-shrink-0">
              {user?.profile ? (
                <img
                  src={user.profile}
                  alt={user.username}
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-[var(--color-primary)]/20 flex items-center justify-center text-[var(--color-primary)] font-medium">
                  {user?.username?.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div className="flex-1">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Write a comment..."
                className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-input-bg)] px-4 py-2 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
                rows="2"
              />
              <div className="flex justify-end mt-2">
                <button
                  type="submit"
                  disabled={submitting || !newComment.trim()}
                  className="px-4 py-1.5 bg-[var(--color-primary)] text-white rounded-lg text-sm hover:bg-[var(--color-primary-hover)] disabled:opacity-50 transition-colors"
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