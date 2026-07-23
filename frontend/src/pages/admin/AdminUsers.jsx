import { useState, useMemo } from 'react'
import toast from 'react-hot-toast'
import { Trash2, ToggleLeft, ToggleRight, Plus } from 'lucide-react'
import { useAppSelector } from '../../app/hooks'
import { useGetAdminUsersQuery, useUpdateUserStatusMutation, useDeleteUserMutation } from '../../features/console/consoleApi'
import { useAdminCreateUserMutation } from '../../features/core/coreApi'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Badge from '../../components/ui/Badge'
import Card, { CardHeader, CardBody } from '../../components/ui/Card'
import Table from '../../components/ui/Table'
import Modal from '../../components/ui/Modal'
import EmptyState from '../../components/ui/EmptyState'

const roleOptions = [
  { value: '', label: 'All Roles' },
  { value: 'admin', label: 'Admin' },
  { value: 'teacher', label: 'Teacher' },
  { value: 'student', label: 'Student' },
]

const createRoleOptions = [
  { value: 'student', label: 'Student' },
  { value: 'teacher', label: 'Teacher' },
  { value: 'admin', label: 'Admin' },
]

const roleBadgeClass = {
  admin: 'bg-indigo-100 text-indigo-700',
  teacher: 'bg-amber-100 text-amber-700',
  student: 'bg-slate-100 text-slate-700',
}

export default function AdminUsers() {
  const searchTerm = useAppSelector((s) => s.search.term)
  const [roleFilter, setRoleFilter] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [pendingId, setPendingId] = useState(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState({ name: '', email: '', password: '', role: 'student' })

  const { data, isLoading, isError } = useGetAdminUsersQuery(roleFilter ? { role: roleFilter } : {})
  const [updateStatus, { isLoading: updating }] = useUpdateUserStatusMutation()
  const [deleteUser, { isLoading: deleting }] = useDeleteUserMutation()
  const [createUser, { isLoading: creating }] = useAdminCreateUserMutation()

  const users = useMemo(() => {
    const all = data?.users || []
    if (!searchTerm) return all
    const lower = searchTerm.toLowerCase()
    return all.filter((u) =>
      u.name?.toLowerCase().includes(lower) ||
      u.email?.toLowerCase().includes(lower) ||
      u.role?.toLowerCase().includes(lower)
    )
  }, [data, searchTerm])

  const handleToggleStatus = async (user) => {
    setPendingId(user.id)
    try {
      await updateStatus({ id: user.id, is_active: !user.is_active }).unwrap()
      toast.success(`User ${user.is_active ? 'deactivated' : 'activated'}`)
    } catch (err) {
      toast.error(err.data?.detail || 'Failed to update status')
    } finally {
      setPendingId(null)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setPendingId(deleteTarget.id)
    try {
      await deleteUser(deleteTarget.id).unwrap()
      toast.success('User deleted')
      setDeleteTarget(null)
    } catch (err) {
      toast.error(err.data?.detail || 'Failed to delete user')
    } finally {
      setPendingId(null)
    }
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    try {
      await createUser(createForm).unwrap()
      toast.success('User created')
      setCreateOpen(false)
      setCreateForm({ name: '', email: '', password: '', role: 'student' })
    } catch (err) {
      toast.error(err.data?.detail || 'Failed to create user')
    }
  }

  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email' },
    {
      key: 'role',
      label: 'Role',
      render: (val) => (
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${roleBadgeClass[val] || 'bg-slate-100 text-slate-700'}`}>
          {val}
        </span>
      ),
    },
    {
      key: 'is_active',
      label: 'Status',
      render: (val) => <Badge variant={val ? 'success' : 'danger'}>{val ? 'Active' : 'Inactive'}</Badge>,
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, row) => (
        <div className="flex items-center gap-2">
          <Button
            variant={row.is_active ? 'outline' : 'primary'}
            size="sm"
            loading={pendingId === row.id && updating}
            onClick={() => handleToggleStatus(row)}
          >
            {row.is_active ? <ToggleLeft size={16} /> : <ToggleRight size={16} />}
            {row.is_active ? 'Deactivate' : 'Activate'}
          </Button>
          <Button
            variant="danger"
            size="sm"
            disabled={row.role === 'admin'}
            title={row.role === 'admin' ? 'Cannot delete admin users' : ''}
            onClick={() => setDeleteTarget(row)}
          >
            <Trash2 size={16} />
            Delete
          </Button>
        </div>
      ),
    },
  ]

  if (isError) {
    return (
      <Card><CardBody>
        <EmptyState icon={Trash2} title="Failed to load users" description="Could not reach the server." />
      </CardBody></Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h2 className="text-lg font-semibold text-slate-800">All Users</h2>
            <div className="flex items-center gap-3">
              <Button size="sm" onClick={() => setCreateOpen(true)}>
                <Plus size={16} /> Add User
              </Button>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="rounded-btn border border-slate-300 px-3 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              >
                {roleOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>
        </CardHeader>
        <CardBody>
          <Table
            columns={columns.map((c) => ({ key: c.key, label: c.label, render: c.render }))}
            rows={users.map((u) => ({ ...u, id: u.id }))}
            loading={isLoading}
            emptyTitle="No users found"
            emptyDescription={roleFilter ? `No users with role "${roleFilter}"` : 'No users registered yet'}
          />
        </CardBody>
      </Card>

      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Confirm Deletion">
        <p className="text-sm text-slate-600 mb-6">
          Are you sure you want to delete <strong>{deleteTarget?.name}</strong> ({deleteTarget?.email})? This action cannot be undone.
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button variant="danger" loading={pendingId === deleteTarget?.id && deleting} onClick={handleDelete}>
            Delete User
          </Button>
        </div>
      </Modal>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Add User">
        <form onSubmit={handleCreate} className="space-y-4">
          <Input label="Name" value={createForm.name} onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })} required />
          <Input label="Email" type="email" value={createForm.email} onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })} required />
          <Input label="Password" type="password" value={createForm.password} onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })} required minLength={6} />
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
            <select
              value={createForm.role}
              onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}
              className="w-full rounded-btn border border-slate-300 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            >
              {createRoleOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button type="submit" loading={creating}>Create User</Button>
          </div>
        </form>
      </Modal>
    </>
  )
}
