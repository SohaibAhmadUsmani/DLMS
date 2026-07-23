import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Award, Users, BookOpen, Globe, CheckCircle, ArrowRight } from 'lucide-react'
import aboutImg from '../../assets/about-1.jpg'
import instructorImg from '../../assets/instructor.webp'
import userImg from '../../assets/user-01.webp'
import featureGroup from '../../assets/feature-group.webp'

const stats = [
  { icon: Users, value: '35K+', label: 'Students Enrolled' },
  { icon: BookOpen, value: '50+', label: 'Courses' },
  { icon: Award, value: '968+', label: 'Expert Tutors' },
  { icon: Globe, value: '56', label: 'Countries' },
]

const values = [
  { title: 'Quality Education', desc: 'We provide top-notch courses designed by industry experts to ensure you get the best learning experience.' },
  { title: 'Flexible Learning', desc: 'Learn at your own pace with lifetime access to all course materials, anytime, anywhere.' },
  { title: 'Career Focused', desc: 'Our curriculum is built to help you gain practical skills that directly translate to career growth.' },
]

export default function AboutPage() {
  useEffect(() => { window.scrollTo(0, 0) }, [])

  return (
    <div className="font-sans">
      {/* Hero */}
      <section className="relative bg-gradient-to-br from-[#2A1B54] to-[#1C1338] text-white py-20 md:py-28 px-5 overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-brand-pink/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-brand-purple/10 rounded-full blur-3xl" />
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <span className="inline-block text-xs font-semibold text-brand-pink bg-white/10 px-4 py-1.5 rounded-full uppercase tracking-wider mb-4">About Us</span>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Empowering Learners Worldwide</h1>
          <p className="text-white/70 text-lg max-w-2xl mx-auto">DLMS is dedicated to making quality education accessible to everyone. We connect students with expert instructors from around the globe.</p>
        </div>
      </section>

      {/* Mission & Image */}
      <section className="py-16 md:py-20 px-5">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <div className="rounded-2xl overflow-hidden">
            <img src={aboutImg} alt="About DLMS" className="w-full h-[400px] object-cover" />
          </div>
          <div>
            <span className="inline-block text-xs font-semibold text-brand-pink bg-rose-50 px-4 py-1.5 rounded-full uppercase tracking-wider mb-4">Our Mission</span>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">Transforming Education for the Digital Age</h2>
            <p className="text-text-secondary text-sm leading-relaxed mb-6">At DLMS, we believe that education should be accessible, engaging, and practical. Our platform brings together expert instructors and motivated learners in a dynamic online environment. Whether you're looking to advance your career, learn a new skill, or explore a passion, we have the right course for you.</p>
            <div className="space-y-3">
              {values.map(v => (
                <div key={v.title} className="flex gap-3">
                  <CheckCircle size={20} className="text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-slate-800 text-sm">{v.title}</h4>
                    <p className="text-text-secondary text-xs">{v.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-12 md:py-16 px-5 bg-surface-strong">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map(s => (
            <div key={s.label} className="text-center">
              <div className="w-12 h-12 rounded-full bg-brand-pink/10 flex items-center justify-center mx-auto mb-3">
                <s.icon size={22} className="text-brand-pink" />
              </div>
              <p className="text-2xl md:text-3xl font-bold text-slate-900">{s.value}</p>
              <p className="text-text-secondary text-sm">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Team */}
      <section className="py-16 md:py-20 px-5">
        <div className="max-w-7xl mx-auto text-center">
          <span className="inline-block text-xs font-semibold text-brand-pink bg-rose-50 px-4 py-1.5 rounded-full uppercase tracking-wider mb-4">Our Team</span>
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-3">Meet Our Expert Instructors</h2>
          <p className="text-text-secondary text-sm max-w-xl mx-auto mb-10">Learn from industry professionals who bring real-world experience to every lesson.</p>
          <div className="grid md:grid-cols-4 gap-6">
            {[
              { name: 'Zain Khan', role: 'React Developer', photo: instructorImg },
              { name: 'Usman Malik', role: 'Web Developer', photo: userImg },
              { name: 'Sana Tariq', role: 'Content Creator', photo: instructorImg },
              { name: 'Sarah Mazhar', role: 'Life Coach', photo: featureGroup },
            ].map(t => (
              <div key={t.name} className="bg-white rounded-2xl border border-slate-100 p-6 text-center hover:shadow-md transition-shadow">
                <img src={t.photo} alt={t.name} className="w-20 h-20 rounded-full object-cover mx-auto mb-3" />
                <h4 className="font-semibold text-slate-800">{t.name}</h4>
                <p className="text-text-secondary text-xs">{t.role}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-5 bg-gradient-to-br from-[#2A1B54] to-[#1C1338]">
        <div className="max-w-3xl mx-auto text-center text-white">
          <h2 className="text-3xl md:text-4xl font-bold mb-3">Ready to Start Your Learning Journey?</h2>
          <p className="text-white/60 text-sm mb-8">Join thousands of students already learning on DLMS.</p>
          <Link to="/register" className="inline-flex items-center gap-2 bg-brand-pink text-white px-8 py-3 rounded-lg font-semibold hover:bg-rose-600 transition-colors">
            Get Started Free <ArrowRight size={18} />
          </Link>
        </div>
      </section>
    </div>
  )
}
