export default function CTACard({ heading, subtext, buttonText, buttonClass, blobColor, imageSrc, imageStyle, onButtonClick }) {
  return (
    <div
      className="relative overflow-hidden bg-white flex"
      style={{
        borderRadius: '20px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
        height: '270px',
      }}
    >
      <div className="relative z-10 flex flex-col justify-center px-8 md:px-10 flex-1">
        <h3 className="text-[22px] font-bold mb-3" style={{ color: '#1a1a2e' }}>{heading}</h3>
        <p className="text-[14px] leading-relaxed mb-5" style={{ color: '#6b7280', maxWidth: '220px' }}>{subtext}</p>
        <button
          onClick={onButtonClick}
          className={`self-start inline-flex items-center gap-1.5 text-white text-sm font-semibold px-5 py-2.5 rounded-full transition-all duration-200 hover:scale-[1.03] active:scale-[0.98] shadow-sm ${buttonClass}`}
        >
          {buttonText} <span className="text-sm leading-none">›</span>
        </button>
      </div>

      <div className="absolute right-0 top-0 bottom-0 flex items-end justify-end pointer-events-none" style={{ width: '55%' }}>
        <div
          className="absolute"
          style={{
            right: '-10px',
            bottom: '-10px',
            width: '90%',
            height: '90%',
            borderRadius: '100px 20px 20px 100px',
            background: blobColor,
          }}
        />
        {imageSrc && (
          <img
            src={imageSrc}
            alt=""
            className="relative object-contain bottom-0"
            style={{
              height: imageStyle?.height || '110%',
              maxWidth: imageStyle?.maxWidth || '85%',
              zIndex: 2,
              objectPosition: imageStyle?.objectPosition || 'bottom center',
              filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.1))',
              ...(imageStyle?.extra || {}),
            }}
          />
        )}
      </div>
    </div>
  )
}
