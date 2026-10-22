import type { LocalAuthState } from "../types";

let sequence = 0;

/** A login lifetime, not a token lifetime. Rotating a token must not reset UI. */
export class AccountScope {
  readonly key = ++sequence;
  readonly userId: string | undefined;
  readonly controller = new AbortController();
  private token?: string;
  active = true;

  constructor(auth: LocalAuthState) {
    this.userId = auth.status === "signed_in" ? auth.user.id : undefined;
    this.update(auth);
  }

  update(auth: LocalAuthState) {
    const userId = auth.status === "signed_in" ? auth.user.id : undefined;
    if (userId !== this.userId) throw new Error("Account scope cannot change owner");
    this.token = auth.status === "signed_in" ? auth.backendSession?.accessToken : undefined;
  }

  get accessToken() {
    return this.active ? this.token : undefined;
  }

  close() {
    this.active = false;
    this.token = undefined;
    this.controller.abort();
  }
}
