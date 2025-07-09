/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as fetch from "../fetch.js";
import type * as images from "../images.js";
import type * as mutations from "../mutations.js";
import type * as restore from "../restore.js";
import type * as utils_adviserCode from "../utils/adviserCode.js";
import type * as utils_log from "../utils/log.js";
import type * as utils_mutationRateLimit from "../utils/mutationRateLimit.js";
import type * as utils_security from "../utils/security.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  fetch: typeof fetch;
  images: typeof images;
  mutations: typeof mutations;
  restore: typeof restore;
  "utils/adviserCode": typeof utils_adviserCode;
  "utils/log": typeof utils_log;
  "utils/mutationRateLimit": typeof utils_mutationRateLimit;
  "utils/security": typeof utils_security;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
