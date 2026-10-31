import { fireEvent, render } from "@testing-library/react-native";
import { act, useState } from "react";
import { AccessibilityInfo, Linking } from "react-native";

import { AuthFlow } from "../AuthFlow";
import type { SignUpOutcome } from "../AuthFlow";
import { AuthView, Language } from "../../types";

function Harness({
  onSignIn = jest.fn(),
  onSignUp = jest.fn(),
  onResendConfirmation = jest.fn(),
  onForgotPassword = jest.fn(),
  onContinueAsGuest,
  initialView = "welcome",
  initialLanguage = "en"
}: {
  onSignIn?: (email: string, password: string) => Promise<void> | void;
  onSignUp?: (name: string, email: string, password: string) => Promise<SignUpOutcome> | SignUpOutcome;
  onResendConfirmation?: (email: string) => Promise<void> | void;
  onForgotPassword?: (email: string) => Promise<void> | void;
  onContinueAsGuest?: () => void;
  initialView?: AuthView;
  initialLanguage?: Language;
}) {
  const [view, setView] = useState<AuthView>(initialView);
  const [language, setLanguage] = useState<Language>(initialLanguage);
  return (
    <AuthFlow
      language={language}
      onLanguageChange={setLanguage}
      onSignIn={onSignIn}
      onSignUp={onSignUp}
      onResendConfirmation={onResendConfirmation}
      onForgotPassword={onForgotPassword}
      onContinueAsGuest={onContinueAsGuest}
      onViewChange={setView}
      view={view}
    />
  );
}

