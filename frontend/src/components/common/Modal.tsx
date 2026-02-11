import React from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  footer?: React.ReactNode;
}

// Map custom sizes to MUI maxWidth
const getSizeMaxWidth = (size: ModalProps['size']) => {
  switch (size) {
    case 'sm':
      return 'sm' as const;
    case 'md':
      return 'md' as const;
    case 'lg':
      return 'lg' as const;
    case 'xl':
      return 'xl' as const;
    default:
      return 'md' as const;
  }
};

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  footer,
}) => {
  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      maxWidth={getSizeMaxWidth(size)}
      fullWidth
      scroll="paper"
      disableScrollLock
    >
      <DialogTitle sx={{ m: 0, p: 2, pr: 6 }}>
        {title}
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{
            position: 'absolute',
            right: 8,
            top: 8,
            color: (theme) => theme.palette.grey[500],
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers sx={{ maxHeight: 'calc(100vh - 200px)' }}>
        {children}
      </DialogContent>
      {footer && (
        <DialogActions sx={{ px: 3, py: 2, bgcolor: 'grey.50' }}>
          {footer}
        </DialogActions>
      )}
    </Dialog>
  );
};
