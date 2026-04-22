import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../../../../../context/useAuth';
import {
  getStudentEnrolledShedule,
  getClassResources,
  getMyResourceProgress,
  trackResourceProgress,
} from '../../../../../api/api';
import { SpinnerIcon } from '../../../../Icons/Icon';
import { FileText, ExternalLink, Link as LinkIcon, ChevronDown, MessageSquare, Download, Clock, PlayCircle } from 'lucide-react';
import FileViewerModal from '../../../../FileViewerModal/FileViewerModal';
import CommentSection from '../../Shared/CommentSection';
import { getFileViewUrl } from '../../../../../utils/fileUtils';

let youtubeApiLoader = null;

function extractYouTubeVideoId(url) {
  const text = String(url || '').trim();
  if (!text) return null;

  const directMatch = text.match(/^[a-zA-Z0-9_-]{11}$/);
  if (directMatch) return directMatch[0];

  try {
    const parsed = new URL(text);
    const host = parsed.hostname.replace(/^www\./, '').toLowerCase();
    if (host === 'youtu.be') {
      const pathId = parsed.pathname.split('/').filter(Boolean)[0];
      return /^[a-zA-Z0-9_-]{11}$/.test(pathId || '') ? pathId : null;
    }
    if (host.includes('youtube.com')) {
      const queryId = parsed.searchParams.get('v');
      if (queryId && /^[a-zA-Z0-9_-]{11}$/.test(queryId)) return queryId;
      const parts = parsed.pathname.split('/').filter(Boolean);
      if ((parts[0] === 'embed' || parts[0] === 'shorts') && /^[a-zA-Z0-9_-]{11}$/.test(parts[1] || '')) {
        return parts[1];
      }
    }
  } catch {
    return null;
  }

  return null;
}

function loadYouTubeApi() {
  if (typeof window === 'undefined') return Promise.reject(new Error('Window unavailable'));
  if (window.YT && typeof window.YT.Player === 'function') {
    return Promise.resolve(window.YT);
  }

  if (!youtubeApiLoader) {
    youtubeApiLoader = new Promise((resolve, reject) => {
      const previousReady = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (typeof previousReady === 'function') previousReady();
        resolve(window.YT);
      };

      const existingScript = document.querySelector('script[src="https://www.youtube.com/iframe_api"]');
      if (!existingScript) {
        const script = document.createElement('script');
        script.src = 'https://www.youtube.com/iframe_api';
        script.async = true;
        script.onerror = () => reject(new Error('Unable to load YouTube API'));
        document.head.appendChild(script);
      }
    });
  }

  return youtubeApiLoader;
}

function formatDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString();
}

function toTimestamp(value, fallback = 0) {
  if (!value) return fallback;
  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? fallback : timestamp;
}

