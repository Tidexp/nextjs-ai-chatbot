'use client';

import { useState } from 'react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { toast } from './toast';

type Tab = 'account' | 'data-controls';

export function SettingsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [tab, setTab] = useState<Tab>('account');
  const [displayName, setDisplayName] = useState('John Doe'); // mock data

  if (!open) return null;

  const handleDeleteAllChats = () => {
    if (!confirm('Are you sure you want to delete all chats?')) return;
    // gọi API xóa chats
    toast({ type: 'success', description: 'All chats deleted!' });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* overlay mờ nền */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      ></div>

      {/* popup full */}
      <div className="relative z-10 w-full max-w-5xl h-[90vh] bg-white dark:bg-zinc-900 rounded-xl shadow-xl flex overflow-hidden">
        {/* Navbar trái */}
        <div className="w-64 bg-gray-100 dark:bg-zinc-800 flex flex-col p-4">
          <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Settings</h2>
          <button
            className={`text-left p-2 rounded-md mb-2 ${tab === 'account' ? 'bg-gray-200 dark:bg-zinc-700 font-semibold' : ''}`}
            onClick={() => setTab('account')}
          >
            Account
          </button>
          <button
            className={`text-left p-2 rounded-md mb-2 ${tab === 'data-controls' ? 'bg-gray-200 dark:bg-zinc-700 font-semibold' : ''}`}
            onClick={() => setTab('data-controls')}
          >
            Data Controls
          </button>
          <Button variant="outline" className="mt-auto" onClick={onClose}>Close</Button>
        </div>

        {/* Nội dung tab bên phải */}
        <div className="flex-1 p-6 overflow-auto">
          {tab === 'account' && (
            <div className="flex flex-col gap-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Account</h3>
              <div>
                <label className="text-sm text-gray-700 dark:text-gray-300">Display Name</label>
                <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
              </div>
              <Button onClick={() => toast({ type: 'success', description: 'Profile updated!' })}>
                Save Changes
              </Button>
            </div>
          )}

          {tab === 'data-controls' && (
            <div className="flex flex-col gap-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Data Controls</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                This will delete all your chats permanently.
              </p>
              <Button variant="destructive" onClick={handleDeleteAllChats}>
                Delete All Chats
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
