import { X, ShoppingCart, Trash2, ArrowRight } from 'lucide-react'

export default function CartDrawer({ items, onClose, onRemove, onCheckout }) {
  const total = items.reduce((sum, item) => sum + (item.price || 0), 0)

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-50" onClick={onClose} />
      <div className="fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-50 flex flex-col animate-[slideInRight_0.3s_cubic-bezier(0.16,1,0.3,1)]">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <ShoppingCart size={20} className="text-brand-pink" />
            <span className="font-semibold text-slate-800">Cart ({items.length})</span>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-card transition-colors" aria-label="Close cart">
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <ShoppingCart size={48} className="text-slate-200 mb-4" />
              <p className="text-slate-500 font-medium">Your cart is empty</p>
              <p className="text-xs text-slate-400 mt-1">Add courses to get started</p>
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((item) => (
                <div key={item.title} className="flex gap-3 bg-slate-50 rounded-card p-3">
                  {item.bannerImage && (
                    <div className="w-20 h-16 rounded-md overflow-hidden shrink-0">
                      <img src={item.bannerImage} alt={item.title} className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-slate-800 line-clamp-2">{item.title}</h4>
                    <p className="text-xs text-slate-400 mt-1">{item.authorName}</p>
                    <p className="text-sm font-bold text-brand-pink mt-1">${item.price?.toFixed(2)}</p>
                  </div>
                  <button onClick={() => onRemove(item.title)} className="p-1.5 hover:bg-red-50 rounded-card transition-colors self-start" aria-label={`Remove ${item.title}`}>
                    <Trash2 size={16} className="text-slate-400 hover:text-red-500" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {items.length > 0 && (
          <div className="border-t border-slate-100 p-5 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">Subtotal</span>
              <span className="font-bold text-slate-800">${total.toFixed(2)}</span>
            </div>
            <button onClick={onCheckout} className="w-full bg-brand-pink hover:bg-rose-600 text-white font-semibold text-sm py-3 rounded-card transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2">
              Proceed to Checkout <ArrowRight size={16} />
            </button>
          </div>
        )}

        <style>{`
          @keyframes slideInRight {
            from { transform: translateX(100%); }
            to { transform: translateX(0); }
          }
        `}</style>
      </div>
    </>
  )
}
