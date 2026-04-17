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

type SubscriptionMode = 'playlist' | 'channel' | 'channel-playlists';

export interface AutoDownloadModalProps {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
    /**
     * Playlist Detected context: locks the playlist URL for playlist-mode submissions.
     * The field is shown read-only in playlist mode; switches to an editable channel URL
     * field when a channel mode is selected.
     */
    fixedPlaylistUrl?: string;
    /** Playlist title — used as the default collection name in playlist mode */
    playlistTitle?: string;
    /** Pre-fill the collection name */
    initialCollectionName?: string;
    /**
     * Pre-fill the URL field.
     * • Header context: whatever was typed in the search bar.
     * • Playlist Detected context: the pre-resolved channel URL (initialChannelUrl).
     */
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

const AutoDownloadModal: React.FC<AutoDownloadModalProps> = ({
    open,
    onClose,
    onSuccess,
    fixedPlaylistUrl,
    playlistTitle,
    initialCollectionName,
    initialUrl = '',
}) => {
    const [mode, setMode] = useState<SubscriptionMode>('playlist');
    const [url, setUrl] = useState('');
    const [resolvedChannelUrl, setResolvedChannelUrl] = useState<string | null>(null);
    const [resolvedChannelName, setResolvedChannelName] = useState<string | null>(null);
    const [collectionName, setCollectionName] = useState('');
    const [interval, setIntervalValue] = useState(60);
    const [format, setFormat] = useState<'mp4' | 'mp3'>('mp4');
    const [downloadAllPrevious, setDownloadAllPrevious] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [resolvingChannelUrl, setResolvingChannelUrl] = useState(false);
    const [resolvingPlaylistTitle, setResolvingPlaylistTitle] = useState(false);
    const [resolvedPlaylistTitle, setResolvedPlaylistTitle] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const needsChannelUrl = mode === 'channel' || mode === 'channel-playlists';
    // In playlist mode when fixedPlaylistUrl is set, show that URL (read-only)
    const displayUrl = !needsChannelUrl && fixedPlaylistUrl ? fixedPlaylistUrl : url;
    const canSubmit =
        !submitting && !resolvingChannelUrl && !resolvingPlaylistTitle && interval > 0 &&
        (needsChannelUrl ? url.trim().length > 0 : !!(fixedPlaylistUrl || url.trim()));

    // Sync state whenever the modal opens
    useEffect(() => {
        if (open) {
            setUrl(initialUrl);
            setResolvedChannelUrl(null);
            setResolvedChannelName(null);
            setResolvedPlaylistTitle(null);
            setCollectionName(initialCollectionName || playlistTitle || '');
            setMode('playlist');
            setError(null);
        }
    }, [open, initialUrl, initialCollectionName, playlistTitle]);

    /** Detect the best subscription mode for a typed URL. */
    const detectMode = (u: string): SubscriptionMode | null => {
        try {
            const parsed = new URL(u);
            const host = parsed.hostname.replace('www.', '');
            if (host === 'youtube.com' || host === 'youtu.be') {
                const path = parsed.pathname;
                if (path.startsWith('/@') || path.startsWith('/channel/') || path.startsWith('/user/') || path.startsWith('/c/'))
                    return 'channel';
                if (parsed.searchParams.get('list')) return 'playlist';
            }
            if (host === 'bilibili.com' && parsed.pathname.startsWith('/space/')) return 'channel';
        } catch { /* ignore */ }
        return null;
    };

    // Auto-switch mode when url changes (only when there's no fixed playlist URL)
    useEffect(() => {
        if (fixedPlaylistUrl) return;
        setResolvedChannelUrl(null);
        setResolvedChannelName(null);
        setResolvedPlaylistTitle(null);
        setCollectionName('');
        if (!url) return;
        const detected = detectMode(url);
        if (detected) setMode(detected);
    }, [url, fixedPlaylistUrl]);

    // Trigger channel resolution whenever the mode is a channel mode and name is not yet known
    useEffect(() => {
        if (!open) return;
        const source = fixedPlaylistUrl || url;
        if ((mode === 'channel' || mode === 'channel-playlists') && source && !resolvedChannelName && !resolvingChannelUrl) {
            resolveChannel(source);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mode, open]);

    // Auto-resolve playlist title when modal opens in playlist mode with a URL (header/subscription page context)
    useEffect(() => {
        if (!open) return;
        if (fixedPlaylistUrl) return; // Playlist Detected context already has title from prop
        if (mode !== 'playlist') return;
        if (!url) return;
        if (resolvedPlaylistTitle || resolvingPlaylistTitle) return;

        const resolve = async () => {
            setResolvingPlaylistTitle(true);
            try {
                const res = await api.get('/channel-url', { params: { url } });
                const title: string | null = res.data?.playlistTitle ?? null;
                const chName: string | null = res.data?.channelName ?? null;
                if (title) {
                    setResolvedPlaylistTitle(title);
                    setCollectionName((prev) => prev || title);
                } else if (chName) {
                    // Fallback: use channel name as title hint
                    setResolvedPlaylistTitle(chName);
                    setCollectionName((prev) => prev || chName);
                }
            } catch { /* silently ignore */ } finally {
                setResolvingPlaylistTitle(false);
            }
        };
        resolve();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, url]);

    /** Resolve channel URL + name; auto-fills url field when it changed. */
    const resolveChannel = useCallback(async (sourceUrl: string) => {
        if (!sourceUrl || resolvingChannelUrl) return;
        setResolvingChannelUrl(true);
        setResolvedChannelUrl(null);
        setResolvedChannelName(null);
        try {
            const res = await api.get('/channel-url', { params: { url: sourceUrl } });
            if (res.data?.channelUrl) {
                if (res.data.channelUrl !== sourceUrl) setUrl(res.data.channelUrl);
                setResolvedChannelUrl(res.data.channelUrl);
                setResolvedChannelName(res.data.channelName ?? null);
                if (res.data.channelName) setCollectionName(res.data.channelName);
            }
        } catch { /* silently ignore */ } finally {
            setResolvingChannelUrl(false);
        }
    }, [resolvingChannelUrl]);

    const triggerChannelResolve = (currentUrl: string) => {
        const source = fixedPlaylistUrl || currentUrl;
        if (source && !resolvedChannelName) resolveChannel(source);
    };

    const handleConfirm = async () => {
        setSubmitting(true);
        setError(null);
        const channelModeUrl = (resolvedChannelUrl || url).trim();
        const playlistModeUrl = fixedPlaylistUrl || url.trim();
        try {
            if (mode === 'playlist') {
                await api.post('/subscriptions/playlist', {
                    playlistUrl: playlistModeUrl,
                    interval,
                    format,
                    collectionName: collectionName.trim() || undefined,
                    downloadAll: downloadAllPrevious,
                });
            } else if (mode === 'channel') {
                await api.post('/subscriptions', {
                    url: channelModeUrl,
                    interval,
                    format,
                    authorName: collectionName.trim() || undefined,
                    downloadAllPrevious,
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
        setResolvedPlaylistTitle(null);
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
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Choose what to monitor for new videos:
                </Typography>

                <RadioGroup
                    value={mode}
                    onChange={(e) => {
                        const next = e.target.value as SubscriptionMode;
                        setMode(next);
                        setError(null);
                        if (next === 'channel' || next === 'channel-playlists') {
                            setCollectionName(resolvedChannelName || '');
                            triggerChannelResolve(url);
                        } else {
                            setCollectionName(playlistTitle || resolvedPlaylistTitle || '');
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

                <Divider sx={{ my: 2 }} />

                {/* URL field */}
                <TextField
                    fullWidth
                    size="small"
                    label={needsChannelUrl ? 'Channel URL' : 'Playlist URL'}
                    value={displayUrl}
                    onChange={(e) => {
                        if (!needsChannelUrl && fixedPlaylistUrl) return;
                        setUrl(e.target.value);
                        setError(null);
                        setResolvedChannelUrl(null);
                        setResolvedChannelName(null);
                    }}
                    placeholder={needsChannelUrl
                        ? 'https://www.youtube.com/@ChannelName'
                        : 'https://www.youtube.com/playlist?list=…'}
                    disabled={resolvingChannelUrl || resolvingPlaylistTitle || (!needsChannelUrl && !!fixedPlaylistUrl)}
                    autoFocus={!fixedPlaylistUrl}
                    slotProps={{
                        input: (resolvingChannelUrl || resolvingPlaylistTitle) ? { endAdornment: <CircularProgress size={16} /> } : undefined,
                    }}
                />
                {/* Hint row */}
                <Box sx={{ mt: 0.5, mb: 1, minHeight: 20 }}>
                    {needsChannelUrl && resolvingChannelUrl ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <CircularProgress size={12} />
                            <Typography variant="caption" color="text.secondary">Looking up channel…</Typography>
                        </Box>
                    ) : needsChannelUrl && resolvedChannelName ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <CheckCircleOutline sx={{ fontSize: 14, color: 'success.main' }} />
                            <Typography variant="caption" color="success.main">
                                <strong>{resolvedChannelName}</strong> — Auto-filled — edit if needed.
                            </Typography>
                        </Box>
                    ) : needsChannelUrl && url ? (
                        <Typography variant="caption" color="text.secondary">Auto-filled — edit if needed.</Typography>
                    ) : !needsChannelUrl && fixedPlaylistUrl ? (
                        <Typography variant="caption" color="text.secondary">
                            {playlistTitle
                                ? <><strong>{playlistTitle}</strong> — playlist URL pre-filled.</>
                                : 'Playlist URL pre-filled.'}
                        </Typography>
                    ) : !needsChannelUrl && resolvingPlaylistTitle ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <CircularProgress size={12} />
                            <Typography variant="caption" color="text.secondary">Looking up title…</Typography>
                        </Box>
                    ) : !needsChannelUrl && resolvedPlaylistTitle ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <CheckCircleOutline sx={{ fontSize: 14, color: 'success.main' }} />
                            <Typography variant="caption" color="success.main">
                                <strong>{resolvedPlaylistTitle}</strong> — playlist URL pre-filled.
                            </Typography>
                        </Box>
                    ) : !needsChannelUrl ? (
                        <Typography variant="caption" color="text.secondary">Enter a YouTube playlist or Bilibili URL.</Typography>
                    ) : null}
                </Box>

                <Divider sx={{ my: 2 }} />

                {/* Collection name */}
                <TextField
                    fullWidth
                    size="small"
                    label="Collection name"
                    value={collectionName}
                    onChange={(e) => setCollectionName(e.target.value)}
                    placeholder={needsChannelUrl ? resolvedChannelName || 'My Channel' : playlistTitle || resolvedPlaylistTitle || 'My Playlist'}
                    helperText={
                        mode === 'channel-playlists'
                            ? 'Used as the channel folder name for all subscribed playlists. Leave blank to skip.'
                            : 'Leave blank to skip collection.'
                    }
                    sx={{ mb: 2 }}
                />

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
                    label={<Typography variant="body2">Download all previous videos now</Typography>}
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

export default AutoDownloadModal;
