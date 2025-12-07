'use client';

import type { User } from 'next-auth';
import React from 'react';

import { SidebarHistory } from '@/components/sidebar-history';
import { SidebarUserNav } from '@/components/sidebar-user-nav';
import { Button } from '@/components/ui/button';
import { SidebarLeftIcon } from '@/components/icons';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  useSidebar,
} from '@/components/ui/sidebar';
import Link from 'next/link';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { useInstructorMode } from '@/hooks/use-instructor-mode';

export function AppSidebar({ user }: { user: User | undefined }) {
  const { setOpenMobile, toggleSidebar, state, open, setOpen } = useSidebar();
  const [isHovering, setIsHovering] = React.useState(false);
  const { active, toggle } = useInstructorMode();
  const isCollapsed = state === 'collapsed';

  return (
    <div className="h-full" aria-live="off">
      {/* Wrapper for hover state separated to satisfy lint rule */}
      <div
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        className="h-full"
        role="button"
        tabIndex={-1}
        aria-label="Sidebar hover region"
        onKeyDown={(e) => {
          if (e.key === 'Escape') setIsHovering(false);
        }}
      >
        <Sidebar
          collapsible="icon"
          className="group-data-[side=left]:border-r-0"
        >
          <SidebarHeader>
            <SidebarMenu>
              <div className="flex flex-row justify-between items-center">
                {isCollapsed ? (
                  <div className="w-full flex items-center justify-center">
                    {!isHovering ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Link
                            href="/"
                            onClick={() => {
                              setOpenMobile(false);
                            }}
                            className="flex items-center justify-center w-10 h-10 rounded-md bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold text-lg hover:opacity-80 transition"
                          >
                            CS
                          </Link>
                        </TooltipTrigger>
                        <TooltipContent side="right">
                          ChatSkibidi
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            type="button"
                            className="w-10 h-10 p-0 flex items-center justify-center hover:bg-muted transition"
                            onClick={toggleSidebar}
                          >
                            <svg
                              className="w-5 h-5"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                            >
                              <path
                                d="M14 6l6 6-6 6"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="right">
                          Expand Sidebar
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                ) : (
                  <>
                    <Link
                      href="/"
                      onClick={() => {
                        setOpenMobile(false);
                      }}
                      className="flex flex-row gap-3 items-center"
                    >
                      <span className="text-lg font-semibold px-2 hover:bg-muted rounded-md cursor-pointer">
                        ChatSkibidi
                      </span>
                    </Link>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          type="button"
                          className="p-2 h-fit"
                          onClick={toggleSidebar}
                        >
                          <SidebarLeftIcon size={16} />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent align="end">
                        Collapse Sidebar
                      </TooltipContent>
                    </Tooltip>
                  </>
                )}
              </div>
            </SidebarMenu>
          </SidebarHeader>
          <SidebarContent>
            {!isCollapsed && <SidebarHistory user={user} />}
            {!isCollapsed && (
              <div className="px-2 py-2">
                <Link
                  href="/analytics"
                  onClick={() => setOpenMobile(false)}
                  className="flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-muted transition-colors"
                >
                  📊 Analytics
                </Link>
                <button
                  type="button"
                  onClick={toggle}
                  className={`mt-2 w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors border ${active ? 'bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-500' : 'hover:bg-muted'}`}
                >
                  {active ? '🎓 Instructor Mode: ON' : '🎓 Instructor Mode'}
                </button>
              </div>
            )}
          </SidebarContent>
          <SidebarFooter>
            {!isCollapsed && user && <SidebarUserNav user={user} />}
            {isCollapsed && user && (
              <div className="flex flex-col items-center py-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 flex items-center justify-center text-white text-sm font-semibold cursor-pointer hover:opacity-80 transition">
                      {user.email?.[0]?.toUpperCase() || 'U'}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="right">{user.email}</TooltipContent>
                </Tooltip>
              </div>
            )}
          </SidebarFooter>
        </Sidebar>
      </div>
    </div>
  );
}
