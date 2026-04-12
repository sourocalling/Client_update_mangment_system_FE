import { apiFetch } from "./api";

describe("apiFetch", () => {
  it("throws an error on non-2xx responses", async () => {
    const fetchMock = jest.fn(async () => {
      const response: Partial<Response> = {
        ok: false,
        json: async () => ({ error: "bad" })
      };
      return response as Response;
    }) as unknown as typeof fetch;
    (globalThis as unknown as { fetch: typeof fetch }).fetch = fetchMock;

    await expect(apiFetch("/x")).rejects.toThrow("bad");
  });
});