describe("AuthFlow", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockResolvedValue(true);
  });

  afterEach(() => {
    act(() => jest.runOnlyPendingTimers());
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it.each([
    ["en", "Email Address", "Enter a valid email address.", "Already have an account?"],
    ["vi", "Email", "Hãy nhập một địa chỉ email hợp lệ.", "Đã có tài khoản?"]
  ] as const)("validates email locally while typing in %s without submitting Auth requests", (language, emailLabel, invalidCopy, accountCopy) => {
    const onSignUp = jest.fn(), onSignIn = jest.fn(), onForgotPassword = jest.fn(), onResendConfirmation = jest.fn();
    const screen = render(<Harness initialView="sign-up" initialLanguage={language} onSignUp={onSignUp} onSignIn={onSignIn} onForgotPassword={onForgotPassword} onResendConfirmation={onResendConfirmation} />);
    expect(screen.getByText(accountCopy)).toBeTruthy();
    expect(screen.queryByText(invalidCopy)).toBeNull();
    fireEvent.changeText(screen.getByLabelText(emailLabel), "luna@");
    expect(screen.getByText(invalidCopy)).toBeTruthy();
    fireEvent.changeText(screen.getByLabelText(emailLabel), "luna@example.com");
    expect(screen.queryByText(invalidCopy)).toBeNull();
    for (const request of [onSignUp, onSignIn, onForgotPassword, onResendConfirmation]) expect(request).not.toHaveBeenCalled();
  });

  it("offers the guest preview on the welcome screen only when it is enabled", () => {
    const onPreview = jest.fn();
    const screen = render(<AuthFlow language="vi" view="welcome" onLanguageChange={jest.fn()} onSignIn={jest.fn()} onSignUp={jest.fn()} onForgotPassword={jest.fn()} onViewChange={jest.fn()} onPreview={onPreview} />);
    fireEvent.press(screen.getByText("Xem thử không cần tài khoản"));
    expect(onPreview).toHaveBeenCalled();
    const hidden = render(<Harness initialLanguage="vi" />);
    expect(hidden.queryByText("Xem thử không cần tài khoản")).toBeNull();
  });

  it("retains the trimmed email when choosing sign-in from the signup email field", () => {
    const onSignUp = jest.fn(), onSignIn = jest.fn();
    const screen = render(<Harness initialView="sign-up" onSignUp={onSignUp} onSignIn={onSignIn} />);
    fireEvent.changeText(screen.getByLabelText("Email Address"), " luna@example.com ");
    fireEvent.press(screen.getByText("Sign In"));
    expect(screen.getByLabelText("Email Address").props.value).toBe("luna@example.com");
    expect(screen.queryByLabelText("Name")).toBeNull();
    expect(onSignUp).not.toHaveBeenCalled();
    expect(onSignIn).not.toHaveBeenCalled();
  });

  it.each([
    ["en", "Name", "Email Address", "Password", "Create Account", "Forgot password?", "Send reset link", "Return to sign in"],
    ["vi", "Tên", "Email", "Mật khẩu", "Tạo tài khoản", "Quên mật khẩu?", "Gửi liên kết đặt lại mật khẩu", "Quay lại đăng nhập"]
  ] as const)("offers direct recovery from generic confirmation in %s without automatically sending a reset", async (language, nameLabel, emailLabel, passwordLabel, createCopy, forgotCopy, sendCopy, returnCopy) => {
    const onForgotPassword = jest.fn();
    const screen = render(<Harness initialView="sign-up" initialLanguage={language} onSignUp={() => "pending-email-confirmation"} onForgotPassword={onForgotPassword} />);
    fireEvent.changeText(screen.getByLabelText(nameLabel), "Luna");
    fireEvent.changeText(screen.getByLabelText(emailLabel), " luna@example.com ");
    fireEvent.changeText(screen.getByLabelText(passwordLabel), "fixture-password");
    fireEvent.press(screen.getByRole("checkbox"));
    fireEvent.press(screen.getByText(createCopy));
    await act(async () => { jest.advanceTimersByTime(500); });
    expect(screen.getByText(/luna@example.com/)).toBeTruthy();
    expect(screen.getByText(returnCopy)).toBeTruthy();
    fireEvent.press(screen.getByText(forgotCopy));
    expect(screen.getByLabelText(emailLabel).props.value).toBe("luna@example.com");
    expect(screen.queryByLabelText(passwordLabel)).toBeNull();
    expect(onForgotPassword).not.toHaveBeenCalled();
    await act(async () => { fireEvent.press(screen.getByText(sendCopy)); });
    expect(onForgotPassword).toHaveBeenCalledTimes(1);
    expect(onForgotPassword).toHaveBeenCalledWith("luna@example.com");
    fireEvent.press(screen.getByText(returnCopy));
    expect(screen.getByLabelText(passwordLabel).props.value).toBe("");
    expect(screen.getByLabelText(emailLabel).props.value).toBe("luna@example.com");
  });

  it("blocks confirmation navigation during a resend and allows recovery after its error settles", async () => {
    let reject!: (error: Error) => void;
    const onResendConfirmation = jest.fn(() => new Promise<void>((_, no) => { reject = no; }));
    const onForgotPassword = jest.fn();
    const screen = render(<Harness initialView="sign-up" onSignUp={() => "pending-email-confirmation"} onResendConfirmation={onResendConfirmation} onForgotPassword={onForgotPassword} />);
    fireEvent.changeText(screen.getByLabelText("Name"), "Luna");
    fireEvent.changeText(screen.getByLabelText("Email Address"), "luna@example.com");
    fireEvent.changeText(screen.getByLabelText("Password"), "fixture-password");
    fireEvent.press(screen.getByRole("checkbox"));
    fireEvent.press(screen.getByText("Create Account"));
    await act(async () => { jest.advanceTimersByTime(500); });
    fireEvent.press(screen.getByText("Resend confirmation email"));
    fireEvent.press(screen.getByText("Forgot password?"));
    fireEvent.press(screen.getByText("Return to sign in"));
    expect(screen.getByText("Check your email")).toBeTruthy();
    expect(screen.queryByLabelText("Email Address")).toBeNull();
    expect(onResendConfirmation).toHaveBeenCalledTimes(1);
    expect(onForgotPassword).not.toHaveBeenCalled();
    await act(async () => { reject(new Error("Fixture SMTP unavailable")); });
    expect(screen.getByText("Fixture SMTP unavailable")).toBeTruthy();
    fireEvent.press(screen.getByText("Forgot password?"));
    expect(screen.queryByText("Fixture SMTP unavailable")).toBeNull();
    expect(screen.getByLabelText("Email Address").props.value).toBe("luna@example.com");
  });

  it("cancels the old signup delay when the user chooses a newer signin intent", async () => {
    const onSignUp = jest.fn(), onSignIn = jest.fn();
    const screen = render(<Harness onSignIn={onSignIn} onSignUp={onSignUp} />);
    fireEvent.press(screen.getByText("Create account"));
    fireEvent.changeText(screen.getByLabelText("Name"), "QA A");
    fireEvent.changeText(screen.getByLabelText("Email Address"), "qa-a@example.com");
    fireEvent.changeText(screen.getByLabelText("Password"), "fixture-password");
    fireEvent.press(screen.getByRole("checkbox"));
    fireEvent.press(screen.getByText("Create Account"));
    await act(async () => { jest.advanceTimersByTime(50); });
    fireEvent.press(screen.getByText("Sign In"));
    fireEvent.changeText(screen.getByLabelText("Email Address"), "qa-b@example.com");
    fireEvent.press(screen.getByRole("button", { name: "Sign In" }));
    await act(async () => { jest.advanceTimersByTime(500); });
    expect(onSignUp).not.toHaveBeenCalled();
    expect(onSignIn).toHaveBeenCalledTimes(1);
    expect(onSignIn).toHaveBeenCalledWith("qa-b@example.com", "fixture-password");
  });

  it("keeps the pending network form and blocks competing auth or duplicate submissions", async () => {
    let reject!: (reason: Error) => void;
    const onSignIn = jest.fn(() => new Promise<void>((_, no) => { reject = no; }));
    const screen = render(<Harness onSignIn={onSignIn} />);
    fireEvent.press(screen.getByText("Log in"));
    fireEvent.changeText(screen.getByLabelText("Email Address"), "qa@example.com");
    fireEvent.changeText(screen.getByLabelText("Password"), "fixture-password");
    fireEvent.press(screen.getByRole("button", { name: "Sign In" }));
    await act(async () => { jest.advanceTimersByTime(400); });
    fireEvent.press(screen.getByText("Create Account"));
    expect(screen.getByText("Continuing...")).toBeTruthy();
    expect(screen.queryByLabelText("Name")).toBeNull();
    fireEvent.press(screen.getByText("Continuing..."));
    expect(onSignIn).toHaveBeenCalledTimes(1);
    await act(async () => { reject(new Error("QA network failure")); });
    fireEvent.press(screen.getByText("Create Account"));
    expect(screen.getByLabelText("Name")).toBeTruthy();
    expect(screen.queryByText("QA network failure")).toBeNull();
  });

  it("unmount cancels callbacks that have not entered the network", async () => {
    const onSignIn = jest.fn();
    const screen = render(<Harness onSignIn={onSignIn} />);
    fireEvent.press(screen.getByText("Log in"));
    fireEvent.changeText(screen.getByLabelText("Email Address"), "qa@example.com");
    fireEvent.changeText(screen.getByLabelText("Password"), "fixture-password");
    fireEvent.press(screen.getByRole("button", { name: "Sign In" }));
    screen.unmount();
    await act(async () => { jest.advanceTimersByTime(400); });
    expect(onSignIn).not.toHaveBeenCalled();
  });

  it("navigates from Welcome to Sign up and switches language", () => {
    const screen = render(<Harness />);
    expect(screen.queryByLabelText("Language options")).toBeNull();
    fireEvent.press(screen.getByLabelText("Language: English"));
    expect(screen.getByLabelText("Language options")).toBeTruthy();
    fireEvent.press(screen.getByText("Tiếng Việt"));
    expect(screen.getByText("Tạo tài khoản")).toBeTruthy();
    fireEvent.press(screen.getByText("Tạo tài khoản"));
    expect(screen.getByText("Tạo hồ sơ của bạn")).toBeTruthy();
  });

  it("fills the welcome canvas and keeps coming-soon languages disabled", () => {
    const onLanguageChange = jest.fn();
    const screen = render(
      <AuthFlow
        language="en"
        onLanguageChange={onLanguageChange}
        onSignIn={jest.fn()}
        onSignUp={jest.fn()}
        onForgotPassword={jest.fn()}
        onViewChange={jest.fn()}
        view="welcome"
      />
    );

    expect(screen.getByTestId("welcome-background").props.resizeMode).toBe("cover");
    fireEvent.press(screen.getByLabelText("Language: English"));
    const chineseOption = screen.getByLabelText("Chinese, Coming soon");
    expect(chineseOption.props.accessibilityState).toEqual(expect.objectContaining({ disabled: true }));
    expect(screen.getAllByText("Coming soon").length).toBeGreaterThan(0);
    fireEvent.press(chineseOption);
    expect(onLanguageChange).not.toHaveBeenCalled();
  });

  it("shows a clear confirmation state after email sign-up and clears the password", async () => {
    const onSignUp = jest.fn(() => "pending-email-confirmation" as const);
    const onResendConfirmation = jest.fn();
    const screen = render(
      <AuthFlow
        language="en"
        onLanguageChange={jest.fn()}
        onSignIn={jest.fn()}
        onSignUp={onSignUp}
        onResendConfirmation={onResendConfirmation}
        onForgotPassword={jest.fn()}
        onViewChange={jest.fn()}
        view="sign-up"
      />
    );

    fireEvent.changeText(screen.getByLabelText("Name"), "Luna");
    fireEvent.changeText(screen.getByLabelText("Email Address"), "luna@example.com");
    fireEvent.changeText(screen.getByLabelText("Password"), "moonlight");
    fireEvent.press(screen.getByRole("checkbox"));
    fireEvent.press(screen.getByText("Create Account"));

    await act(async () => {
      jest.advanceTimersByTime(500);
      await Promise.resolve();
    });

    expect(screen.getByText("Check your email")).toBeTruthy();
    expect(screen.getByText(/luna@example.com/)).toBeTruthy();
    expect(screen.queryByLabelText("Password")).toBeNull();
    await act(async () => {
      fireEvent.press(screen.getByText("Resend confirmation email"));
      await Promise.resolve();
    });
    expect(onResendConfirmation).toHaveBeenCalledWith("luna@example.com");
  });

  it("starts guest onboarding directly when guest entry is available", () => {
    const onContinueAsGuest = jest.fn();
    const screen = render(<Harness onContinueAsGuest={onContinueAsGuest} />);
    fireEvent.press(screen.getByText("Begin Your Journey"));
    expect(onContinueAsGuest).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("Create Your Profile")).toBeNull();
  });

  it("shows validation errors and submits a valid sign-up without exposing the password", async () => {
    const onSignUp = jest.fn();
    const screen = render(
      <AuthFlow
        language="en"
        onLanguageChange={jest.fn()}
        onSignIn={jest.fn()}
        onSignUp={onSignUp}
        onForgotPassword={jest.fn()}
        onViewChange={jest.fn()}
        view="sign-up"
      />
    );

    fireEvent.press(screen.getByText("Create Account"));
    expect(screen.getByText("Enter the name you would like Nilaza to use.")).toBeTruthy();

    fireEvent.changeText(screen.getByLabelText("Name"), "Luna");
    fireEvent.changeText(screen.getByLabelText("Email Address"), "luna@example.com");
    fireEvent.changeText(screen.getByLabelText("Password"), "moonlight");
    fireEvent.press(screen.getByLabelText("Show password"));
    expect(screen.getByLabelText("Hide password")).toBeTruthy();
    fireEvent.press(screen.getByText("Create Account"));
    expect(screen.getByText("Nilaza is for people aged 18 and over. Please confirm to create an account.")).toBeTruthy();
    expect(onSignUp).not.toHaveBeenCalled();

    const adultConfirm = screen.getByRole("checkbox");
    expect(adultConfirm.props.accessibilityState).toEqual(expect.objectContaining({ checked: false }));
    fireEvent.press(adultConfirm);
    expect(screen.getByRole("checkbox").props.accessibilityState).toEqual(expect.objectContaining({ checked: true }));
    fireEvent.press(screen.getByText("Create Account"));

    await act(async () => {
      jest.advanceTimersByTime(500);
    });
    expect(onSignUp).toHaveBeenCalledWith("Luna", "luna@example.com", "moonlight");
  });

  it("validates and submits the email sign-in flow", async () => {
    const onSignIn = jest.fn();
    const screen = render(
      <AuthFlow
        language="en"
        onLanguageChange={jest.fn()}
        onSignIn={onSignIn}
        onSignUp={jest.fn()}
        onForgotPassword={jest.fn()}
        onViewChange={jest.fn()}
        view="sign-in"
      />
    );

    fireEvent.changeText(screen.getByLabelText("Email Address"), "returning@example.com");
    fireEvent.changeText(screen.getByLabelText("Password"), "moonlight");
    fireEvent.press(screen.getByRole("button", { name: "Sign In" }));
    await act(async () => {
      jest.advanceTimersByTime(400);
    });
    expect(onSignIn).toHaveBeenCalledWith("returning@example.com", "moonlight");
  });

  it("lets a new user switch from sign-in to sign-up without going back", () => {
    const onViewChange = jest.fn();
    const screen = render(
      <AuthFlow
        language="en"
        onLanguageChange={jest.fn()}
        onSignIn={jest.fn()}
        onSignUp={jest.fn()}
        onForgotPassword={jest.fn()}
        onViewChange={onViewChange}
        view="sign-in"
      />
    );

    expect(screen.getByText("New to Nilaza?")).toBeTruthy();
    fireEvent.press(screen.getByText("Create Account"));
    expect(onViewChange).toHaveBeenCalledWith("sign-up");
  });

  it("supports password reset from the sign-in screen", async () => {
    const onForgotPassword = jest.fn();
    const screen = render(<Harness onForgotPassword={onForgotPassword} />);

    fireEvent.press(screen.getByText("Log in"));

    fireEvent.press(screen.getByText("Forgot password?"));
    expect(screen.getByText("Reset your password")).toBeTruthy();
    expect(screen.getByText("Enter your email and Nilaza will send you a password reset link.")).toBeTruthy();
    expect(screen.queryByLabelText("Password")).toBeNull();
    expect(onForgotPassword).not.toHaveBeenCalled();

    fireEvent.changeText(screen.getByLabelText("Email Address"), "returning@example.com");
    fireEvent.press(screen.getByText("Send reset link"));

    await act(async () => {
      await Promise.resolve();
    });

    expect(onForgotPassword).toHaveBeenCalledWith("returning@example.com");
    expect(screen.getByText("If this email has a Nilaza account, a password reset link will be sent to your inbox.")).toBeTruthy();
    fireEvent.press(screen.getByText("Return to sign in"));
    expect(screen.getByText("Welcome back")).toBeTruthy();
  });

  it("shows async sign-in errors and unlocks the submit button", async () => {
    const onSignIn = jest.fn(async () => {
      throw new Error("Invalid login credentials");
    });
    const screen = render(
      <AuthFlow
        language="en"
        onLanguageChange={jest.fn()}
        onSignIn={onSignIn}
        onSignUp={jest.fn()}
        onForgotPassword={jest.fn()}
        onViewChange={jest.fn()}
        view="sign-in"
      />
    );

    fireEvent.changeText(screen.getByLabelText("Email Address"), "returning@example.com");
    fireEvent.changeText(screen.getByLabelText("Password"), "moonlight");
    fireEvent.press(screen.getByRole("button", { name: "Sign In" }));
    expect(screen.getByText("Continuing...")).toBeTruthy();

    await act(async () => {
      jest.advanceTimersByTime(400);
      await Promise.resolve();
    });

    expect(screen.getByText("Invalid login credentials")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Sign In" })).toBeTruthy();
  });

  it("hides sign-in providers that do not work yet and opens the real legal pages", () => {
    const openURL = jest.spyOn(Linking, "openURL").mockResolvedValue(true);
    const screen = render(
      <AuthFlow
        language="en"
        onLanguageChange={jest.fn()}
        onSignIn={jest.fn()}
        onSignUp={jest.fn()}
        onForgotPassword={jest.fn()}
        onViewChange={jest.fn()}
        view="sign-in"
      />
    );

    for (const provider of ["Apple", "Google", "Facebook", "X"]) {
      expect(screen.queryByLabelText(new RegExp(`Continue with ${provider}`))).toBeNull();
    }
    fireEvent.press(screen.getByText("Terms of Service"));
    expect(openURL).toHaveBeenCalledWith("https://nilaza.magicpendigital.com/en/terms/");
    fireEvent.press(screen.getByText("Privacy Policy"));
    expect(openURL).toHaveBeenCalledWith("https://nilaza.magicpendigital.com/en/privacy/");
  });
});
