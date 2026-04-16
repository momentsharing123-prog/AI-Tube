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
import { useState } from 'react';
import { api } from '../utils/apiClient';

type SubscriptionMode = 'channel' | 'playlist' | 'channel-playlists';

interface ChannelSubscribeModalProps {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const MODES: { value: SubscriptionMode; label: string; description: string }[] = [
    {
        value: 'channel',
        label: 'Channel (all videos)',
        description: 'Subscribe to all new uploads from a YouTube/Bilibili channel.',
    },
    {
        value: 'playlist',
        label: 'Playlist',
        description: 'Subscribe to new videos added to a specific playlist.',
    },
    {
        value: 'channel-playlists',
        label: 'All channel playlists',
        description: 'Subscribe to every playlist on a channel.',
    },
];

const ChannelSubscribeModal: React.FC<ChannelSubscribeModalProps> = ({ open, onClose, onSuccess }) => {
    const [mode, setMode] = useState<SubscriptionMode>('channel');
    const [url, setUrl] = useState('');
    const [collectionName, setCollectionName] = useState('');
    const [interval, setIntervalValue] = useState(60);
    const [format, setFormat] = useState<'mp4' | 'mp3'>('mp4');
    const [downloadAllPrevious, setDownloadAllPrevious] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const canSubmit = !submitting && url.trim().length > 0 && interval > 0;

    const handleConfirm = async () => {
        setSubmitting(true);
        setError(null);
        try {
            if (mode === 'channel') {
                await api.post('/subscriptions', {
                    url: url.trim(),
                    interval,
                    format,
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
                    url: url.trim(),
                    interval,
                    format,
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
        setMode('channel');
        setIntervalValue(60);
        setFormat('mp4');
        setDownloadAllPrevious(false);
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
                    onChange={(e) => { setUrl(e.target.value); setError(null); }}
                    placeholder="https://www.youtube.com/@ChannelName"
                    helperText="Enter a YouTube channel, playlist, or Bilibili space URL."
                    autoFocus
                    sx={{ mt: 1, mb: 2 }}
                />

                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    Subscription type:
                </Typography>
                <RadioGroup
                    value={mode}
                    onChange={(e) => { setMode(e.target.value as SubscriptionMode); setError(null); }}
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

                {mode === 'playlist' && (
                    <>
                        <Divider sx={{ my: 2 }} />
                        <TextField
                            fullWidth
                            size="small"
                            label="Collection name (optional)"
                            value={collectionName}
                            onChange={(e) => setCollectionName(e.target.value)}
                            placeholder="My Playlist"
                            helperText="Leave blank to use the playlist title as the collection name."
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
