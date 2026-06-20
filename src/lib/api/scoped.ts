import "server-only";
import type { FilterQuery, Model, Types } from "mongoose";
import type { AuthContext } from "@/lib/api/context";
import { tenantFilter } from "@/lib/api/context";

/**
 * Tenant-scoped data access (spec §13, §15.2).
 *
 * Every clinic-scoped read/write for doctor & receptionist roles goes through
 * these helpers, which force-merge `{ doctorId }` from the trusted AuthContext
 * into the Mongo filter. Because the doctorId is overwritten from `ctx` AFTER
 * the caller's filter is spread, a caller cannot widen the scope by passing
 * their own doctorId — the tenant pin always wins. Admin (ctx.doctorId === null)
 * is rejected by tenantFilter() and must use explicit cross-tenant queries.
 *
 * These return Mongoose Query objects (not awaited) so callers can chain
 * `.select()`, `.sort()`, `.lean()`, etc. before executing with `await`.
 */

export function scopedFind<T>(model: Model<T>, ctx: AuthContext, filter: FilterQuery<T> = {}) {
  return model.find({ ...filter, ...tenantFilter(ctx) });
}

export function scopedFindOne<T>(model: Model<T>, ctx: AuthContext, filter: FilterQuery<T> = {}) {
  return model.findOne({ ...filter, ...tenantFilter(ctx) });
}

export function scopedFindById<T>(
  model: Model<T>,
  ctx: AuthContext,
  id: string | Types.ObjectId,
) {
  return model.findOne({ _id: id, ...tenantFilter(ctx) } as FilterQuery<T>);
}

export function scopedCount<T>(model: Model<T>, ctx: AuthContext, filter: FilterQuery<T> = {}) {
  return model.countDocuments({ ...filter, ...tenantFilter(ctx) });
}
