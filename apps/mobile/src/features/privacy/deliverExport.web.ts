export async function cleanupExportFiles() { /* Object URLs have their own short lifetime. */ }

export async function deliverExport(json: string, filename: string, active: () => boolean): Promise<"dialog_closed" | "download_requested"> {
  if (!active() || !/^nilaza-data-[0-9TZ.\-]+\.json$/.test(filename)) throw new Error("Export is unavailable");
  const url = URL.createObjectURL(new Blob([json], { type: "application/json;charset=utf-8" }));
  const anchor = document.createElement("a");
  try {
    anchor.href = url; anchor.download = filename;
    document.body.appendChild(anchor);
    if (!active()) throw new Error("Account closed during export");
    anchor.click();
    // Browsers can resolve a download after click returns; release after that turn.
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    return "download_requested";
  } catch (error) { URL.revokeObjectURL(url); throw error; }
  finally { anchor.remove(); }
}
