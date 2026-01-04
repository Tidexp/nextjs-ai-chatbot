'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Settings2 } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';

export interface RAGSettings {
  topK: number;
  similarityThreshold: number;
  maxChunksPerSource: number;
  enableGraphTwoHop: boolean;
  graphBoost: number;
}

export const DEFAULT_RAG_SETTINGS: RAGSettings = {
  topK: 15,
  similarityThreshold: 0.15,
  maxChunksPerSource: 2,
  enableGraphTwoHop: false,
  graphBoost: 0.3,
};

interface RAGSettingsProps {
  settings: RAGSettings;
  onSettingsChange: (settings: RAGSettings) => void;
}

export function RAGSettingsPanel({
  settings,
  onSettingsChange,
}: RAGSettingsProps) {
  const [isOpen, setIsOpen] = useState(false);

  const updateSetting = <K extends keyof RAGSettings>(
    key: K,
    value: RAGSettings[K],
  ) => {
    onSettingsChange({ ...settings, [key]: value });
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon" title="RAG Settings">
          <Settings2 className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96" align="end">
        <div className="space-y-6">
          <div className="space-y-2">
            <h4 className="font-medium leading-none">RAG Search Settings</h4>
            <p className="text-sm text-muted-foreground">
              Điều chỉnh cách tìm kiếm và lấy thông tin từ tài liệu
            </p>
          </div>

          {/* Top K */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="topK">Top K Chunks</Label>
              <span className="text-sm text-muted-foreground">
                {settings.topK}
              </span>
            </div>
            <Slider
              id="topK"
              min={3}
              max={30}
              step={1}
              value={[settings.topK]}
              onValueChange={([value]: number[]) =>
                updateSetting('topK', value)
              }
            />
            <p className="text-xs text-muted-foreground">
              Số lượng chunks trả về (nhiều = context rộng hơn)
            </p>
          </div>

          {/* Max Chunks Per Source */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="maxChunks">Max Chunks/Source</Label>
              <span className="text-sm text-muted-foreground">
                {settings.maxChunksPerSource}
              </span>
            </div>
            <Slider
              id="maxChunks"
              min={1}
              max={5}
              step={1}
              value={[settings.maxChunksPerSource]}
              onValueChange={([value]: number[]) =>
                updateSetting('maxChunksPerSource', value)
              }
            />
            <p className="text-xs text-muted-foreground">
              Giới hạn chunks từ mỗi file (thấp = diversity cao hơn)
            </p>
          </div>

          {/* Similarity Threshold */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="threshold">Similarity Threshold</Label>
              <span className="text-sm text-muted-foreground">
                {settings.similarityThreshold.toFixed(2)}
              </span>
            </div>
            <Slider
              id="threshold"
              min={0}
              max={1}
              step={0.05}
              value={[settings.similarityThreshold]}
              onValueChange={([value]: number[]) =>
                updateSetting('similarityThreshold', value)
              }
            />
            <p className="text-xs text-muted-foreground">
              Ngưỡng similarity tối thiểu (thấp = results rộng hơn)
            </p>
          </div>

          {/* Graph Boost */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="graphBoost">Graph Boost</Label>
              <span className="text-sm text-muted-foreground">
                {settings.graphBoost.toFixed(1)}
              </span>
            </div>
            <Slider
              id="graphBoost"
              min={0}
              max={1}
              step={0.1}
              value={[settings.graphBoost]}
              onValueChange={([value]: number[]) =>
                updateSetting('graphBoost', value)
              }
            />
            <p className="text-xs text-muted-foreground">
              Trọng số của graph score (0 = chỉ vector, 1 = graph cao)
            </p>
          </div>

          {/* Enable 2-Hop */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="twoHop">Enable 2-Hop Graph</Label>
              <p className="text-xs text-muted-foreground">
                Mở rộng entity search (chậm hơn với nhiều sources)
              </p>
            </div>
            <Switch
              id="twoHop"
              checked={settings.enableGraphTwoHop}
              onCheckedChange={(checked: boolean) =>
                updateSetting('enableGraphTwoHop', checked)
              }
            />
          </div>

          {/* Reset Button */}
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => onSettingsChange(DEFAULT_RAG_SETTINGS)}
          >
            Reset về mặc định
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
