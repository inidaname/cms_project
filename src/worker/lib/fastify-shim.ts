import type { ContextUser } from "../types";

export type ShimSchema = {
  body?: object;
  querystring?: object;
  params?: object;
  headers?: object;
  [key: string]: unknown;
};

export interface ShimRouteEntry {
  method: string;
  path: string;
  prefix: string;
  authenticate: boolean;
  schema: ShimSchema | undefined;
  handler: (request: any, reply: ShimReply) => Promise<unknown> | unknown;
}

type ShimHandler = (request: any, reply: ShimReply) => Promise<unknown> | unknown;

interface ShimOptions {
  schema?: ShimSchema;
  preHandler?: unknown[] | unknown;
  onRequest?: unknown[] | unknown;
  [key: string]: unknown;
}

export interface ShimReply {
  status(code: number): ShimReply;
  send(payload?: unknown): ShimReply;
  header(name: string, value: string): ShimReply;
  code(code: number): ShimReply;
}

export function isAuthHook(hook: unknown): boolean {
  const name = (hook as { name?: string } | null)?.name ?? "";
  return name === "authenticate";
}

type PluginFn = (scope: Scope, opts?: { prefix?: string }) => unknown;

class Scope {
  private routes: ShimRouteEntry[] = [];
  private hooks: unknown[] = [];
  prisma: unknown;
  jwt: unknown;
  bcrypt: unknown;
  cache: unknown;
  authenticate: unknown;
  log = { info() {}, warn() {}, error() {}, debug() {} };

  addSchema() {}
  decorateRequest() {
    return this;
  }
  decorate() {
    return this;
  }
  addHook(_name: string, hook: unknown) {
    this.hooks.push(hook);
  }

  private collect(method: string, path: string, opts: ShimOptions | undefined, handler: ShimHandler) {
    const routeLevel = [
      ...(Array.isArray(opts?.preHandler) ? opts.preHandler : opts?.preHandler ? [opts.preHandler] : []),
      ...(Array.isArray(opts?.onRequest) ? opts.onRequest : opts?.onRequest ? [opts.onRequest] : []),
    ];
    this.routes.push({
      method,
      path,
      prefix: "",
      authenticate: [...this.hooks, ...routeLevel].filter(isAuthHook).length > 0,
      schema: opts?.schema,
      handler,
    });
  }

  get(path: string, opts?: ShimOptions | ShimHandler, handler?: ShimHandler) {
    const [o, h] = resolve(opts, handler);
    this.collect("get", path, o, h);
    return this;
  }
  post(path: string, opts?: ShimOptions | ShimHandler, handler?: ShimHandler) {
    const [o, h] = resolve(opts, handler);
    this.collect("post", path, o, h);
    return this;
  }
  put(path: string, opts?: ShimOptions | ShimHandler, handler?: ShimHandler) {
    const [o, h] = resolve(opts, handler);
    this.collect("put", path, o, h);
    return this;
  }
  patch(path: string, opts?: ShimOptions | ShimHandler, handler?: ShimHandler) {
    const [o, h] = resolve(opts, handler);
    this.collect("patch", path, o, h);
    return this;
  }
  delete(path: string, opts?: ShimOptions | ShimHandler, handler?: ShimHandler) {
    const [o, h] = resolve(opts, handler);
    this.collect("delete", path, o, h);
    return this;
  }

  register(plugin: PluginFn | unknown, opts?: { prefix?: string }) {
    const child = new Scope();
    child.prisma = this.prisma;
    child.jwt = this.jwt;
    child.bcrypt = this.bcrypt;
    child.cache = this.cache;
    child.authenticate = this.authenticate;
    child.hooks = [...this.hooks];
    void (plugin as PluginFn)(child, opts);
    this.routes.push(
      ...child.routes.map((r) => ({
        ...r,
        prefix: (opts?.prefix ?? "") + r.prefix,
      })),
    );
    return this;
  }

  entries(prefix: string): ShimRouteEntry[] {
    return this.routes.map((r) => ({ ...r, prefix: prefix + r.prefix }));
  }
}

function resolve(opts: ShimOptions | ShimHandler | undefined, handler: ShimHandler | undefined): [ShimOptions | undefined, ShimHandler] {
  if (typeof opts === "function") return [undefined, opts as ShimHandler];
  return [opts, handler as ShimHandler];
}

export function createScope(deps: { prisma: unknown; jwt: unknown; bcrypt: unknown; cache: unknown; authenticate: unknown }): Scope {
  const scope = new Scope();
  scope.prisma = deps.prisma;
  scope.jwt = deps.jwt;
  scope.bcrypt = deps.bcrypt;
  scope.cache = deps.cache;
  scope.authenticate = deps.authenticate;
  return scope;
}

export type { ContextUser };

// Re-exported for consumers that type route plugins loosely.
export type ScopeLike = Scope;
