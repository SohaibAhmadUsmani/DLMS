import { useState, useRef, useEffect } from 'react'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'
import { useAppSelector, useAppDispatch } from '../../app/hooks'
import { loginSuccess, logout } from '../../features/auth/authSlice'
import {
  useUpdateProfileMutation,
  useUploadProfilePictureMutation,
  useDeleteProfilePictureMutation,
  useDeleteMyAccountMutation,
} from '../../features/core/coreApi'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Select from '../../components/ui/Select'
import Modal from '../../components/ui/Modal'
import Spinner from '../../components/ui/Spinner'
import RepeatableFields from '../../components/profile/RepeatableFields'

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'
const baseUrl = apiUrl.replace('/api/v1', '').replace(/\/+$/, '')

function validateImageDimensions(file) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      if (img.width > 800 || img.height > 800) {
        reject(new Error(`Image must be 800x800px or smaller (${img.width}x${img.height}px detected)`))
      } else {
        resolve(true)
      }
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to load image'))
    }
    img.src = url
  })
}

export default function StudentProfile() {
  const { user, token, role } = useAppSelector((s) => s.auth)
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const fileRef = useRef(null)

  const [updateProfile, { isLoading: saving }] = useUpdateProfileMutation()
  const [uploadPicture, { isLoading: uploading }] = useUploadProfilePictureMutation()
  const [deletePicture, { isLoading: deletingPhoto }] = useDeleteProfilePictureMutation()
  const [deleteAccount, { isLoading: deletingAccount }] = useDeleteMyAccountMutation()

  const [loadingData, setLoadingData] = useState(true)

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [gender, setGender] = useState('')
  const [dob, setDob] = useState('')
  const [bio, setBio] = useState('')
  const [cnic, setCnic] = useState('')
  const [education, setEducation] = useState([])
  const [experience, setExperience] = useState([])
  const [errors, setErrors] = useState({})
  const [deleteTypeConfirm, setDeleteTypeConfirm] = useState('')
  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false)
  const [photoError, setPhotoError] = useState('')
  const [imagePreview, setImagePreview] = useState(null)

  useEffect(() => {
    if (user) {
      const parts = (user.name || '').split(' ')
      setFirstName(parts[0] || '')
      setLastName(parts.slice(1).join(' ') || '')
      setUsername(user.username || '')
      setEmail(user.email || '')
      setPhone(user.phone || '')
      setGender(user.gender || '')
      setDob(user.dob ? user.dob.split('T')[0] : '')
      setBio(user.bio || '')
      setCnic(user.cnic || '')
      setEducation(Array.isArray(user.education) ? user.education : [])
      setExperience(Array.isArray(user.experience) ? user.experience : [])
      setLoadingData(false)
    }
  }, [user])

  const pictureUrl = imagePreview || (user?.profile_picture_url ? `${baseUrl}${user.profile_picture_url}` : null)

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoError('')
    if (!['image/png', 'image/jpeg', 'image/jpg'].includes(file.type)) {
      setPhotoError('Only PNG and JPG files are allowed')
      return
    }
    try {
      await validateImageDimensions(file)
    } catch (err) {
      setPhotoError(err.message)
      return
    }
    const formData = new FormData()
    formData.append('file', file)
    try {
      const result = await uploadPicture(formData).unwrap()
      dispatch(loginSuccess({ user: { ...user, profile_picture_url: result.profile_picture_url }, token, role }))
      setImagePreview(null)
      toast.success('Profile photo uploaded')
    } catch (err) {
      toast.error(err.data?.detail || 'Failed to upload photo')
    }
  }

  const handleDeletePhoto = async () => {
    try {
      await deletePicture().unwrap()
      dispatch(loginSuccess({ user: { ...user, profile_picture_url: null }, token, role }))
      setImagePreview(null)
      toast.success('Profile photo removed')
    } catch (err) {
      toast.error(err.data?.detail || 'Failed to delete photo')
    }
  }

  const validate = () => {
    const errs = {}
    if (!firstName.trim()) errs.firstName = 'First name is required'
    if (!lastName.trim()) errs.lastName = 'Last name is required'
    if (!username.trim()) errs.username = 'Username is required'
    if (!phone.trim()) errs.phone = 'Phone number is required'
    if (!gender) errs.gender = 'Gender is required'
    if (!dob) errs.dob = 'Date of birth is required'
    if (!bio.trim()) errs.bio = 'Bio is required'
    if (cnic.trim()) {
      const cnicRegex = /^\d{5}-\d{7}-\d{1}$/
      if (!cnicRegex.test(cnic.trim())) errs.cnic = 'CNIC must be in format XXXXX-XXXXXXX-X (e.g., 12345-1234567-1)'
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSave = async () => {
    if (!validate()) return
    const payload = {
      name: `${firstName.trim()} ${lastName.trim()}`,
      username: username.trim(),
      phone: phone.trim(),
      gender,
      dob,
      bio: bio.trim(),
      cnic: cnic.trim() || undefined,
    }
    if (email) payload.email = email.trim()
    if (role === 'teacher') {
      payload.education = education.filter((e) => e.degree && e.university)
      payload.experience = experience.map((e) => ({
        ...e,
        is_current: e.is_current === true || e.is_current === 'true',
        to_date: e.is_current ? null : (e.to_date || null),
      })).filter((e) => e.company && e.position)
    }
    try {
      const result = await updateProfile(payload).unwrap()
      dispatch(loginSuccess({ user: { ...result, profile_picture_url: result.profile_picture_url || user?.profile_picture_url }, token, role }))
      toast.success('Profile updated successfully')
    } catch (err) {
      toast.error(err.data?.detail || 'Failed to update profile')
    }
  }

  const handleDeleteAccount = async () => {
    try {
      await deleteAccount().unwrap()
      dispatch(logout())
      navigate('/login', { replace: true })
      toast.success('Account deleted')
    } catch (err) {
      toast.error(err.data?.detail || 'Failed to delete account')
    }
  }

  const openDeletePhotoConfirm = () => {
    if (!window.confirm('Are you sure you want to remove your profile photo?')) return
    handleDeletePhoto()
  }

  if (loadingData) return <Spinner size={32} />

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <Card className="p-6">
        <div className="flex items-start gap-5">
          <div className="relative shrink-0">
            {pictureUrl ? (
              <img src={pictureUrl} alt="Profile" className="h-20 w-20 rounded-full object-cover border-2 border-slate-200" />
            ) : (
              <div className="h-20 w-20 rounded-full bg-primary text-white flex items-center justify-center text-2xl font-medium border-2 border-slate-200">
                {user?.name?.charAt(0) || 'U'}
              </div>
            )}
          </div>
          <div className="flex flex-col justify-center gap-1">
            <h3 className="font-bold text-slate-800">Profile Photo</h3>
            <p className="text-xs text-slate-500">PNG or JPG no bigger than 800px width and height</p>
            <div className="flex gap-2.5 mt-1">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="inline-flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium px-4 py-1.5 transition-colors cursor-pointer disabled:opacity-50"
              >
                {uploading ? 'Uploading...' : 'Upload'}
              </button>
              <input ref={fileRef} type="file" accept=".png,.jpg,.jpeg" onChange={handleFileSelect} className="hidden" />
              {pictureUrl && (
                <button
                  type="button"
                  onClick={openDeletePhotoConfirm}
                  disabled={deletingPhoto}
                  className="inline-flex items-center justify-center rounded-full bg-danger hover:bg-red-600 text-white text-sm font-medium px-4 py-1.5 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {deletingPhoto ? 'Deleting...' : 'Delete'}
                </button>
              )}
            </div>
            {photoError && <p className="text-xs text-danger mt-1">{photoError}</p>}
          </div>
        </div>

        <hr className="my-5 border-slate-200" />

        <div>
          <h3 className="font-bold text-slate-800">Personal Details</h3>
          <p className="text-xs text-slate-500 mt-0.5 mb-4">Edit your personal information</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-4">
            <Input
              label="First Name *"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              error={errors.firstName}
              placeholder="John"
            />
            <Input
              label="Last Name *"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              error={errors.lastName}
              placeholder="Doe"
            />
            <Input
              label="User Name *"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              error={errors.username}
              placeholder="johndoe"
            />
            {role === 'admin' && (
              <Input
                label="Email *"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@example.com"
              />
            )}
            <Input
              label="Phone Number *"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              error={errors.phone}
              placeholder="+1 (555) 123-4567"
            />
            <Input
              label="CNIC (Pakistani ID)"
              value={cnic}
              onChange={(e) => setCnic(e.target.value)}
              error={errors.cnic}
              placeholder="12345-1234567-1"
            />
            <Select
              label="Gender *"
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              error={errors.gender}
              options={[
                { value: 'Male', label: 'Male' },
                { value: 'Female', label: 'Female' },
                { value: 'Other', label: 'Other / Prefer not to say' },
              ]}
              placeholder="Select gender"
            />
            <div className="w-full">
              {errors.dob && <p className="mt-1 text-xs text-danger">{errors.dob}</p>}
              <Input
                label="DOB *"
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                error={errors.dob}
              />
            </div>
            {role === 'admin' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                <p className="text-sm text-slate-500 capitalize px-3 py-2 border border-slate-200 rounded-card bg-slate-50">
                  {user?.role || 'Admin'}
                </p>
              </div>
            )}
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-slate-700 mb-1">Bio *</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={4}
              placeholder="Write a short bio about yourself..."
              className={`w-full rounded-btn border px-3 py-2 text-sm text-slate-800 placeholder-slate-400 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-y min-h-[100px] ${errors.bio ? 'border-danger' : 'border-slate-300'}`}
            />
            {errors.bio && <p className="mt-1 text-xs text-danger">{errors.bio}</p>}
          </div>

          {role === 'teacher' && (
            <>
              <hr className="my-6 border-slate-200" />
              <RepeatableFields
                fields={education}
                setFields={setEducation}
                fieldsConfig={[
                  { key: 'degree', label: 'Degree *', placeholder: 'BCA - Bachelor of Computer Applications' },
                  { key: 'university', label: 'University *', placeholder: 'University of Technology' },
                  { key: 'from_date', label: 'From Date *', type: 'date' },
                  { key: 'to_date', label: 'To Date *', type: 'date' },
                ]}
                label="Educational Details"
                description="Edit your Educational information"
              />
              <hr className="my-6 border-slate-200" />
              <RepeatableFields
                fields={experience}
                setFields={setExperience}
                fieldsConfig={[
                  { key: 'company', label: 'Company *', placeholder: 'Acme Corp' },
                  { key: 'position', label: 'Position *', placeholder: 'Senior Developer' },
                  { key: 'from_date', label: 'From Date *', type: 'date' },
                  { key: 'to_date', label: 'To Date', type: 'date' },
                  { key: 'is_current', label: 'I currently work here', type: 'checkbox' },
                ]}
                label="Experience"
                description="Edit your Experience"
              />
            </>
          )}

          <div className="mt-5">
            <Button
              onClick={handleSave}
              loading={saving}
              variant="danger"
              className="rounded-full px-7 py-3.5 text-sm font-bold"
            >
              Update Profile
            </Button>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="font-bold text-slate-800">Delete Account</h3>
        <p className="text-sm font-semibold text-slate-700 mt-2">Are you sure you want to delete your account?</p>
        <p className="text-xs text-slate-500 mt-1">Refers to the action of permanently removing a user's account and associated data from a system, service and platform.</p>
        <div className="mt-4">
          <Button
            variant="danger"
            onClick={() => setDeleteAccountOpen(true)}
            className="rounded-full"
          >
            Delete Account
          </Button>
        </div>
      </Card>

      <Modal
        open={deleteAccountOpen}
        onClose={() => { setDeleteAccountOpen(false); setDeleteTypeConfirm('') }}
        title="Delete Account"
      >
        <div className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-card p-3">
            <p className="text-sm text-red-700 font-medium">Warning: This action is irreversible.</p>
            <p className="text-xs text-red-600 mt-1">All your data, including enrollments, submissions, and certificates, will be permanently deleted.</p>
          </div>
          <p className="text-sm text-slate-600">
            Please type <span className="font-bold text-slate-800">DELETE</span> to confirm.
          </p>
          <Input
            placeholder='Type "DELETE" to confirm'
            value={deleteTypeConfirm}
            onChange={(e) => setDeleteTypeConfirm(e.target.value)}
          />
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => { setDeleteAccountOpen(false); setDeleteTypeConfirm('') }}>
              Cancel
            </Button>
            <Button
              variant="danger"
              disabled={deleteTypeConfirm !== 'DELETE'}
              loading={deletingAccount}
              onClick={handleDeleteAccount}
            >
              Yes, delete my account
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
