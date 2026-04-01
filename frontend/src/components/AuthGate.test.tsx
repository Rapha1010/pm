import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AuthGate } from "@/components/AuthGate";

const renderGate = () =>
  render(
    <AuthGate>
      <div>Authenticated content</div>
    </AuthGate>
  );

describe("AuthGate", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("shows the login form when signed out", () => {
    renderGate();
    expect(
      screen.getByRole("heading", { name: /sign in/i })
    ).toBeInTheDocument();
  });

  it("rejects invalid credentials", async () => {
    renderGate();
    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/username/i), "wrong");
    await user.type(screen.getByLabelText(/password/i), "credentials");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /invalid credentials/i
    );
  });

  it("allows login and logout with demo credentials", async () => {
    renderGate();
    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/username/i), "user");
    await user.type(screen.getByLabelText(/password/i), "password");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    expect(
      await screen.findByText("Authenticated content")
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /log out/i }));

    expect(
      await screen.findByRole("heading", { name: /sign in/i })
    ).toBeInTheDocument();
  });
});
