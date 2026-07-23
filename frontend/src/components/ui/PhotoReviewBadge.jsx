export default function PhotoReviewBadge({ groupPhoto, avatars = [], reviewCount = "200+" }) {
  return (
    <div className="relative inline-block" style={{ marginTop: '24px', marginLeft: '24px' }}>
      <img
        src={groupPhoto}
        alt=""
        className="w-full block"
        style={{ borderRadius: '28px', boxShadow: '0 10px 30px rgba(0,0,0,0.15)', objectFit: 'cover' }}
      />
      <div
        className="absolute flex flex-col z-10"
        style={{
          top: '-24px',
          left: '-24px',
          background: '#0A0A0A',
          borderRadius: '20px',
          padding: '16px 20px',
          gap: '8px',
        }}
      >
        <div className="flex items-center">
          {avatars.map((src, i) => (
            <img
              key={i}
              src={src}
              alt=""
              className="rounded-full object-cover"
              style={{
                width: '34px',
                height: '34px',
                border: '2px solid #FFFFFF',
                marginLeft: i === 0 ? 0 : '-10px',
              }}
            />
          ))}
        </div>
        <p className="whitespace-nowrap text-[18px] font-extrabold">
          <span style={{ color: '#EF4368' }}>{reviewCount}</span>
          <span style={{ color: '#FFFFFF', fontWeight: 700, marginLeft: '4px' }}>Reviews</span>
        </p>
      </div>
    </div>
  )
}
