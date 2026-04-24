import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppAbility } from '@/ability'
import type { Position, User } from '@/types'
import { UserCog, Edit2, Trash2, X, Check, Key } from 'lucide-react'
import Box from '@mui/material/Box'
import MuiTextField from '@mui/material/TextField'
import Autocomplete from '@mui/material/Autocomplete'
import Chip from '@mui/material/Chip'
import Typography from '@mui/material/Typography'
import { Card, DataTable, IconButton } from '@/components/common'
import type { ColumnDef } from '@/components/common'

interface IamUsersTabProps {
  users: User[]
  positions: Position[]
  editingUserId: number | null
  editingUsername: string
  editingUserEmail: string
  editingUserPositionId: number | null
  setEditingUsername: (v: string) => void
  setEditingUserEmail: (v: string) => void
  setEditingUserPositionId: (v: number | null) => void
  onEditUser: (user: User) => void
  onSaveUser: () => void
  onCancelEditUser: () => void
  onDeleteUser: (userId: number, username: string) => void
  onResetPassword: (userId: number, username: string) => void
  updateUserPending: boolean
}

export function IamUsersTab({
  users,
  positions,
  editingUserId,
  editingUsername,
  editingUserEmail,
  editingUserPositionId,
  setEditingUsername,
  setEditingUserEmail,
  setEditingUserPositionId,
  onEditUser,
  onSaveUser,
  onCancelEditUser,
  onDeleteUser,
  onResetPassword,
  updateUserPending,
}: IamUsersTabProps) {
  const { t } = useTranslation()
  const ability = useAppAbility()

  const columns = useMemo((): ColumnDef<User>[] => [
    {
      key: 'username',
      header: t('iam.username'),
      render: (user) =>
        editingUserId === user.id ? (
          <MuiTextField
            size="small"
            fullWidth
            value={editingUsername}
            onChange={(e) => setEditingUsername(e.target.value)}
            autoFocus
          />
        ) : (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography fontWeight={500}>{user.username}</Typography>
            {user.username === 'super-admin' && (
              <Chip label="Super Admin" size="small" color="secondary" />
            )}
          </Box>
        ),
    },
    {
      key: 'email',
      header: t('iam.email'),
      render: (user) =>
        editingUserId === user.id ? (
          <MuiTextField
            size="small"
            type="email"
            fullWidth
            value={editingUserEmail}
            onChange={(e) => setEditingUserEmail(e.target.value)}
            placeholder={t('iam.emailPlaceholder')}
          />
        ) : (
          <Typography variant="body2" color="text.secondary">
            {user.email || '-'}
          </Typography>
        ),
    },
    {
      key: 'position',
      header: t('iam.position'),
      render: (user) =>
        editingUserId === user.id ? (
          <Autocomplete
            size="small"
            sx={{ minWidth: 150 }}
            options={positions || []}
            value={positions?.find((position) => position.id === editingUserPositionId) || null}
            onChange={(_, option) => setEditingUserPositionId(option?.id || null)}
            getOptionLabel={(option) => option.name}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            renderInput={(params) => <MuiTextField {...params} />}
          />
        ) : (
          <Typography variant="body2" color="text.secondary">
            {user.position?.name || t('common.unknown')}
          </Typography>
        ),
    },
    {
      key: 'mustChangePassword',
      header: t('iam.mustChangePassword'),
      render: (user) => (
        <Chip
          label={user.mustChangePassword ? t('common.yes') : t('common.no')}
          size="small"
          color={user.mustChangePassword ? 'warning' : 'success'}
        />
      ),
    },
    {
      key: 'createdAt',
      header: t('common.created'),
      render: (user) => (
        <Typography variant="body2" color="text.secondary">
          {new Date(user.createdAt).toLocaleDateString()}
        </Typography>
      ),
    },
    ...(ability.can('manage', 'user')
      ? [{
          key: 'actions',
          header: t('common.actions'),
          align: 'right' as const,
          render: (user: User) => {
            const isEditing = editingUserId === user.id
            const isSuperAdmin = user.username === 'super-admin'
            const canManage = ability.can('manage', 'user') && !isSuperAdmin

            if (isEditing) {
              return (
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
                  <IconButton
                    variant="success"
                    icon={<Check size={16} />}
                    onClick={onSaveUser}
                    disabled={updateUserPending}
                  />
                  <IconButton
                    icon={<X size={16} />}
                    onClick={onCancelEditUser}
                  />
                </Box>
              )
            }

            if (!canManage) return null

            return (
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
                <IconButton
                  variant="primary"
                  icon={<Edit2 size={16} />}
                  tooltip={t('iam.editUser')}
                  onClick={() => onEditUser(user)}
                />
                <IconButton
                  variant="info"
                  icon={<Key size={16} />}
                  tooltip={t('iam.resetPassword')}
                  onClick={() => onResetPassword(user.id, user.username)}
                />
                <IconButton
                  variant="danger"
                  icon={<Trash2 size={16} />}
                  tooltip={t('iam.deleteUser')}
                  onClick={() => onDeleteUser(user.id, user.username)}
                />
              </Box>
            )
          },
        }]
      : []),
  ], [
    t, ability, editingUserId, editingUsername, editingUserEmail, editingUserPositionId,
    positions, updateUserPending, onEditUser, onSaveUser, onCancelEditUser,
    onDeleteUser, onResetPassword, setEditingUsername, setEditingUserEmail, setEditingUserPositionId,
  ])

  return (
    <Card
      title={
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <UserCog size={20} color="gray" />
          <Typography variant="subtitle1">{t('iam.usersTitle')}</Typography>
        </Box>
      }
    >
      <DataTable
        columns={columns}
        data={users}
        keyExtractor={(user) => user.id}
        emptyTitle={t('iam.noUsers')}
        emptyDescription={t('iam.noUsersHint')}
      />
    </Card>
  )
}
