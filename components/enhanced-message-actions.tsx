'use client';

import { useSWRConfig } from 'swr';
import { useCopyToClipboard } from 'usehooks-ts';
import { useState, memo } from 'react';
import { toast } from 'sonner';

import type { Vote } from '@/lib/db/schema';
import type { ChatMessage } from '@/lib/types';

import { CopyIcon, ThumbDownIcon, ThumbUpIcon, PencilEditIcon } from './icons';
import { RotateCcw } from 'lucide-react';
import { Actions, Action } from './elements/actions';
import equal from 'fast-deep-equal';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (feedback: any) => void;
  messageId: string;
  voteType: 'up' | 'down';
}

function FeedbackModal({
  isOpen,
  onClose,
  onSubmit,
  messageId,
  voteType,
}: FeedbackModalProps) {
  const [qualityScore, setQualityScore] = useState<number>(5);
  const [helpfulnessScore, setHelpfulnessScore] = useState<number>(5);
  const [accuracyScore, setAccuracyScore] = useState<number>(5);
  const [clarityScore, setClarityScore] = useState<number>(5);
  const [downvoteReason, setDownvoteReason] = useState<string>('');
  const [customFeedback, setCustomFeedback] = useState<string>('');

  if (!isOpen) return null;

  const handleSubmit = () => {
    onSubmit({
      qualityScore,
      helpfulnessScore,
      accuracyScore,
      clarityScore,
      downvoteReason: voteType === 'down' ? downvoteReason : undefined,
      customFeedback: customFeedback || undefined,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg max-w-md w-full mx-4">
        <h3 className="text-lg font-semibold mb-4">
          {voteType === 'up' ? '👍' : '👎'} Rate this response
        </h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Overall Quality (1-10)
            </label>
            <input
              type="range"
              min="1"
              max="10"
              value={qualityScore}
              onChange={(e) => setQualityScore(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
              style={{
                background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${(qualityScore - 1) * 11.11}%, #e5e7eb ${(qualityScore - 1) * 11.11}%, #e5e7eb 100%)`,
              }}
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>1</span>
              <span className="font-medium">{qualityScore}/10</span>
              <span>10</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Helpfulness (1-10)
            </label>
            <input
              type="range"
              min="1"
              max="10"
              value={helpfulnessScore}
              onChange={(e) => setHelpfulnessScore(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
              style={{
                background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${(helpfulnessScore - 1) * 11.11}%, #e5e7eb ${(helpfulnessScore - 1) * 11.11}%, #e5e7eb 100%)`,
              }}
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>1</span>
              <span className="font-medium">{helpfulnessScore}/10</span>
              <span>10</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Accuracy (1-10)
            </label>
            <input
              type="range"
              min="1"
              max="10"
              value={accuracyScore}
              onChange={(e) => setAccuracyScore(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
              style={{
                background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${(accuracyScore - 1) * 11.11}%, #e5e7eb ${(accuracyScore - 1) * 11.11}%, #e5e7eb 100%)`,
              }}
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>1</span>
              <span className="font-medium">{accuracyScore}/10</span>
              <span>10</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Clarity (1-10)
            </label>
            <input
              type="range"
              min="1"
              max="10"
              value={clarityScore}
              onChange={(e) => setClarityScore(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
              style={{
                background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${(clarityScore - 1) * 11.11}%, #e5e7eb ${(clarityScore - 1) * 11.11}%, #e5e7eb 100%)`,
              }}
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>1</span>
              <span className="font-medium">{clarityScore}/10</span>
              <span>10</span>
            </div>
          </div>

          {voteType === 'down' && (
            <div>
              <label className="block text-sm font-medium mb-2">
                Why was this response not helpful?
              </label>
              <select
                value={downvoteReason}
                onChange={(e) => setDownvoteReason(e.target.value)}
                className="w-full p-2 border rounded"
              >
                <option value="">Select a reason</option>
                <option value="inaccurate">Inaccurate information</option>
                <option value="unhelpful">Not helpful</option>
                <option value="inappropriate">Inappropriate content</option>
                <option value="too_long">Too long</option>
                <option value="too_short">Too short</option>
                <option value="off_topic">Off topic</option>
                <option value="other">Other</option>
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-2">
              Additional feedback (optional)
            </label>
            <textarea
              value={customFeedback}
              onChange={(e) => setCustomFeedback(e.target.value)}
              placeholder="Any additional thoughts..."
              className="w-full p-2 border rounded h-20"
            />
          </div>
        </div>

        <div className="flex gap-2 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border rounded hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Submit Feedback
          </button>
        </div>
      </div>
    </div>
  );
}

export function PureEnhancedMessageActions({
  chatId,
  message,
  vote,
  isLoading,
  onEdit,
  messages,
  setMessages,
  sendMessage,
  regenerate,
}: {
  chatId: string;
  message: ChatMessage;
  vote: Vote | undefined;
  isLoading: boolean;
  onEdit?: () => void;
  messages: ChatMessage[];
  setMessages: (
    messages: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[]),
  ) => void;
  sendMessage: (message: { role: 'user'; parts: any[] }) => void;
  regenerate: () => void;
}) {
  const [_, copyToClipboard] = useCopyToClipboard();
  const { mutate } = useSWRConfig();
  const [feedbackModal, setFeedbackModal] = useState<{
    isOpen: boolean;
    voteType: 'up' | 'down';
  }>({ isOpen: false, voteType: 'up' });

  if (isLoading) return null;

  const handleVote = async (voteType: 'up' | 'down') => {
    // First save the basic vote
    const voteResponse = await fetch('/api/vote', {
      method: 'PATCH',
      body: JSON.stringify({
        chatId,
        messageId: message.id,
        type: voteType,
      }),
    });

    if (!voteResponse.ok) {
      toast.error(`Failed to ${voteType}vote response`);
      return;
    }

    // Update local state
    mutate<Array<Vote>>(
      `/api/vote?chatId=${chatId}`,
      (currentVotes) => {
        if (!currentVotes) return [];

        const votesWithoutCurrent = currentVotes.filter(
          (vote) => vote.messageId !== message.id,
        );

        return [
          ...votesWithoutCurrent,
          {
            chatId,
            messageId: message.id,
            isUpvoted: voteType === 'up',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ];
      },
      { revalidate: false },
    );

    // Open feedback modal for detailed feedback
    setFeedbackModal({ isOpen: true, voteType });
  };

  const handleDetailedFeedback = async (feedbackData: any) => {
    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chatId,
          messageId: message.id,
          voteType: feedbackModal.voteType,
          ...feedbackData,
        }),
      });

      if (response.ok) {
        toast.success(
          'Detailed feedback saved! This helps improve future responses.',
        );
      } else {
        toast.error('Failed to save detailed feedback');
      }
    } catch (error) {
      console.error('Error saving detailed feedback:', error);
      toast.error('Failed to save detailed feedback');
    }
  };

  return (
    <>
      <Actions
        className={
          message.role === 'user'
            ? 'opacity-0 group-hover:opacity-100 transition-opacity duration-200'
            : ''
        }
      >
        <Action
          tooltip="Copy"
          onClick={async () => {
            const textFromParts = message.parts
              ?.filter((part: any) => part.type === 'text')
              .map((part: any) => part.text)
              .join('\n')
              .trim();

            if (!textFromParts) {
              toast.error("There's no text to copy!");
              return;
            }

            await copyToClipboard(textFromParts);
            toast.success('Copied to clipboard!');
          }}
        >
          <CopyIcon />
        </Action>

        {message.role === 'assistant' && (
          <Action
            tooltip="Try Again"
            onClick={async () => {
              try {
                console.log(
                  '[MessageActions] Regenerate assistant message:',
                  message.id,
                );
                await regenerate({ messageId: message.id });
                toast.success('Regenerating response...');
              } catch (error) {
                console.error(
                  '[MessageActions] Error regenerating message:',
                  error,
                );
                toast.error('Failed to regenerate response');
              }
            }}
          >
            <RotateCcw size={14} />
          </Action>
        )}

        {message.role === 'assistant' && (
          <Action
            tooltip="Upvote Response"
            data-testid="message-upvote"
            disabled={vote?.isUpvoted}
            onClick={() => handleVote('up')}
          >
            <ThumbUpIcon />
          </Action>
        )}

        {message.role === 'assistant' && (
          <Action
            tooltip="Downvote Response"
            data-testid="message-downvote"
            disabled={vote && !vote.isUpvoted}
            onClick={() => handleVote('down')}
          >
            <ThumbDownIcon />
          </Action>
        )}

        {message.role === 'user' && onEdit && (
          <Action tooltip="Edit Message" onClick={onEdit}>
            <PencilEditIcon />
          </Action>
        )}
      </Actions>

      <FeedbackModal
        isOpen={feedbackModal.isOpen}
        onClose={() => setFeedbackModal({ isOpen: false, voteType: 'up' })}
        onSubmit={handleDetailedFeedback}
        messageId={message.id}
        voteType={feedbackModal.voteType}
      />
    </>
  );
}

export const EnhancedMessageActions = memo(PureEnhancedMessageActions, equal);
