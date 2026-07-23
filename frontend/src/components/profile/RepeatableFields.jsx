import { Plus, X } from 'lucide-react'
import Input from '../ui/Input'

export default function RepeatableFields({ fields, setFields, fieldsConfig, label, description }) {
  const addField = () => {
    const empty = {}
    fieldsConfig.forEach(({ key, type, defaultValue }) => {
      empty[key] = defaultValue !== undefined ? defaultValue : (type === 'checkbox' ? false : '')
    })
    setFields([...fields, empty])
  }

  const removeField = (idx) => {
    if (fields.length <= 1) return
    setFields(fields.filter((_, i) => i !== idx))
  }

  const updateField = (idx, key, value) => {
    const updated = fields.map((f, i) => (i === idx ? { ...f, [key]: value } : f))
    setFields(updated)
  }

  return (
    <div>
      <h3 className="font-bold text-slate-800">{label}</h3>
      <p className="text-xs text-slate-500 mt-0.5 mb-4">{description}</p>

      {fields.map((field, idx) => (
        <div key={idx} className="relative mb-4 p-4 border border-slate-200 rounded-card">
          {fields.length > 1 && (
            <button
              type="button"
              onClick={() => removeField(idx)}
              className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-danger text-white flex items-center justify-center hover:bg-red-600 transition-colors cursor-pointer"
              aria-label={`Remove ${label}`}
            >
              <X size={14} />
            </button>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
            {fieldsConfig.map(({ key, label: fieldLabel, type, placeholder, required, ...extra }) => (
              <div key={key}>
                {type === 'checkbox' ? (
                  <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!field[key]}
                      onChange={(e) => updateField(idx, key, e.target.checked)}
                      className="rounded border-slate-300 text-primary focus:ring-primary/30"
                    />
                    {fieldLabel}
                  </label>
                ) : (
                  <Input
                    label={fieldLabel}
                    type={type || 'text'}
                    value={field[key] || ''}
                    onChange={(e) => updateField(idx, key, e.target.value)}
                    placeholder={placeholder}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={addField}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:text-amber-600 transition-colors cursor-pointer"
      >
        <Plus size={16} />
        Add New
      </button>
    </div>
  )
}
