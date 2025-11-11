// controllers/dashboardController.js
import User from "../models/User.js";
import Auction from "../models/Auction.js";
import Lot from "../models/Lot.js";
import Bid from "../models/Bid.js";
import SubscriptionPlan from "../models/SubscriptionPlan.js";
import UserSubscription from "../models/UserSubscription.js";

/* ----------------------- helpers ----------------------- */

const parseRange = (query) => {
  const now = new Date();
  const {
    // Accept: 7d | 30d | 90d | 12w | 6m etc.
    range = "30d",
    start,
    end,
    tzOffsetMinutes,       // client timezone offset to align day buckets
  } = query || {};

  let from = null;
  let to = null;

  if (start || end) {
    from = start ? new Date(start) : new Date(now.getTime() - 30*24*60*60*1000);
    to   = end ? new Date(end) : now;
  } else {
    const unit = range.slice(-1);
    const num = Number(range.slice(0, -1)) || 30;
    to = now;
    if (unit === "d") from = new Date(now.getTime() - num * 24*60*60*1000);
    else if (unit === "w") from = new Date(now.getTime() - num * 7 * 24*60*60*1000);
    else if (unit === "m") {
      from = new Date(now);
      from.setMonth(from.getMonth() - num);
    } else {
      from = new Date(now.getTime() - 30 * 24*60*60*1000);
    }
  }

  // Normalize ms
  from = new Date(from);
  to = new Date(to);

  const tzShift = Number.isFinite(+tzOffsetMinutes) ? parseInt(tzOffsetMinutes, 10) : 0;

  return { from, to, tzShift };
};

const dayBucketStage = (dateField, tzShift) => ([
  // Shift for client TZ so day boundaries match UI
  { $addFields: { __ts: { $add: [ `$${dateField}`, tzShift * 60 * 1000 ] } } },
  {
    $group: {
      _id: {
        y: { $year: "$__ts" },
        m: { $month: "$__ts" },
        d: { $dayOfMonth: "$__ts" },
      },
      count: { $sum: 1 },
    }
  },
  {
    $project: {
      _id: 0,
      date: {
        $dateFromParts: { year: "$_id.y", month: "$_id.m", day: "$_id.d" }
      },
      count: 1,
    }
  },
  { $sort: { date: 1 } }
]);

const money = (n) => Math.round((Number(n || 0) + Number.EPSILON) * 100) / 100;

/* ----------------------- MAIN: Admin dashboard ----------------------- */
/**
 * GET /api/admin/dashboard/overview?range=30d&tzOffsetMinutes=330
 *
 * Response:
 * {
 *   success: true,
 *   range: { from, to },
 *   summary: {...},         // card metrics
 *   auctions: {...},        // status breakdown & trend
 *   bids: {...},            // totals & daily trend & top lots
 *   users: {...},           // status funnel & recent
 *   subscriptions: {...},   // sales, revenue, ARPU-ish
 *   leaders: {...},         // top sellers / bidders
 * }
 */
