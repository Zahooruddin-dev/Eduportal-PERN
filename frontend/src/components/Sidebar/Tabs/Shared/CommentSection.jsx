import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getResourceComments, createResourceComment, updateResourceComment, deleteResourceComment } from '../../api/api';
import { SpinnerIcon, AlertBox } from '../Icons/Icon';

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
        setError('');
        setSuccess('');
        try {
            await createResourceComment(classId, resourceId, { content: newComment, parentCommentId: replyTo?.id });
            setNewComment('');
            setReplyTo(null);
            fetchComments();
            setSuccess('Comment added');
        } catch (err) {
            setError('Failed to post comment');
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

    if (loading) return <div className="p-4 flex justify-center"><SpinnerIcon /></div>;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] max-w-2xl w-full max-h-[80vh] flex flex-col">
                <div className="flex justify-between items-center p-4 border-b border-[var(--color-border)]">
                    <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">Comments</h2>
                    <button onClick={onClose} className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]">✕</button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {error && <AlertBox message={error} />}
                    {success && <div className="text-sm text-green-600">{success}</div>}
                    {rootComments.length === 0 ? (
                        <p className="text-[var(--color-text-muted)] text-center">No comments yet. Be the first!</p>
                    ) : (
                        rootComments.map(comment => (
                            <div key={comment.id} className="border-l-2 border-[var(--color-primary)] pl-3">
                                <div className="flex items-start gap-2">
                                    <div className="w-8 h-8 rounded-full bg-[var(--color-primary)]/20 flex items-center justify-center text-[var(--color-primary)] text-sm">
                                        {comment.username.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-baseline gap-2">
                                            <span className="font-medium text-[var(--color-text-primary)]">{comment.username}</span>
                                            <span className="text-xs text-[var(--color-text-muted)]">
                                                {new Date(comment.created_at).toLocaleString()}
                                                {comment.updated_at !== comment.created_at && ' (edited)'}
                                            </span>
                                        </div>
                                        {editing === comment.id ? (
                                            <div className="mt-1">
                                                <textarea
                                                    value={editContent}
                                                    onChange={(e) => setEditContent(e.target.value)}
                                                    className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-input-bg)] p-2 text-sm"
                                                    rows="2"
                                                />
                                                <div className="flex gap-2 mt-1">
                                                    <button onClick={() => handleUpdateComment(comment.id)} className="text-xs text-[var(--color-primary)]">Save</button>
                                                    <button onClick={() => setEditing(null)} className="text-xs text-[var(--color-text-muted)]">Cancel</button>
                                                </div>
                                            </div>
                                        ) : (
                                            <p className="text-sm text-[var(--color-text-secondary)] mt-1">{comment.content}</p>
                                        )}
                                        {!editing && (
                                            <div className="flex gap-3 mt-1">
                                                <button onClick={() => setReplyTo(comment)} className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-primary)]">Reply</button>
                                                {comment.user_id === user?.id && (
                                                    <>
                                                        <button onClick={() => { setEditing(comment.id); setEditContent(comment.content); }} className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-primary)]">Edit</button>
                                                        <button onClick={() => handleDeleteComment(comment.id)} className="text-xs text-red-500">Delete</button>
                                                    </>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                {comment.replies.length > 0 && (
                                    <div className="ml-8 mt-2 space-y-2">
                                        {comment.replies.map(reply => (
                                            <div key={reply.id} className="flex items-start gap-2">
                                                <div className="w-6 h-6 rounded-full bg-[var(--color-border)] flex items-center justify-center text-xs">
                                                    {reply.username.charAt(0).toUpperCase()}
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex items-baseline gap-2">
                                                        <span className="font-medium text-[var(--color-text-primary)] text-sm">{reply.username}</span>
                                                        <span className="text-xs text-[var(--color-text-muted)]">{new Date(reply.created_at).toLocaleString()}</span>
                                                    </div>
                                                    <p className="text-xs text-[var(--color-text-secondary)]">{reply.content}</p>
                                                    {reply.user_id === user?.id && (
                                                        <div className="flex gap-3 mt-1">
                                                            <button onClick={() => { setEditing(reply.id); setEditContent(reply.content); }} className="text-xs text-[var(--color-text-muted)]">Edit</button>
                                                            <button onClick={() => handleDeleteComment(reply.id)} className="text-xs text-red-500">Delete</button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                    {replyTo && (
                        <div className="bg-[var(--color-border)]/20 p-2 rounded-lg flex justify-between items-center">
                            <span className="text-sm text-[var(--color-text-muted)]">Replying to {replyTo.username}</span>
                            <button onClick={() => setReplyTo(null)} className="text-xs text-red-500">Cancel</button>
                        </div>
                    )}
                    <form onSubmit={handleSubmitComment} className="mt-4">
                        <textarea
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            placeholder="Write a comment..."
                            className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3.5 py-2.5 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)]"
                            rows="2"
                        />
                        <div className="flex justify-end mt-2">
                            <button type="submit" className="px-4 py-1 bg-[var(--color-primary)] text-white rounded-lg text-sm">Post</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}