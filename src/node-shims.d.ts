declare module "http" {
  export interface IncomingMessage {
    method?: string;
    url?: string;
    headers: Record<string, string | string[] | undefined>;
    on(event: "data", callback: (chunk: Uint8Array) => void): void;
    on(event: "end", callback: () => void): void;
    on(event: "error", callback: (error: Error) => void): void;
  }

  export interface ServerResponse {
    statusCode: number;
    setHeader(name: string, value: string | string[]): void;
    end(data?: string | Uint8Array): void;
  }

  export function createServer(
    handler: (req: IncomingMessage, res: ServerResponse) => void | Promise<void>
  ): {
    listen(port: number, callback?: () => void): void;
  };
}

declare module "fs/promises" {
  export function mkdir(path: string, options?: { recursive?: boolean }): Promise<void>;
  export function readFile(path: string, encoding: "utf8"): Promise<string>;
  export function readFile(path: string): Promise<Uint8Array>;
  export function writeFile(path: string, data: string): Promise<void>;
  export function stat(path: string): Promise<{ isFile(): boolean }>;
}

declare module "path" {
  export function extname(path: string): string;
  export function join(...paths: string[]): string;
  export function normalize(path: string): string;
  export function resolve(...paths: string[]): string;
}

declare module "crypto" {
  export function randomBytes(size: number): { toString(encoding: string): string };
  export function pbkdf2Sync(
    password: string,
    salt: string,
    iterations: number,
    keylen: number,
    digest: string
  ): { toString(encoding: string): string };
  export function timingSafeEqual(a: unknown, b: unknown): boolean;
}

declare const __dirname: string;
declare const process: { env: Record<string, string | undefined> };
declare const console: {
  log(...args: unknown[]): void;
  error(...args: unknown[]): void;
};
declare const Buffer: {
  from(input: string, encoding?: string): { length: number };
  concat(chunks: Uint8Array[]): { toString(encoding: string): string };
};
