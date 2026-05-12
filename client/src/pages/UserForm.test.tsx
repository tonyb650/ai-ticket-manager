import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import axios from "axios";
import { Role } from "core";
import UserForm from "./UserForm";
import type { User } from "./UsersTable";

vi.mock("axios");

const mockedPost = vi.mocked(axios.post);
const mockedPatch = vi.mocked(axios.patch);
const mockedIsAxiosError = vi.mocked(axios.isAxiosError);

const VALID_INPUT = {
  name: "Test User",
  email: "test@example.com",
  password: "longenough",
};

const EXISTING_USER: User = {
  id: "user-1",
  name: "Existing User",
  email: "existing@example.com",
  role: Role.agent,
  createdAt: "2024-01-15T00:00:00.000Z",
};

function renderForm({
  user,
  onClose = vi.fn(),
}: { user?: User; onClose?: () => void } = {}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const utils = render(
    <QueryClientProvider client={queryClient}>
      <UserForm user={user} onClose={onClose} />
    </QueryClientProvider>,
  );
  return { ...utils, queryClient, onClose };
}

async function fillForm(
  user: ReturnType<typeof userEvent.setup>,
  values: typeof VALID_INPUT = VALID_INPUT,
) {
  await user.type(screen.getByLabelText(/name/i), values.name);
  await user.type(screen.getByLabelText(/email/i), values.email);
  await user.type(screen.getByLabelText(/password/i), values.password);
}

