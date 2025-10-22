type RequestBodyDefault = import("fastify").RequestBodyDefault;

type RawReplyDefaultExpression = import("fastify").RawReplyDefaultExpression;
type RawRequestDefaultExpression =
  import("fastify").RawRequestDefaultExpression;
type RawServerDefault = import("fastify").RawServerDefault;
type RouteHandlerMethod = import("fastify").RouteHandlerMethod;
type RouteGenericInterface = import("fastify").RouteGenericInterface;

type Handler<
  T = {},
  R = {},
  P = {},
  Q = {},
> = import("fastify").RouteHandlerMethod<
  RawServerDefault,
  RawRequestDefaultExpression,
  RawReplyDefaultExpression,
  CusReq<T, P, Q, R>
>;

type MiddleHandler<
  T = {},
  R = {},
  P = {},
  Q = {},
> = import("fastify").preHandlerHookHandler<
  RawServerDefault,
  RawRequestDefaultExpression,
  RawReplyDefaultExpression,
  CusReq<T, P, Q, R>
>;

interface CusReq<T, P, Q, R> extends RouteGenericInterface {
  Body: T;
  Params: P;
  Querystring: Q;
  Reply: (ReturnHandler<R> | AuthData) & (CASError | CASSuccess);
  User?: any;
}

type CASMessage =
  | import("../utils/enums/messages").CASErrorMessage
  | import("../utils/enums/messages").CASSuccessMessage;
type CASCodes =
  | import("../utils/enums/code").CASErrorCode
  | import("../utils/enums/code").CASSuccessCode;

interface ReturnData {
  status: "success" | "error" | "warning";
}

interface ReturnHandler<T = {}> extends ReturnData {
  data: T | null;
}
interface AuthData extends ReturnData {
  token: string;
}

interface CustomReply<R> extends RawReplyDefaultExpression {
  Reply: R;
}

type CASECType = typeof import("../utils/enums/code").CASErrorCode;
type CASEMType = typeof import("../utils/enums/messages").CASErrorMessage;

type CASErrorPair = {
  [K in keyof CASECType]: {
    code: CASECType[K];
    message: CASEMType[K];
  };
};

type CASSCType = typeof import("../utils/enums/code").CASSuccessCode;
type CASSMType = typeof import("../utils/enums/messages").CASSuccessMessage;

type CASSuccessPair = {
  [K in keyof CASSCType]: {
    code: CASSCType[K];
    message: CASSMType[K];
  };
};

type CASError = CASErrorPair[keyof CASErrorPair];
type CASSuccess = CASSuccessPair[keyof CASSuccessPair];
