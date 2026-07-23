import { createApi } from '@reduxjs/toolkit/query/react'
import { createBaseQuery } from '../../lib/baseQuery'
import { CONSOLE_API } from '../../lib/constants'

const baseQuery = createBaseQuery(CONSOLE_API)

export const consoleApi = createApi({
  reducerPath: 'consoleApi',
  baseQuery,
  tagTypes: ['User', 'Course', 'Section', 'Announcement', 'Assignment', 'Review', 'Settings'],
  endpoints: (builder) => ({
    getAdminUsers: builder.query({
      query: (params) => ({ url: '/admin/users/', params }),
      providesTags: ['User'],
    }),
    updateUserStatus: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/admin/users/${id}/status/`, method: 'PATCH', body }),
      invalidatesTags: ['User'],
    }),
    deleteUser: builder.mutation({
      query: (id) => ({ url: `/admin/users/${id}/`, method: 'DELETE' }),
      invalidatesTags: ['User'],
    }),
    getAdminCourses: builder.query({
      query: () => '/admin/courses/',
      providesTags: ['Course'],
    }),
    getSettings: builder.query({
      query: () => '/admin/settings/',
      providesTags: ['Settings'],
    }),
    updateSettings: builder.mutation({
      query: (body) => ({ url: '/admin/settings/', method: 'PUT', body }),
      invalidatesTags: ['Settings'],
    }),

    getMyCourses: builder.query({
      query: () => '/courses/',
      providesTags: ['Course'],
    }),
    createCourse: builder.mutation({
      query: (body) => ({ url: '/courses/', method: 'POST', body }),
      invalidatesTags: ['Course'],
    }),
    getCourseDetail: builder.query({
      query: (id) => `/courses/${id}/`,
      providesTags: (result, error, id) => [{ type: 'Course', id }],
    }),
    updateCourse: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/courses/${id}/`, method: 'PATCH', body }),
      invalidatesTags: ['Course'],
    }),
    deleteCourse: builder.mutation({
      query: (id) => ({ url: `/courses/${id}/`, method: 'DELETE' }),
      invalidatesTags: ['Course'],
    }),
    uploadCourseCover: builder.mutation({
      query: ({ id, formData }) => ({ url: `/courses/${id}/cover/`, method: 'POST', body: formData }),
      invalidatesTags: ['Course'],
    }),

    createSection: builder.mutation({
      query: ({ courseId, ...body }) => ({ url: `/courses/${courseId}/sections/`, method: 'POST', body }),
      invalidatesTags: ['Section', 'Course'],
    }),
    getCourseSections: builder.query({
      query: (courseId) => `/courses/${courseId}/sections/`,
      providesTags: (result, error, id) => [{ type: 'Section', id }],
    }),
    updateSection: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/courses/sections/${id}/`, method: 'PATCH', body }),
      invalidatesTags: ['Section', 'Course'],
    }),
    deleteSection: builder.mutation({
      query: (id) => ({ url: `/courses/sections/${id}/`, method: 'DELETE' }),
      invalidatesTags: ['Section', 'Course'],
    }),

    getCourseAnnouncements: builder.query({
      query: (courseId) => `/courses/${courseId}/announcements/`,
      providesTags: (result, error, id) => [{ type: 'Announcement', id }],
    }),
    createAnnouncement: builder.mutation({
      query: ({ courseId, ...body }) => ({ url: `/courses/${courseId}/announcements/`, method: 'POST', body }),
      invalidatesTags: ['Announcement'],
    }),
    getMyAnnouncementCount: builder.query({
      query: () => '/announcements/my-count/',
      providesTags: ['Announcement'],
    }),

    getCourseAssignments: builder.query({
      query: (courseId) => `/courses/${courseId}/assignments/`,
      providesTags: (result, error, id) => [{ type: 'Assignment', id }],
    }),
    createAssignment: builder.mutation({
      query: ({ courseId, ...body }) => ({ url: `/courses/${courseId}/assignments/`, method: 'POST', body }),
      invalidatesTags: ['Assignment'],
    }),
    getAssignmentSubmissions: builder.query({
      query: (id) => `/assignments/${id}/submissions/`,
      providesTags: (result, error, id) => [{ type: 'Assignment', id }],
    }),
    updateAssignment: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/assignments/${id}/`, method: 'PATCH', body }),
      invalidatesTags: ['Assignment'],
    }),
    getMyAssignments: builder.query({
      query: () => '/assignments/my/',
      providesTags: ['Assignment'],
    }),
    uploadAssignmentMaterial: builder.mutation({
      query: ({ id, formData }) => ({ url: `/assignments/${id}/upload-material/`, method: 'POST', body: formData }),
      invalidatesTags: ['Assignment'],
    }),
    gradeSubmission: builder.mutation({
      query: ({ submissionId, ...body }) => ({ url: `/assignments/submissions/${submissionId}/grade/`, method: 'PATCH', body }),
      invalidatesTags: ['Assignment'],
    }),

    getCourses: builder.query({
      query: () => '/courses/',
      providesTags: ['Course'],
    }),

    getCourseReviews: builder.query({
      query: (courseId) => `/courses/${courseId}/reviews/`,
      providesTags: (result, error, id) => [{ type: 'Review', id }],
    }),
    submitReview: builder.mutation({
      query: ({ courseId, ...body }) => ({ url: `/courses/${courseId}/reviews/`, method: 'POST', body }),
      invalidatesTags: ['Review'],
    }),

  }),
})

export const {
  useGetAdminUsersQuery,
  useUpdateUserStatusMutation,
  useDeleteUserMutation,
  useGetAdminCoursesQuery,
  useGetSettingsQuery,
  useUpdateSettingsMutation,
  useGetMyCoursesQuery,
  useCreateCourseMutation,
  useGetCourseDetailQuery,
  useUpdateCourseMutation,
  useDeleteCourseMutation,
  useCreateSectionMutation,
  useGetCourseSectionsQuery,
  useUpdateSectionMutation,
  useDeleteSectionMutation,
  useGetCourseAnnouncementsQuery,
  useCreateAnnouncementMutation,
  useGetCourseAssignmentsQuery,
  useCreateAssignmentMutation,
  useGetAssignmentSubmissionsQuery,
  useUpdateAssignmentMutation,
  useGetMyAssignmentsQuery,
  useUploadAssignmentMaterialMutation,
  useGradeSubmissionMutation,
  useGetCoursesQuery,
  useGetCourseReviewsQuery,
  useSubmitReviewMutation,
  useUploadCourseCoverMutation,
  useGetMyAnnouncementCountQuery,
} = consoleApi
