import React from "react";
import { cn } from "@/lib/utils";

// Card frame shared by the General Settings cards. Defined at module level so
// the references stay stable across re-renders (prevents input focus loss).

export const SectionCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={cn("bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden", className)}>
    {children}
  </div>
);

export const SectionHeader = ({
  icon: Icon, title, children,
}: { icon: React.ElementType; title: string; children?: React.ReactNode }) => (
  <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-gray-100 bg-gray-50/70">
    <div className="flex items-center gap-2.5 min-w-0">
      <div className="p-1.5 bg-blue-50 rounded-md">
        <Icon className="h-4 w-4 text-blue-600" />
      </div>
      <h2 className="text-sm font-semibold text-gray-800 truncate">{title}</h2>
    </div>
    {children}
  </div>
);
