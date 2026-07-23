import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import {
  LayoutDashboard,
  BookOpen,
  Users,
  ClipboardList,
  HelpCircle,
  Megaphone,
  Settings,
  Compass,
  User,
  MessageSquare,
  Calendar,
  LogOut,
  DollarSign,
  ShoppingBag,
  TrendingUp,
  Award,
} from 'lucide-react'
import { DashboardShell } from '../components/layout'
import ProtectedRoute from '../features/auth/ProtectedRoute'
import { ROLES } from '../lib/constants'
import LandingPage from '../pages/landing/LandingPage'
import BlogPage from '../pages/landing/BlogPage'
import LoginPage from '../pages/auth/LoginPage'
import RegisterPage from '../pages/auth/RegisterPage'
import AdminDashboard from '../pages/admin/AdminDashboard'
import AdminUsers from '../pages/admin/AdminUsers'
import AdminCourses from '../pages/admin/AdminCourses'
import AdminSettings from '../pages/admin/AdminSettings'
import TeacherDashboard from '../pages/teacher/TeacherDashboard'
import TeacherCourses from '../pages/teacher/TeacherCourses'
import CourseDetail from '../pages/teacher/CourseDetail'
import TeacherAssignments from '../pages/teacher/TeacherAssignments'
import AssignmentGrading from '../pages/teacher/AssignmentGrading'
import TeacherQuizzes from '../pages/teacher/TeacherQuizzes'
import QuizBuilder from '../pages/teacher/QuizBuilder'
import QuizQuestions from '../pages/teacher/QuizQuestions'
import QuizResults from '../pages/teacher/QuizResults'
import TeacherAnnouncements from '../pages/teacher/TeacherAnnouncements'
import TeacherMessages from '../pages/teacher/TeacherMessages'
import ClassCalendar from '../pages/teacher/ClassCalendar'
import TeacherEarnings from '../pages/teacher/TeacherEarnings'
import TeacherPayouts from '../pages/teacher/TeacherPayouts'
import TeacherStatements from '../pages/teacher/TeacherStatements'
import AdminMessages from '../pages/admin/AdminMessages'
import AdminAnnouncements from '../pages/admin/AdminAnnouncements'
import AdminClasses from '../pages/admin/AdminClasses'
import StudentMessages from '../pages/student/StudentMessages'
import StudentDashboard from '../pages/student/StudentDashboard'
import StudentCourses from '../pages/student/StudentCourses'
import StudentCourseDetail from '../pages/student/StudentCourseDetail'
import CourseLearning from '../pages/student/CourseLearning'
import QuizAttempt from '../pages/student/QuizAttempt'
import QuizResult from '../pages/student/QuizResult'
import StudentBrowse from '../pages/student/BrowseCourses'
import StudentQuizzes from '../pages/student/StudentQuizzes'
import StudentProfile from '../pages/student/StudentProfile'
import StudentMyProfile from '../pages/student/StudentMyProfile'
import StudentOrderHistory from '../pages/student/StudentOrderHistory'
import StudentCertificates from '../pages/student/StudentCertificates'
import AdminCertificates from '../pages/admin/AdminCertificates'
import AdminFinance from '../pages/admin/AdminFinance'
import PaymentSuccess from '../pages/PaymentSuccess'
import PaymentCancel from '../pages/PaymentCancel'

const adminNav = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/admin/users', label: 'Users', icon: Users },
  { to: '/admin/courses', label: 'Courses', icon: BookOpen },
  { to: '/admin/announcements', label: 'Announcements', icon: Megaphone },
  { to: '/admin/classes', label: 'Classes', icon: Calendar },
  { to: '/admin/messages', label: 'Messages', icon: MessageSquare },
  { to: '/admin/finance', label: 'Finance', icon: DollarSign },
  { to: '/admin/certificates', label: 'Certificates', icon: Award },
  { to: '/admin/settings', label: 'System Settings', icon: Settings },
  { type: 'group', label: 'Account' },
  { to: '/admin/profile', label: 'Settings', icon: Settings, end: true },
  { to: '/admin/my-profile', label: 'My Profile', icon: User },
  { label: 'Logout', icon: LogOut, logout: true },
]

