import { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { Search, Star, BookOpen, Clock, User, ArrowRight } from 'lucide-react'
import courseImg1 from '../../assets/web.avif'
import courseImg2 from '../../assets/courses2.jpg'
import courseImg3 from '../../assets/courses3.webp'
import courseImg4 from '../../assets/courses4.webp'
import uiuxImg from '../../assets/ui-ux.jpg'
import pythonImg from '../../assets/python.jpg'
import mathsImg from '../../assets/maths.jpg'
import webdevIcon from '../../assets/webdevsvg.svg'
import uxsvg from '../../assets/uxsvg.png'
import seosvg from '../../assets/seosvg.png'
import datasciencesvg from '../../assets/datasciencesvg.png'

const allCourses = [
  { title: 'Complete Web Development Bootcamp', category: 'Development', categorySlug: 'development', instructor: 'Usman Malik', price: 49.99, rating: 4.9, students: 2340, duration: '12 weeks', image: courseImg1, icon: webdevIcon, badge: '#000000' },
  { title: 'React & Frontend Mastery', category: 'Development', categorySlug: 'development', instructor: 'Zain Khan', price: 54.99, rating: 4.8, students: 1890, duration: '8 weeks', image: courseImg2, icon: webdevIcon, badge: '#7C3AED' },
  { title: 'Digital Content Strategy & Production', category: 'Design', categorySlug: 'design', instructor: 'Sana Tariq', price: 39.99, rating: 4.7, students: 3120, duration: '6 weeks', image: courseImg3, icon: uxsvg, badge: '#1E5FBF' },
  { title: 'Lifestyle & Mentorship Program', category: 'Lifestyle', categorySlug: 'lifestyle', instructor: 'Sarah Mazhar', price: 44.99, rating: 4.8, students: 1560, duration: '10 weeks', image: courseImg4, icon: uxsvg, badge: '#E8A70A' },
  { title: 'UI/UX Design Fundamentals', category: 'Design', categorySlug: 'design', instructor: 'Sana Tariq', price: 34.99, rating: 4.6, students: 980, duration: '8 weeks', image: uiuxImg, icon: uxsvg, badge: '#1E5FBF' },
  { title: 'Data Science & Machine Learning', category: 'Data Science', categorySlug: 'data-science', instructor: 'Usman Malik', price: 64.99, rating: 4.9, students: 1450, duration: '14 weeks', image: pythonImg, icon: datasciencesvg, badge: '#F59E0B' },
  { title: 'Digital Marketing Mastery', category: 'Marketing', categorySlug: 'marketing', instructor: 'Zain Khan', price: 29.99, rating: 4.5, students: 2100, duration: '6 weeks', image: mathsImg, icon: seosvg, badge: '#EF4444' },
  { title: 'Python for Beginners', category: 'Development', categorySlug: 'development', instructor: 'Usman Malik', price: 44.99, rating: 4.7, students: 3200, duration: '10 weeks', image: pythonImg, icon: webdevIcon, badge: '#000000' },
]

const categories = ['All', 'Development', 'Design', 'Data Science', 'Marketing', 'Lifestyle']

export default function CoursesPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [search, setSearch] = useState('')

  const activeCategory = searchParams.get('category') || 'all'

  useEffect(() => { window.scrollTo(0, 0) }, [])

  const filtered = allCourses.filter(c => {
    const matchCategory = activeCategory === 'all' || c.categorySlug === activeCategory
    const matchSearch = !search || c.title.toLowerCase().includes(search.toLowerCase()) || c.instructor.toLowerCase().includes(search.toLowerCase())
    return matchCategory && matchSearch
  })

  const setCategory = (slug) => {
    if (slug === 'all') setSearchParams({})
    else setSearchParams({ category: slug })
  }

  return (
    <div className="font-sans">
      {/* Header */}
      <section className="bg-gradient-to-br from-[#2A1B54] to-[#1C1338] text-white py-20 md:py-28 px-5 text-center">
        <span className="inline-block text-xs font-semibold text-brand-pink bg-white/10 px-4 py-1.5 rounded-full uppercase tracking-wider mb-4">Our Courses</span>
        <h1 className="text-4xl md:text-5xl font-bold mb-4">Browse Our Courses</h1>
        <p className="text-white/70 text-lg max-w-2xl mx-auto">Find the perfect course to advance your skills and career.</p>
      </section>

      {/* Filters */}
      <section className="py-8 px-5 border-b border-slate-100">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex gap-2 flex-wrap">
              {categories.map(c => {
                const slug = c === 'All' ? 'all' : c.toLowerCase().replace(/\s+/g, '-')
                return (
                  <button
                    key={c}
                    onClick={() => setCategory(slug)}
                    className={`text-sm px-4 py-2 rounded-full font-medium transition-all ${
                      activeCategory === slug ? 'bg-brand-pink text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {c}
                  </button>
                )
              })}
            </div>
            <div className="relative w-full md:w-72">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search courses..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand-pink/50"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Course grid */}
      <section className="py-12 md:py-16 px-5">
        <div className="max-w-7xl mx-auto">
          {filtered.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-slate-400 text-lg">No courses found matching your criteria.</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filtered.map((course, i) => (
                <div key={i} className="bg-white rounded-2xl border border-slate-100 overflow-hidden hover:shadow-md transition-all duration-300 group">
                  <div className="h-48 overflow-hidden relative">
                    <img src={course.icon} alt="" className="absolute top-3 left-3 w-10 h-10 object-contain z-10" />
                    <img src={course.image} alt={course.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                  </div>
                  <div className="p-5">
                    <span className="text-[11px] font-semibold text-white px-2.5 py-1 rounded-full" style={{ backgroundColor: course.badge }}>{course.category}</span>
                    <h3 className="font-semibold text-slate-800 mt-2 mb-2 line-clamp-2">{course.title}</h3>
                    <div className="flex items-center gap-1 text-xs text-text-secondary mb-3">
                      <User size={12} /> {course.instructor}
                    </div>
                    <div className="flex items-center justify-between text-xs text-text-secondary mb-3">
                      <span className="flex items-center gap-1"><Clock size={12} /> {course.duration}</span>
                      <span className="flex items-center gap-1"><Star size={12} className="text-brand-yellow fill-brand-yellow" /> {course.rating}</span>
                    </div>
                    <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                      <span className="text-lg font-bold text-slate-900">${course.price}</span>
                      <span className="text-xs font-semibold text-brand-pink flex items-center gap-1 group-hover:gap-2 transition-all cursor-pointer">
                        Details <ArrowRight size={12} />
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
