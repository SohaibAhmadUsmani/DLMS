export default function PhotoCollage({ leftImage, topRightImage, bottomRightImage }) {
  return (
    <>
      <div className="hidden max-md:flex flex-col gap-4 h-auto">
        <div className="h-[240px] overflow-hidden">
          <img src={leftImage} alt="" className="w-full h-full object-cover" style={{ borderRadius: '24px 24px 0 0', objectPosition: '5% 15%' }} />
        </div>
        <div className="h-[240px] overflow-hidden">
          <img src={topRightImage} alt="" className="w-full h-full object-cover" />
        </div>
        <div className="h-[240px] overflow-hidden">
          <img src={bottomRightImage} alt="" className="w-full h-full object-cover" style={{ borderRadius: '0 0 24px 24px' }} />
        </div>
      </div>
      <div className="max-md:hidden grid grid-cols-2 gap-4 h-[520px]">
        <div className="row-span-2 h-full overflow-hidden">
          <img src={leftImage} alt="" className="w-full h-full object-cover" style={{ borderRadius: '24px 0 0 24px', objectPosition: '5% 15%' }} />
        </div>
        <div className="flex flex-col gap-4 h-full">
          <div className="flex-1 overflow-hidden">
            <img src={topRightImage} alt="" className="w-full h-full object-cover" style={{ borderRadius: '0 24px 0 0' }} />
          </div>
          <div className="flex-1 overflow-hidden">
            <img src={bottomRightImage} alt="" className="w-full h-full object-cover" style={{ borderRadius: '0 0 24px 0' }} />
          </div>
        </div>
      </div>
    </>
  )
}
