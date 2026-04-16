import { NotificationsActive, Warning } from '@mui/icons-material';
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
    Typography,
} from '@mui/material';
import { useState } from 'react';
import { api } from '../utils/apiClient';

type SubscriptionMode = 'playlist' | 'channel' | 'channel-playlists';

interface PlaylistSubscribeModalProps {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
    playlistUrl: string;
    playlistTitle: string;
    collectionName: string;
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
}) => {
    const [mode, setMode] = useState<SubscriptionMode>('playlist');
    const [channelUrl, setChannelUrl] = useState('');
    const [interval, setIntervalValue] = useState(60);
    const [downloadAllPrevious, setDownloadAllPrevious] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

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
                    collectionName: collectionName || playlistTitle,
                    downloadAll: downloadAllPrevious,
                });
            } else if (mode === 'channel') {
                await api.post('/subscriptions', {
                    url: channelUrl.trim(),
                    interval,
                    downloadAllPrevious,
                });
            } else {
                await api.post('/subscriptions/channel-playlists', {
                    url: channelUrl.trim(),
                    interval,
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
                        setMode(e.target.value as SubscriptionMode);
                        setError(null);
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
                            helperText="Enter the YouTube channel URL for this playlist's channel."
                            autoFocus
                        />
                    </>
                )}

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
