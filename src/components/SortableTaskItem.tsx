"use client";

import { CSSProperties } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import TaskItem, { TaskItemProps } from "./TaskItem";

interface SortableTaskItemProps extends TaskItemProps {
  id: string;
  activeId?: string | null;
  overId?: string | null;
  isDroppable?: boolean;
}

export default function SortableTaskItem({ 
  id, 
  task, 
  activeId,
  overId,
  isDroppable,
  ...props 
}: SortableTaskItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const childIds = task.children.map(child => child.id);

  // このタスクがドロップ対象かどうか
  const isOver = overId === id;
  const isActive = activeId === id;

  // levelStylesをTaskItemから取得するため、ここで定義
  const levelStyles: Record<string, { childConnector: string }> = {
    kgi: {
      childConnector: "border-blue-200 dark:border-blue-800/60",
    },
    kpi: {
      childConnector: "border-emerald-200 dark:border-emerald-800/60",
    },
    kai: {
      childConnector: "border-amber-200 dark:border-amber-800/60",
    },
  };

  const levelStyle = levelStyles[task.level] || levelStyles.kgi;
  const timelineSpacing = props.depth === 0 ? "mt-2" : "mt-1.5";

  // ドロップ可能な状態でホバーしている場合のスタイル
  const dropHighlightClass = isOver && isDroppable && !isActive
    ? "ring-2 ring-green-400 ring-offset-2 dark:ring-green-500 dark:ring-offset-gray-900 shadow-lg"
    : "";

  // ドロップ不可能な状態でホバーしている場合のスタイル
  const dropInvalidClass = isOver && !isDroppable && !isActive
    ? "ring-2 ring-red-400 ring-offset-2 dark:ring-red-500 dark:ring-offset-gray-900"
    : "";

  return (
    <div className={`space-y-2 ${dropHighlightClass} ${dropInvalidClass} rounded-xl transition-all duration-200`}>
      <div ref={setNodeRef} style={style}>
        <div {...attributes} {...listeners}>
          <TaskItem
            {...props}
            task={task}
          />
        </div>
      </div>

      {task.children.length > 0 && (
        <div
          className={`${timelineSpacing} space-y-2 border-l-2 pl-5 dark:pl-6 ${levelStyle.childConnector}`}
        >
          <SortableContext items={childIds} strategy={verticalListSortingStrategy}>
            {task.children.map((child) => (
              <SortableTaskItem
                key={child.id}
                id={child.id}
                task={child}
                onToggle={props.onToggle}
                onDelete={props.onDelete}
                onUpdate={props.onUpdate}
                onAddChild={props.onAddChild}
                depth={props.depth + 1}
                parentId={task.id}
                ancestorIds={[...props.ancestorIds, task.id]}
                onSummaryLevelInteractionChange={props.onSummaryLevelInteractionChange}
                activeId={activeId}
                overId={overId}
                isDroppable={isDroppable}
              />
            ))}
          </SortableContext>
        </div>
      )}
    </div>
  );
}
