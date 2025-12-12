'use client';

import React from 'react';

interface MindMapNode {
  id: string;
  label: string;
  children: MindMapNode[];
}

interface MindMapData {
  title: string;
  root: MindMapNode;
}

interface MindMapViewerProps {
  data: MindMapData;
}

interface NodePosition {
  x: number;
  y: number;
  collapsed: boolean;
}

export function MindMapViewer({ data }: MindMapViewerProps) {
  const svgRef = React.useRef<SVGSVGElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const [scale, setScale] = React.useState(1);
  const [translate, setTranslate] = React.useState({ x: 400, y: 300 });
  const [isDragging, setIsDragging] = React.useState(false);
  const [dragStart, setDragStart] = React.useState({ x: 0, y: 0 });
  const [collapsedNodes, setCollapsedNodes] = React.useState<Set<string>>(
    new Set(),
  );

  // Horizontal tree layout (left-to-right)
  // Compute subtree heights to space children vertically
  const getVisibleChildren = (node: MindMapNode) =>
    collapsedNodes.has(node.id) ? [] : node.children;

  const measureSubtree = (node: MindMapNode): number => {
    const children = getVisibleChildren(node);
    if (children.length === 0) return 1; // leaf counts as 1 unit height
    return children.map(measureSubtree).reduce((a, b) => a + b, 0);
  };

  const positions = new Map<string, { x: number; y: number }>();
  const depths = new Map<string, number>();
  const levelX = (depth: number) => 220 * depth; // horizontal spacing per level
  const vGap = 100; // vertical gap between leaf units

  const assignPositions = (node: MindMapNode, depth: number, topY: number) => {
    const children = getVisibleChildren(node);
    if (children.length === 0) {
      const x = levelX(depth);
      const y = topY + vGap / 2;
      positions.set(node.id, { x, y });
      depths.set(node.id, depth);
      return vGap; // leaf consumes one unit height
    }

    // Compute total height of children
    const childHeights = children
      .map(measureSubtree)
      .map((units) => units * vGap);
    const totalHeight = childHeights.reduce((a, b) => a + b, 0);

    // Position this node centered over children
    const x = levelX(depth);
    const y = topY + totalHeight / 2;
    positions.set(node.id, { x, y });
    depths.set(node.id, depth);

    // Assign positions to children, stacked vertically
    let cursorY = topY;
    children.forEach((child, idx) => {
      const h = childHeights[idx];
      assignPositions(child, depth + 1, cursorY);
      cursorY += h;
    });

    return totalHeight;
  };

  // Start layout from root at topY = 0
  assignPositions(data.root, 0, 0);

  // Handle mouse wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    // Very smooth zoom: ~3-5% per wheel tick
    const zoomIntensity = 0.01;
    const direction = e.deltaY > 0 ? -1 : 1;
    setScale((prev) => {
      const next = prev + direction * zoomIntensity;
      return Math.max(0.5, Math.min(2, next));
    });
  };

  // Handle pan
  const handleMouseDown = (e: React.MouseEvent) => {
    if (
      e.target === svgRef.current ||
      (e.target as SVGElement).tagName === 'line'
    ) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - translate.x, y: e.clientY - translate.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setTranslate({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Toggle node collapse
  const toggleNode = (nodeId: string) => {
    setCollapsedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  // Render nodes and edges recursively
  const renderNode = (node: MindMapNode, parentId?: string): JSX.Element[] => {
    const elements: JSX.Element[] = [];
    const pos = positions.get(node.id);
    if (!pos) return elements;

    // Draw edge to parent
    if (parentId) {
      const parentPos = positions.get(parentId);
      if (parentPos) {
        const nodeWidth = 140;
        const buttonRadius = 10;
        // Start from the right edge of parent's expand/collapse button
        const startX = parentPos.x + nodeWidth / 2 + 14 + buttonRadius;
        const startY = parentPos.y;
        // End at left edge of child node
        const endX = pos.x - nodeWidth / 2;
        const endY = pos.y;

        // Organic cubic Bezier curve
        const dx = endX - startX;
        const control1X = startX + dx * 0.5;
        const control1Y = startY;
        const control2X = startX + dx * 0.5;
        const control2Y = endY;
        const path = `M ${startX} ${startY} C ${control1X} ${control1Y}, ${control2X} ${control2Y}, ${endX} ${endY}`;

        const dParent = depths.get(parentId || '') || 0;
        const edgeColors = [
          '#4A7A78',
          '#3D6B69',
          '#2C5654',
          '#5A8A88',
          '#6A9A98',
        ];
        const edgeColor = edgeColors[dParent % edgeColors.length];

        elements.push(
          <path
            key={`edge-${parentId}-${node.id}`}
            d={path}
            fill="none"
            stroke={edgeColor}
            strokeWidth={2.5}
            opacity={0.5}
          />,
        );
      }
    }

    // Draw node
    const isCollapsed = collapsedNodes.has(node.id);
    const hasChildren = node.children.length > 0;
    const nodeWidth = 140;
    const nodeHeight = 44;
    const corner = 10;

    elements.push(
      <g key={`node-${node.id}`}>
        {/* Node rectangle */}
        {(() => {
          const depth = depths.get(node.id) || 0;
          const palette = [
            '#2D5F5D', // dark teal (root)
            '#3B5998', // slate blue (level 1)
            '#2C6E49', // forest green (level 2)
            '#4A5D8F', // medium blue (level 3)
            '#3D6B69', // lighter teal (level 4)
            '#5A7F7D', // sage (level 5)
            '#4D7C8A', // steel blue (level 6)
            '#3A5A5C', // dark cyan (level 7)
          ];
          const fillColor = palette[depth % palette.length];
          // Add subtle border color variation for same-rank distinction
          const strokeColors = [
            '#1A3837',
            '#1F2E4E',
            '#1A3B2A',
            '#283648',
            '#254645',
            '#3A4F4D',
            '#2E4E56',
            '#1E3234',
          ];
          const strokeColor = strokeColors[depth % strokeColors.length];
          return (
            <rect
              x={pos.x - nodeWidth / 2}
              y={pos.y - nodeHeight / 2}
              rx={corner}
              ry={corner}
              width={nodeWidth}
              height={nodeHeight}
              fill={fillColor}
              stroke={strokeColor}
              strokeWidth={2}
              className="cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => hasChildren && toggleNode(node.id)}
            />
          );
        })()}

        {/* Node label */}
        <text
          x={pos.x}
          y={pos.y}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="#ffffff"
          className="text-[12px] font-semibold pointer-events-none select-none"
          style={{ maxWidth: `${nodeWidth - 16}px` }}
        >
          {node.label.length > 20
            ? `${node.label.slice(0, 18)}...`
            : node.label}
        </text>

        {/* Expand/collapse button */}
        {hasChildren && (
          <g className="cursor-pointer" onClick={() => toggleNode(node.id)}>
            <circle
              cx={pos.x + nodeWidth / 2 + 14}
              cy={pos.y}
              r="10"
              fill="#1A3837"
              stroke="#4A7A78"
              strokeWidth="1.5"
              className="hover:opacity-80 transition-opacity"
            />
            <text
              x={pos.x + nodeWidth / 2 + 14}
              y={pos.y}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="#E0F2F1"
              className="text-[11px] font-bold pointer-events-none select-none"
            >
              {isCollapsed ? '+' : '−'}
            </text>
          </g>
        )}
      </g>,
    );

    // Render children if not collapsed
    if (!isCollapsed && hasChildren) {
      node.children.forEach((child) => {
        elements.push(...renderNode(child, node.id));
      });
    }

    return elements;
  };

  return (
    <div
      ref={containerRef}
      className="w-full h-full relative overflow-hidden bg-muted/20"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      role="application"
      aria-label="Interactive mind map"
    >
      {/* Zoom controls */}
      <div className="absolute top-4 right-4 flex flex-col gap-2 z-10">
        <button
          type="button"
          onClick={() => setScale((prev) => Math.min(3, prev * 1.2))}
          className="w-10 h-10 rounded-lg bg-background border border-border hover:bg-muted flex items-center justify-center text-lg font-bold shadow-sm"
          title="Zoom in"
        >
          +
        </button>
        <button
          type="button"
          onClick={() => setScale((prev) => Math.max(0.3, prev / 1.2))}
          className="w-10 h-10 rounded-lg bg-background border border-border hover:bg-muted flex items-center justify-center text-lg font-bold shadow-sm"
          title="Zoom out"
        >
          −
        </button>
        <button
          type="button"
          onClick={() => {
            setScale(1);
            setTranslate({ x: 400, y: 300 });
          }}
          className="w-10 h-10 rounded-lg bg-background border border-border hover:bg-muted flex items-center justify-center text-xs font-medium shadow-sm"
          title="Reset view"
        >
          ⟲
        </button>
      </div>

      {/* Mind map SVG */}
      <svg
        ref={svgRef}
        className="w-full h-full cursor-grab active:cursor-grabbing"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
      >
        <g
          transform={`translate(${translate.x}, ${translate.y}) scale(${scale})`}
        >
          {renderNode(data.root)}
        </g>
      </svg>

      {/* Instructions */}
      <div className="absolute bottom-4 left-4 bg-background/90 backdrop-blur-sm border border-border rounded-lg px-4 py-2 text-xs text-muted-foreground shadow-sm">
        <div className="font-medium mb-1">{data.title}</div>
        <div>Scroll to zoom • Drag to pan • Click nodes to expand/collapse</div>
      </div>
    </div>
  );
}
