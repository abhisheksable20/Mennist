import { render, screen } from "@testing-library/react";
import ErrorBoundary from "../components/utils/ErrorBoundary";

const Boom = ({ error }) => { throw error; };

beforeEach(() => {
  jest.spyOn(console, "error").mockImplementation(() => {});
  sessionStorage.clear();
});
afterEach(() => console.error.mockRestore());

test("renders children when nothing breaks", () => {
  render(<ErrorBoundary resetKey="/"><p>fine</p></ErrorBoundary>);
  expect(screen.getByText("fine")).toBeInTheDocument();
});

test("a crash shows a friendly screen instead of a blank page", () => {
  render(<ErrorBoundary resetKey="/"><Boom error={new Error("x")} /></ErrorBoundary>);
  expect(screen.getByRole("alert")).toHaveTextContent("Something went wrong");
  expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
});

test("changing page clears the error", () => {
  const { rerender } = render(<ErrorBoundary resetKey="/a"><Boom error={new Error("x")} /></ErrorBoundary>);
  rerender(<ErrorBoundary resetKey="/b"><p>next page</p></ErrorBoundary>);
  expect(screen.getByText("next page")).toBeInTheDocument();
});

test("missing code after a deploy: asks to reload, and reloads only once", () => {
  const err = new Error("Loading chunk 123 failed.");
  err.name = "ChunkLoadError";
  sessionStorage.setItem("mennist-chunk-reload", "1"); // already reloaded once
  render(<ErrorBoundary resetKey="/"><Boom error={err} /></ErrorBoundary>);
  expect(screen.getByRole("alert")).toHaveTextContent("A new version is available");
  expect(screen.getByRole("button", { name: "Reload" })).toBeInTheDocument();
});
