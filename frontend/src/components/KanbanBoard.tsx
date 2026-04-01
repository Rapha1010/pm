"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { KanbanColumn } from "@/components/KanbanColumn";
import { KanbanCardPreview } from "@/components/KanbanCardPreview";
import { AiChatSidebar, type ChatMessage } from "@/components/AiChatSidebar";
import { createId, initialData, moveCard, type BoardData } from "@/lib/kanban";

type AIOperation = {
  type: "create" | "update" | "move" | "delete";
  cardId?: string;
  columnId?: string;
  position?: number;
  title?: string;
  details?: string;
};

type AIResponse = {
  message: string;
  operations?: AIOperation[];
};

export const KanbanBoard = () => {
  const [board, setBoard] = useState<BoardData>(() => initialData);
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const [syncState, setSyncState] = useState<"loading" | "idle" | "saving" | "error">(
    "loading"
  );
  const hasLoadedRef = useRef(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatStatus, setChatStatus] = useState<"idle" | "sending" | "error">("idle");
  const [chatError, setChatError] = useState<string | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(true);

  useEffect(() => {
    let isActive = true;
    const loadBoard = async () => {
      setSyncState("loading");
      try {
        const response = await fetch("/api/board");
        if (!response.ok) {
          throw new Error("Failed to load board");
        }
        const data = (await response.json()) as BoardData;
        if (isActive) {
          setBoard(data);
          setSyncState("idle");
        }
      } catch (error) {
        if (isActive) {
          setSyncState("error");
        }
      } finally {
        hasLoadedRef.current = true;
      }
    };

    loadBoard();

    return () => {
      isActive = false;
    };
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    })
  );

  const cardsById = useMemo(() => board.cards, [board.cards]);

  const cloneBoard = (data: BoardData): BoardData => ({
    columns: data.columns.map((column) => ({
      ...column,
      cardIds: [...column.cardIds],
    })),
    cards: { ...data.cards },
  });

  const insertAt = (list: string[], index: number | undefined, value: string) => {
    const next = [...list];
    const safeIndex =
      index === undefined ? next.length : Math.max(0, Math.min(index, next.length));
    next.splice(safeIndex, 0, value);
    return next;
  };

  const applyOperations = (data: BoardData, operations: AIOperation[]) => {
    const next = cloneBoard(data);

    operations.forEach((operation) => {
      if (operation.type === "create") {
        if (!operation.columnId) {
          return;
        }
        const column = next.columns.find((col) => col.id === operation.columnId);
        if (!column) {
          return;
        }
        const cardId = operation.cardId || createId("card");
        if (next.cards[cardId]) {
          return;
        }
        next.cards[cardId] = {
          id: cardId,
          title: operation.title || "Untitled",
          details: operation.details || "No details yet.",
        };
        column.cardIds = insertAt(column.cardIds, operation.position, cardId);
      }

      if (operation.type === "update") {
        if (!operation.cardId || !next.cards[operation.cardId]) {
          return;
        }
        const existing = next.cards[operation.cardId];
        next.cards[operation.cardId] = {
          ...existing,
          title: operation.title ?? existing.title,
          details: operation.details ?? existing.details,
        };
      }

      if (operation.type === "move") {
        if (!operation.cardId) {
          return;
        }
        const sourceColumn = next.columns.find((col) =>
          col.cardIds.includes(operation.cardId as string)
        );
        const targetColumn = operation.columnId
          ? next.columns.find((col) => col.id === operation.columnId)
          : sourceColumn;
        if (!sourceColumn || !targetColumn) {
          return;
        }
        sourceColumn.cardIds = sourceColumn.cardIds.filter(
          (id) => id !== operation.cardId
        );
        targetColumn.cardIds = insertAt(
          targetColumn.cardIds,
          operation.position,
          operation.cardId
        );
      }

      if (operation.type === "delete") {
        if (!operation.cardId || !next.cards[operation.cardId]) {
          return;
        }
        delete next.cards[operation.cardId];
        next.columns = next.columns.map((col) => ({
          ...col,
          cardIds: col.cardIds.filter((id) => id !== operation.cardId),
        }));
      }
    });

    return next;
  };

  const persistBoard = async (nextBoard: BoardData) => {
    if (!hasLoadedRef.current) {
      return;
    }
    setSyncState("saving");
    try {
      const response = await fetch("/api/board", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nextBoard),
      });
      if (!response.ok) {
        throw new Error("Failed to save board");
      }
      setSyncState("idle");
    } catch (error) {
      setSyncState("error");
    }
  };

  const updateBoard = (updater: (prev: BoardData) => BoardData) => {
    setBoard((prev) => {
      const next = updater(prev);
      void persistBoard(next);
      return next;
    });
  };

  const handleSendChat = async () => {
    const question = chatInput.trim();
    if (!question) {
      return;
    }
    const history = chatMessages;
    setChatInput("");
    setChatMessages((prev) => [...prev, { role: "user", content: question }]);
    setChatStatus("sending");
    setChatError(null);

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, history }),
      });
      if (!response.ok) {
        throw new Error("AI request failed");
      }
      const data = (await response.json()) as AIResponse;
      setChatMessages((prev) => [...prev, { role: "assistant", content: data.message }]);
      if (data.operations && data.operations.length > 0) {
        updateBoard((prev) => applyOperations(prev, data.operations ?? []));
      }
      setChatStatus("idle");
    } catch (error) {
      setChatStatus("error");
      setChatError("AI request failed. Please try again.");
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveCardId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveCardId(null);

    if (!over || active.id === over.id) {
      return;
    }

    updateBoard((prev) => ({
      ...prev,
      columns: moveCard(prev.columns, active.id as string, over.id as string),
    }));
  };

  const handleRenameColumn = (columnId: string, title: string) => {
    updateBoard((prev) => ({
      ...prev,
      columns: prev.columns.map((column) =>
        column.id === columnId ? { ...column, title } : column
      ),
    }));
  };

  const handleAddCard = (columnId: string, title: string, details: string) => {
    const id = createId("card");
    updateBoard((prev) => ({
      ...prev,
      cards: {
        ...prev.cards,
        [id]: { id, title, details: details || "No details yet." },
      },
      columns: prev.columns.map((column) =>
        column.id === columnId
          ? { ...column, cardIds: [...column.cardIds, id] }
          : column
      ),
    }));
  };

  const handleDeleteCard = (columnId: string, cardId: string) => {
    updateBoard((prev) => {
      return {
        ...prev,
        cards: Object.fromEntries(
          Object.entries(prev.cards).filter(([id]) => id !== cardId)
        ),
        columns: prev.columns.map((column) =>
          column.id === columnId
            ? {
                ...column,
                cardIds: column.cardIds.filter((id) => id !== cardId),
              }
            : column
        ),
      };
    });
  };

  const activeCard = activeCardId ? cardsById[activeCardId] : null;
  const syncMessage =
    syncState === "loading"
      ? "Loading board..."
      : syncState === "saving"
      ? "Saving..."
      : syncState === "error"
      ? "Unable to sync changes."
      : "";

  return (
    <div className="relative overflow-hidden">
      <div className="pointer-events-none absolute left-0 top-0 h-[420px] w-[420px] -translate-x-1/3 -translate-y-1/3 rounded-full bg-[radial-gradient(circle,_rgba(32,157,215,0.25)_0%,_rgba(32,157,215,0.05)_55%,_transparent_70%)]" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-[520px] w-[520px] translate-x-1/4 translate-y-1/4 rounded-full bg-[radial-gradient(circle,_rgba(117,57,145,0.18)_0%,_rgba(117,57,145,0.05)_55%,_transparent_75%)]" />

      <main className="relative mx-auto flex min-h-screen max-w-[1500px] flex-col gap-10 px-6 pb-16 pt-12">
        <header className="flex flex-col gap-6 rounded-[32px] border border-[var(--stroke)] bg-white/80 p-8 shadow-[var(--shadow)] backdrop-blur">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[var(--gray-text)]">
                Single Board Kanban
              </p>
              <h1 className="mt-3 font-display text-4xl font-semibold text-[var(--navy-dark)]">
                Kanban Studio
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-[var(--gray-text)]">
                Keep momentum visible. Rename columns, drag cards between stages,
                and capture quick notes without getting buried in settings.
              </p>
            </div>
            <div className="rounded-2xl border border-[var(--stroke)] bg-[var(--surface)] px-5 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--gray-text)]">
                Focus
              </p>
              <p className="mt-2 text-lg font-semibold text-[var(--primary-blue)]">
                One board. Five columns. Zero clutter.
              </p>
              {syncMessage && (
                <p className="mt-3 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--secondary-purple)]">
                  {syncMessage}
                </p>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            {board.columns.map((column) => (
              <div
                key={column.id}
                className="flex items-center gap-2 rounded-full border border-[var(--stroke)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--navy-dark)]"
              >
                <span className="h-2 w-2 rounded-full bg-[var(--accent-yellow)]" />
                {column.title}
              </div>
            ))}
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <section className="grid gap-6 lg:grid-cols-5">
              {board.columns.map((column) => (
                <KanbanColumn
                  key={column.id}
                  column={column}
                  cards={column.cardIds.map((cardId) => board.cards[cardId])}
                  onRename={handleRenameColumn}
                  onAddCard={handleAddCard}
                  onDeleteCard={handleDeleteCard}
                />
              ))}
            </section>
            <DragOverlay>
              {activeCard ? (
                <div className="w-[260px]">
                  <KanbanCardPreview card={activeCard} />
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>

          <AiChatSidebar
            messages={chatMessages}
            input={chatInput}
            onInputChange={setChatInput}
            onSend={handleSendChat}
            isSending={chatStatus === "sending"}
            error={chatError}
            isOpen={isChatOpen}
            onToggle={() => setIsChatOpen((open) => !open)}
          />
        </div>
      </main>
    </div>
  );
};
