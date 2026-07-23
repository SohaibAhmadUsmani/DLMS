import { createApi } from '@reduxjs/toolkit/query/react'
import { createBaseQuery } from '../../lib/baseQuery'
import { CORE_API } from '../../lib/constants'

const baseQuery = createBaseQuery(CORE_API)

export const coreApi = createApi({
  reducerPath: 'coreApi',
  baseQuery,
  tagTypes: ['User', 'Enrollment', 'Material', 'Quiz', 'Question', 'Attempt', 'Submission', 'Attendance', 'Notification', 'Message', 'Course', 'Student', 'Class', 'Announcement', 'Fees', 'Event', 'Leave', 'Payment', 'Certificate', 'AdminOverview'],
  endpoints: (builder) => ({
    // ── Auth ──
    register: builder.mutation({
      query: (body) => ({ url: '/auth/register', method: 'POST', body }),
      invalidatesTags: ['User'],
    }),
    adminCreateUser: builder.mutation({
      query: (body) => ({ url: '/auth/admin/users', method: 'POST', body }),
      invalidatesTags: ['User'],
    }),
    login: builder.mutation({
      query: (body) => ({ url: '/auth/login', method: 'POST', body }),
    }),
    getMe: builder.query({
      query: () => '/auth/me',
      providesTags: ['User'],
    }),
    updateProfile: builder.mutation({
      query: (body) => ({ url: '/auth/me', method: 'PATCH', body }),
      invalidatesTags: ['User'],
    }),
    uploadProfilePicture: builder.mutation({
      query: (formData) => ({
        url: '/auth/me/picture',
        method: 'POST',
        body: formData,
      }),
      invalidatesTags: ['User'],
    }),
    deleteProfilePicture: builder.mutation({
      query: () => ({ url: '/auth/me/picture', method: 'DELETE' }),
      invalidatesTags: ['User'],
    }),
    deleteMyAccount: builder.mutation({
      query: () => ({ url: '/auth/me', method: 'DELETE' }),
    }),

    // ── Enrollments ──
    enroll: builder.mutation({
      query: (courseId) => ({ url: `/enrollments?course_id=${courseId}`, method: 'POST' }),
      invalidatesTags: ['Enrollment'],
    }),
    teacherEnroll: builder.mutation({
      query: (body) => ({ url: '/enrollments/teacher', method: 'POST', body }),
      invalidatesTags: ['Enrollment'],
    }),
    unenroll: builder.mutation({
      query: (enrollmentId) => ({ url: `/enrollments/${enrollmentId}`, method: 'DELETE' }),
      invalidatesTags: ['Enrollment'],
    }),
    getMyEnrollments: builder.query({
      query: () => '/enrollments/my',
      providesTags: ['Enrollment'],
    }),
    getCourseEnrollments: builder.query({
      query: (courseId) => `/internal/enrollments/course/${courseId}`,
      providesTags: (result, error, id) => [{ type: 'Enrollment', id }],
    }),

    // ── Courses ──
    getEnrichedCourses: builder.query({
      query: () => '/courses/enriched',
      providesTags: ['Course'],
    }),
    getCourseStudents: builder.query({
      query: (courseId) => `/enrollments/students/${courseId}`,
      providesTags: (result, error, id) => [{ type: 'Student', id }],
    }),
    getCourseDetailData: builder.query({
      query: (courseId) => `/courses/${courseId}/detail`,
      providesTags: (result, error, id) => [{ type: 'Course', id }],
    }),
    updateProgress: builder.mutation({
      query: ({ enrollmentId, progress }) => ({
        url: `/enrollments/${enrollmentId}/progress?progress=${progress}`,
        method: 'PATCH',
      }),
      invalidatesTags: ['Enrollment'],
    }),

    // ── Attendance ──
    markAttendanceBatch: builder.mutation({
      query: ({ course_id, date, records }) => ({
        url: `/attendance/batch?course_id=${course_id}&date=${date}`,
        method: 'POST',
        body: { records },
      }),
      invalidatesTags: ['Attendance'],
    }),
    getCourseAttendance: builder.query({
      query: ({ courseId, date }) => {
        const params = date ? `?date=${date}` : ''
        return `/attendance/course/${courseId}${params}`
      },
      providesTags: (result, error, { courseId }) => [{ type: 'Attendance', id: courseId }],
    }),
    getAttendanceSummary: builder.query({
      query: (courseId) => `/attendance/summary/${courseId}`,
      providesTags: (result, error, id) => [{ type: 'Attendance', id }],
    }),
    getMyAttendance: builder.query({
      query: (courseId) => `/attendance/my${courseId ? `?course_id=${courseId}` : ''}`,
      providesTags: ['Attendance'],
    }),
    getSemesterAttendance: builder.query({
      query: (courseId) => `/attendance/semester/${courseId}`,
      providesTags: (result, error, id) => [{ type: 'Attendance', id }],
    }),
    saveSemesterAttendance: builder.mutation({
      query: ({ courseId, records }) => ({
        url: `/attendance/semester/${courseId}`,
        method: 'POST',
        body: { records },
      }),
      invalidatesTags: ['Attendance'],
    }),

    // ── Notifications ──
    getNotifications: builder.query({
      query: ({ page = 1, limit = 20 } = {}) => `/notifications?page=${page}&limit=${limit}`,
      providesTags: ['Notification'],
    }),
    getUnreadCount: builder.query({
      query: () => '/notifications/unread-count',
      providesTags: ['Notification'],
    }),
    markNotificationRead: builder.mutation({
      query: (id) => ({ url: `/notifications/${id}/read`, method: 'PATCH' }),
      invalidatesTags: ['Notification'],
    }),
    markAllNotificationsRead: builder.mutation({
      query: () => ({ url: '/notifications/read-all', method: 'PATCH' }),
      invalidatesTags: ['Notification'],
    }),
    createNotification: builder.mutation({
      query: (body) => ({ url: '/notifications', method: 'POST', body }),
      invalidatesTags: ['Notification'],
    }),

    // ── Materials ──
    uploadMaterial: builder.mutation({
      query: ({ sectionId, formData }) => ({
        url: `/sections/${sectionId}/materials`,
        method: 'POST',
        body: formData,
      }),
      invalidatesTags: ['Material'],
    }),
    getMaterials: builder.query({
      query: (sectionId) => `/sections/${sectionId}/materials`,
      providesTags: (result, error, id) => [{ type: 'Material', id }],
    }),
    uploadCourseMaterial: builder.mutation({
      query: ({ courseId, formData }) => ({
        url: `/courses/${courseId}/materials`,
        method: 'POST',
        body: formData,
      }),
      invalidatesTags: ['Material'],
    }),
    getCourseMaterials: builder.query({
      query: (courseId) => `/courses/${courseId}/materials`,
      providesTags: (result, error, id) => [{ type: 'Material', id }],
    }),
    deleteMaterial: builder.mutation({
      query: (id) => ({ url: `/materials/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Material'],
    }),

    // ── Quizzes ──
    getCourseQuizzes: builder.query({
      query: (courseId) => `/courses/${courseId}/quizzes`,
      providesTags: (result, error, id) => [{ type: 'Quiz', id }],
    }),
    createQuiz: builder.mutation({
      query: ({ courseId, ...body }) => ({ url: `/courses/${courseId}/quizzes`, method: 'POST', body }),
      invalidatesTags: ['Quiz'],
    }),
    getQuiz: builder.query({
      query: (quizId) => `/quizzes/${quizId}`,
      providesTags: (result, error, id) => [{ type: 'Quiz', id }],
    }),
    updateQuiz: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/quizzes/${id}`, method: 'PUT', body }),
      invalidatesTags: ['Quiz'],
    }),
    deleteQuiz: builder.mutation({
      query: (id) => ({ url: `/quizzes/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Quiz'],
    }),
    addQuestion: builder.mutation({
      query: ({ quizId, ...body }) => ({ url: `/quizzes/${quizId}/questions`, method: 'POST', body }),
      invalidatesTags: ['Question', 'Quiz'],
    }),
    updateQuestion: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/quizzes/questions/${id}`, method: 'PUT', body }),
      invalidatesTags: ['Question', 'Quiz'],
    }),
    deleteQuestion: builder.mutation({
      query: (id) => ({ url: `/quizzes/questions/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Question', 'Quiz'],
    }),
    uploadQuestionImage: builder.mutation({
      query: ({ questionId, file }) => {
        const formData = new FormData()
        formData.append('file', file)
        return { url: `/questions/${questionId}/image`, method: 'POST', body: formData }
      },
      invalidatesTags: ['Question', 'Quiz'],
    }),
    generateAIQuiz: builder.mutation({
      query: ({ courseId, generation_mode, uploaded_pdf, difficulty, number_of_mcqs, number_of_true_false, number_of_short }) => {
        const formData = new FormData()
        formData.append('course_id', courseId)
        formData.append('generation_mode', generation_mode)
        if (uploaded_pdf) formData.append('uploaded_pdf', uploaded_pdf)
        formData.append('difficulty', difficulty)
        formData.append('number_of_mcqs', String(number_of_mcqs))
        formData.append('number_of_true_false', String(number_of_true_false))
        formData.append('number_of_short', String(number_of_short))
        return { url: '/quizzes/generate-ai', method: 'POST', body: formData }
      },
    }),
    getQuizResults: builder.query({
      query: (quizId) => `/quizzes/${quizId}/results`,
      providesTags: (result, error, id) => [{ type: 'Quiz', id }],
    }),
    startQuizAttempt: builder.mutation({
      query: (quizId) => ({ url: `/quizzes/${quizId}/start`, method: 'POST' }),
      invalidatesTags: ['Attempt', 'Quiz'],
    }),
    getAttemptQuestions: builder.query({
      query: ({ quizId, attemptId }) => `/quizzes/${quizId}/attempt/${attemptId}`,
      providesTags: (result, error, { attemptId }) => [{ type: 'Attempt', id: attemptId }],
    }),
    submitAttempt: builder.mutation({
      query: ({ attemptId, ...body }) => ({ url: `/attempts/${attemptId}/submit`, method: 'POST', body }),
      invalidatesTags: ['Attempt', 'Quiz'],
    }),
    getAttemptResult: builder.query({
      query: (attemptId) => `/attempts/${attemptId}/result`,
      providesTags: (result, error, id) => [{ type: 'Attempt', id }],
    }),
    getMyAttempts: builder.query({
      query: (quizId) => `/quizzes/${quizId}/attempts/my`,
      providesTags: ['Attempt'],
    }),
    getMyQuizzes: builder.query({
      query: () => '/my-quizzes',
      providesTags: ['Quiz'],
    }),
    getMyQuizzesTeacher: builder.query({
      query: () => '/my-quizzes/teacher',
      providesTags: ['Quiz'],
    }),
    getMyQuizCount: builder.query({
      query: () => '/quizzes/my/count',
      providesTags: ['Quiz'],
    }),
    submitAssignment: builder.mutation({
      query: ({ assignmentId, formData }) => ({
        url: `/assignments/${assignmentId}/submit`,
        method: 'POST',
        body: formData,
      }),
      invalidatesTags: ['Submission'],
    }),
    getMySubmission: builder.query({
      query: (assignmentId) => `/assignments/${assignmentId}/my-submission`,
      providesTags: (result, error, id) => [{ type: 'Submission', id }],
    }),

    // ── Messages ──
    sendMessage: builder.mutation({
      query: (body) => ({ url: '/messages', method: 'POST', body }),
      invalidatesTags: ['Message'],
    }),
    replyToMessage: builder.mutation({
      query: ({ messageId, body }) => ({ url: `/messages/${messageId}/reply`, method: 'POST', body }),
      invalidatesTags: ['Message'],
    }),
    getMessages: builder.query({
      query: ({ page = 1, limit = 50 } = {}) => `/messages?page=${page}&limit=${limit}`,
      providesTags: ['Message'],
    }),
    getMessage: builder.query({
      query: (id) => `/messages/${id}`,
      providesTags: (result, error, id) => [{ type: 'Message', id }],
    }),
    getMessageThread: builder.query({
      query: (id) => `/messages/${id}`,
      providesTags: (result, error, id) => [{ type: 'Message', id }],
    }),
    getMyTeachers: builder.query({
      query: () => '/messages/my-teachers',
    }),
    markMessageRead: builder.mutation({
      query: (id) => ({ url: `/messages/${id}/read`, method: 'PATCH' }),
      invalidatesTags: ['Message'],
    }),

    // ── Classes ──
    getUpcomingClasses: builder.query({
      query: (limit = 10) => `/classes/upcoming?limit=${limit}`,
      providesTags: ['Class'],
    }),
    createClass: builder.mutation({
      query: (body) => ({ url: '/admin/classes', method: 'POST', body }),
      invalidatesTags: ['Class'],
    }),
    getMyClasses: builder.query({
      query: () => '/my-classes',
      providesTags: ['Class'],
    }),
    getAdminClasses: builder.query({
      query: () => '/admin/classes',
      providesTags: ['Class'],
    }),
    deleteClass: builder.mutation({
      query: (id) => ({ url: `/admin/classes/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Class'],
    }),
    updateClass: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/admin/classes/${id}`, method: 'PUT', body }),
      invalidatesTags: ['Class'],
    }),
    getAdminClass: builder.query({
      query: (id) => `/admin/classes/${id}`,
      providesTags: (result, error, id) => [{ type: 'Class', id }],
    }),

    // ── Announcements ──
    getAnnouncements: builder.query({
      query: ({ page = 1, limit = 50, include_archived = false } = {}) =>
        `/announcements?page=${page}&limit=${limit}&include_archived=${include_archived}`,
      providesTags: ['Announcement'],
    }),
    createAnnouncement: builder.mutation({
      query: (body) => ({ url: '/announcements', method: 'POST', body }),
      invalidatesTags: ['Announcement'],
    }),
    getAnnouncement: builder.query({
      query: (id) => `/announcements/${id}`,
      providesTags: (result, error, id) => [{ type: 'Announcement', id }],
    }),
    updateAnnouncement: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/announcements/${id}`, method: 'PUT', body }),
      invalidatesTags: ['Announcement'],
    }),
    deleteAnnouncement: builder.mutation({
      query: (id) => ({ url: `/announcements/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Announcement'],
    }),
    dismissAnnouncement: builder.mutation({
      query: (id) => ({ url: `/announcements/${id}/dismiss`, method: 'POST' }),
      invalidatesTags: ['Announcement'],
    }),

    // ── Fees ──
    getFees: builder.query({
      query: () => '/fees',
      providesTags: ['Fees'],
    }),
    createFee: builder.mutation({
      query: (body) => ({ url: '/fees', method: 'POST', body }),
      invalidatesTags: ['Fees'],
    }),
    updateFee: builder.mutation({
      query: ({ feeId, ...body }) => ({ url: `/fees/${feeId}`, method: 'PATCH', body }),
      invalidatesTags: ['Fees'],
    }),
    addFine: builder.mutation({
      query: ({ feeId, ...body }) => ({ url: `/fees/${feeId}/fines`, method: 'POST', body }),
      invalidatesTags: ['Fees'],
    }),
    getFeeStatsSummary: builder.query({
      query: () => '/fees/stats/summary',
      providesTags: ['Fees'],
    }),
    getFeeStatsQuarterly: builder.query({
      query: () => '/fees/stats/quarterly',
      providesTags: ['Fees'],
    }),

    // ── Events ──
    getEvents: builder.query({
      query: ({ upcoming = false } = {}) => `/events?upcoming=${upcoming}`,
      providesTags: ['Event'],
    }),
    createEvent: builder.mutation({
      query: (body) => ({ url: '/events', method: 'POST', body }),
      invalidatesTags: ['Event'],
    }),
    updateEvent: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/events/${id}`, method: 'PUT', body }),
      invalidatesTags: ['Event'],
    }),
    deleteEvent: builder.mutation({
      query: (id) => ({ url: `/events/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Event'],
    }),

    // ── Payments / Stripe ──
    createCheckoutSession: builder.mutation({
      query: (courseId) => ({ url: '/payments/create-checkout-session', method: 'POST', body: { courseId } }),
    }),
    verifyPayment: builder.query({
      query: (sessionId) => `/payments/verify/${sessionId}`,
    }),
    getConnectOnboardUrl: builder.mutation({
      query: () => ({ url: '/payments/connect/onboard', method: 'POST' }),
    }),
    getConnectStatus: builder.query({
      query: () => '/payments/connect/status',
    }),

    // ── Teacher: Earnings / Payouts / Statements ──
    getTeacherEarnings: builder.query({
      query: (year = 2026) => `/payments/teacher/earnings?year=${year}`,
      providesTags: ['Payment'],
    }),
    getTeacherEarningTransactions: builder.query({
      query: (params) => ({
        url: '/payments/teacher/earnings/transactions',
        params,
      }),
      providesTags: ['Payment'],
    }),
    getTeacherPayouts: builder.query({
      query: (params) => ({ url: '/payments/teacher/payouts', params }),
      providesTags: ['Payment'],
    }),
    getTeacherStatements: builder.query({
      query: (params) => ({ url: '/payments/teacher/statements', params }),
      providesTags: ['Payment'],
    }),

    // ── Student: Order History ──
    getStudentOrders: builder.query({
      query: (params) => ({ url: '/payments/student/orders', params }),
      providesTags: ['Payment'],
    }),

    // ── Admin: Financial Overview ──
    getAdminPaymentOverview: builder.query({
      query: (year = 2026) => `/payments/admin/overview?year=${year}`,
      providesTags: ['Payment'],
    }),
    getAdminTransactions: builder.query({
      query: (params) => ({ url: '/payments/admin/transactions', params }),
      providesTags: ['Payment'],
    }),
    getAdminTeachersConnect: builder.query({
      query: () => '/payments/admin/teachers-connect',
      providesTags: ['Payment'],
    }),
    getAdminCommission: builder.query({
      query: () => '/payments/admin/commission',
      providesTags: ['Payment'],
    }),
    updateAdminCommission: builder.mutation({
      query: (commission_percent) => ({ url: '/payments/admin/commission', method: 'PUT', body: { commission_percent } }),
      invalidatesTags: ['Payment'],
    }),

    // ── Leave Requests ──
    getLeaveRequests: builder.query({
      query: () => '/leave-requests',
      providesTags: ['Leave'],
    }),
    createLeaveRequest: builder.mutation({
      query: (body) => ({ url: '/leave-requests', method: 'POST', body }),
      invalidatesTags: ['Leave'],
    }),
    approveLeaveRequest: builder.mutation({
      query: (id) => ({ url: `/leave-requests/${id}/approve`, method: 'PATCH' }),
      invalidatesTags: ['Leave'],
    }),
    rejectLeaveRequest: builder.mutation({
      query: (id) => ({ url: `/leave-requests/${id}/reject`, method: 'PATCH' }),
      invalidatesTags: ['Leave'],
    }),
    getPendingLeaveCount: builder.query({
      query: () => '/leave-requests/pending-count',
      providesTags: ['Leave'],
    }),

    // ── Dashboard ──
    getTeacherDashboardOverview: builder.query({
      query: ({ year } = {}) => {
        const params = new URLSearchParams()
        if (year) params.set('year', year)
        return `/dashboard/teacher/overview?${params.toString()}`
      },
      refetchOnMountOrArgChange: true,
    }),
    getAdminDashboardOverview: builder.query({
      query: () => '/dashboard/admin/overview',
      providesTags: ['AdminOverview'],
    }),
    approveCourse: builder.mutation({
      query: ({ course_id, action }) => ({
        url: '/dashboard/admin/approve-course',
        method: 'POST',
        body: { course_id, action },
      }),
      invalidatesTags: ['AdminOverview'],
    }),

    // ── Certificates ──
    getMyCertificates: builder.query({
      query: () => '/certificates/my',
      providesTags: ['Certificate'],
    }),
    getCertificate: builder.query({
      query: (id) => `/certificates/${id}`,
      providesTags: (result, error, id) => [{ type: 'Certificate', id }],
    }),
    getAdminCertificates: builder.query({
      query: ({ search, page, limit }) => {
        const params = new URLSearchParams()
        if (search) params.set('search', search)
        if (page) params.set('page', page)
        if (limit) params.set('limit', limit)
        return `/admin/certificates?${params.toString()}`
      },
      providesTags: ['Certificate'],
    }),
    getAdminCertificateSettings: builder.query({
      query: () => '/admin/certificates/settings',
    }),
    updateAdminCertificateSettings: builder.mutation({
      query: (body) => ({ url: '/admin/certificates/settings', method: 'PUT', body }),
      invalidatesTags: ['Certificate'],
    }),
  }),
})

export const {
  useRegisterMutation,
  useAdminCreateUserMutation,
  useLoginMutation,
  useUpdateProfileMutation,
  useUploadProfilePictureMutation,
  useLazyGetMeQuery,
  useDeleteProfilePictureMutation,
  useDeleteMyAccountMutation,
  useEnrollMutation,
  useTeacherEnrollMutation,
  useUnenrollMutation,
  useGetMyEnrollmentsQuery,
  useGetCourseEnrollmentsQuery,
  useUploadMaterialMutation,
  useGetMaterialsQuery,
  useUploadCourseMaterialMutation,
  useGetCourseMaterialsQuery,
  useDeleteMaterialMutation,
  useCreateQuizMutation,
  useGetCourseQuizzesQuery,
  useGetQuizQuery,
  useUpdateQuizMutation,
  useDeleteQuizMutation,
  useAddQuestionMutation,
  useUpdateQuestionMutation,
  useDeleteQuestionMutation,
  useUploadQuestionImageMutation,
  useGenerateAIQuizMutation,
  useGetQuizResultsQuery,
  useStartQuizAttemptMutation,
  useGetAttemptQuestionsQuery,
  useSubmitAttemptMutation,
  useGetAttemptResultQuery,
  useGetMyAttemptsQuery,
  useGetMyQuizzesQuery,
  useGetMyQuizzesTeacherQuery,
  useGetMyQuizCountQuery,
  useSubmitAssignmentMutation,
  useGetMySubmissionQuery,
  useMarkAttendanceBatchMutation,
  useGetCourseAttendanceQuery,
  useGetAttendanceSummaryQuery,
  useGetMyAttendanceQuery,
  useGetSemesterAttendanceQuery,
  useSaveSemesterAttendanceMutation,
  useGetEnrichedCoursesQuery,
  useGetCourseStudentsQuery,
  useGetCourseDetailDataQuery,
  useUpdateProgressMutation,
  useGetNotificationsQuery,
  useGetUnreadCountQuery,
  useMarkNotificationReadMutation,
  useMarkAllNotificationsReadMutation,
  useCreateNotificationMutation,
  useSendMessageMutation,
  useReplyToMessageMutation,
  useGetMessagesQuery,
  useGetMessageQuery,
  useGetMessageThreadQuery,
  useGetMyTeachersQuery,
  useMarkMessageReadMutation,
  useGetUpcomingClassesQuery,
  useCreateClassMutation,
  useGetMyClassesQuery,
  useGetAdminClassesQuery,
  useDeleteClassMutation,
  useUpdateClassMutation,
  useGetAdminClassQuery,
  useGetAnnouncementsQuery,
  useCreateAnnouncementMutation,
  useGetAnnouncementQuery,
  useUpdateAnnouncementMutation,
  useDeleteAnnouncementMutation,
  useDismissAnnouncementMutation,
  useGetFeesQuery,
  useCreateFeeMutation,
  useUpdateFeeMutation,
  useAddFineMutation,
  useGetFeeStatsSummaryQuery,
  useGetFeeStatsQuarterlyQuery,
  useGetEventsQuery,
  useCreateEventMutation,
  useUpdateEventMutation,
  useDeleteEventMutation,
  useGetLeaveRequestsQuery,
  useCreateLeaveRequestMutation,
  useApproveLeaveRequestMutation,
  useRejectLeaveRequestMutation,
  useGetPendingLeaveCountQuery,
  useCreateCheckoutSessionMutation,
  useVerifyPaymentQuery,
  useLazyVerifyPaymentQuery,
  useGetConnectOnboardUrlMutation,
  useGetConnectStatusQuery,
  useGetTeacherEarningsQuery,
  useGetTeacherEarningTransactionsQuery,
  useGetTeacherPayoutsQuery,
  useGetTeacherStatementsQuery,
  useGetStudentOrdersQuery,
  useGetAdminPaymentOverviewQuery,
  useGetAdminTransactionsQuery,
  useGetAdminTeachersConnectQuery,
  useGetAdminCommissionQuery,
  useUpdateAdminCommissionMutation,
  useGetTeacherDashboardOverviewQuery,
  useGetAdminDashboardOverviewQuery,
  useApproveCourseMutation,
  useGetMyCertificatesQuery,
  useGetCertificateQuery,
  useGetAdminCertificatesQuery,
  useGetAdminCertificateSettingsQuery,
  useUpdateAdminCertificateSettingsMutation,
} = coreApi
