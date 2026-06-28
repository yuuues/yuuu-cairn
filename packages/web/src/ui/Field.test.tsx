import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Field } from "./Field.js";
import { Input } from "./Input.js";

describe("Field", () => {
  it("muestra la etiqueta", () => {
    render(
      <Field label="Email" htmlFor="email">
        <Input id="email" />
      </Field>
    );
    expect(screen.getByText("Email")).toBeInTheDocument();
  });

  it("muestra el error con role=alert", () => {
    render(
      <Field label="Email" htmlFor="email" error="Required">
        <Input id="email" />
      </Field>
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Required");
  });
});
