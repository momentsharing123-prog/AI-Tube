import { CheckCircleOutline, MusicNote, NotificationsActive, VideoLibrary, Warning } from '@mui/icons-material';
import {
    Alert,
    Box,
    Button,
    Checkbox,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    FormControlLabel,
    Radio,
    RadioGroup,
    TextField,
    ToggleButton,
    ToggleButtonGroup,
    Typography,
} from '@mui/material';
import { useCallback, useEffect, useState } from 'react';
import { api } from '../utils/apiClient';

type SubscriptionMode = 'channel' | 'playlist' | 'channel-playlists';

interface ChannelSubscribeModalProps {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
    /** Pre-fill the URL field (e.g. from the header search bar) */
    initialUrl?: string;
}

const MODES: { value: SubscriptionMode; label: string; description: string }[] = [
    {
        value: 'playlist',
        label: 'This playlist only',
        description: 'Watch for new videos added to this specific playlist.',
    },
    {
        value: 'channel',
        label: 'This channel (all videos)',
        description: 'Watch for any new upload from the channel.',
    },
    {
        value: 'channel-playlists',
        label: 'All channel playlists',
        description: 'Subscribe to every playlist on the channel.',
    },
];

const ChannelSubscribeModal: React.FC<ChannelSubscribeModalProps> = ({ open, onClose, onSuccess, initialUrl = '' }) => {
    const [mode, setMode] = useState<SubscriptionMode>('playlist');
    const [url, setUrl] = useState('');
    const [collectionName, setCollectionName] = useState('');
    const [interval, setIntervalValue] = useState(60);
    const [format, setFormat] = useState<'mp4' | 'mp3'>('mp4');
    const [downloadAllPrevious, setDownloadAllPrevious] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [resolvingChannelUrl, setResolvingChannelUrl] = useState(false);
    const [resolvedChannelUrl, setResolvedChannelUrl] = useState<string | null>(null);
    const [resolvedChannelName, setResolvedChannelName] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const canSubmit = !submitting && !resolvingChannelUrl && url.trim().length > 0 && interval > 0;

    // Pre-fill URL from prop when the modal opens
    useEffect(() => {
        if (open) {
            setUrl(initialUrl);
        }
    }, [open, initialUrl]);

    /** Detect the best subscription mode for a given URL (returns null when no strong signal). */
    const detectMode = (u: string): SubscriptionMode | null => {
        try {
            const parsed = new URL(u);
            const host = parsed.hostname.replace('www.', '');
            if (host === 'youtube.com' || host === 'youtu.be') {
                const path = parsed.pathname;
                if (path.startsWith('/@') || path.startsWith('/channel/') || path.startsWith('/user/') || path.startsWith('/c/')) {
                    return 'channel';
                }
                if (parsed.searchParams.get('list')) return 'playlist';
            }
            if (host === 'bilibili.com') {
                // Bilibili space pages are channel-like
                if (parsed.pathname.startsWith('/space/')) return 'channel';
            }
        } catch {
            // ignore invalid URLs
        }
        return null;
    };

    // Auto-switch mode when the URL changes; also clear resolved channel hint
    useEffect(() => {
        setResolvedChannelUrl(null);
        setResolvedChannelName(null);
        if (!url) return;
        const detected = detectMode(url);
        if (detected) setMode(detected);
    }, [url]);

    /** Returns true when the URL looks like a video or playlist rather than a channel page. */
    const looksLikeVideoOrPlaylist = (u: string): boolean => {
        try {
            const parsed = new URL(u);
            const host = parsed.hostname.replace('www.', '');
            if (host === 'youtube.com' || host === 'youtu.be') {
                const path = parsed.pathname;
                // Already a channel URL — no need to resolve
                if (path.startsWith('/@') || path.startsWith('/channel/') || path.startsWith('/user/') || path.startsWith('/c/')) return false;
                return true; // /watch, /playlist, /shorts, etc.
            }
            if (host === 'bilibili.com') {
                return parsed.pathname.startsWith('/video/');
            }
            return false;
        } catch {
            return false;
        }
    };

    /** Resolve a channel URL from a video/playlist URL, auto-fill the url field, and store the channel name as a hint. */
    const resolveChannelUrlFromUrl = useCallback(async (sourceUrl: string) => {
        if (!sourceUrl || resolvingChannelUrl) return;
        setResolvingChannelUrl(true);
        setResolvedChannelUrl(null);
        setResolvedChannelName(null);
        try {
            const res = await api.get('/channel-url', { params: { url: sourceUrl } });
            if (res.data?.channelUrl) {
                // Only replace the URL in the textbox if it actually differs (e.g. was a video/playlist link)
                if (res.data.channelUrl !== sourceUrl) {
                    setUrl(res.data.channelUrl);
                }
                setResolvedChannelUrl(res.data.channelUrl);
                setResolvedChannelName(res.data.channelName ?? null);
                // Always update collection name with the resolved channel name
                if (res.data.channelName) {
                    setCollectionName(res.data.channelName);
                }
            }
        } catch {
            // silently ignore — user can fill manually
        } finally {
            setResolvingChannelUrl(false);
        }
    }, [resolvingChannelUrl]);

    const handleConfirm = async () => {
        setSubmitting(true);
        setError(null);
        // For channel modes use the resolved channel URL if available, else fall back to what the user typed
        const channelModeUrl = (resolvedChannelUrl || url).trim();
        try {
            if (mode === 'channel') {
                await api.post('/subscriptions', {
                    url: channelModeUrl,
                    interval,
                    format,
                    authorName: collectionName.trim() || undefined,
                    downloadAllPrevious,
                });
            } else if (mode === 'playlist') {
                await api.post('/subscriptions/playlist', {
                    playlistUrl: url.trim(),
                    interval,
                    format,
                    collectionName: collectionName.trim() || undefined,
                    downloadAll: downloadAllPrevious,
                });
            } else {
                await api.post('/subscriptions/channel-playlists', {
                    url: channelModeUrl,
                    interval,
                    format,
                    channelNameOverride: collectionName.trim() || undefined,
                    downloadAllPrevious,
                });
            }
            onSuccess();
            handleClose();
        } catch (err: any) {
            setError(err?.response?.data?.error || err?.message || 'Subscription failed. Please check the URL and try again.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleClose = () => {
        if (submitting) return;
        setUrl('');
        setCollectionName('');
        setMode('playlist');
        setIntervalValue(60);
        setFormat('mp4');
        setDownloadAllPrevious(false);
        setResolvedChannelUrl(null);
        setResolvedChannelName(null);
        setError(null);
        onClose();
    };

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            maxWidth="xs"
            fullWidth
            slotProps={{ paper: { sx: { borderRadius: 2 } } }}
        >
            <DialogTitle sx={{ pb: 1, fontWeight: 600 }}>
                Subscribe to Auto-Download
            </DialogTitle>

            <DialogContent sx={{ pt: 0 }}>
                <TextField
                    fullWidth
                    size="small"
                    label="Channel or playlist URL"
                    value={url}
                    onChange={(e) => { setUrl(e.target.value); setError(null); setResolvedChannelUrl(null); setResolvedChannelName(null); }}
                    placeholder="https://www.youtube.com/@ChannelName"
                    disabled={resolvingChannelUrl}
                    helperText="Enter a YouTube channel, playlist, video, or Bilibili space URL."
                    autoFocus
                    sx={{ mt: 1, mb: 2 }}
                />

                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    Subscription type:
                </Typography>
                <RadioGroup
                    value={mode}
                    onChange={(e) => {
                        const next = e.target.value as SubscriptionMode;
                        setMode(next);
                        setError(null);
                        // Auto-update collection name to match the selected mode's default
                        if (next === 'channel' || next === 'channel-playlists') {
                            setCollectionName(resolvedChannelName || '');
                        } else if (next === 'playlist') {
                            setCollectionName('');
                        }
                        // Resolve channel URL/name when switching to a channel mode
                        // Always run if we don't have the channel name yet
                        if ((next === 'channel' || next === 'channel-playlists') && url && !resolvedChannelName) {
                            resolveChannelUrlFromUrl(url);
                        }
                    }}
                >
                    {MODES.map((m) => (
                        <FormControlLabel
                            key={m.value}
                            value={m.value}
                            control={<Radio size="small" />}
                            label={
                                <span>
                                    <Typography variant="body2" component="span" sx={{ fontWeight: mode === m.value ? 600 : 400 }}>
                                        {m.label}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary" display="block">
                                        {m.description}
                                    </Typography>
                                </span>
                            }
                            sx={{ mb: 0.5, alignItems: 'flex-start', '& .MuiRadio-root': { pt: 0.5 } }}
                        />
                    ))}
                </RadioGroup>

                {/* Resolved channel hint */}
                {(mode === 'channel' || mode === 'channel-playlists') && (resolvingChannelUrl || resolvedChannelUrl) && (
                    <Box sx={{ mt: 1, mb: 0.5 }}>
                        {resolvingChannelUrl ? (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <CircularProgress size={14} />
                                <Typography variant="caption" color="text.secondary">
                                    Looking up channel…
                                </Typography>
                            </Box>
                        ) : resolvedChannelUrl ? (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <CheckCircleOutline sx={{ fontSize: 14, color: 'success.main' }} />
                                <Typography variant="caption" color="success.main">
                                    {resolvedChannelName ? <><strong>{resolvedChannelName}</strong> — </> : null}
                                    Auto-filled — edit if needed.
                                </Typography>
                            </Box>
                        ) : null}
                    </Box>
                )}

                <Divider sx={{ my: 2 }} />

                {/* Collection name — shown for all modes */}
                <TextField
                    fullWidth
                    size="small"
                    label="Collection name (optional)"
                    value={collectionName}
                    onChange={(e) => setCollectionName(e.target.value)}
                    placeholder={mode === 'playlist' ? 'My Playlist' : resolvedChannelName || 'My Channel'}
                    helperText={
                        mode === 'channel-playlists'
                            ? 'Used as the channel folder name for all subscribed playlists. Leave blank to skip.'
                            : 'Leave blank to skip collection.'
                    }
                    sx={{ mb: 2 }}
                />

                <Divider sx={{ my: 2 }} />

                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    Download format:
                </Typography>
                <ToggleButtonGroup
                    value={format}
                    exclusive
                    onChange={(_, val) => { if (val) setFormat(val); }}
                    size="small"
                    fullWidth
                    sx={{ mb: 2 }}
                >
                    <ToggleButton value="mp4" sx={{ gap: 0.5 }}>
                        <VideoLibrary fontSize="small" /> MP4 (Video)
                    </ToggleButton>
                    <ToggleButton value="mp3" sx={{ gap: 0.5 }}>
                        <MusicNote fontSize="small" /> MP3 (Audio)
                    </ToggleButton>
                </ToggleButtonGroup>

                <TextField
                    fullWidth
                    size="small"
                    label="Check interval (minutes)"
                    type="number"
                    value={interval}
                    onChange={(e) => setIntervalValue(Math.max(1, Number(e.target.value)))}
                    slotProps={{ htmlInput: { min: 1 } }}
                    sx={{ mb: 2 }}
                />

                <FormControlLabel
                    control={
                        <Checkbox
                            size="small"
                            checked={downloadAllPrevious}
                            onChange={(e) => setDownloadAllPrevious(e.target.checked)}
                        />
                    }
                    label={
                        <Typography variant="body2">
                            Download all previous videos now
                        </Typography>
                    }
                />

                {downloadAllPrevious && (
                    <Alert severity="warning" icon={<Warning fontSize="small" />} sx={{ mt: 1 }}>
                        <Typography variant="caption">
                            This may take a long time for large channels or playlists.
                        </Typography>
                    </Alert>
                )}

                {error && (
                    <Alert severity="error" sx={{ mt: 2 }}>
                        <Typography variant="caption">{error}</Typography>
                    </Alert>
                )}
            </DialogContent>

            <DialogActions sx={{ p: 2, pt: 1 }}>
                <Button onClick={handleClose} color="inherit" disabled={submitting}>
                    Cancel
                </Button>
                <Button
                    onClick={handleConfirm}
                    variant="contained"
                    disabled={!canSubmit}
                    startIcon={submitting ? <CircularProgress size={14} color="inherit" /> : <NotificationsActive />}
                >
                    {submitting ? 'Subscribing…' : 'Subscribe'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default ChannelSubscribeModal;