function YouTubeProgressPlayer({
  classId,
  resource,
  savedProgress,
  onProgressChange,
}) {
  const containerRef = useRef(null);
  const playerRef = useRef(null);
  const timerRef = useRef(null);
  const lastSentTimeRef = useRef(0);
  const [syncing, setSyncing] = useState(false);

  const videoId = useMemo(
    () => resource.youtube_video_id || extractYouTubeVideoId(resource.content),
    [resource.youtube_video_id, resource.content],
  );

  const pushProgress = useCallback(async (force = false) => {
    const player = playerRef.current;
    if (!player || typeof player.getDuration !== 'function') return;

    const duration = Number(player.getDuration());
    const currentTime = Number(player.getCurrentTime());

    if (!Number.isFinite(duration) || duration <= 0 || !Number.isFinite(currentTime) || currentTime < 0) {
      return;
    }

    if (!force && Math.abs(currentTime - lastSentTimeRef.current) < 5) {
      return;
    }

    setSyncing(true);
    try {
      const res = await trackResourceProgress(classId, resource.id, {
        watchedSeconds: currentTime,
        currentTimeSeconds: currentTime,
        durationSeconds: duration,
      });
      lastSentTimeRef.current = currentTime;
      const progressPercent = Number(res.data?.progressPercent || 0);
      const thresholdReached = Boolean(res.data?.thresholdReached);
      onProgressChange(resource.id, {
        progressPercent,
        thresholdReached,
      });
    } catch (err) {
      const _ignored = err;
      void _ignored;
    } finally {
      setSyncing(false);
    }
  }, [classId, onProgressChange, resource.id]);

  useEffect(() => {
    if (!videoId || !containerRef.current) return undefined;

    let mounted = true;

    loadYouTubeApi()
      .then(() => {
        if (!mounted || !containerRef.current) return;

        playerRef.current = new window.YT.Player(containerRef.current, {
          videoId,
          playerVars: {
            rel: 0,
            modestbranding: 1,
          },
          events: {
            onReady: (event) => {
              const seekSeconds = Number(savedProgress?.progressPercent || 0);
              const duration = Number(event.target.getDuration());
              if (duration > 0 && seekSeconds > 0) {
                const target = Math.max(0, Math.min(duration - 1, (seekSeconds / 100) * duration));
                if (target > 0) event.target.seekTo(target, true);
              }
            },
            onStateChange: (event) => {
              const playerState = window.YT?.PlayerState;
              if (!playerState) return;

              if (event.data === playerState.PLAYING) {
                if (timerRef.current) window.clearInterval(timerRef.current);
                timerRef.current = window.setInterval(() => {
                  pushProgress(false);
                }, 10000);
              }

              if (
                event.data === playerState.PAUSED ||
                event.data === playerState.ENDED ||
                event.data === playerState.BUFFERING
              ) {
                if (timerRef.current) {
                  window.clearInterval(timerRef.current);
                  timerRef.current = null;
                }
                pushProgress(true);
              }
            },
          },
        });
      })
      .catch(() => null);

    return () => {
      mounted = false;
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (playerRef.current && typeof playerRef.current.destroy === 'function') {
        playerRef.current.destroy();
        playerRef.current = null;
      }
    };
  }, [videoId, savedProgress?.progressPercent, pushProgress]);

  if (!videoId) {
    return (
      <a
        href={resource.content}
        target='_blank'
        rel='noopener noreferrer'
        className='inline-flex items-center gap-2 rounded-lg border-2 border-[var(--color-primary)] bg-[var(--color-primary)]/5 px-4 py-2.5 text-sm font-bold text-[var(--color-primary)] transition hover:bg-[var(--color-primary)]/15 md:rounded-xl md:px-5'
      >
        <PlayCircle size={18} />
        Open Video
      </a>
    );
  }

  const progressPercent = Number(savedProgress?.progressPercent || 0);

  return (
    <div className='w-full space-y-2'>
      <div className='aspect-video w-full overflow-hidden rounded-xl border border-[var(--color-border)] bg-black'>
        <div ref={containerRef} className='h-full w-full' />
      </div>
      <div className='flex items-center justify-between text-xs'>
        <span className='font-semibold text-[var(--color-text-secondary)]'>Watched {progressPercent.toFixed(2)}%</span>
        <span className={`font-semibold ${savedProgress?.thresholdReached ? 'text-[var(--color-success)]' : 'text-[var(--color-text-muted)]'}`}>
          {savedProgress?.thresholdReached ? 'Attendance eligible' : 'Need 25% for attendance'}
        </span>
      </div>
      <div className='h-2 overflow-hidden rounded-full bg-[var(--color-border)]'>
        <div className='h-full bg-[var(--color-primary)]' style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }} />
      </div>
      {syncing && <p className='text-xs text-[var(--color-text-muted)]'>Syncing progress...</p>}
    </div>
  );
}

