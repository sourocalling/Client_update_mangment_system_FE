import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { AiEnhanceDialog } from "./AiEnhanceDialog";

describe("AiEnhanceDialog", () => {
  it("calls enhance API and allows replacing content", async () => {
    const fetchMock = jest.fn(async () => {
      const response: Partial<Response> = {
        ok: true,
        json: async () => ({
          enriched: "Polished text.",
          risk: false,
          riskKeywords: [],
          inappropriate: false,
          inappropriateKeywords: []
        })
      };
      return response as Response;
    }) as unknown as typeof fetch;

    (globalThis as unknown as { fetch: typeof fetch }).fetch = fetchMock;

    const onReplace = jest.fn();
    render(
      <AiEnhanceDialog
        open
        token="t"
        body="raw"
        onClose={() => {}}
        onResult={() => {}}
        onReplace={onReplace}
        onInsert={() => {}}
      />
    );

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(await screen.findByText("Polished text.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Replace" }));
    expect(onReplace).toHaveBeenCalledWith("Polished text.");
  });
});

