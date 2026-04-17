import { MusicNote, NotificationsActive, VideoLibrary, Warning } from '@mui/icons-material';
import {
    Alert,
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
    const [interval, setIntervalValue] = useState(60);
    const [format, setFormat] = useState<'mp4' | 'mp3'>('mp4');
    const [downloadAllPrevious, setDownloadAllPrevious] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [resolvingChannelUrl, setResolvingChannelUrl] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Sync the channel URL whenever the modal opens or initialChannelUrl becomes available
    useEffect(() => {
        if (open) {
            setChannelUrl(initialChannelUrl);
        }
    }, [open, initialChannelUrl]);

    // When switching to a channel mode, auto-resolve channel URL from playlistUrl if not yet filled
    const resolveChannelUrlFromPlaylist = useCallback(async () => {
        if (!playlistUrl || resolvingChannelUrl) return;
        setResolvingChannelUrl(true);
        try {
            const res = await api.get('/channel-url', { params: { url: playlistUrl } });
            if (res.data?.channelUrl) {
                setChannelUrl(res.data.channelUrl);
            }
        } catch {
            // silently ignore — user can fill manually
        } finally {
            setResolvingChannelUrl(false);
        }
    }, [playlistUrl, resolvingChannelUrl]);

    const needsChannelUrl = mode === 'channel' || mode === 'channel-playlists';
    const canSubmit = !submitting && interval > 0 && (!needsChannelUrl || channelUrl.trim().length > 0);

    const handleConfirm = async () => {
        setSubmitting(true);
        setError(null);
        try {
            if (mode === 'playlist') {
                await api.post('/subscriptions/playlist', {
                    playlistUrl,
                    interval,
                    format,
                    collectionName: collectionName || playlistTitle,
                    downloadAll: downloadAllPrevious,
                });
            } else if (mode === 'channel') {
                await api.post('/subscriptions', {
                    url: channelUrl.trim(),
                    interval,
                    format,
                    downloadAllPrevious,
                });
            } else {
                await api.post('/subscriptions/channel-playlists', {
                    url: channelUrl.trim(),
                    interval,
                    format,
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
                            onChange={(e) => setChannelUrl(e.target.value)}
                            placeholder="https://www.youtube.com/@ChannelName"
                            disabled={resolvingChannelUrl}
                            helperText={
                                resolvingChannelUrl
                                    ? 'Looking up channel…'
                                    : channelUrl
                                        ? 'Auto-filled — edit if needed.'
                                        : 'Enter the YouTube channel URL for this playlist\'s channel.'
                            }
                            autoFocus={!channelUrl && !resolvingChannelUrl}
                            slotProps={{
                                input: resolvingChannelUrl ? {
                                    endAdornment: <CircularProgress size={16} />,
                                } : undefined,
                            }}
                        />
                    </>
                )}

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

                <Divider sx={{ my: 2 }} />

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
