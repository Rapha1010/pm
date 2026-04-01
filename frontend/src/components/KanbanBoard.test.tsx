import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, vi } from "vitest";
import { KanbanBoard } from "@/components/KanbanBoard";
import { initialData } from "@/lib/kanban";

const getFirstColumn = () => screen.getAllByTestId(/column-/i)[0];

const renderBoard = async () => {
  render(<KanbanBoard />);
  await waitFor(() => {
    expect(fetch).toHaveBeenCalledWith("/api/board");
  });
};

describe("KanbanBoard", () => {
  beforeEach(() => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url === "/api/board" && (!init?.method || init.method === "GET")) {
        return { ok: true, json: async () => initialData } as Response;
      }
      if (url === "/api/board" && init?.method === "PUT") {
        return { ok: true, json: async () => initialData } as Response;
      }
      if (url === "/api/ai/chat") {
        return {
          ok: true,
          json: async () => ({
            message: "Added a card.",
            operations: [
              {
                type: "create",
                cardId: "card-ai",
                columnId: "col-backlog",
                position: 0,
                title: "AI card",
                details: "From the assistant.",
              },
            ],
          }),
        } as Response;
      }
      return { ok: true, json: async () => ({}) } as Response;
    });

    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetAllMocks();
  });

  it("loads the board from the API", async () => {
    await renderBoard();
  });

  it("renders five columns", async () => {
    await renderBoard();
    expect(screen.getAllByTestId(/column-/i)).toHaveLength(5);
  });

  it("renames a column", async () => {
    await renderBoard();
    const column = getFirstColumn();
    const input = within(column).getByLabelText("Column title");
    await userEvent.clear(input);
    await userEvent.type(input, "New Name");
    await waitFor(() => {
      expect(input).toHaveValue("New Name");
    });
  });

  it("adds and removes a card", async () => {
    await renderBoard();
    const column = getFirstColumn();
    const addButton = within(column).getByRole("button", {
      name: /add a card/i,
    });
    await userEvent.click(addButton);

    const titleInput = within(column).getByPlaceholderText(/card title/i);
    await userEvent.type(titleInput, "New card");
    const detailsInput = within(column).getByPlaceholderText(/details/i);
    await userEvent.type(detailsInput, "Notes");

    await userEvent.click(within(column).getByRole("button", { name: /add card/i }));

    expect(within(column).getByText("New card")).toBeInTheDocument();

    const deleteButton = within(column).getByRole("button", {
      name: /delete new card/i,
    });
    await userEvent.click(deleteButton);

    expect(within(column).queryByText("New card")).not.toBeInTheDocument();
  });

  it("applies AI operations to the board", async () => {
    await renderBoard();
    const input = screen.getByPlaceholderText(/ask the ai/i);
    await userEvent.type(input, "Add a card");
    await userEvent.click(screen.getByRole("button", { name: /send to ai/i }));

    await waitFor(() => {
      expect(screen.getByText("AI card")).toBeInTheDocument();
    });
  });
});