export default function StudentCourseMaterial() {
  const { user } = useAuth();
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingResources, setLoadingResources] = useState(false);
  const [error, setError] = useState('');
  const [viewingFile, setViewingFile] = useState(null);
  const [showCommentsFor, setShowCommentsFor] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedTag, setSelectedTag] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [downloadingAll, setDownloadingAll] = useState(false);
  const [resourceProgress, setResourceProgress] = useState({});

  const selectedClass = useMemo(
    () => classes.find((classItem) => classItem.id === selectedClassId) || null,
    [classes, selectedClassId],
  );

  const availableTags = useMemo(() => {
    const tags = new Set();
    resources.forEach((resource) => {
      (resource.tags || []).forEach((tag) => {
        const normalized = String(tag || '').trim();
        if (normalized) tags.add(normalized);
      });
    });
    return [...tags].sort((a, b) => a.localeCompare(b));
  }, [resources]);

  const availableCategories = useMemo(() => {
    const categories = new Set();
    resources.forEach((resource) => {
      const category = String(resource.material_category || '').trim();
      if (category) categories.add(category);
    });
    return [...categories].sort((a, b) => a.localeCompare(b));
  }, [resources]);

  const filteredResources = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    let next = [...resources];

    if (query) {
      next = next.filter((resource) => {
        const haystack = [
          resource.title,
          resource.description,
          resource.content,
          ...(resource.tags || []),
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return haystack.includes(query);
      });
    }

    if (selectedTag !== 'all') {
      next = next.filter((resource) =>
        (resource.tags || []).some(
          (tag) => String(tag).toLowerCase() === selectedTag.toLowerCase(),
        ),
      );
    }

    if (selectedCategory !== 'all') {
      next = next.filter(
        (resource) => String(resource.material_category || '').toLowerCase() === selectedCategory.toLowerCase(),
      );
    }

    next.sort((a, b) => {
      if (sortBy === 'oldest') {
        return toTimestamp(a.created_at) - toTimestamp(b.created_at);
      }
      if (sortBy === 'expiring') {
        const aExpiry = toTimestamp(a.expires_at, Number.POSITIVE_INFINITY);
        const bExpiry = toTimestamp(b.expires_at, Number.POSITIVE_INFINITY);
        if (aExpiry !== bExpiry) return aExpiry - bExpiry;
        return toTimestamp(b.created_at) - toTimestamp(a.created_at);
      }
      return toTimestamp(b.created_at) - toTimestamp(a.created_at);
    });

    return next;
  }, [resources, searchQuery, selectedTag, selectedCategory, sortBy]);

  useEffect(() => {
    if (selectedTag !== 'all' && !availableTags.includes(selectedTag)) {
      setSelectedTag('all');
    }
  }, [availableTags, selectedTag]);

  useEffect(() => {
    if (selectedCategory !== 'all' && !availableCategories.includes(selectedCategory)) {
      setSelectedCategory('all');
    }
  }, [availableCategories, selectedCategory]);

  const handleProgressChange = useCallback((resourceId, progress) => {
    setResourceProgress((current) => ({
      ...current,
      [resourceId]: {
        progressPercent: Number(progress?.progressPercent || 0),
        thresholdReached: Boolean(progress?.thresholdReached),
      },
    }));
  }, []);

  const loadResourceProgress = useCallback(async (classId, resourceItems) => {
    const youtubeResources = (resourceItems || []).filter((item) => item.type === 'youtube');
    if (youtubeResources.length === 0) {
      setResourceProgress({});
      return;
    }

    const entries = await Promise.all(
      youtubeResources.map(async (item) => {
        try {
          const res = await getMyResourceProgress(classId, item.id);
          return [
            item.id,
            {
              progressPercent: Number(res.data?.progressPercent || 0),
              thresholdReached: Boolean(res.data?.thresholdReached),
            },
          ];
        } catch {
          return [item.id, { progressPercent: 0, thresholdReached: false }];
        }
      }),
    );

    setResourceProgress(Object.fromEntries(entries));
  }, []);

  const fetchResourcesForClass = useCallback(async (classId) => {
    if (!classId) {
      setResources([]);
      setResourceProgress({});
      return;
    }

    setLoadingResources(true);
    setError('');
    try {
      const res = await getClassResources(classId);
      const nextResources = res.data || [];
      setResources(nextResources);
      await loadResourceProgress(classId, nextResources);
    } catch {
      setError('Failed to load resources for this class.');
      setResources([]);
      setResourceProgress({});
    } finally {
      setLoadingResources(false);
    }
  }, [loadResourceProgress]);

  useEffect(() => {
    if (!user?.id) return;

    const fetchClasses = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await getStudentEnrolledShedule(user.id);
        const enrolledClasses = res.data || [];
        setClasses(enrolledClasses);

        if (enrolledClasses.length > 0) {
          const firstClassId = enrolledClasses[0].id;
          setSelectedClassId(firstClassId);
          await fetchResourcesForClass(firstClassId);
        } else {
          setSelectedClassId('');
          setResources([]);
        }
      } catch {
        setError('Failed to load enrolled classes.');
      } finally {
        setLoading(false);
      }
    };

    fetchClasses();
  }, [user?.id, fetchResourcesForClass]);

  const handleClassChange = async (event) => {
    const nextClassId = event.target.value;
    setSelectedClassId(nextClassId);
    await fetchResourcesForClass(nextClassId);
  };

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
    } catch (err) {
      console.error('Download failed:', err);
    }
  };

  const handleDownloadAll = async () => {
    if (filteredResources.length === 0) return;
    setDownloadingAll(true);
    try {
      for (const resource of filteredResources) {
        if (resource.type === 'file') {
          const fileUrl = getFileViewUrl(resource.content);
          const fileName = `${resource.title}`.replace(/[^a-z0-9]/gi, '_').toLowerCase();
          await downloadFile(fileUrl, fileName);
          // Small delay between downloads to avoid browser blocking
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }
    } catch (err) {
      console.error('Download all failed:', err);
    } finally {
      setDownloadingAll(false);
    }
  };

  if (loading) {
    return (
      <div className='flex h-64 items-center justify-center'>
        <SpinnerIcon />
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-[var(--color-bg-primary)] p-3 sm:p-4 md:p-6'>
      <div className='mx-auto max-w-6xl'>
        {/* Header */}
        <header className='mb-6 border-b-2 border-[var(--color-primary)]/20 pb-6 md:mb-8 md:pb-8'>
          <div className='flex items-center gap-3 md:gap-4'>
            <div className='rounded-xl bg-[var(--color-primary)]/10 p-3 md:rounded-2xl md:p-4'>
              <span className='text-2xl font-bold text-[var(--color-primary)] md:text-3xl'>Cs</span>
            </div>
            <div>
              <h1 className='text-2xl font-bold text-[var(--color-text-primary)] md:text-4xl'>Course Materials</h1>
              <p className='mt-1 text-sm text-[var(--color-text-muted)] md:text-base'>
                Access all files and resources shared by your instructors
              </p>
            </div>
          </div>
        </header>

        {/* Error Alert */}
        {error && (
          <div
            role='alert'
            className='mb-4 rounded-xl border border-[var(--color-danger)]/40 bg-[var(--color-danger)]/10 px-4 py-3 text-sm text-[var(--color-danger)] md:rounded-2xl md:px-5 md:py-4'
          >
            {error}
          </div>
        )}

        {/* No Classes State */}
        {classes.length === 0 ? (
          <div className='rounded-2xl border-2 border-dashed border-[var(--color-border)] bg-gradient-to-br from-[var(--color-surface)] to-[var(--color-surface)]/50 p-8 text-center md:p-12'>
            <div className='mb-4 inline-block rounded-2xl bg-[var(--color-primary)]/10 p-4'>
              <span className='text-5xl font-bold text-[var(--color-primary)]'>Cs</span>
            </div>
            <p className='text-lg font-semibold text-[var(--color-text-primary)]'>
              No Courses Yet
            </p>
            <p className='mt-2 text-[var(--color-text-muted)]'>
              You are not enrolled in any classes yet. Admin will add you to classes soon!
            </p>
          </div>
        ) : (
          <>
            {/* Class Selection and Info */}
            <div className='mb-6 space-y-4 md:mb-8'>
              {/* Class Selector */}
              <div className='rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm transition hover:shadow-md md:rounded-2xl md:p-5'>
                <label
                  htmlFor='student-resource-class-selector'
                  className='mb-2 block text-xs font-bold uppercase tracking-widest text-[var(--color-text-muted)]'
                >
                  Select Your Course
                </label>
                <div className='relative'>
                  <select
                    id='student-resource-class-selector'
                    value={selectedClassId}
                    onChange={handleClassChange}
                    className='w-full appearance-none rounded-lg border-2 border-[var(--color-border)] bg-[var(--color-input-bg)] px-4 py-3 text-sm font-semibold text-[var(--color-text-primary)] outline-none transition focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20 md:rounded-xl md:px-5 md:py-3'
                  >
                    {classes.map((classItem) => (
                      <option key={classItem.id} value={classItem.id}>
                        {classItem.class_name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={20}
                    className='pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-primary)]'
                    aria-hidden='true'
                  />
                </div>
              </div>

              {/* Teacher Info Card */}
              {selectedClass && (
                <div className='rounded-xl border-2 border-[var(--color-primary)]/30 bg-gradient-to-br from-[var(--color-primary)]/8 via-[var(--color-surface)] to-[var(--color-primary)]/8 p-4 shadow-md md:rounded-2xl md:p-6'>
                  <h3 className='mb-4 text-sm font-bold uppercase tracking-widest text-[var(--color-text-muted)]'>
                    Course Instructor
                  </h3>
                  <div className='flex flex-col items-center gap-4 md:flex-row md:items-center md:gap-6'>
                    {/* Avatar Section */}
                    <div className='relative'>
                      {selectedClass.teacher_profile_pic ? (
                        <img
                          src={selectedClass.teacher_profile_pic}
                          alt={selectedClass.teacher_name}
                          className='h-20 w-20 rounded-full object-cover ring-4 ring-[var(--color-primary)]/40 shadow-lg md:h-24 md:w-24'
                        />
                      ) : (
                        <div className='flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-primary)]/80 text-2xl font-bold text-white ring-4 ring-[var(--color-primary)]/40 shadow-lg md:h-24 md:w-24 md:text-3xl'>
                          {selectedClass.teacher_name?.[0]?.toUpperCase() || '?'}
                        </div>
                      )}
                      <div className='absolute bottom-0 right-0 h-6 w-6 rounded-full border-2 border-[var(--color-surface)] bg-green-500 md:h-7 md:w-7'></div>
                    </div>
                    
                    {/* Teacher Info */}
                    <div className='flex-1 text-center md:text-left'>
                      <p className='text-lg font-bold text-[var(--color-text-primary)] md:text-2xl'>
                        {selectedClass.teacher_name || 'Instructor'}
                      </p>
                      <p className='mt-1 text-sm font-medium text-[var(--color-primary)] md:text-base'>
                        {selectedClass.subject || 'Subject'}
                      </p>
                      <p className='mt-2 text-xs text-[var(--color-text-muted)] md:text-sm'>
                        Room {selectedClass.room_number || 'TBA'} • Grade {selectedClass.grade_level || 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Class Stats Grid */}
              <div className='grid grid-cols-2 gap-3 md:grid-cols-5 md:gap-4'>
                <div className='rounded-xl border-2 border-[var(--color-border)] bg-gradient-to-br from-[var(--color-primary)]/5 to-transparent p-4 text-center shadow-sm transition hover:border-[var(--color-primary)]/50 hover:shadow-md md:rounded-2xl md:p-5'>
                  <p className='text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]'>Course Name</p>
                  <p className='mt-2 truncate text-sm font-bold text-[var(--color-primary)] md:text-base'>
                    {selectedClass?.class_name || '-'}
                  </p>
                </div>

                <div className='rounded-xl border-2 border-[var(--color-border)] bg-gradient-to-br from-blue-500/5 to-transparent p-4 text-center shadow-sm transition hover:border-blue-500/50 hover:shadow-md md:rounded-2xl md:p-5'>
                  <p className='text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]'>Total Materials</p>
                  <p className='mt-2 text-sm font-bold text-blue-600 md:text-base'>{resources.length}</p>
                  <p className='mt-1 text-xs text-[var(--color-text-muted)]'>{filteredResources.length} shown</p>
                </div>

                <div className='rounded-xl border-2 border-[var(--color-border)] bg-gradient-to-br from-purple-500/5 to-transparent p-4 text-center shadow-sm transition hover:border-purple-500/50 hover:shadow-md md:rounded-2xl md:p-5'>
                  <p className='text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]'>Files</p>
                  <p className='mt-2 text-sm font-bold text-purple-600 md:text-base'>
                    {resources.filter(r => r.type === 'file').length}
                  </p>
                  <p className='mt-1 text-xs text-[var(--color-text-muted)]'>downloadable</p>
                </div>

                <div className='rounded-xl border-2 border-[var(--color-border)] bg-gradient-to-br from-red-500/5 to-transparent p-4 text-center shadow-sm transition hover:border-red-500/50 hover:shadow-md md:rounded-2xl md:p-5'>
                  <p className='text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]'>Videos</p>
                  <p className='mt-2 text-sm font-bold text-red-600 md:text-base'>
                    {resources.filter(r => r.type === 'youtube').length}
                  </p>
                  <p className='mt-1 text-xs text-[var(--color-text-muted)]'>watch & track</p>
                </div>

                <div className='rounded-xl border-2 border-[var(--color-border)] bg-gradient-to-br from-green-500/5 to-transparent p-4 text-center shadow-sm transition hover:border-green-500/50 hover:shadow-md md:rounded-2xl md:p-5'>
                  <p className='text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]'>Links</p>
                  <p className='mt-2 text-sm font-bold text-green-600 md:text-base'>
                    {resources.filter(r => r.type === 'link').length}
                  </p>
                  <p className='mt-1 text-xs text-[var(--color-text-muted)]'>external</p>
                </div>
              </div>

              {/* Additional Course Info */}
              <div className='grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4'>
                <div className='rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm md:rounded-2xl md:p-5'>
                  <p className='text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]'>Last Updated</p>
                  <p className='mt-2 text-sm font-semibold text-[var(--color-text-primary)]'>
                    {resources.length > 0
                      ? formatDate(
                          resources.reduce((latest, r) =>
                            new Date(r.created_at) > new Date(latest.created_at)
                              ? r
                              : latest
                          ).created_at
                        )
                      : 'No updates yet'}
                  </p>
                </div>

                <div className='rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm md:rounded-2xl md:p-5'>
                  <p className='text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]'>Comments</p>
                  <p className='mt-2 text-sm font-semibold text-[var(--color-text-primary)]'>
                    {resources.reduce((sum, r) => sum + (r.comment_count || 0), 0)} total discussions
                  </p>
                </div>
              </div>
            </div>

            {/* Filters and Search */}
            <div className='mb-6 space-y-4 md:mb-8'>
              <div className='rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm transition hover:shadow-md md:rounded-2xl md:p-5'>
                <h3 className='mb-4 text-sm font-bold uppercase tracking-widest text-[var(--color-text-muted)]'>
                  Search & Filter
                </h3>
                <div className='grid grid-cols-1 gap-3 md:grid-cols-4'>
                  {/* Search */}
                  <div>
                    <label htmlFor='student-resource-search' className='mb-2 block text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]'>
                      Search Materials
                    </label>
                    <input
                      id='student-resource-search'
                      type='text'
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                      placeholder='Type to search...'
                      className='w-full rounded-lg border-2 border-[var(--color-border)] bg-[var(--color-input-bg)] px-4 py-2.5 text-sm font-medium text-[var(--color-text-primary)] outline-none placeholder:text-[var(--color-text-muted)]/40 transition focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20 md:rounded-xl'
                    />
                  </div>

                  {/* Tag Filter */}
                  <div>
                    <label htmlFor='student-resource-tag-filter' className='mb-2 block text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]'>
                      Filter by Tag
                    </label>
                    <select
                      id='student-resource-tag-filter'
                      value={selectedTag}
                      onChange={(event) => setSelectedTag(event.target.value)}
                      className='w-full rounded-lg border-2 border-[var(--color-border)] bg-[var(--color-input-bg)] px-4 py-2.5 text-sm font-medium text-[var(--color-text-primary)] outline-none transition focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20 md:rounded-xl'
                    >
                      <option value='all'>All tags</option>
                      {availableTags.map((tag) => (
                        <option key={tag} value={tag}>
                          #{tag}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor='student-resource-category-filter' className='mb-2 block text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]'>
                      Category
                    </label>
                    <select
                      id='student-resource-category-filter'
                      value={selectedCategory}
                      onChange={(event) => setSelectedCategory(event.target.value)}
                      className='w-full rounded-lg border-2 border-[var(--color-border)] bg-[var(--color-input-bg)] px-4 py-2.5 text-sm font-medium text-[var(--color-text-primary)] outline-none transition focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20 md:rounded-xl'
                    >
                      <option value='all'>All categories</option>
                      {availableCategories.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Sort */}
                  <div>
                    <label htmlFor='student-resource-sort' className='mb-2 block text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]'>
                      Sort By
                    </label>
                    <select
                      id='student-resource-sort'
                      value={sortBy}
                      onChange={(event) => setSortBy(event.target.value)}
                      className='w-full rounded-lg border-2 border-[var(--color-border)] bg-[var(--color-input-bg)] px-4 py-2.5 text-sm font-medium text-[var(--color-text-primary)] outline-none transition focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20 md:rounded-xl'
                    >
                      <option value='newest'>Newest first</option>
                      <option value='oldest'>Oldest first</option>
                      <option value='expiring'>Expiring soon</option>
                    </select>
                  </div>
                </div>

                <div className='mt-4 flex flex-col items-center justify-between gap-3 sm:flex-row md:mt-5'>
                  <p className='text-xs font-semibold text-[var(--color-text-muted)]'>
                    Showing <span className='font-bold text-[var(--color-primary)]'>{filteredResources.length}</span> of <span className='font-bold text-[var(--color-text-primary)]'>{resources.length}</span> materials
                  </p>
                  {filteredResources.some(r => r.type === 'file') && (
                    <button
                      type='button'
                      onClick={handleDownloadAll}
                      disabled={downloadingAll}
                      className='inline-flex items-center gap-2.5 rounded-lg border-2 border-[var(--color-primary)] bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary)]/80 px-4 py-2.5 text-sm font-bold text-white shadow-lg transition hover:shadow-xl hover:scale-105 disabled:opacity-50 disabled:scale-100 md:rounded-xl md:px-5 md:py-3'
                    >
                      <Download size={18} />
                      {downloadingAll ? 'Downloading Files...' : 'Download All Files'}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Resources List */}
            {loadingResources ? (
              <div className='flex h-40 items-center justify-center rounded-xl border-2 border-dashed border-[var(--color-border)] bg-[var(--color-surface)] md:rounded-2xl'>
                <SpinnerIcon />
              </div>
            ) : resources.length === 0 ? (
              <div className='rounded-2xl border-2 border-dashed border-[var(--color-border)] bg-gradient-to-br from-[var(--color-surface)] to-[var(--color-surface)]/50 p-8 text-center md:p-12'>
                <div className='mb-4 inline-block rounded-2xl bg-[var(--color-primary)]/10 p-4'>
                  <span className='text-5xl font-bold text-[var(--color-primary)]'>∅</span>
                </div>
                <p className='text-lg font-semibold text-[var(--color-text-primary)]'>
                  No Materials Available
                </p>
                <p className='mt-2 text-[var(--color-text-muted)]'>
                  Your instructor hasn't uploaded any materials for this class yet.
                </p>
              </div>
            ) : filteredResources.length === 0 ? (
              <div className='rounded-2xl border-2 border-dashed border-[var(--color-border)] bg-gradient-to-br from-[var(--color-surface)] to-[var(--color-surface)]/50 p-8 text-center md:p-12'>
                <div className='mb-4 inline-block rounded-2xl bg-[var(--color-primary)]/10 p-4'>
                  <span className='text-5xl font-bold text-[var(--color-primary)]'>◯</span>
                </div>
                <p className='text-lg font-semibold text-[var(--color-text-primary)]'>
                  No Matches Found
                </p>
                <p className='mt-2 text-[var(--color-text-muted)]'>
                  No materials match your current search or filter criteria.
                </p>
              </div>
            ) : (
              <div className='grid gap-4 md:gap-5'>
                {filteredResources.map((resource) => (
                  <article
                    key={resource.id}
                    className='group rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm transition hover:border-[var(--color-primary)]/60 hover:shadow-lg hover:-translate-y-1 md:rounded-2xl md:p-6'
                  >
                    {/* Resource Header */}
                    <div className='flex flex-col gap-4 md:flex-row md:items-start md:justify-between'>
                      <div className='flex-1'>
                        <div className='flex items-start gap-3'>
                          <div className='mt-1 rounded-lg bg-[var(--color-primary)]/10 p-2 md:p-2.5'>
                            {resource.type === 'file' ? (
                              <FileText size={20} className='text-[var(--color-primary)]' />
                            ) : resource.type === 'youtube' ? (
                              <PlayCircle size={20} className='text-[var(--color-primary)]' />
                            ) : (
                              <LinkIcon size={20} className='text-[var(--color-primary)]' />
                            )}
                          </div>
                          <div className='flex-1'>
                            <h3 className='text-base font-bold text-[var(--color-text-primary)] md:text-lg'>
                              {resource.title}
                            </h3>
                            {resource.description && (
                              <p className='mt-1.5 line-clamp-2 text-sm text-[var(--color-text-secondary)]'>
                                {resource.description}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Tags */}
                        <div className='mt-3.5 flex flex-wrap gap-2'>
                          <span className='inline-flex items-center gap-1.5 rounded-full bg-[var(--color-primary)]/15 px-3 py-1.5 text-xs font-bold text-[var(--color-primary)]'>
                            {resource.type === 'file' ? 'File' : resource.type === 'youtube' ? 'YouTube' : 'Link'}
                          </span>

                          <span className='inline-flex items-center gap-1.5 rounded-full bg-[var(--color-border)]/70 px-3 py-1.5 text-xs font-semibold text-[var(--color-text-secondary)]'>
                            {resource.material_category || 'lecture'}
                          </span>

                          <span className='inline-flex items-center gap-1.5 rounded-full bg-[var(--color-border)]/70 px-3 py-1.5 text-xs font-semibold text-[var(--color-text-secondary)]'>
                            {resource.content_mode || 'view'}
                          </span>

                          {resource.tags?.length > 0 &&
                            resource.tags.map((tag, index) => (
                              <span
                                key={`${tag}-${index}`}
                                className='rounded-full bg-[var(--color-border)]/60 px-3 py-1.5 text-xs font-semibold text-[var(--color-text-secondary)]'
                              >
                                #{tag}
                              </span>
                            ))}
                        </div>

                        {/* Metadata */}
                        <div className='mt-3.5 flex flex-wrap gap-3 text-xs font-medium text-[var(--color-text-muted)]'>
                          <div className='flex items-center gap-1.5'>
                            <Clock size={14} className='text-[var(--color-primary)]' />
                            {formatDate(resource.created_at)}
                          </div>
                          {resource.expires_at && (
                            <div className='flex items-center gap-1.5 rounded-full bg-[var(--color-warning)]/10 px-2.5 py-1 text-[var(--color-warning)]'>
                              <Clock size={14} />
                              ⏰ Expires: {formatDate(resource.expires_at)}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className='mt-5 flex flex-wrap gap-2 md:mt-6 md:gap-3'>
                      {resource.type === 'file' ? (
                        <button
                          type='button'
                          onClick={() => {
                            setViewingFile({
                              url: getFileViewUrl(resource.content),
                              title: resource.title,
                            });
                          }}
                          className='inline-flex items-center gap-2 rounded-lg border-2 border-[var(--color-primary)] bg-[var(--color-primary)]/5 px-4 py-2.5 text-sm font-bold text-[var(--color-primary)] transition hover:bg-[var(--color-primary)]/15 hover:scale-105 md:rounded-xl md:px-5'
                        >
                          <FileText size={18} />
                          <span className='hidden sm:inline'>Preview</span>File
                        </button>
                      ) : resource.type === 'youtube' ? (
                        <div className='w-full'>
                          <YouTubeProgressPlayer
                            classId={selectedClassId}
                            resource={resource}
                            savedProgress={resourceProgress[resource.id]}
                            onProgressChange={handleProgressChange}
                          />
                        </div>
                      ) : (
                        <a
                          href={resource.content}
                          target='_blank'
                          rel='noopener noreferrer'
                          className='inline-flex items-center gap-2 rounded-lg border-2 border-[var(--color-primary)] bg-[var(--color-primary)]/5 px-4 py-2.5 text-sm font-bold text-[var(--color-primary)] transition hover:bg-[var(--color-primary)]/15 hover:scale-105 md:rounded-xl md:px-5'
                        >
                          <LinkIcon size={18} />
                          Open Link
                          <ExternalLink size={16} className='hidden sm:inline' />
                        </a>
                      )}

                      {resource.type === 'file' && (
                        <button
                          type='button'
                          onClick={() => downloadFile(getFileViewUrl(resource.content), resource.title)}
                          className='inline-flex items-center gap-2 rounded-lg border-2 border-[var(--color-text-muted)]/30 bg-[var(--color-text-muted)]/5 px-4 py-2.5 text-sm font-bold text-[var(--color-text-secondary)] transition hover:border-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 hover:text-[var(--color-primary)] hover:scale-105 md:rounded-xl md:px-5'
                        >
                          <Download size={18} />
                          <span className='hidden sm:inline'>Download</span>
                        </button>
                      )}

                      <button
                        type='button'
                        onClick={() => setShowCommentsFor(resource.id)}
                        className='ml-auto inline-flex items-center gap-2 rounded-lg border-2 border-[var(--color-text-muted)]/30 bg-[var(--color-text-muted)]/5 px-4 py-2.5 text-sm font-bold text-[var(--color-text-secondary)] transition hover:border-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 hover:scale-105 md:rounded-xl md:px-5'
                      >
                        <MessageSquare size={18} />
                        <span className='hidden sm:inline'>Comments</span>
                        <span className='rounded-full bg-[var(--color-primary)] px-2.5 py-1 text-xs font-bold text-white'>
                          {resource.comment_count ?? 0}
                        </span>
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </>
        )}

        {/* Modals */}
        {showCommentsFor && (
          <CommentSection
            classId={selectedClassId}
            resourceId={showCommentsFor}
            onClose={() => setShowCommentsFor(null)}
          />
        )}

        {viewingFile && (
          <FileViewerModal
            fileUrl={viewingFile.url}
            title={viewingFile.title}
            isOpen={Boolean(viewingFile)}
            onClose={() => setViewingFile(null)}
          />
        )}
      </div>
    </div>
  );
}
