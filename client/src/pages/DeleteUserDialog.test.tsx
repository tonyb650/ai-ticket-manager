import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import axios from "axios";
import { Role } from "core";
import DeleteUserDialog from "./DeleteUserDialog";
import type { User } from "./UsersTable";

vi.mock("axios");

const mockedDelete = vi.mocked(axios.delete);

const TARGET_USER: User = {
  id: "user-1",
  name: "Adam Agent",
  email: "adam@example.com",
  role: "agent",
  createdAt: "2024-01-15T00:00:00.000Z",
};

function renderDialog({
  open = true,
  onOpenChange = vi.fn(),
}: { open?: boolean; onOpenChange?: (open: boolean) => void } = {}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const utils = render(
    <QueryClientProvider client={queryClient}>
      <DeleteUserDialog
        user={TARGET_USER}
        open={open}
        onOpenChange={onOpenChange}
      />
    </QueryClientProvider>,
  );
  return { ...utils, queryClient, onOpenChange };
}

describe("<DeleteUserDialog />", () => {
  beforeEach(() => {
    mockedDelete.mockReset();
  });

  it("renders nothing when closed", () => {
    renderDialog({ open: false });
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("renders the title, description with name + email, and action buttons", () => {
    renderDialog();
    expect(
      screen.getByRole("alertdialog", { name: /delete this user\?/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/adam agent.*adam@example\.com/i),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^delete$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
  });

  it("calls onOpenChange(false) when Cancel is clicked and does not call axios.delete", async () => {
    const onOpenChange = vi.fn();
    const user = userEvent.setup();
    renderDialog({ onOpenChange });

    await user.click(screen.getByRole("button", { name: /cancel/i }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(mockedDelete).not.toHaveBeenCalled();
  });

  it("DELETEs the user, invalidates the users query, and closes on success", async () => {
    mockedDelete.mockResolvedValueOnce({ status: 204 });
    const onOpenChange = vi.fn();
    const user = userEvent.setup();
    const { queryClient } = renderDialog({ onOpenChange });
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    await user.click(screen.getByRole("button", { name: /^delete$/i }));

    await waitFor(() => {
      expect(mockedDelete).toHaveBeenCalledWith(`/api/users/${TARGET_USER.id}`);
    });
    await waitFor(() => {
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["users"] });
  });

  it("disables both buttons and shows 'Deleting…' while the mutation is in flight", async () => {
    let resolveDelete: (value: unknown) => void = () => {};
    mockedDelete.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveDelete = resolve;
      }),
    );
    const onOpenChange = vi.fn();
    const user = userEvent.setup();
    renderDialog({ onOpenChange });

    await user.click(screen.getByRole("button", { name: /^delete$/i }));

    const action = await screen.findByRole("button", { name: /deleting/i });
    expect(action).toBeDisabled();
    expect(screen.getByRole("button", { name: /cancel/i })).toBeDisabled();
    expect(onOpenChange).not.toHaveBeenCalled();

    resolveDelete({ status: 204 });
  });

  describe("error handling", () => {
    let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
    });

    afterEach(() => {
      consoleErrorSpy.mockRestore();
    });

    it("shows an error alert and keeps the dialog open on failure", async () => {
      mockedDelete.mockRejectedValueOnce(new Error("network down"));
      const onOpenChange = vi.fn();
      const user = userEvent.setup();
      renderDialog({ onOpenChange });

      await user.click(screen.getByRole("button", { name: /^delete$/i }));

      expect(await screen.findByRole("alert")).toHaveTextContent(
        /failed to delete user/i,
      );
      expect(onOpenChange).not.toHaveBeenCalled();
    });
  });
});
