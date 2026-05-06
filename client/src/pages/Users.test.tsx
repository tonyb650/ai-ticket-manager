import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import axios from "axios";
import Users from "./Users";

vi.mock("axios");

const MOCK_USERS = [
  {
    id: "1",
    name: "Alice Admin",
    email: "alice@example.com",
    role: "admin",
    createdAt: "2024-01-15T00:00:00.000Z",
  },
  {
    id: "2",
    name: "Adam Agent",
    email: "adam@example.com",
    role: "agent",
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

    const adminBadge = await screen.findByText("admin");
    const agentBadge = screen.getByText("agent");

    expect(adminBadge).toHaveAttribute("data-slot", "badge");
    expect(adminBadge).toHaveAttribute("data-variant", "default");
    expect(agentBadge).toHaveAttribute("data-slot", "badge");
    expect(agentBadge).toHaveAttribute("data-variant", "secondary");
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
