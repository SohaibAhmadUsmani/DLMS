import { useState, useEffect } from 'react'
import { MapPin, Phone, Mail, Clock, Send } from 'lucide-react'

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' })
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => { window.scrollTo(0, 0) }, [])

  const handleSubmit = (e) => {
    e.preventDefault()
    setSubmitted(true)
  }

  return (
    <div className="font-sans">
      {/* Header */}
      <section className="bg-gradient-to-br from-[#2A1B54] to-[#1C1338] text-white py-20 md:py-28 px-5 text-center">
        <span className="inline-block text-xs font-semibold text-brand-pink bg-white/10 px-4 py-1.5 rounded-full uppercase tracking-wider mb-4">Contact Us</span>
        <h1 className="text-4xl md:text-5xl font-bold mb-4">Get in Touch</h1>
        <p className="text-white/70 text-lg max-w-2xl mx-auto">Have questions? We'd love to hear from you. Send us a message and we'll respond as soon as possible.</p>
      </section>

      {/* Contact info & form */}
      <section className="py-16 md:py-20 px-5">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12">
          {/* Info */}
          <div>
            <h2 className="text-2xl font-bold text-slate-900 mb-6">Contact Information</h2>
            <div className="space-y-5">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-brand-pink/10 flex items-center justify-center shrink-0">
                  <MapPin size={18} className="text-brand-pink" />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-800 text-sm">Address</h4>
                  <p className="text-text-secondary text-sm">Staten Island, New York, USA</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-brand-pink/10 flex items-center justify-center shrink-0">
                  <Phone size={18} className="text-brand-pink" />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-800 text-sm">Phone</h4>
                  <p className="text-text-secondary text-sm">(702) 555-0122</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-brand-pink/10 flex items-center justify-center shrink-0">
                  <Mail size={18} className="text-brand-pink" />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-800 text-sm">Email</h4>
                  <p className="text-text-secondary text-sm">support@dlms.com</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-brand-pink/10 flex items-center justify-center shrink-0">
                  <Clock size={18} className="text-brand-pink" />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-800 text-sm">Working Hours</h4>
                  <p className="text-text-secondary text-sm">Mon - Fri: 9:00 AM - 6:00 PM</p>
                </div>
              </div>
            </div>
          </div>

          {/* Form */}
          <div className="bg-white rounded-2xl border border-slate-100 p-8 shadow-sm">
            {submitted ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                  <Send size={28} className="text-emerald-500" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Message Sent!</h3>
                <p className="text-text-secondary text-sm">Thank you for reaching out. We'll get back to you shortly.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Your Name</label>
                    <input type="text" required value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand-pink/50" placeholder="John Doe" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Your Email</label>
                    <input type="email" required value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand-pink/50" placeholder="john@example.com" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Subject</label>
                  <input type="text" required value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))} className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand-pink/50" placeholder="How can we help?" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Message</label>
                  <textarea required rows={5} value={form.message} onChange={e => setForm(p => ({ ...p, message: e.target.value }))} className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand-pink/50 resize-none" placeholder="Write your message here..." />
                </div>
                <button type="submit" className="w-full bg-brand-pink text-white py-3 rounded-lg font-semibold text-sm hover:bg-rose-600 transition-colors flex items-center justify-center gap-2">
                  <Send size={16} /> Send Message
                </button>
              </form>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