const teacherNav = [
  { to: '/teacher', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/teacher/courses', label: 'My Courses', icon: BookOpen },
  { to: '/teacher/assignments', label: 'Assignments', icon: ClipboardList },
  { to: '/teacher/quizzes', label: 'Quizzes', icon: HelpCircle },
  { to: '/teacher/announcements', label: 'Announcements', icon: Megaphone },
  { to: '/teacher/messages', label: 'Messages', icon: MessageSquare },
  { type: 'group', label: 'Earnings' },
  { to: '/teacher/earnings', label: 'Earnings', icon: LayoutDashboard, end: true },
  { to: '/teacher/payouts', label: 'Payouts', icon: DollarSign },
  { to: '/teacher/statements', label: 'Statements', icon: ClipboardList },
  { type: 'group', label: 'Account' },
  { to: '/teacher/profile', label: 'Settings', icon: Settings, end: true },
  { to: '/teacher/my-profile', label: 'My Profile', icon: User },
  { label: 'Logout', icon: LogOut, logout: true },
]

const studentNav = [
  { to: '/student', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/student/browse', label: 'Browse Courses', icon: Compass },
  { to: '/student/courses', label: 'My Courses', icon: BookOpen },
  { to: '/student/quizzes', label: 'Quizzes', icon: HelpCircle },
  { to: '/student/orders', label: 'Order History', icon: ShoppingBag },
  { to: '/student/certificates', label: 'Certificates', icon: Award },
  { to: '/student/messages', label: 'Messages', icon: MessageSquare },
  { type: 'group', label: 'Account' },
  { to: '/student/settings', label: 'Settings', icon: Settings, end: true },
  { to: '/student/profile', label: 'My Profile', icon: User },
  { label: 'Logout', icon: LogOut, logout: true },
]

const NotFound = () => (
  <div className="flex items-center justify-center h-screen bg-surface">
    <div className="text-center">
      <h1 className="text-6xl font-bold text-slate-300 mb-2">404</h1>
      <p className="text-slate-500">Page not found</p>
    </div>
  </div>
)

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/blog" element={<BlogPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
              <DashboardShell navItems={adminNav} />
            </ProtectedRoute>
          }
        >
          <Route index element={<AdminDashboard />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="courses" element={<AdminCourses />} />
          <Route path="announcements" element={<AdminAnnouncements />} />
          <Route path="classes" element={<AdminClasses />} />
          <Route path="messages" element={<AdminMessages />} />
          <Route path="settings" element={<AdminSettings />} />
          <Route path="finance" element={<AdminFinance />} />
          <Route path="certificates" element={<AdminCertificates />} />
          <Route path="profile" element={<StudentProfile />} />
          <Route path="my-profile" element={<StudentMyProfile settingsPath="/admin/profile" />} />
        </Route>

        <Route
          path="/teacher"
          element={
            <ProtectedRoute allowedRoles={[ROLES.TEACHER]}>
              <DashboardShell navItems={teacherNav} />
            </ProtectedRoute>
          }
        >
          <Route index element={<TeacherDashboard />} />
          <Route path="courses" element={<TeacherCourses />} />
          <Route path="courses/:courseId/quizzes" element={<QuizBuilder />} />
          <Route path="courses/:courseId" element={<CourseDetail />} />
          <Route path="assignments" element={<TeacherAssignments />} />
          <Route path="assignments/:assignmentId/submissions" element={<AssignmentGrading />} />
          <Route path="quizzes" element={<TeacherQuizzes />} />
          <Route path="quizzes/:quizId" element={<QuizQuestions />} />
          <Route path="quizzes/:quizId/results" element={<QuizResults />} />
          <Route path="announcements" element={<TeacherAnnouncements />} />
          <Route path="calendar" element={<ClassCalendar />} />
          <Route path="messages" element={<TeacherMessages />} />
          <Route path="earnings" element={<TeacherEarnings />} />
          <Route path="payouts" element={<TeacherPayouts />} />
          <Route path="statements" element={<TeacherStatements />} />
          <Route path="profile" element={<StudentProfile />} />
          <Route path="my-profile" element={<StudentMyProfile settingsPath="/teacher/profile" />} />
        </Route>

        <Route
          path="/student"
          element={
            <ProtectedRoute allowedRoles={[ROLES.STUDENT]}>
              <DashboardShell navItems={studentNav} />
            </ProtectedRoute>
          }
        >
          <Route index element={<StudentDashboard />} />
          <Route path="browse" element={<StudentBrowse />} />
          <Route path="courses" element={<StudentCourses />} />
          <Route path="courses/:courseId" element={<StudentCourseDetail />} />
          <Route path="learning/:courseId" element={<CourseLearning />} />
          <Route path="quizzes" element={<StudentQuizzes />} />
          <Route path="quizzes/:quizId/attempt/:attemptId" element={<QuizAttempt />} />
          <Route path="attempts/:attemptId/result" element={<QuizResult />} />
          <Route path="messages" element={<StudentMessages />} />
          <Route path="orders" element={<StudentOrderHistory />} />
          <Route path="certificates" element={<StudentCertificates />} />

          <Route path="profile" element={<StudentMyProfile />} />
          <Route path="settings" element={<StudentProfile />} />
        </Route>

        <Route path="/payment/success" element={<PaymentSuccess />} />
        <Route path="/payment/cancel" element={<PaymentCancel />} />

        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  )
}
