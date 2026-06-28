import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Modal } from "./Modal.js";

describe("Modal", () => {
  it("no renderiza nada cuando open=false", () => {
    render(
      <Modal open={false} onClose={() => {}}>
        body
      </Modal>
    );
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("renderiza con role=dialog y título cuando open", () => {
    render(
      <Modal open onClose={() => {}} title="Hello">
        body
      </Modal>
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Hello" })).toBeInTheDocument();
  });

  it("cierra con Escape", () => {
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose}>
        body
      </Modal>
    );
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledOnce();
  });
});
