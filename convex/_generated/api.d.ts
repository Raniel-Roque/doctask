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
import type * as mutations from "../mutations.js";
import type * as restore from "../restore.js";
import type * as utils_adviserCode from "../utils/adviserCode.js";
import type * as utils_backup from "../utils/backup.js";
import type * as utils_log from "../utils/log.js";

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
  mutations: typeof mutations;
  restore: typeof restore;
  "utils/adviserCode": typeof utils_adviserCode;
  "utils/backup": typeof utils_backup;
  "utils/log": typeof utils_log;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
