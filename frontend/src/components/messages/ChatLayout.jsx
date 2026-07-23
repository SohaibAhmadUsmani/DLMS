export default function ChatLayout({ leftPanel, rightPanel }) {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Messages</h1>
      </div>
      <hr className="border-slate-200" />

      <div className="flex border border-slate-200 rounded-card overflow-hidden h-[calc(100vh-16rem)] min-h-[480px] bg-white">
        <div className="w-[30%] min-w-[260px] shrink-0 border-r border-slate-200">
          {leftPanel}
        </div>
        <div className="flex-1">
          {rightPanel}
        </div>
      </div>
    </div>
  )
}