describe("<UserForm />", () => {
  beforeEach(() => {
    mockedPost.mockReset();
    mockedPatch.mockReset();
    mockedIsAxiosError.mockReset();
    mockedIsAxiosError.mockImplementation(
      (err: unknown): err is import("axios").AxiosError =>
        typeof err === "object" && err !== null && "response" in err,
    );
  });

  describe("create mode", () => {
    it("renders all fields and action buttons", () => {
      renderForm();
      expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /create user/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /cancel/i }),
      ).toBeInTheDocument();
    });

    it("starts with empty field values", () => {
      renderForm();
      expect(screen.getByLabelText(/name/i)).toHaveValue("");
      expect(screen.getByLabelText(/email/i)).toHaveValue("");
      expect(screen.getByLabelText(/password/i)).toHaveValue("");
    });

    describe("validation", () => {
      it("shows an error when the name is too short and does not submit", async () => {
        const user = userEvent.setup();
        renderForm();

        await user.type(screen.getByLabelText(/name/i), "ab");
        await user.type(screen.getByLabelText(/email/i), VALID_INPUT.email);
        await user.type(
          screen.getByLabelText(/password/i),
          VALID_INPUT.password,
        );
        await user.click(screen.getByRole("button", { name: /create user/i }));

        expect(
          await screen.findByText(/name must be at least 3 characters/i),
        ).toBeInTheDocument();
        expect(mockedPost).not.toHaveBeenCalled();
      });

      it("shows an error when the email is invalid and does not submit", async () => {
        const user = userEvent.setup();
        renderForm();

        await user.type(screen.getByLabelText(/name/i), VALID_INPUT.name);
        await user.type(screen.getByLabelText(/email/i), "not-an-email");
        await user.type(
          screen.getByLabelText(/password/i),
          VALID_INPUT.password,
        );
        await user.click(screen.getByRole("button", { name: /create user/i }));

        expect(
          await screen.findByText(/enter a valid email/i),
        ).toBeInTheDocument();
        expect(mockedPost).not.toHaveBeenCalled();
      });

      it("shows an error when the password is too short and does not submit", async () => {
        const user = userEvent.setup();
        renderForm();

        await user.type(screen.getByLabelText(/name/i), VALID_INPUT.name);
        await user.type(screen.getByLabelText(/email/i), VALID_INPUT.email);
        await user.type(screen.getByLabelText(/password/i), "short");
        await user.click(screen.getByRole("button", { name: /create user/i }));

        expect(
          await screen.findByText(/password must be at least 8 characters/i),
        ).toBeInTheDocument();
        expect(mockedPost).not.toHaveBeenCalled();
      });

      it("requires a password (blank fails validation)", async () => {
        const user = userEvent.setup();
        renderForm();

        await user.type(screen.getByLabelText(/name/i), VALID_INPUT.name);
        await user.type(screen.getByLabelText(/email/i), VALID_INPUT.email);
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
        renderForm();

        await fillForm(user);
        await user.click(screen.getByRole("button", { name: /create user/i }));

        await waitFor(() => {
          expect(mockedPost).toHaveBeenCalledWith("/api/users", VALID_INPUT);
        });
      });

      it("invalidates the users query and calls onClose on success", async () => {
        mockedPost.mockResolvedValueOnce({ data: { user: { id: "1" } } });
        const onClose = vi.fn();
        const user = userEvent.setup();
        const { queryClient } = renderForm({ onClose });
        const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

        await fillForm(user);
        await user.click(screen.getByRole("button", { name: /create user/i }));

        await waitFor(() => {
          expect(onClose).toHaveBeenCalledTimes(1);
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
        renderForm();

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
        renderForm();

        await fillForm(user);
        await user.click(screen.getByRole("button", { name: /create user/i }));

        expect(await screen.findByRole("alert")).toHaveTextContent(
          /email already in use/i,
        );
      });

      it("shows a generic error message on other failures", async () => {
        mockedPost.mockRejectedValueOnce(new Error("network down"));

        const user = userEvent.setup();
        renderForm();

        await fillForm(user);
        await user.click(screen.getByRole("button", { name: /create user/i }));

        expect(await screen.findByRole("alert")).toHaveTextContent(
          /failed to create user/i,
        );
      });

      it("does not call onClose on error", async () => {
        mockedPost.mockRejectedValueOnce(new Error("network down"));
        const onClose = vi.fn();
        const user = userEvent.setup();
        renderForm({ onClose });

        await fillForm(user);
        await user.click(screen.getByRole("button", { name: /create user/i }));

        expect(await screen.findByRole("alert")).toBeInTheDocument();
        expect(onClose).not.toHaveBeenCalled();
      });
    });

    describe("cancel", () => {
      it("calls onClose when the Cancel button is clicked", async () => {
        const onClose = vi.fn();
        const user = userEvent.setup();
        renderForm({ onClose });

        await user.click(screen.getByRole("button", { name: /cancel/i }));

        expect(onClose).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe("edit mode", () => {
    it("pre-fills name and email from the user prop and leaves password blank", () => {
      renderForm({ user: EXISTING_USER });
      expect(screen.getByLabelText(/name/i)).toHaveValue(EXISTING_USER.name);
      expect(screen.getByLabelText(/email/i)).toHaveValue(EXISTING_USER.email);
      expect(screen.getByLabelText(/password/i)).toHaveValue("");
    });

    it("shows 'Save changes' as the submit label", () => {
      renderForm({ user: EXISTING_USER });
      expect(
        screen.getByRole("button", { name: /save changes/i }),
      ).toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: /create user/i }),
      ).not.toBeInTheDocument();
    });

    it("hints that the password field is optional", () => {
      renderForm({ user: EXISTING_USER });
      expect(
        screen.getByText(/leave blank to keep current/i),
      ).toBeInTheDocument();
    });

    it("submits PATCH with an empty password when left blank (server treats blank as no change)", async () => {
      mockedPatch.mockResolvedValueOnce({
        data: { user: EXISTING_USER },
      });
      const user = userEvent.setup();
      renderForm({ user: EXISTING_USER });

      await user.clear(screen.getByLabelText(/name/i));
      await user.type(screen.getByLabelText(/name/i), "New Name");
      await user.click(screen.getByRole("button", { name: /save changes/i }));

      await waitFor(() => {
        expect(mockedPatch).toHaveBeenCalledWith(
          `/api/users/${EXISTING_USER.id}`,
          { name: "New Name", email: EXISTING_USER.email, password: "" },
        );
      });
      expect(mockedPost).not.toHaveBeenCalled();
    });

    it("submits PATCH including the new password when provided", async () => {
      mockedPatch.mockResolvedValueOnce({
        data: { user: EXISTING_USER },
      });
      const user = userEvent.setup();
      renderForm({ user: EXISTING_USER });

      await user.type(screen.getByLabelText(/password/i), "brand-new-pw");
      await user.click(screen.getByRole("button", { name: /save changes/i }));

      await waitFor(() => {
        expect(mockedPatch).toHaveBeenCalledWith(
          `/api/users/${EXISTING_USER.id}`,
          {
            name: EXISTING_USER.name,
            email: EXISTING_USER.email,
            password: "brand-new-pw",
          },
        );
      });
    });

    it("rejects a too-short password and does not submit", async () => {
      const user = userEvent.setup();
      renderForm({ user: EXISTING_USER });

      await user.type(screen.getByLabelText(/password/i), "short");
      await user.click(screen.getByRole("button", { name: /save changes/i }));

      expect(
        await screen.findByText(/password must be at least 8 characters/i),
      ).toBeInTheDocument();
      expect(mockedPatch).not.toHaveBeenCalled();
    });

    it("invalidates the users query and calls onClose on success", async () => {
      mockedPatch.mockResolvedValueOnce({
        data: { user: EXISTING_USER },
      });
      const onClose = vi.fn();
      const user = userEvent.setup();
      const { queryClient } = renderForm({ user: EXISTING_USER, onClose });
      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

      await user.click(screen.getByRole("button", { name: /save changes/i }));

      await waitFor(() => {
        expect(onClose).toHaveBeenCalledTimes(1);
      });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["users"] });
    });

    it("shows 'Saving…' while submitting", async () => {
      let resolvePatch: (value: unknown) => void = () => {};
      mockedPatch.mockReturnValueOnce(
        new Promise((resolve) => {
          resolvePatch = resolve;
        }),
      );
      const user = userEvent.setup();
      renderForm({ user: EXISTING_USER });

      await user.click(screen.getByRole("button", { name: /save changes/i }));

      const submit = await screen.findByRole("button", { name: /saving/i });
      expect(submit).toBeDisabled();
      expect(screen.getByRole("button", { name: /cancel/i })).toBeDisabled();

      resolvePatch({ data: { user: EXISTING_USER } });
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
        mockedPatch.mockRejectedValueOnce(conflict);

        const user = userEvent.setup();
        renderForm({ user: EXISTING_USER });

        await user.click(screen.getByRole("button", { name: /save changes/i }));

        expect(await screen.findByRole("alert")).toHaveTextContent(
          /email already in use/i,
        );
      });

      it("shows 'Failed to update user' on other failures", async () => {
        mockedPatch.mockRejectedValueOnce(new Error("network down"));

        const user = userEvent.setup();
        renderForm({ user: EXISTING_USER });

        await user.click(screen.getByRole("button", { name: /save changes/i }));

        expect(await screen.findByRole("alert")).toHaveTextContent(
          /failed to update user/i,
        );
      });
    });
  });
});
