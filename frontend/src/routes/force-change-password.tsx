import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Input, Button } from '@/components/common'
import { useAuth } from '@/context/AuthContext'

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
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold text-gray-900">{t('auth.forceChangeTitle')}</h1>
          <p className="text-sm text-gray-500">{t('auth.forceChangeSubtitle')}</p>
        </div>
        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <Input
            label={t('auth.username')}
            value={newUsername}
            onChange={(event) => setNewUsername(event.target.value)}
          />
          <Input
            label={t('auth.newPassword')}
            type="password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            required
          />
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? t('common.loading') : t('auth.updateCredentials')}
          </Button>
        </form>
      </div>
    </div>
  )
}
