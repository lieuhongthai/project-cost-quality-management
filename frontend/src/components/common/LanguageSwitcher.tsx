import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supportedLanguages } from '@/i18n';

// MUI imports
import Button from '@mui/material/Button';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import CheckIcon from '@mui/icons-material/Check';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';

export function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const currentLanguage = supportedLanguages.find(
    (lang) => lang.code === i18n.language
  ) || supportedLanguages[0];

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLanguageChange = (langCode: string) => {
    i18n.changeLanguage(langCode);
    handleClose();
  };

  return (
    <>
      <Button
        onClick={handleClick}
        variant="outlined"
        size="small"
        endIcon={<KeyboardArrowDownIcon sx={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />}
        sx={{
          color: 'text.secondary',
          borderColor: 'divider',
          textTransform: 'none',
          '&:hover': {
            borderColor: 'text.secondary',
            bgcolor: 'action.hover',
          },
        }}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span style={{ marginRight: 8 }}>{currentLanguage.flag}</span>
        <span className="hidden sm:inline">{currentLanguage.name}</span>
      </Button>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        disableScrollLock
        slotProps={{
          paper: {
            sx: { minWidth: 160, mt: 1 },
          },
          list: {
            role: 'listbox',
            disablePadding: true,
          },
        }}
      >
        {supportedLanguages.map((language) => (
          <MenuItem
            key={language.code}
            onClick={() => handleLanguageChange(language.code)}
            selected={language.code === i18n.language}
            sx={{
              py: 1,
              ...(language.code === i18n.language && {
                bgcolor: 'primary.50',
                '&.Mui-selected': {
                  bgcolor: 'primary.50',
                },
              }),
            }}
          >
            <ListItemIcon sx={{ minWidth: 32 }}>
              <span style={{ fontSize: '1.25rem' }}>{language.flag}</span>
            </ListItemIcon>
            <ListItemText primary={language.name} />
            {language.code === i18n.language && (
              <CheckIcon fontSize="small" color="primary" sx={{ ml: 1 }} />
            )}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
