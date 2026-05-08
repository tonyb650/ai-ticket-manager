import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import axios from "axios";
import CreateUserDialog from "./CreateUserDialog";

vi.mock("axios");

const mockedPost = vi.mocked(axios.post);
const mockedIsAxiosError = vi.mocked(axios.isAxiosError);

const VALID_INPUT = {
  name: "Test User",
  email: "test@example.com",
  password: "longenough",
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
      <CreateUserDialog open={open} onOpenChange={onOpenChange} />
    </QueryClientProvider>,
  );
  return { ...utils, queryClient, onOpenChange };
}

async function fillForm(
  user: ReturnType<typeof userEvent.setup>,
  values: typeof VALID_INPUT = VALID_INPUT,
) {
  await user.type(screen.getByLabelText(/name/i), values.name);
  await user.type(screen.getByLabelText(/email/i), values.email);
  await user.type(screen.getByLabelText(/password/i), values.password);
}

describe("<CreateUserDialog />", () => {
  beforeEach(() => {
    mockedPost.mockReset();
    mockedIsAxiosError.mockReset();
    // Treat any thrown value with a `.response` property as an axios error.
    mockedIsAxiosError.mockImplementation(
      (err: unknown): err is import("axios").AxiosError =>
        typeof err === "object" && err !== null && "response" in err,
    );
  });

  it("renders nothing in the document when closed", () => {
    renderDialog({ open: false });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders all fields and action buttons when open", () => {
    renderDialog();
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /create user/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
  });

  describe("validation", () => {
    it("shows an error when the name is too short and does not submit", async () => {
      const user = userEvent.setup();
      renderDialog();

      await user.type(screen.getByLabelText(/name/i), "ab");
      await user.type(screen.getByLabelText(/email/i), VALID_INPUT.email);
      await user.type(screen.getByLabelText(/password/i), VALID_INPUT.password);
      await user.click(screen.getByRole("button", { name: /create user/i }));

      expect(
        await screen.findByText(/name must be at least 3 characters/i),
      ).toBeInTheDocument();
      expect(mockedPost).not.toHaveBeenCalled();
    });

    it("shows an error when the email is invalid and does not submit", async () => {
      const user = userEvent.setup();
      renderDialog();

      await user.type(screen.getByLabelText(/name/i), VALID_INPUT.name);
      await user.type(screen.getByLabelText(/email/i), "not-an-email");
      await user.type(screen.getByLabelText(/password/i), VALID_INPUT.password);
      await user.click(screen.getByRole("button", { name: /create user/i }));

      expect(
        await screen.findByText(/enter a valid email/i),
      ).toBeInTheDocument();
      expect(mockedPost).not.toHaveBeenCalled();
    });

    it("shows an error when the password is too short and does not submit", async () => {
      const user = userEvent.setup();
      renderDialog();

      await user.type(screen.getByLabelText(/name/i), VALID_INPUT.name);
      await user.type(screen.getByLabelText(/email/i), VALID_INPUT.email);
      await user.type(screen.getByLabelText(/password/i), "short");
      await user.click(screen.getByRole("button", { name: /create user/i }));

      expect(
        await screen.findByText(/password must be at least 8 characters/i),
      ).toBeInTheDocument();
      expect(mockedPost).not.toHaveBeenCalled();
    });
  });

  describe("submit", () => {
    it("posts the form values to /api/users", async () => {
      mockedPost.mockResolvedValueOnce({ data: { user: { id: "1" } } });
      const user = userEvent.setup();
      renderDialog();

      await fillForm(user);
      await user.click(screen.getByRole("button", { name: /create user/i }));

      await waitFor(() => {
        expect(mockedPost).toHaveBeenCalledWith("/api/users", VALID_INPUT);
      });
    });

    it("invalidates the users query and closes the dialog on success", async () => {
      mockedPost.mockResolvedValueOnce({ data: { user: { id: "1" } } });
      const onOpenChange = vi.fn();
      const user = userEvent.setup();
      const { queryClient } = renderDialog({ onOpenChange });
      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

      await fillForm(user);
      await user.click(screen.getByRole("button", { name: /create user/i }));

      await waitFor(() => {
        expect(onOpenChange).toHaveBeenCalledWith(false);
      });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["users"] });
    });

    it("disables both buttons and shows 'Creating…' while submitting", async () => {
      let resolvePost: (value: unknown) => void = () => {};
      mockedPost.mockReturnValueOnce(
        new Promise((resolve) => {
          resolvePost = resolve;
        }),
      );
      const user = userEvent.setup();
      renderDialog();

      await fillForm(user);
      await user.click(screen.getByRole("button", { name: /create user/i }));

      const submit = await screen.findByRole("button", { name: /creating/i });
      expect(submit).toBeDisabled();
      expect(screen.getByRole("button", { name: /cancel/i })).toBeDisabled();

      resolvePost({ data: { user: { id: "1" } } });
    });
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

    it("shows 'Email already in use' on a 409 response", async () => {
      const conflict = Object.assign(new Error("conflict"), {
        response: { status: 409 },
      });
      mockedPost.mockRejectedValueOnce(conflict);

      const user = userEvent.setup();
      renderDialog();

      await fillForm(user);
      await user.click(screen.getByRole("button", { name: /create user/i }));

      expect(await screen.findByRole("alert")).toHaveTextContent(
        /email already in use/i,
      );
    });

    it("shows a generic error message on other failures", async () => {
      mockedPost.mockRejectedValueOnce(new Error("network down"));

      const user = userEvent.setup();
      renderDialog();

      await fillForm(user);
      await user.click(screen.getByRole("button", { name: /create user/i }));

      expect(await screen.findByRole("alert")).toHaveTextContent(
        /failed to create user/i,
      );
    });

    it("does not close the dialog on error", async () => {
      mockedPost.mockRejectedValueOnce(new Error("network down"));
      const onOpenChange = vi.fn();
      const user = userEvent.setup();
      renderDialog({ onOpenChange });

      await fillForm(user);
      await user.click(screen.getByRole("button", { name: /create user/i }));

      expect(await screen.findByRole("alert")).toBeInTheDocument();
      expect(onOpenChange).not.toHaveBeenCalled();
    });
  });

  describe("cancel", () => {
    it("calls onOpenChange(false) when the Cancel button is clicked", async () => {
      const onOpenChange = vi.fn();
      const user = userEvent.setup();
      renderDialog({ onOpenChange });

      await user.click(screen.getByRole("button", { name: /cancel/i }));

      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });
});
