"use client";

import React, { useState } from "react";

export interface TreeNode {
  id: string;
  name: string;
  description?: string;
  children?: TreeNode[];
  active?: boolean;
}

interface TreeViewProps {
  data: TreeNode[];
  onNodeClick?: (node: TreeNode) => void;
  onNodeExpand?: (node: TreeNode) => void;
  selectedNodeId?: string;
  className?: string;
}

interface TreeNodeItemProps {
  node: TreeNode;
  level: number;
  onNodeClick?: (node: TreeNode) => void;
  onNodeExpand?: (node: TreeNode) => void;
  selectedNodeId?: string;
}

function TreeNodeItem({
  node,
  level,
  onNodeClick,
  onNodeExpand,
  selectedNodeId,
}: TreeNodeItemProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const hasChildren = node.children && node.children.length > 0;

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
    if (onNodeExpand) {
      onNodeExpand(node);
    }
  };

  const handleClick = () => {
    if (onNodeClick) {
      onNodeClick(node);
    }
  };

  const isSelected = selectedNodeId === node.id;

  return (
    <div>
      <div
        className={`flex items-center gap-2 py-2 px-3 rounded cursor-pointer transition-colors ${
          isSelected
            ? "bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100"
            : "hover:bg-gray-100 dark:hover:bg-gray-800"
        } ${!node.active ? "opacity-50" : ""}`}
        style={{ paddingLeft: `${level * 1.5 + 0.75}rem` }}
        onClick={handleClick}
      >
        {hasChildren && (
          <button
            onClick={handleToggle}
            className="flex-shrink-0 w-5 h-5 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
          >
            <svg
              className={`w-4 h-4 transition-transform ${isExpanded ? "rotate-90" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
        )}
        {!hasChildren && <div className="w-5" />}
        <div className="flex-1 min-w-0">
          <div className="font-medium truncate">{node.name}</div>
          {node.description && (
            <div className="text-sm text-gray-600 dark:text-gray-400 truncate">
              {node.description}
            </div>
          )}
        </div>
        {!node.active && (
          <span className="flex-shrink-0 px-2 py-1 text-xs font-medium bg-gray-200 dark:bg-gray-700 rounded">
            Inactive
          </span>
        )}
      </div>
      {hasChildren && isExpanded && (
        <div>
          {node.children!.map((child) => (
            <TreeNodeItem
              key={child.id}
              node={child}
              level={level + 1}
              onNodeClick={onNodeClick}
              onNodeExpand={onNodeExpand}
              selectedNodeId={selectedNodeId}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function TreeView({
  data,
  onNodeClick,
  onNodeExpand,
  selectedNodeId,
  className = "",
}: TreeViewProps) {
  if (!data || data.length === 0) {
    return (
      <div className={`p-4 text-center text-gray-500 ${className}`}>
        No items to display
      </div>
    );
  }

  return (
    <div className={`overflow-auto ${className}`}>
      {data.map((node) => (
        <TreeNodeItem
          key={node.id}
          node={node}
          level={0}
          onNodeClick={onNodeClick}
          onNodeExpand={onNodeExpand}
          selectedNodeId={selectedNodeId}
        />
      ))}
    </div>
  );
}
