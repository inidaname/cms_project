import Ajv, { type ValidateFunction } from "ajv";
import addFormats from "ajv-formats";
import { SharedSchemas } from "../../utils/schema/shared-schemas";

const ajv = new Ajv({
  strict: false,
  allErrors: true,
  removeAdditional: false,
  coerceTypes: true,
});

addFormats(ajv);

const shared = SharedSchemas as unknown as {
  definitions: Record<string, { $id?: string }>;
};

for (const [name, definition] of Object.entries(shared.definitions)) {
  ajv.addSchema(definition, definition.$id ?? name);
}

export function compileSchema(schema: object): ValidateFunction {
  return ajv.compile(schema);
}

export type RouteSchemas = {
  body?: object;
  querystring?: object;
  params?: object;
  headers?: object;
};

export class ValidationError extends Error {
  statusCode = 400;
  details: unknown;

  constructor(errors: unknown) {
    super("Validation failed");
    this.details = errors;
  }
}

export function validateSchemas(schemas: RouteSchemas | undefined) {
  const fns: {
    target: "body" | "query" | "param" | "header";
    validate: ValidateFunction;
  }[] = [];

  if (schemas?.body) fns.push({ target: "body", validate: compileSchema(schemas.body) });
  if (schemas?.querystring) fns.push({ target: "query", validate: compileSchema(schemas.querystring as object) });
  if (schemas?.params) fns.push({ target: "param", validate: compileSchema(schemas.params as object) });
  if (schemas?.headers) fns.push({ target: "header", validate: compileSchema(schemas.headers as object) });

  return fns;
}

export function assertValid(
  validate: ValidateFunction,
  data: unknown,
  container: string,
) {
  if (!validate(data)) {
    throw new ValidationError({ container, errors: validate.errors });
  }
}
