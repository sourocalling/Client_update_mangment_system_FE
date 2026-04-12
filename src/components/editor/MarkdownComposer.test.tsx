import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MarkdownComposer } from "./MarkdownComposer";

function setup(value = "hello") {
  const onChange = jest.fn();
  const onUploadImage = jest.fn(async () => ({ url: "/uploads/x.png" }));

  render(
    <MarkdownComposer
      value={value}
      onChange={onChange}
      onUploadImage={onUploadImage}
      placeholder="..."
      maxChars={1000}
    />
  );

  const textarea = screen.getByPlaceholderText("...") as HTMLTextAreaElement;
  return { onChange, onUploadImage, textarea };
}

describe("MarkdownComposer", () => {
  it("wraps selection with bold markdown", () => {
    const { onChange, textarea } = setup("hello");
    textarea.setSelectionRange(0, 5);
    fireEvent.click(screen.getByRole("button", { name: "Bold" }));
    expect(onChange).toHaveBeenCalledWith("**hello**");
  });

  it("inserts a link with URL normalization", () => {
    const { onChange, textarea } = setup("hello");
    textarea.setSelectionRange(5, 5);
    fireEvent.click(screen.getByRole("button", { name: "Link" }));
    const input = screen.getByPlaceholderText("https://example.com") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "example.com" } });
    fireEvent.keyDown(input, { key: "Enter" });
    const next = (onChange.mock.calls[0]?.[0] as string) ?? "";
    expect(next.includes("[link](https://example.com/)")).toBe(true);
  });

  it("uploads image and inserts markdown image", async () => {
    const { onChange, onUploadImage } = setup("hello");
    const file = new File([new Uint8Array([1, 2, 3])], "a.png", { type: "image/png" });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => expect(onUploadImage).toHaveBeenCalled());
    const next = onChange.mock.calls[0]?.[0] as string;
    expect(next).toContain("![a.png](/uploads/x.png)");
  });
});
