// services/subscriptionQuota.js
import UserSubscription from "../models/UserSubscription.js";

/** Get active subscription for user (valid now or future active) */
export const getActiveSubscription = async (userId) => {
  const now = new Date();
  
  // First try to find currently active subscription
  let sub = await UserSubscription.findOne({
    userId,
    status: "active",
    startDate: { $lte: now },
    endDate: { $gt: now }
  });
  
  // If no current subscription, check for future active subscriptions (from upgrades)
  if (!sub) {
    sub = await UserSubscription.findOne({
      userId,
      status: "active",
      startDate: { $gt: now } // Future start date
    }).sort({ startDate: 1 }); // Get the earliest future subscription
  }
  
  return sub;
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
  
  // First, get the active subscription to check if it has unlimited bids
  const activeSub = await getActiveSubscription(userId);
  if (!activeSub) {
    return { ok: false, reason: "No active subscription" };
  }
  
  // If unlimited bids (null), no need to consume quota
  if (activeSub.remainingBids === null) {
    return { ok: true };
  }
  
  // If limited bids, check and consume
  if (activeSub.remainingBids <= 0) {
    return { ok: false, reason: "Bid quota exhausted" };
  }
  
  // Decrement the bid count
  const dec = await UserSubscription.findOneAndUpdate(
    { 
      userSubId: activeSub.userSubId, 
      remainingBids: { $gt: 0 } 
    },
    { 
      $inc: { remainingBids: -1 }, 
      $set: { updatedAt: new Date() } 
    },
    { new: true }
  );
  
  if (!dec) {
    return { ok: false, reason: "Bid quota exhausted" };
  }

  return { ok: true };
};