export const getAdminDashboardOverview = async (req, res) => {
  try {
    const { from, to, tzShift } = parseRange(req.query);

    /* ---------- 1) Summary cards (fast counts) ---------- */
    const [
      totalUsers,
      approvedUsers,
      totalAuctions,
      activeAuctions,        // upcoming + live
      totalLots,
      totalBids,
      activeSubs
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ registrationStatus: "approved" }),
      Auction.countDocuments(),
      Auction.countDocuments({ status: { $in: ["upcoming", "live"] } }),
      Lot.countDocuments(),
      Bid.countDocuments({ status: "valid" }),
      UserSubscription.countDocuments({
        status: "active",
        startDate: { $lte: to },
        endDate: { $gt: from }
      })
    ]);

    const summary = {
      users: { total: totalUsers, approved: approvedUsers },
      auctions: { total: totalAuctions, active: activeAuctions },
      lots: { total: totalLots },
      bids: { total: totalBids },
      subscriptions: { activeNow: activeSubs },
    };

    /* ---------- 2) Auctions: status split + trend ---------- */
    const [auctionStatusAgg, auctionTrend] = await Promise.all([
      Auction.aggregate([
        { $group: { _id: "$status", count: { $sum: 1 } } },
        { $project: { _id: 0, status: "$_id", count: 1 } }
      ]),
      Auction.aggregate([
        { $match: { createdAt: { $gte: from, $lte: to } } },
        ...dayBucketStage("createdAt", tzShift)
      ])
    ]);

    const auctions = {
      statusBreakdown: auctionStatusAgg, // [{status, count}]
      createdTrend: auctionTrend        // [{date, count}]
    };

    /* ---------- 3) Bids: totals, daily trend, top lots (by bid count & highest bid) ---------- */
    const [bidTrend, topLotsByBids, topLotsByAmount] = await Promise.all([
      Bid.aggregate([
        { $match: { createdAt: { $gte: from, $lte: to }, status: "valid" } },
        ...dayBucketStage("createdAt", tzShift)
      ]),
      Bid.aggregate([
        { $match: { status: "valid" } },
        { $group: { _id: "$lotId", bids: { $sum: 1 }, lastBidAt: { $max: "$createdAt" } } },
        { $sort: { bids: -1 } },
        { $limit: 10 },
        {
          $lookup: {
            from: "lots",
            localField: "_id",
            foreignField: "lotId",
            as: "lot"
          }
        },
        { $addFields: { lot: { $first: "$lot" } } },
        {
          $project: {
            _id: 0,
            lotId: "$_id",
            bids: 1,
            lastBidAt: 1,
            lotName: "$lot.lotName",
            currentBid: "$lot.currentBid",
            auctionId: "$lot.auctionId",
            status: "$lot.status"
          }
        }
      ]),
      Bid.aggregate([
        { $match: { status: "valid" } },
        { $group: { _id: "$lotId", highest: { $max: "$amount" }, lastBidAt: { $max: "$createdAt" } } },
        { $sort: { highest: -1 } },
        { $limit: 10 },
        {
          $lookup: {
            from: "lots",
            localField: "_id",
            foreignField: "lotId",
            as: "lot"
          }
        },
        { $addFields: { lot: { $first: "$lot" } } },
        {
          $project: {
            _id: 0,
            lotId: "$_id",
            highestBid: "$highest",
            lastBidAt: 1,
            lotName: "$lot.lotName",
            currentBid: "$lot.currentBid",
            auctionId: "$lot.auctionId",
            status: "$lot.status"
          }
        }
      ])
    ]);

    const bids = {
      total: totalBids,
      dailyTrend: bidTrend,            // [{date, count}]
      topLotsByBids,                   // 10 rows
      topLotsByAmount                  // 10 rows
    };

    /* ---------- 4) Users: funnel + recent ---------- */
    const [userFunnelAgg, recentUsers] = await Promise.all([
      User.aggregate([
        { $group: { _id: "$registrationStatus", count: { $sum: 1 } } },
        { $project: { _id: 0, status: "$_id", count: 1 } }
      ]),
      User.find({})
        .sort({ createdAt: -1 })
        .limit(10)
        .select("userId name email userType registrationStatus createdAt")
    ]);

    const users = {
      funnel: userFunnelAgg,       // [{status, count}]
      recent: recentUsers
    };

    /* ---------- 5) Subscriptions: sales, revenue, by plan, trend ---------- */
    const [salesAgg, revenueByPlan, planPie, subTrend] = await Promise.all([
      UserSubscription.aggregate([
        { $match: { createdAt: { $gte: from, $lte: to } } },
        { $lookup: {
            from: "subscriptionplans",
            localField: "planId",
            foreignField: "planId",
            as: "plan"
        }},
        { $addFields: { plan: { $first: "$plan" } } },
        {
          $group: {
            _id: null,
            purchases: { $sum: 1 },
            revenue: { $sum: { $ifNull: ["$plan.price", 0] } },
            avgPrice: { $avg: { $ifNull: ["$plan.price", 0] } }
          }
        }
      ]),
      UserSubscription.aggregate([
        { $match: { createdAt: { $gte: from, $lte: to } } },
        { $lookup: {
            from: "subscriptionplans",
            localField: "planId",
            foreignField: "planId",
            as: "plan"
        }},
        { $addFields: { plan: { $first: "$plan" } } },
        {
          $group: {
            _id: "$plan.planId",
            planId: { $first: "$plan.planId" },
            name: { $first: "$plan.name" },
            userType: { $first: "$plan.userType" },
            price: { $first: "$plan.price" },
            currency: { $first: "$plan.currency" },
            count: { $sum: 1 },
            revenue: { $sum: { $ifNull: ["$plan.price", 0] } }
          }
        },
        { $sort: { revenue: -1 } }
      ]),
      SubscriptionPlan.aggregate([
        { $match: { status: "active" } },
        { $project: { _id: 0, planId: 1, name: 1, userType: 1, price: 1, currency: 1 } }
      ]),
      UserSubscription.aggregate([
        { $match: { createdAt: { $gte: from, $lte: to } } },
        { $lookup: {
            from: "subscriptionplans",
            localField: "planId",
            foreignField: "planId",
            as: "plan"
        }},
        { $addFields: { plan: { $first: "$plan" } } },
        // we bucket by day based on createdAt
        ...dayBucketStage("createdAt", tzShift),
      ])
    ]);

    const sales = salesAgg?.[0] || { purchases: 0, revenue: 0, avgPrice: 0 };
    const subscriptions = {
      period: { purchases: sales.purchases, revenue: money(sales.revenue), avgPrice: money(sales.avgPrice) },
      revenueByPlan,         // table [{planId, name, count, revenue, ...}]
      activePlans: planPie,  // list for pie
      salesTrend: subTrend   // [{date, count}]
    };

    /* ---------- 6) Leaders: top sellers & top bidders ---------- */
    const [topSellers, topBidders] = await Promise.all([
      Auction.aggregate([
        { $group: { _id: "$sellerId", auctions: { $sum: 1 } } },
        { $sort: { auctions: -1 } },
        { $limit: 10 },
        {
          $lookup: {
            from: "users",
            localField: "_id",
            foreignField: "userId",
            as: "user"
          }
        },
        { $addFields: { user: { $first: "$user" } } },
        {
          $project: {
            _id: 0,
            sellerId: "$_id",
            auctions: 1,
            name: "$user.name",
            email: "$user.email",
            userType: "$user.userType",
          }
        }
      ]),
      Bid.aggregate([
        { $match: { status: "valid" } },
        { $group: { _id: "$bidderId", bids: { $sum: 1 }, totalAmount: { $sum: "$amount" } } },
        { $sort: { bids: -1 } },
        { $limit: 10 },
        {
          $lookup: {
            from: "users",
            localField: "_id",
            foreignField: "userId",
            as: "user"
          }
        },
        { $addFields: { user: { $first: "$user" } } },
        {
          $project: {
            _id: 0,
            bidderId: "$_id",
            bids: 1,
            totalAmount: 1,
            name: "$user.name",
            email: "$user.email",
            userType: "$user.userType",
          }
        }
      ])
    ]);

    const leaders = { topSellers, topBidders };

    /* ---------- final ---------- */
    return res.json({
      success: true,
      range: { from, to },
      summary,
      auctions,
      bids,
      users,
      subscriptions,
      leaders
    });
  } catch (err) {
    console.error("getAdminDashboardOverview error:", err);
    return res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
};
