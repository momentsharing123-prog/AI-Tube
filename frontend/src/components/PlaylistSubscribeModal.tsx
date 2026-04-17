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

interface PlaylistSubscribeModalProps {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
    playlistUrl: string;
    playlistTitle: string;
    collectionName: string;
    /** Pre-filled channel URL, derived from the playlist metadata */
    initialChannelUrl?: string;
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

const PlaylistSubscribeModal: React.FC<PlaylistSubscribeModalProps> = ({
    open,
    onClose,
    onSuccess,
    playlistUrl,
    playlistTitle,
    collectionName,
    initialChannelUrl = '',
}) => {
    const [mode, setMode] = useState<SubscriptionMode>('playlist');
    const [channelUrl, setChannelUrl] = useState(initialChannelUrl);
    const [resolvedChannelName, setResolvedChannelName] = useState<string | null>(null);
    const [customCollectionName, setCustomCollectionName] = useState('');
    const [interval, setIntervalValue] = useState(60);
    const [format, setFormat] = useState<'mp4' | 'mp3'>('mp4');
    const [downloadAllPrevious, setDownloadAllPrevious] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [resolvingChannelUrl, setResolvingChannelUrl] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Sync state whenever the modal opens
    useEffect(() => {
        if (open) {
            setChannelUrl(initialChannelUrl);
            setResolvedChannelName(null);
            setCustomCollectionName(collectionName || playlistTitle || '');
            setMode('playlist');
            setError(null);
        }
    }, [open, initialChannelUrl, collectionName, playlistTitle]);

    // When switching to a channel mode, auto-resolve channel URL from playlistUrl if not yet filled
    const resolveChannelUrlFromPlaylist = useCallback(async () => {
        if (!playlistUrl || resolvingChannelUrl) return;
        setResolvingChannelUrl(true);
        setResolvedChannelName(null);
        try {
            const res = await api.get('/channel-url', { params: { url: playlistUrl } });
            if (res.data?.channelUrl) {
                setChannelUrl(res.data.channelUrl);
                setResolvedChannelName(res.data.channelName ?? null);
                // Always update collection name with the resolved channel name
                if (res.data.channelName) {
                    setCustomCollectionName(res.data.channelName);
                }
            }
        } catch {
            // silently ignore — user can fill manually
        } finally {
            setResolvingChannelUrl(false);
        }
    }, [playlistUrl, resolvingChannelUrl]);

    const needsChannelUrl = mode === 'channel' || mode === 'channel-playlists';
    const canSubmit = !submitting && !resolvingChannelUrl && interval > 0 && (!needsChannelUrl || channelUrl.trim().length > 0);

    const handleConfirm = async () => {
        setSubmitting(true);
        setError(null);
        try {
            if (mode === 'playlist') {
                await api.post('/subscriptions/playlist', {
                    playlistUrl,
                    interval,
                    format,
                    collectionName: customCollectionName.trim() || collectionName || playlistTitle,
                    downloadAll: downloadAllPrevious,
                });
            } else if (mode === 'channel') {
                await api.post('/subscriptions', {
                    url: channelUrl.trim(),
                    interval,
                    format,
                    authorName: customCollectionName.trim() || undefined,
                    downloadAllPrevious,
                });
            } else {
                await api.post('/subscriptions/channel-playlists', {
                    url: channelUrl.trim(),
                    interval,
                    format,
                    channelNameOverride: customCollectionName.trim() || undefined,
                    downloadAllPrevious,
                });
            }
            onSuccess();
            onClose();
        } catch (err: any) {
            setError(err?.response?.data?.error || err?.message || 'Subscription failed. Please check the URL and try again.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleClose = () => {
        if (!submitting) {
            setError(null);
            onClose();
        }
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
                        // Auto-update collection name to match the selected mode's default
                        if (next === 'playlist') {
                            setCustomCollectionName(playlistTitle || '');
                        } else if (next === 'channel' || next === 'channel-playlists') {
                            setCustomCollectionName(resolvedChannelName || '');
                        }
                        // Auto-resolve channel URL when switching to a channel mode
                        if ((next === 'channel' || next === 'channel-playlists') && !channelUrl) {
                            resolveChannelUrlFromPlaylist();
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

                {needsChannelUrl && (
                    <>
                        <Divider sx={{ my: 2 }} />
                        <TextField
                            fullWidth
                            size="small"
                            label="Channel URL"
                            value={channelUrl}
                            onChange={(e) => { setChannelUrl(e.target.value); setResolvedChannelName(null); }}
                            placeholder="https://www.youtube.com/@ChannelName"
                            disabled={resolvingChannelUrl}
                            autoFocus={!channelUrl && !resolvingChannelUrl}
                            slotProps={{
                                input: resolvingChannelUrl ? {
                                    endAdornment: <CircularProgress size={16} />,
                                } : undefined,
                            }}
                        />
                        {/* Channel resolution hint */}
                        <Box sx={{ mt: 0.5, mb: 1, minHeight: 20 }}>
                            {resolvingChannelUrl ? (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <CircularProgress size={12} />
                                    <Typography variant="caption" color="text.secondary">Looking up channel…</Typography>
                                </Box>
                            ) : resolvedChannelName ? (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <CheckCircleOutline sx={{ fontSize: 14, color: 'success.main' }} />
                                    <Typography variant="caption" color="success.main">
                                        <strong>{resolvedChannelName}</strong> — Auto-filled — edit if needed.
                                    </Typography>
                                </Box>
                            ) : channelUrl ? (
                                <Typography variant="caption" color="text.secondary">Auto-filled — edit if needed.</Typography>
                            ) : (
                                <Typography variant="caption" color="text.secondary">Enter the channel URL for this playlist.</Typography>
                            )}
                        </Box>
                    </>
                )}

                <Divider sx={{ my: 2 }} />

                {/* Collection name — shown for all modes */}
                <TextField
                    fullWidth
                    size="small"
                    label="Collection name"
                    value={customCollectionName}
                    onChange={(e) => setCustomCollectionName(e.target.value)}
                    placeholder={mode === 'playlist' ? playlistTitle || 'My Playlist' : resolvedChannelName || 'My Channel'}
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

export default PlaylistSubscribeModal;
