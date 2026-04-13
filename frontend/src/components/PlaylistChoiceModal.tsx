import { Close, PlaylistPlay, VideoFile } from '@mui/icons-material';
import {
    Box,
    Button,
    Dialog,
    DialogContent,
    DialogTitle,
    IconButton,
    Typography,
} from '@mui/material';

interface PlaylistChoiceModalProps {
    isOpen: boolean;
    onClose: () => void;
    format: 'mp3' | 'mp4';
    /** Download only the single video/track in the URL */
    onDownloadCurrent: () => void;
    /** Browse all entries and select which to download */
    onBrowsePlaylist: () => void;
}

const PlaylistChoiceModal: React.FC<PlaylistChoiceModalProps> = ({
    isOpen,
    onClose,
    format,
    onDownloadCurrent,
    onBrowsePlaylist,
}) => {
    const itemLabel = format === 'mp3' ? 'song' : 'video';
    const formatLabel = format === 'mp3' ? 'MP3' : 'MP4';

    return (
        <Dialog
            open={isOpen}
            onClose={onClose}
            maxWidth="xs"
            fullWidth
            slotProps={{ paper: { sx: { borderRadius: 2 } } }}
        >
            <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Playlist Detected
                </Typography>
                <IconButton aria-label="close" onClick={onClose} sx={{ color: (theme) => theme.palette.grey[500] }}>
                    <Close />
                </IconButton>
            </DialogTitle>

            <DialogContent sx={{ pb: 3 }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    This URL belongs to a playlist. What would you like to do?
                </Typography>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    {/* Option 1 — single item */}
                    <Button
                        variant="outlined"
                        size="large"
                        fullWidth
                        startIcon={<VideoFile />}
                        onClick={onDownloadCurrent}
                        sx={{ justifyContent: 'flex-start', textTransform: 'none', py: 1.5 }}
                    >
                        <Box sx={{ textAlign: 'left' }}>
                            <Typography variant="body1" sx={{ fontWeight: 600 }}>
                                Just this {itemLabel}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                Download only the current {itemLabel} as {formatLabel}
                            </Typography>
                        </Box>
                    </Button>

                    {/* Option 2 — browse playlist */}
                    <Button
                        variant="contained"
                        size="large"
                        fullWidth
                        startIcon={<PlaylistPlay />}
                        onClick={onBrowsePlaylist}
                        sx={{ justifyContent: 'flex-start', textTransform: 'none', py: 1.5 }}
                    >
                        <Box sx={{ textAlign: 'left' }}>
                            <Typography variant="body1" sx={{ fontWeight: 600, color: 'inherit' }}>
                                Browse playlist
                            </Typography>
                            <Typography variant="caption" sx={{ opacity: 0.85 }}>
                                Select which {itemLabel}s to download as {formatLabel}
                            </Typography>
                        </Box>
                    </Button>
                </Box>
            </DialogContent>
        </Dialog>
    );
};

export default PlaylistChoiceModal;
