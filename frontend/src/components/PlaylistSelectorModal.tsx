import { CheckBox, CheckBoxOutlineBlank, Close, MusicNote, NotificationsActive } from '@mui/icons-material';
import { api } from '../utils/apiClient';
import {
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
    IconButton,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import PlaylistSubscribeModal from './PlaylistSubscribeModal';

export interface PlaylistEntry {
    url: string;
    title: string;
}

interface PlaylistSelectorModalProps {
    isOpen: boolean;
    onClose: () => void;
    playlistUrl: string;
    playlistTitle: string;
    format: 'mp3' | 'mp4';
    /** Called with the selected entries and optional collection name to download */
    onDownloadSelected: (entries: PlaylistEntry[], collectionName: string) => void;
    /** Called when the user wants just the single current video (no playlist) */
    onDownloadCurrent: () => void;
    isLoading?: boolean;
}

const PlaylistSelectorModal: React.FC<PlaylistSelectorModalProps> = ({
    isOpen,
    onClose,
    playlistUrl,
    playlistTitle,
    format,
    onDownloadSelected,
    onDownloadCurrent,
    isLoading = false,
}) => {
    const formatLabel = format === 'mp3' ? 'MP3' : 'MP4';
    const itemLabel = format === 'mp3' ? 'track' : 'video';
    const [entries, setEntries] = useState<PlaylistEntry[]>([]);
    const [selected, setSelected] = useState<Set<number>>(new Set());
    const [fetching, setFetching] = useState(false);
    const [fetchError, setFetchError] = useState<string | null>(null);
    // true  → use original playlist name (locked field)
    // false → custom name (free-text field)
    const [usePlaylistName, setUsePlaylistName] = useState(true);
    const [customCollectionName, setCustomCollectionName] = useState('');
    // Playlist title fetched from the backend (authoritative; prop starts as '')
    const [fetchedTitle, setFetchedTitle] = useState<string>(playlistTitle);
    const [channelUrl, setChannelUrl] = useState<string>('');
    const [subscribeOpen, setSubscribeOpen] = useState(false);
    const [subscribeSuccess, setSubscribeSuccess] = useState(false);

    // The collection name that will actually be submitted
    const effectiveCollectionName = usePlaylistName ? fetchedTitle : customCollectionName;

    // Reset per-open state whenever the modal opens
    useEffect(() => {
        if (!isOpen) return;
        setEntries([]);
        setSelected(new Set());
        setUsePlaylistName(true);
        setCustomCollectionName('');
        setFetchedTitle(playlistTitle); // show prop value immediately, overwrite when fetch returns
        setChannelUrl('');
        setFetchError(null);
        setFetching(true);

        api.get('/playlist-entries', { params: { url: playlistUrl }, timeout: 60000 })
            .then((res) => {
                const fetched: PlaylistEntry[] = res.data?.entries ?? [];
                setEntries(fetched);
                setSelected(new Set(fetched.map((_, i) => i)));
                if (res.data?.playlistTitle) {
                    setFetchedTitle(res.data.playlistTitle);
                }
                if (res.data?.channelUrl) {
                    setChannelUrl(res.data.channelUrl);
                }
            })
            .catch((err) => {
                setFetchError(err?.response?.data?.error || err?.message || 'Failed to load playlist');
            })
            .finally(() => setFetching(false));
    }, [isOpen, playlistUrl]);

    const allSelected = entries.length > 0 && selected.size === entries.length;
    const noneSelected = selected.size === 0;

    const toggleAll = () => {
        if (allSelected) {
            setSelected(new Set());
        } else {
            setSelected(new Set(entries.map((_, i) => i)));
        }
    };

    const toggle = (idx: number) => {
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(idx)) next.delete(idx);
            else next.add(idx);
            return next;
        });
    };

    const handleDownload = () => {
        const chosenEntries = entries.filter((_, i) => selected.has(i));
        onDownloadSelected(chosenEntries, effectiveCollectionName.trim());
    };

    // Fallback: download all without selecting (used when entry list couldn't be fetched)
    const handleDownloadAll = () => {
        onDownloadSelected(entries.length > 0 ? entries : [], effectiveCollectionName.trim());
    };

    const showFallback = !fetching && (fetchError !== null || entries.length === 0);


    return (
        <Dialog
            open={isOpen}
            onClose={onClose}
            maxWidth="sm"
            fullWidth
            slotProps={{ paper: { sx: { borderRadius: 2, maxHeight: '90vh' } } }}
        >
            <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                    <Typography variant="h6" component="div" sx={{ fontWeight: 600 }}>
                        Playlist Detected
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }} noWrap>
                        {fetchedTitle}
                    </Typography>
                </Box>
                <IconButton aria-label="close" onClick={onClose} sx={{ color: (theme) => theme.palette.grey[500] }}>
                    <Close />
                </IconButton>
            </DialogTitle>

            <DialogContent dividers sx={{ p: 0 }}>
                {/* Collection name field — always shown */}
                <Box sx={{ px: 2, pt: 2, pb: 1 }}>
                    <FormControlLabel
                        control={
                            <Checkbox
                                size="small"
                                checked={usePlaylistName}
                                onChange={(e) => {
                                    const checked = e.target.checked;
                                    setUsePlaylistName(checked);
                                    // When unchecking, seed the custom field with the current title
                                    // so the user can edit from the existing value rather than starting blank
                                    if (!checked && !customCollectionName) {
                                        setCustomCollectionName(fetchedTitle);
                                    }
                                }}
                                disabled={isLoading}
                            />
                        }
                        label={<Typography variant="body2">Use original playlist name</Typography>}
                        sx={{ mb: 1 }}
                    />
                    <TextField
                        fullWidth
                        label="Collection name (optional)"
                        variant="outlined"
                        size="small"
                        value={usePlaylistName ? fetchedTitle : customCollectionName}
                        onChange={(e) => { if (!usePlaylistName) setCustomCollectionName(e.target.value); }}
                        placeholder="My Playlist"
                        disabled={isLoading || usePlaylistName}
                        helperText={
                            usePlaylistName
                                ? 'Uncheck above to use a custom name.'
                                : 'Leave blank to add tracks without a collection, or enter a name to group them together.'
                        }
                        autoFocus={!usePlaylistName}
                    />
                </Box>
                <Divider />

                {fetching && (
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 6, gap: 2 }}>
                        <CircularProgress size={36} />
                        <Typography variant="body2" color="text.secondary">
                            Loading track list…
                        </Typography>
                    </Box>
                )}

                {/* Fetch error or empty list — show fallback message */}
                {showFallback && (
                    <Box sx={{ p: 2 }}>
                        {fetchError
                            ? <Typography color="error" sx={{ mb: 1 }}>{fetchError}</Typography>
                            : <Typography color="text.secondary" sx={{ mb: 1 }}>
                                Track list is unavailable for this playlist type (e.g. YouTube Mix / Radio).
                              </Typography>
                        }
                        <Typography variant="body2" color="text.secondary">
                            You can still download all {itemLabel}s, or just the current one.
                        </Typography>
                    </Box>
                )}

                {!fetching && !fetchError && entries.length > 0 && (
                    <>
                        {/* Select all row */}
                        <Box sx={{ px: 2, py: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <FormControlLabel
                                control={
                                    <Checkbox
                                        checked={allSelected}
                                        indeterminate={!allSelected && !noneSelected}
                                        onChange={toggleAll}
                                        icon={<CheckBoxOutlineBlank />}
                                        checkedIcon={<CheckBox />}
                                    />
                                }
                                label={
                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                        {allSelected ? 'Deselect all' : 'Select all'} ({entries.length} tracks)
                                    </Typography>
                                }
                            />
                            <Typography variant="caption" color="text.secondary">
                                {selected.size} selected
                            </Typography>
                        </Box>
                        <Divider />

                        {/* Track list */}
                        <List dense disablePadding sx={{ overflowY: 'auto' }}>
                            {entries.map((entry, idx) => (
                                <ListItem
                                    key={idx}
                                    disablePadding
                                    onClick={() => toggle(idx)}
                                    sx={{
                                        cursor: 'pointer',
                                        px: 2,
                                        py: 0.5,
                                        '&:hover': { bgcolor: 'action.hover' },
                                        bgcolor: selected.has(idx) ? 'action.selected' : 'transparent',
                                    }}
                                >
                                    <ListItemIcon sx={{ minWidth: 36 }}>
                                        <Checkbox
                                            edge="start"
                                            checked={selected.has(idx)}
                                            tabIndex={-1}
                                            disableRipple
                                            size="small"
                                        />
                                    </ListItemIcon>
                                    <ListItemIcon sx={{ minWidth: 32 }}>
                                        <MusicNote fontSize="small" color="action" />
                                    </ListItemIcon>
                                    <ListItemText
                                        primary={
                                            <Typography variant="body2" noWrap title={entry.title}>
                                                {entry.title}
                                            </Typography>
                                        }
                                    />
                                </ListItem>
                            ))}
                        </List>
                    </>
                )}
            </DialogContent>

            <DialogActions sx={{ p: 2, gap: 1, flexWrap: 'wrap' }}>
                {/* Always show "just this one" option */}
                <Button onClick={onDownloadCurrent} color="inherit" disabled={isLoading || fetching}>
                    Just this {itemLabel}
                </Button>

                {/* Subscribe button */}
                <Tooltip title={subscribeSuccess ? 'Subscribed! New videos will be auto-downloaded.' : 'Subscribe to auto-download new videos'}>
                    <span>
                        <Button
                            onClick={() => setSubscribeOpen(true)}
                            variant="outlined"
                            disabled={isLoading || fetching}
                            startIcon={subscribeSuccess ? <NotificationsActive color="success" /> : <NotificationsActive />}
                            sx={{
                                borderColor: subscribeSuccess ? 'success.main' : 'divider',
                                color: subscribeSuccess ? 'success.main' : 'text.primary',
                                '&:hover': {
                                    borderColor: subscribeSuccess ? 'success.main' : 'text.primary',
                                    bgcolor: 'action.hover',
                                },
                            }}
                        >
                            {subscribeSuccess ? 'Subscribed' : 'Subscribe'}
                        </Button>
                    </span>
                </Tooltip>

                <Box sx={{ flexGrow: 1 }} />

                {/* Fallback: can't enumerate → offer download-all */}
                {showFallback && (
                    <Button
                        onClick={handleDownloadAll}
                        variant="contained"
                        color="primary"
                        disabled={isLoading}
                        startIcon={isLoading ? <CircularProgress size={16} color="inherit" /> : <MusicNote />}
                    >
                        {isLoading ? 'Queuing…' : `Download All as ${formatLabel}`}
                    </Button>
                )}

                {/* Normal: list loaded → download selected */}
                {!fetching && entries.length > 0 && (
                    <Button
                        onClick={handleDownload}
                        variant="contained"
                        color="primary"
                        disabled={isLoading || noneSelected}
                        startIcon={isLoading ? <CircularProgress size={16} color="inherit" /> : <MusicNote />}
                    >
                        {isLoading
                            ? 'Queuing…'
                            : `Download ${selected.size} ${itemLabel}${selected.size === 1 ? '' : 's'} as ${formatLabel}`}
                    </Button>
                )}
            </DialogActions>

            {/* Playlist subscription modal */}
            <PlaylistSubscribeModal
                open={subscribeOpen}
                onClose={() => setSubscribeOpen(false)}
                onSuccess={() => setSubscribeSuccess(true)}
                playlistUrl={playlistUrl}
                playlistTitle={fetchedTitle}
                collectionName={effectiveCollectionName.trim()}
                initialChannelUrl={channelUrl}
            />
        </Dialog>
    );
};

export default PlaylistSelectorModal;
