'use client';

import { useEffect, useState } from 'react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { toast } from './toast';
import { deleteAllChats } from '@/app/(chat)/actions';

type Tab = 'account' | 'data-controls';

export function SettingsModal({
  open,
  onClose,
}: { open: boolean; onClose: () => void }) {
  const [tab, setTab] = useState<Tab>('account');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        const res = await fetch('/api/account', { cache: 'no-store' });
        if (!res.ok) throw new Error('Failed to load account');
        const data = await res.json();
        setDisplayName(data.displayName || '');
      } catch (e) {
        // ignore
      }
    })();
  }, [open]);

  if (!open) return null;

  const handleDeleteAllChats = async () => {
    if (!confirm('Are you sure you want to delete all chats?')) return;
    try {
      setLoading(true);
      console.log('[Settings] Deleting all chats...');
      await deleteAllChats();
      console.log('[Settings] All chats deleted successfully');
      toast({ type: 'success', description: 'All chats deleted!' });
      // notify UI to refresh history
      try {
        window.dispatchEvent(new Event('chatCreated'));
      } catch {}
    } catch (e: any) {
      console.error('[Settings] Delete all chats error:', e);
      toast({ type: 'error', description: 'Failed to delete chats' });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAccount = async () => {
    try {
      setLoading(true);
      console.log('[Settings] Updating display name:', displayName);
      const res = await fetch('/api/account', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName }),
      });
      console.log('[Settings] Update response:', res.status, res.statusText);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        console.error('[Settings] Update error:', errorData);
        throw new Error('Failed');
      }
      const result = await res.json();
      console.log('[Settings] Update result:', result);
      toast({ type: 'success', description: 'Profile updated!' });
    } catch (e) {
      console.error('[Settings] Update profile error:', e);
      toast({ type: 'error', description: 'Failed to update profile' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* overlay mờ nền */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        aria-hidden="true"
        onClick={onClose}
      />

      {/* popup full */}
      <div className="relative z-10 w-full max-w-5xl h-[90vh] bg-white dark:bg-zinc-900 rounded-xl shadow-xl flex overflow-hidden">
        {/* Navbar trái */}
        <div className="w-64 bg-gray-100 dark:bg-zinc-800 flex flex-col p-4">
          <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
            Settings
          </h2>
          <button
            type="button"
            className={`text-left p-2 rounded-md mb-2 ${tab === 'account' ? 'bg-gray-200 dark:bg-zinc-700 font-semibold' : ''}`}
            onClick={() => setTab('account')}
          >
            Account
          </button>
          <button
            type="button"
            className={`text-left p-2 rounded-md mb-2 ${tab === 'data-controls' ? 'bg-gray-200 dark:bg-zinc-700 font-semibold' : ''}`}
            onClick={() => setTab('data-controls')}
          >
            Data Controls
          </button>
          <Button variant="outline" className="mt-auto" onClick={onClose}>
            Close
          </Button>
        </div>

        {/* Nội dung tab bên phải */}
        <div className="flex-1 p-6 overflow-auto">
          {tab === 'account' && (
            <div className="flex flex-col gap-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Account
              </h3>
              <div>
                <label
                  htmlFor="displayName"
                  className="text-sm text-gray-700 dark:text-gray-300"
                >
                  Display Name
                </label>
                <Input
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                />
              </div>
              <Button disabled={loading} onClick={handleSaveAccount}>
                Save Changes
              </Button>
            </div>
          )}

          {tab === 'data-controls' && (
            <div className="flex flex-col gap-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Data Controls
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                This will delete all your chats permanently.
              </p>
              <Button
                variant="destructive"
                disabled={loading}
                onClick={handleDeleteAllChats}
              >
                Delete All Chats
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
