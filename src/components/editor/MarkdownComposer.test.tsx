import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MarkdownComposer } from "./MarkdownComposer";

function setup(value = "") {
  const onChange = jest.fn();
  const onUploadImage = jest.fn(async () => ({ url: "/uploads/x.png" }));

  render(
    <MarkdownComposer
      value={value}
      onChange={onChange}
      onUploadImage={onUploadImage}
      placeholder="Start writing..."
      maxChars={1000}
    />
  );

  return { onChange, onUploadImage };
}

describe("MarkdownComposer", () => {
  it("renders the toolbar with formatting buttons", () => {
    setup();
    expect(screen.getByTitle("Bold")).toBeInTheDocument();
    expect(screen.getByTitle("Italic")).toBeInTheDocument();
    expect(screen.getByTitle("Underline")).toBeInTheDocument();
    expect(screen.getByTitle("Bullet list")).toBeInTheDocument();
    expect(screen.getByTitle("Ordered list")).toBeInTheDocument();
    expect(screen.getByTitle("Insert link")).toBeInTheDocument();
    expect(screen.getByTitle("Upload image")).toBeInTheDocument();
  });

  it("shows the character count", () => {
    setup("hello");
    expect(screen.getByText("5/1000")).toBeInTheDocument();
  });

  it("opens link dialog when link button is clicked", () => {
    setup();
    fireEvent.click(screen.getByTitle("Insert link"));
    expect(screen.getByPlaceholderText("https://example.com")).toBeInTheDocument();
  });

  it("provides a file input for image upload", async () => {
    const { onUploadImage } = setup();
    const file = new File([new Uint8Array([1, 2, 3])], "a.png", { type: "image/png" });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input).toBeInTheDocument();
    fireEvent.change(input, { target: { files: [file] } });
    await waitFor(() => expect(onUploadImage).toHaveBeenCalledWith(file));
  });
});
