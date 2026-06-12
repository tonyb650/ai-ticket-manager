import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import axios from "axios";
import ReplyForm from "./ReplyForm";

vi.mock("axios");

const mockedPost = vi.mocked(axios.post);

function renderForm(ticketId = "42") {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const utils = render(
    <QueryClientProvider client={queryClient}>
      <ReplyForm ticketId={ticketId} />
    </QueryClientProvider>,
  );
  return { ...utils, queryClient };
}

const textbox = () => screen.getByRole("textbox", { name: "Reply" });
const sendButton = () => screen.getByRole("button", { name: /send reply/i });

describe("<ReplyForm />", () => {
  beforeEach(() => {
    mockedPost.mockReset();
  });

  it("renders the reply textarea and submit button", () => {
    renderForm();
    expect(textbox()).toBeInTheDocument();
    expect(sendButton()).toBeInTheDocument();
  });

  it("blocks submission of an empty reply and does not POST", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(sendButton());

    expect(await screen.findByText(/too small|required/i)).toBeInTheDocument();
    expect(mockedPost).not.toHaveBeenCalled();
  });

  it("POSTs the reply body to the ticket's replies endpoint", async () => {
    mockedPost.mockResolvedValue({ data: { reply: { id: 1 } } });
    const user = userEvent.setup();
    renderForm("42");

    await user.type(textbox(), "Looking into it now.");
    await user.click(sendButton());

    await waitFor(() => {
      expect(mockedPost).toHaveBeenCalledWith("/api/tickets/42/replies", {
        body: "Looking into it now.",
      });
    });
  });

  it("clears the textarea and invalidates queries on success", async () => {
    mockedPost.mockResolvedValue({ data: { reply: { id: 1 } } });
    const user = userEvent.setup();
    const { queryClient } = renderForm("42");
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    await user.type(textbox(), "Looking into it now.");
    await user.click(sendButton());

    await waitFor(() => expect(textbox()).toHaveValue(""));
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["ticket", "42"] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["tickets"] });
  });

  describe("when the request fails", () => {
    let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    });

    afterEach(() => {
      consoleErrorSpy.mockRestore();
    });

    it("shows a root error and keeps the typed text", async () => {
      mockedPost.mockRejectedValue(new Error("network down"));
      const user = userEvent.setup();
      renderForm();

      await user.type(textbox(), "Looking into it now.");
      await user.click(sendButton());

      expect(
        await screen.findByText(/failed to send reply/i),
      ).toBeInTheDocument();
      expect(textbox()).toHaveValue("Looking into it now.");
    });
  });
});
