(function (root) {
  "use strict";
  function createRecovery(client, now = Date.now) {
    let ready = false;
    let busy = false;
    let nextRequest = 0;
    return {
      async request(email, redirectTo) {
        if (busy || now() < nextRequest) throw new Error("cooldown");
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) throw new Error("email");
        busy = true;
        nextRequest = now() + 60000;
        try {
          const { error } = await client.auth.resetPasswordForEmail(email.trim(), { redirectTo });
          if (error) throw error;
        } finally { busy = false; }
      },
      async accept(fragment) {
        ready = false;
        const params = new URLSearchParams(fragment.replace(/^#/, ""));
        if (params.get("type") !== "recovery" || params.has("error") || !params.get("access_token") || !params.get("refresh_token")) throw new Error("link");
        const { data, error } = await client.auth.setSession({ access_token: params.get("access_token"), refresh_token: params.get("refresh_token") });
        if (error || !data.session) throw new Error("link");
        const verified = await client.auth.getUser();
        if (verified.error || !verified.data.user) throw new Error("link");
        ready = true;
      },
      async update(password, confirmation) {
        if (!ready || busy) throw new Error("link");
        if (password.length < 12) throw new Error("length");
        if (password !== confirmation) throw new Error("match");
        busy = true;
        try {
          const { error } = await client.auth.updateUser({ password });
          if (error) throw error;
          ready = false;
          // Never adopt this ephemeral session into the admin login store.
          await client.auth.signOut({ scope: "local" }).catch(() => undefined);
        } finally { busy = false; }
      }
    };
  }
  root.NilazaRecovery = { createRecovery };
})(typeof window === "undefined" ? globalThis : window);
