import type { ComponentProps } from 'react';
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
} from './ui/sidebar';

interface SidebarHistoryGroupProps extends ComponentProps<typeof SidebarGroup> {
  label: string;
  isEmpty?: boolean;
  emptyMessage?: string;
}

export function SidebarHistoryGroup({
  label,
  isEmpty,
  emptyMessage = 'No items to display',
  children,
  ...props
}: SidebarHistoryGroupProps) {
  return (
    <SidebarGroup {...props}>
      <SidebarGroupLabel>{label}</SidebarGroupLabel>
      <SidebarGroupContent>
        {isEmpty ? (
          <div className="px-2 text-zinc-500 w-full flex flex-row justify-center items-center text-sm gap-2">
            {emptyMessage}
          </div>
        ) : (
          children
        )}
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
