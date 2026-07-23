import { useEffect } from 'react'
import { ArrowRight } from 'lucide-react'
import { TopUtilityBar, Navbar } from '../../components/ui'
import { useScrollAnimation } from '../../hooks/useScrollAnimation'
import blogImg1 from '../../assets/blog-22.jpg'
import blogImg2 from '../../assets/blog-23.jpg'
import blogImg3 from '../../assets/blog-24.jpg'

const blogPosts = [
  { title: '10 Tips for Effective Online Learning', excerpt: 'Discover strategies to make the most of your online learning experience.', date: 'Jan 15, 2026', image: blogImg1 },
  { title: 'The Future of Education: AI in Learning', excerpt: 'How artificial intelligence is transforming the education landscape.', date: 'Jan 10, 2026', image: blogImg2 },
  { title: 'Career Change Guide: Switching to Tech', excerpt: 'A comprehensive guide to transitioning into a tech career.', date: 'Jan 5, 2026', image: blogImg3 },
]

export default function BlogPage() {
  useEffect(() => { window.scrollTo(0, 0) }, [])

  return (
    <div className="font-sans">
      <TopUtilityBar />
      <Navbar />

      <section className="py-20 md:py-28 px-5 bg-surface-strong">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <span className="inline-block text-xs font-semibold text-brand-pink bg-rose-50 px-4 py-1.5 rounded-full uppercase tracking-wider mb-4">Blog</span>
            <p className="text-text-secondary text-sm max-w-xl mx-auto">Stay updated with the latest in education and technology.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {blogPosts.map((post, i) => (
              <article key={post.title} className="bg-white rounded border border-slate-100 overflow-hidden hover:shadow-[var(--shadow-1)] transition-all duration-500 group">
                <div className="h-60 overflow-hidden">
                  <img src={post.image} alt={post.title} className="w-full h-full object-cover transition-transform duration-500 ease-in-out group-hover:scale-110" style={{ objectPosition: 'center 25%' }} />
                </div>
                <div className="p-5">
                  <p className="text-xs text-text-secondary mb-2">{post.date}</p>
                  <h2 className="font-semibold text-slate-800 line-clamp-2 mb-2">{post.title}</h2>
                  <p className="text-xs text-text-secondary line-clamp-2 mb-3">{post.excerpt}</p>
                  <span className="text-xs font-semibold text-brand-pink flex items-center gap-1 group-hover:gap-2 transition-all cursor-pointer">
                    Read More <ArrowRight size={12} />
                  </span>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}