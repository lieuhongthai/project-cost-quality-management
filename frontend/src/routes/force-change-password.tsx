import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/context/AuthContext'

// MUI imports
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import Alert from '@mui/material/Alert'
import CircularProgress from '@mui/material/CircularProgress'

export const Route = createFileRoute('/force-change-password')({
  component: ForceChangePasswordPage,
})

function ForceChangePasswordPage() {
  const { t } = useTranslation()
  const { user, changeCredentials } = useAuth()
  const navigate = useNavigate()
  const [newPassword, setNewPassword] = useState('')
  const [newUsername, setNewUsername] = useState(user?.username ?? '')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) {
      navigate({ to: '/login' })
      return
    }
    if (!user.mustChangePassword) {
      navigate({ to: '/' })
    }
  }, [user, navigate])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setIsSubmitting(true)
    setError(null)
    try {
      await changeCredentials({
        newPassword,
        newUsername: newUsername.trim() || undefined,
      })
      navigate({ to: '/' })
    } catch (err: any) {
      setError(err?.response?.data?.message || t('auth.changeFailed'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Box
      sx={{
        minHeight: '70vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        px: 2,
      }}
    >
      <Card sx={{ width: '100%', maxWidth: 400, borderRadius: 3 }}>
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <Typography variant="h5" fontWeight={600} gutterBottom>
              {t('auth.forceChangeTitle')}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t('auth.forceChangeSubtitle')}
            </Typography>
          </Box>

          <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label={t('auth.username')}
              value={newUsername}
              onChange={(event) => setNewUsername(event.target.value)}
              fullWidth
              size="small"
            />
            <TextField
              label={t('auth.newPassword')}
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              required
              fullWidth
              size="small"
            />

            {error && (
              <Alert severity="error" sx={{ py: 0.5 }}>
                {error}
              </Alert>
            )}

            <Button
              type="submit"
              variant="contained"
              fullWidth
              disabled={isSubmitting}
              sx={{ mt: 1 }}
            >
              {isSubmitting ? <CircularProgress size={20} color="inherit" /> : t('auth.updateCredentials')}
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  )
}
