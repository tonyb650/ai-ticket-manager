import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import axios from "axios";
import { Role } from "core";
import Users from "./Users";

vi.mock("axios");

const MOCK_USERS = [
  {
    id: "1",
    name: "Alice Admin",
    email: "alice@example.com",
    role: Role.admin,
    createdAt: "2024-01-15T00:00:00.000Z",
  },
  {
    id: "2",
    name: "Adam Agent",
    email: "adam@example.com",
    role: Role.agent,
    createdAt: "2024-06-20T00:00:00.000Z",
  },
] as const;

function renderUsers() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <Users />
    </QueryClientProvider>,
  );
}

const mockedGet = vi.mocked(axios.get);

describe("<Users />", () => {
  beforeEach(() => {
    mockedGet.mockReset();
  });

  it("renders the page heading", () => {
    mockedGet.mockResolvedValueOnce({ data: { users: [] } });
    renderUsers();
    expect(
      screen.getByRole("heading", { level: 1, name: /users/i }),
    ).toBeInTheDocument();
  });

  it("shows skeleton placeholders while users are loading", () => {
    mockedGet.mockReturnValueOnce(new Promise(() => {}));
    renderUsers();

    expect(screen.getAllByRole("status").length).toBeGreaterThan(0);
    expect(screen.queryByText(/no users found/i)).not.toBeInTheDocument();
  });

  it("renders the empty state when the API returns no users", async () => {
    mockedGet.mockResolvedValueOnce({ data: { users: [] } });
    renderUsers();

    expect(await screen.findByText(/no users found/i)).toBeInTheDocument();
  });

  it("renders a row for each user with name, email, and joined date", async () => {
    mockedGet.mockResolvedValueOnce({ data: { users: MOCK_USERS } });
    renderUsers();

    expect(await screen.findByText("Alice Admin")).toBeInTheDocument();
    expect(screen.getByText("alice@example.com")).toBeInTheDocument();
    expect(screen.getByText("Adam Agent")).toBeInTheDocument();
    expect(screen.getByText("adam@example.com")).toBeInTheDocument();

    const formattedDate = new Date(MOCK_USERS[1].createdAt).toLocaleDateString();
    expect(screen.getByText(formattedDate)).toBeInTheDocument();
  });

  it("uses different badge variants for admin and agent roles", async () => {
    mockedGet.mockResolvedValueOnce({ data: { users: MOCK_USERS } });
    renderUsers();

    const adminBadge = await screen.findByText(Role.admin);
    const agentBadge = screen.getByText(Role.agent);

    expect(adminBadge).toHaveAttribute("data-slot", "badge");
    expect(adminBadge).toHaveAttribute("data-variant", "default");
    expect(agentBadge).toHaveAttribute("data-slot", "badge");
    expect(agentBadge).toHaveAttribute("data-variant", "secondary");
  });

  describe("create user dialog", () => {
    beforeEach(() => {
      mockedGet.mockResolvedValue({ data: { users: [] } });
    });

    it("does not render the dialog by default", () => {
      renderUsers();
      expect(
        screen.queryByRole("dialog", { name: /new user/i }),
      ).not.toBeInTheDocument();
    });

    it("opens the dialog when the New user button is clicked", async () => {
      const user = userEvent.setup();
      renderUsers();

      await user.click(screen.getByRole("button", { name: /new user/i }));

      expect(
        await screen.findByRole("dialog", { name: /new user/i }),
      ).toBeInTheDocument();
    });

    it("closes the dialog when Escape is pressed", async () => {
      const user = userEvent.setup();
      renderUsers();

      await user.click(screen.getByRole("button", { name: /new user/i }));
      expect(
        await screen.findByRole("dialog", { name: /new user/i }),
      ).toBeInTheDocument();

      await user.keyboard("{Escape}");

      await waitFor(() => {
        expect(
          screen.queryByRole("dialog", { name: /new user/i }),
        ).not.toBeInTheDocument();
      });
    });

    it("closes the dialog when clicking outside (on the overlay)", async () => {
      const user = userEvent.setup();
      renderUsers();

      await user.click(screen.getByRole("button", { name: /new user/i }));
      expect(
        await screen.findByRole("dialog", { name: /new user/i }),
      ).toBeInTheDocument();

      const overlay = document.querySelector('[data-slot="dialog-overlay"]');
      expect(overlay).not.toBeNull();
      await user.click(overlay as HTMLElement);

      await waitFor(() => {
        expect(
          screen.queryByRole("dialog", { name: /new user/i }),
        ).not.toBeInTheDocument();
      });
    });
  });

  describe("delete user button", () => {
    it("renders a delete button for agent rows", async () => {
      mockedGet.mockResolvedValueOnce({ data: { users: MOCK_USERS } });
      renderUsers();

      expect(
        await screen.findByRole("button", { name: /delete adam agent/i }),
      ).toBeInTheDocument();
    });

    it("does not render a delete button for admin rows", async () => {
      mockedGet.mockResolvedValueOnce({ data: { users: MOCK_USERS } });
      renderUsers();

      // Wait for the table to populate.
      await screen.findByText("Alice Admin");
      expect(
        screen.queryByRole("button", { name: /delete alice admin/i }),
      ).not.toBeInTheDocument();
    });

    it("opens the confirmation alert dialog when a delete button is clicked", async () => {
      mockedGet.mockResolvedValueOnce({ data: { users: MOCK_USERS } });
      const user = userEvent.setup();
      renderUsers();

      await user.click(
        await screen.findByRole("button", { name: /delete adam agent/i }),
      );

      const dialog = await screen.findByRole("alertdialog", {
        name: /delete this user\?/i,
      });
      expect(dialog).toBeInTheDocument();
      expect(dialog).toHaveTextContent(/adam agent/i);
      expect(dialog).toHaveTextContent(/adam@example\.com/i);
    });
  });

  describe("error state", () => {
    let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
    });

    afterEach(() => {
      consoleErrorSpy.mockRestore();
    });

    it("shows an error message when the request fails", async () => {
      mockedGet.mockRejectedValueOnce(new Error("Network down"));
      renderUsers();

      expect(
        await screen.findByText(/failed to load users: network down/i),
      ).toBeInTheDocument();
      expect(
        screen.queryByRole("table"),
      ).not.toBeInTheDocument();
    });
  });
});
