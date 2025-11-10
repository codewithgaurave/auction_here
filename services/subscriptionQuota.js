// services/subscriptionQuota.js
import UserSubscription from "../models/UserSubscription.js";

/** Get active subscription for user (valid now) */
export const getActiveSubscription = async (userId) => {
  const now = new Date();
  return await UserSubscription.findOne({
    userId,
    status: "active",
    startDate: { $lte: now },
    endDate: { $gt: now }
  });
};

/** Check if user has auction quota (>0 or unlimited) */
export const hasAuctionQuota = async (userId) => {
  const sub = await getActiveSubscription(userId);
  if (!sub) return { ok: false, reason: "No active subscription" };
  if (sub.remainingAuctions == null) return { ok: true }; // unlimited or not applicable
  if (sub.remainingAuctions > 0) return { ok: true };
  return { ok: false, reason: "Auction quota exhausted" };
};

/** Check if user has bid quota (>0 or unlimited) */
export const hasBidQuota = async (userId) => {
  const sub = await getActiveSubscription(userId);
  if (!sub) return { ok: false, reason: "No active subscription" };
  if (sub.remainingBids == null) return { ok: true }; // unlimited or not applicable
  if (sub.remainingBids > 0) return { ok: true };
  return { ok: false, reason: "Bid quota exhausted" };
};

/** Try to decrement auction quota atomically */
export const consumeAuctionQuota = async (userId) => {
  const now = new Date();
  const res = await UserSubscription.findOneAndUpdate(
    {
      userId,
      status: "active",
      startDate: { $lte: now },
      endDate: { $gt: now },
      // allow null (unlimited) or >0
      $or: [{ remainingAuctions: null }, { remainingAuctions: { $gt: 0 } }]
    },
    {
      $inc: { remainingAuctions: 1 * 0 }, // no-op by default; we handle null separately in post
      $set: { updatedAt: new Date() }
    },
    { new: true }
  );

  if (!res) return { ok: false, reason: "No active subscription or auction quota exhausted" };

  // If unlimited (null), nothing to decrement
  if (res.remainingAuctions == null) return { ok: true };

  // Decrement now (second safe step)
  const dec = await UserSubscription.findOneAndUpdate(
    { userSubId: res.userSubId, remainingAuctions: { $gt: 0 } },
    { $inc: { remainingAuctions: -1 }, $set: { updatedAt: new Date() } },
    { new: true }
  );
  if (!dec) return { ok: false, reason: "Auction quota exhausted" };

  return { ok: true };
};

/** Try to decrement bid quota atomically */
export const consumeBidQuota = async (userId) => {
  const now = new Date();
  const res = await UserSubscription.findOneAndUpdate(
    {
      userId,
      status: "active",
      startDate: { $lte: now },
      endDate: { $gt: now },
      $or: [{ remainingBids: null }, { remainingBids: { $gt: 0 } }]
    },
    {
      $inc: { remainingBids: 1 * 0 },
      $set: { updatedAt: new Date() }
    },
    { new: true }
  );

  if (!res) return { ok: false, reason: "No active subscription or bid quota exhausted" };

  if (res.remainingBids == null) return { ok: true };

  const dec = await UserSubscription.findOneAndUpdate(
    { userSubId: res.userSubId, remainingBids: { $gt: 0 } },
    { $inc: { remainingBids: -1 }, $set: { updatedAt: new Date() } },
    { new: true }
  );
  if (!dec) return { ok: false, reason: "Bid quota exhausted" };

  return { ok: true };
};
