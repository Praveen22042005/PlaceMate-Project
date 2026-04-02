import React from 'react';

export function TableSkeleton({ columns = 4, rows = 5 }: { columns?: number, rows?: number }) {
  return (
    <div className="w-full">
      {/* Header Skeleton */}
      <div className="flex border-b border-slate-200 bg-white">
        {Array(columns).fill(0).map((_, i) => (
          <div key={`th-${i}`} className="flex-1 p-4">
            <div className="h-4 bg-slate-200 rounded animate-pulse w-24"></div>
          </div>
        ))}
      </div>
      
      {/* Body Skeleton */}
      <div className="flex flex-col">
        {Array(rows).fill(0).map((_, rowIndex) => (
          <div key={`tr-${rowIndex}`} className="flex border-b border-slate-100 bg-white/50">
            {Array(columns).fill(0).map((_, colIndex) => (
              <div key={`td-${rowIndex}-${colIndex}`} className="flex-1 p-4">
                <div className="flex items-center gap-3">
                  {colIndex === 0 && (
                    <div className="w-10 h-10 rounded-xl bg-slate-200 animate-pulse shrink-0"></div>
                  )}
                  <div className="flex flex-col gap-2 w-full">
                    <div className="h-4 bg-slate-200 rounded animate-pulse w-3/4"></div>
                    {colIndex === 0 && <div className="h-3 bg-slate-200 rounded animate-pulse w-1/2"></div>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function CardSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array(count).fill(0).map((_, i) => (
        <div key={`card-${i}`} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col h-full">
          <div className="flex justify-between items-start mb-4">
            <div className="w-12 h-12 bg-slate-200 rounded-xl animate-pulse"></div>
            <div className="w-20 h-6 bg-slate-200 rounded-full animate-pulse"></div>
          </div>
          <div className="w-3/4 h-5 bg-slate-200 rounded animate-pulse mb-3"></div>
          <div className="w-1/2 h-4 bg-slate-200 rounded animate-pulse mb-6"></div>
          
          <div className="mt-auto space-y-3">
            <div className="w-full h-4 bg-slate-200 rounded animate-pulse"></div>
            <div className="w-5/6 h-4 bg-slate-200 rounded animate-pulse"></div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function DetailedCardSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array(count).fill(0).map((_, i) => (
        <div key={`detail-${i}`} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm h-full flex flex-col">
          <div className="flex items-start justify-between mb-4">
             <div className="w-12 h-12 bg-slate-200 rounded-xl animate-pulse"></div>
             <div className="w-16 h-6 bg-slate-200 rounded-full animate-pulse"></div>
          </div>
          <div className="w-2/3 h-6 bg-slate-200 rounded animate-pulse mb-2"></div>
          <div className="w-1/2 h-4 bg-slate-200 rounded animate-pulse mb-6"></div>
          
          <div className="space-y-4 mb-6 flex-1">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-slate-200 rounded animate-pulse"></div>
              <div className="w-1/3 h-4 bg-slate-200 rounded animate-pulse"></div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-slate-200 rounded animate-pulse"></div>
              <div className="w-1/2 h-4 bg-slate-200 rounded animate-pulse"></div>
            </div>
          </div>
          
          <div className="flex gap-2">
            <div className="w-full h-10 bg-slate-200 rounded-lg animate-pulse"></div>
          </div>
        </div>
      ))}
    </div>
  );
}
