import { IncomingMessage, ServerResponse } from "http";
import { handleRequest } from "../src/server";

function normalizeRewrittenApiPath(req: IncomingMessage): void {
  const requestUrl = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
  const rewrittenPath = requestUrl.searchParams.get("path");

  if (requestUrl.pathname !== "/api/index" || !rewrittenPath) return;

  requestUrl.pathname = `/api/${rewrittenPath.replace(/^\/+/, "")}`;
  requestUrl.searchParams.delete("path");
  req.url = `${requestUrl.pathname}${requestUrl.search}`;
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  normalizeRewrittenApiPath(req);
  await handleRequest(req, res);
}
