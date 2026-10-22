(function () {
  const roles = new Set(["owner", "admin", "editor", "safety_reviewer"]);
  const capabilities = new Set(["hub.read", "content.read", "content.draft", "content.publish", "content.delete", "ai.read", "ai.manage", "roles.manage", "overview.read", "notifications.dispatch", "safety.review"]);
  window.NilazaAccess = {
    parse(data, user) {
      if (!data || data.userId !== user.id || !Array.isArray(data.roles) || !Array.isArray(data.capabilities)
        || data.roles.some(role => !roles.has(role)) || data.capabilities.some(cap => !capabilities.has(cap))
        || (!data.roles.length && data.capabilities.length)) throw Error("Invalid access response");
      return { ...data, email: user.email, role: ["owner", "admin", "editor", "safety_reviewer"].find(role => data.roles.includes(role)) };
    },
    can(session, capability) { return session?.capabilities?.includes(capability) === true; },
    async load(client, user) {
      const { data, error } = await client.rpc("get_admin_access");
      if (error) throw Error("Unable to verify access");
      return this.parse(data, user);
    }
  };
})();
