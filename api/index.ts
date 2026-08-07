import { IncomingMessage, ServerResponse } from "http";
import { handleRequest } from "../src/server";

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  await handleRequest(req, res);
}