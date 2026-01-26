// controllers/subscriptionController.js
import SubscriptionPlan from "../models/SubscriptionPlan.js";
import UserSubscription from "../models/UserSubscription.js";
import User from "../models/User.js";

const genPlanId = () =>
  "PLAN" + Math.random().toString(36).substr(2, 9).toUpperCase();
const genUserSubId = () =>
  "USUB" + Math.random().toString(36).substr(2, 9).toUpperCase();

/* -------------------- helpers -------------------- */

const toNumOrNull = (v) => {
  // undefined / null / "" / NaN => null (treat as unlimited)
  if (v === undefined || v === null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const pickLimits = (body) => {
  // Accept both top-level and nested "limits" structure
  const fromTopSeller = body.sellerAuctionLimit;
  const fromTopBuyer = body.buyerBidLimit;

  // Nested limits: { limits: { maxAuctions, maxBids } }
  const fromNestedSeller = body?.limits?.maxAuctions;
  const fromNestedBuyer = body?.limits?.maxBids;

  const sellerAuctionLimit = toNumOrNull(
    fromTopSeller !== undefined ? fromTopSeller : fromNestedSeller
  );
  const buyerBidLimit = toNumOrNull(
    fromTopBuyer !== undefined ? fromTopBuyer : fromNestedBuyer
  );

  return { sellerAuctionLimit, buyerBidLimit };
};

const normalizeStatus = (isActive) => {
  if (typeof isActive === "boolean") return isActive ? "active" : "inactive";
  // also accept string "true"/"false"
  if (typeof isActive === "string") {
    return isActive.toLowerCase() === "true" ? "active" : "inactive";
  }
  return "active";
};

/* -------------------- PLAN CRUD (Admin Only) -------------------- */

export const createPlan = async (req, res) => {
  try {
    const {
      name,
      description,
      userType,
      price,
      currency = "INR",
      durationDays,
      features = [],
      isActive, // optional boolean
      tier = 1, // plan tier for upgrade hierarchy
      code, // optional unique code, if your model supports it
    } = req.body;

    // pick limits from either top-level or nested "limits"
    const { sellerAuctionLimit, buyerBidLimit } = pickLimits(req.body);

    if (!name || !userType || price == null || !durationDays) {
      return res.status(400).json({
        success: false,
        message: "name, userType, price, durationDays required",
      });
    }

    // Validate userType + limits combination
    if (userType === "Seller") {
      // Seller plan: ONLY sellerAuctionLimit is meaningful; buyerBidLimit must be null
      if (buyerBidLimit !== null) {
        return res.status(400).json({
          success: false,
          message: "Buyer bid limit is not applicable for Seller plan",
        });
      }
    } else if (userType === "Buyer") {
      // Buyer plan: ONLY buyerBidLimit is meaningful; sellerAuctionLimit must be null
      if (sellerAuctionLimit !== null) {
        return res.status(400).json({
          success: false,
          message: "Seller auction limit is not applicable for Buyer plan",
        });
      }
    } // "Seller & Buyer Both" => both limits are allowed (can be null=unlimited)

    const planDoc = {
      planId: genPlanId(),
      name,
      code: code || undefined,
      description: description || "",
      userType,
      price: Number(price),
      currency,
      durationDays: Number(durationDays),
      tier: Number(tier),
      features: Array.isArray(features) ? features : [],
      sellerAuctionLimit, // null => unlimited; undefined avoided so it persists
      buyerBidLimit, // null => unlimited
      status: normalizeStatus(isActive),
      createdByAdminId: req.admin?.adminId,
    };

    const plan = new SubscriptionPlan(planDoc);
    await plan.save();

    return res
      .status(201)
      .json({ success: true, message: "Plan created", plan });
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Error creating plan", error: err.message });
  }
};

export const listPlansAdmin = async (req, res) => {
  try {
    const { userType, status } = req.query;
    const filter = {};
    if (userType) filter.userType = userType;
    if (status) filter.status = status;

    const plans = await SubscriptionPlan.find(filter).sort({
      userType: 1,
      price: 1,
      createdAt: -1,
    });
    return res.json({ success: true, count: plans.length, plans });
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Error listing plans", error: err.message });
  }
};

export const getPlan = async (req, res) => {
  try {
    const { planId } = req.params;
    const plan = await SubscriptionPlan.findOne({ planId });
    if (!plan)
      return res
        .status(404)
        .json({ success: false, message: "Plan not found" });
    return res.json({ success: true, plan });
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Error", error: err.message });
  }
};

export const updatePlan = async (req, res) => {
  try {
    // Accept both shapes during update as well
    const { sellerAuctionLimit, buyerBidLimit } = pickLimits(req.body);

    const { planId } = req.params;
    const allowed = [
      "name",
      "code",
      "description",
      "price",
      "currency",
      "durationDays",
      "features",
      "status",
      "isActive",
      // allow top-level limits too
      "sellerAuctionLimit",
      "buyerBidLimit",
    ];
    const updates = {};
    Object.keys(req.body || {}).forEach((k) => {
      if (allowed.includes(k)) updates[k] = req.body[k];
    });

    // normalize numbers
    if (updates.durationDays != null) updates.durationDays = Number(updates.durationDays);
    if (updates.price != null) updates.price = Number(updates.price);
    if ("isActive" in updates) {
      updates.status = normalizeStatus(updates.isActive);
      delete updates.isActive;
    }

    // overwrite limits using normalized helper result (takes precedence)
    if (sellerAuctionLimit !== undefined) updates.sellerAuctionLimit = sellerAuctionLimit;
    if (buyerBidLimit !== undefined) updates.buyerBidLimit = buyerBidLimit;

    // ensure nulls persist (undefined fields won't change in Mongo)
    if (updates.sellerAuctionLimit === undefined && "sellerAuctionLimit" in updates === false) {
      // no-op
    }
    if (updates.buyerBidLimit === undefined && "buyerBidLimit" in updates === false) {
      // no-op
    }

    updates.updatedAt = new Date();

    const plan = await SubscriptionPlan.findOneAndUpdate({ planId }, updates, {
      new: true,
    });
    if (!plan)
      return res
        .status(404)
        .json({ success: false, message: "Plan not found" });
    return res.json({ success: true, message: "Plan updated", plan });
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Error updating plan", error: err.message });
  }
};

export const deletePlan = async (req, res) => {
  try {
    const { planId } = req.params;
    const plan = await SubscriptionPlan.findOneAndUpdate(
      { planId },
      { status: "inactive", updatedAt: new Date() },
      { new: true }
    );
    if (!plan)
      return res
        .status(404)
        .json({ success: false, message: "Plan not found" });
    return res.json({ success: true, message: "Plan set to inactive", plan });
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Error changing plan", error: err.message });
  }
};

/* -------------------- PUBLIC: list active plans for purchase -------------------- */
export const listPlansPublic = async (req, res) => {
  try {
    const { userType } = req.query;
    const filter = { status: "active" };
    if (userType) filter.userType = userType;
    const plans = await SubscriptionPlan.find(filter).sort({
      userType: 1,
      price: 1,
    });
    return res.json({ success: true, count: plans.length, plans });
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Error", error: err.message });
  }
};

/* -------------------- USER: purchase plan -------------------- */
export const purchasePlan = async (req, res) => {
  try {
    const { planId, paymentRef } = req.body; // assume payment success externally
    const userId = req.user.userId;

    const user = await User.findOne({ userId });
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    const plan = await SubscriptionPlan.findOne({ planId, status: "active" });
    if (!plan)
      return res
        .status(404)
        .json({ success: false, message: "Active plan not found" });

    // userType compatibility
    if (user.userType !== plan.userType) {
      return res.status(400).json({
        success: false,
        message: `Plan userType (${plan.userType}) does not match your userType (${user.userType})`,
      });
    }

    if (user.registrationStatus !== "approved") {
      return res.status(400).json({
        success: false,
        message: "Your account must be approved to purchase a plan",
      });
    }

    // Check if user already has this exact plan active
    const existingActiveSub = await UserSubscription.findOne({
      userId: user.userId,
      planId: planId,
      status: "active",
      endDate: { $gt: new Date() }
    });

    if (existingActiveSub) {
      // Get available upgrade plans
      const availableUpgrades = await SubscriptionPlan.find({
        userType: plan.userType,
        status: "active",
        tier: { $gt: plan.tier },
        _id: { $ne: plan._id }
      }).sort({ tier: 1, price: 1 });

      return res.status(400).json({
        success: false,
        message: "You already have this plan active. You can upgrade to a higher plan instead.",
        currentPlan: {
          name: existingActiveSub.planSnapshot.name,
          endDate: existingActiveSub.endDate
        },
        availableUpgrades: availableUpgrades.map(p => ({
          planId: p.planId,
          name: p.name,
          price: p.price,
          tier: p.tier,
          features: p.features
        }))
      });
    }

    // Expire any current active subs
    await UserSubscription.updateMany(
      { userId: user.userId, status: "active", endDate: { $gte: new Date() } },
      { $set: { status: "expired", updatedAt: new Date() } }
    );

    // Dates
    const start = new Date();
    const end = new Date(start);
    end.setDate(end.getDate() + Number(plan.durationDays));

    // Plan limits → remaining counters
    const planSellerLimit =
      plan.sellerAuctionLimit === undefined
        ? null
        : toNumOrNull(plan.sellerAuctionLimit);
    const planBuyerLimit =
      plan.buyerBidLimit === undefined
        ? null
        : toNumOrNull(plan.buyerBidLimit);

    let remainingAuctions = null;
    let remainingBids = null;

    if (plan.userType === "Seller") {
      remainingAuctions = planSellerLimit; // null => unlimited
      remainingBids = null; // N/A
    } else if (plan.userType === "Buyer") {
      remainingAuctions = null;
      remainingBids = planBuyerLimit; // null => unlimited
    } else {
      // "Seller & Buyer Both"
      remainingAuctions = planSellerLimit;
      remainingBids = planBuyerLimit;
    }

    const userSub = new UserSubscription({
      userSubId: genUserSubId(),
      userId: user.userId,
      userType: user.userType,
      planId: plan.planId,
      planSnapshot: {
        name: plan.name,
        description: plan.description,
        userType: plan.userType,
        price: plan.price,
        currency: plan.currency,
        durationDays: plan.durationDays,
        features: plan.features,
        sellerAuctionLimit: planSellerLimit,
        buyerBidLimit: planBuyerLimit,
      },
      remainingAuctions,
      remainingBids,
      startDate: start,
      endDate: end,
      status: "active",
      paymentRef: paymentRef || "",
      createdBy: "user",
      planTier: plan.tier
    });

    await userSub.save();

    return res.status(201).json({
      success: true,
      message: "Subscription purchased successfully",
      subscription: userSub,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Error purchasing plan",
      error: err.message,
    });
  }
};

/* -------------------- USER: my active subscription -------------------- */
export const getMyActiveSubscription = async (req, res) => {
  try {
    const now = new Date();
    const sub = await UserSubscription.findOne({
      userId: req.user.userId,
      status: "active",
      startDate: { $lte: now },
      endDate: { $gt: now },
    }).sort({ createdAt: -1 });

    return res.json({ success: true, subscription: sub || null });
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Error", error: err.message });
  }
};

/* -------------------- USER: get available upgrades -------------------- */
export const getAvailableUpgrades = async (req, res) => {
  try {
    const userId = req.user.userId;
    const now = new Date();
    
    // Get current active subscription
    const currentSub = await UserSubscription.findOne({
      userId: userId,
      status: "active",
      startDate: { $lte: now },
      endDate: { $gt: now },
    }).sort({ createdAt: -1 });

    if (!currentSub) {
      return res.status(404).json({
        success: false,
        message: "No active subscription found"
      });
    }

    // Get current plan details
    const currentPlan = await SubscriptionPlan.findOne({ planId: currentSub.planId });
    if (!currentPlan) {
      return res.status(404).json({
        success: false,
        message: "Current plan not found"
      });
    }

    // Find available upgrade plans (higher tier, same userType)
    const availableUpgrades = await SubscriptionPlan.find({
      userType: currentPlan.userType,
      status: "active",
      tier: { $gt: currentPlan.tier },
      _id: { $ne: currentPlan._id }
    }).sort({ tier: 1, price: 1 });

    return res.json({
      success: true,
      currentSubscription: {
        userSubId: currentSub.userSubId,
        planName: currentSub.planSnapshot.name,
        tier: currentPlan.tier,
        endDate: currentSub.endDate,
        remainingDays: Math.ceil((currentSub.endDate - now) / (1000 * 60 * 60 * 24))
      },
      availableUpgrades: availableUpgrades.map(plan => ({
        planId: plan.planId,
        name: plan.name,
        description: plan.description,
        price: plan.price,
        tier: plan.tier,
        durationDays: plan.durationDays,
        features: plan.features,
        sellerAuctionLimit: plan.sellerAuctionLimit,
        buyerBidLimit: plan.buyerBidLimit
      }))
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Error getting available upgrades",
      error: err.message
    });
  }
};

/* -------------------- USER: upgrade subscription -------------------- */
export const upgradeSubscription = async (req, res) => {
  try {
    const { planId, paymentRef } = req.body;
    const userId = req.user.userId;
    const now = new Date();

    const user = await User.findOne({ userId });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Get current active subscription
    const currentSub = await UserSubscription.findOne({
      userId: userId,
      status: "active",
      startDate: { $lte: now },
      endDate: { $gt: now },
    }).sort({ createdAt: -1 });

    if (!currentSub) {
      return res.status(404).json({
        success: false,
        message: "No active subscription found to upgrade"
      });
    }

    // Get new plan details
    const newPlan = await SubscriptionPlan.findOne({ planId, status: "active" });
    if (!newPlan) {
      return res.status(404).json({
        success: false,
        message: "Upgrade plan not found"
      });
    }

    // Get current plan details
    const currentPlan = await SubscriptionPlan.findOne({ planId: currentSub.planId });
    if (!currentPlan) {
      return res.status(404).json({
        success: false,
        message: "Current plan not found"
      });
    }

    // Validate upgrade eligibility
    if (newPlan.userType !== currentPlan.userType) {
      return res.status(400).json({
        success: false,
        message: "Cannot upgrade to a plan with different user type"
      });
    }

    if (newPlan.tier <= currentPlan.tier) {
      return res.status(400).json({
        success: false,
        message: "Can only upgrade to higher tier plans"
      });
    }

    // Calculate remaining days and prorated credit
    const remainingDays = Math.ceil((currentSub.endDate - now) / (1000 * 60 * 60 * 24));
    const dailyCurrentPlanCost = currentSub.planSnapshot.price / currentSub.planSnapshot.durationDays;
    const remainingCredit = dailyCurrentPlanCost * remainingDays;
    
    // Calculate upgrade cost (simplified - in real app, implement proper proration)
    const upgradeCost = Math.max(0, newPlan.price - remainingCredit);

    // Mark current subscription as upgraded
    currentSub.status = "upgraded";
    currentSub.upgradedTo = genUserSubId(); // Generate new subscription ID
    currentSub.upgradeDate = now;
    currentSub.updatedAt = now;
    await currentSub.save();

    // Create new subscription (extends from current end date or starts now, whichever is later)
    const upgradeStartDate = new Date(Math.max(now.getTime(), currentSub.endDate.getTime()));
    const upgradeEndDate = new Date(upgradeStartDate);
    upgradeEndDate.setDate(upgradeEndDate.getDate() + Number(newPlan.durationDays));

    // Plan limits → remaining counters
    const planSellerLimit = newPlan.sellerAuctionLimit === undefined ? null : toNumOrNull(newPlan.sellerAuctionLimit);
    const planBuyerLimit = newPlan.buyerBidLimit === undefined ? null : toNumOrNull(newPlan.buyerBidLimit);

    let remainingAuctions = null;
    let remainingBids = null;

    if (newPlan.userType === "Seller") {
      remainingAuctions = planSellerLimit;
      remainingBids = null;
    } else if (newPlan.userType === "Buyer") {
      remainingAuctions = null;
      remainingBids = planBuyerLimit;
    } else {
      remainingAuctions = planSellerLimit;
      remainingBids = planBuyerLimit;
    }

    // Create upgraded subscription
    const upgradedSub = new UserSubscription({
      userSubId: currentSub.upgradedTo,
      userId: user.userId,
      userType: user.userType,
      planId: newPlan.planId,
      planSnapshot: {
        name: newPlan.name,
        description: newPlan.description,
        userType: newPlan.userType,
        price: newPlan.price,
        currency: newPlan.currency,
        durationDays: newPlan.durationDays,
        features: newPlan.features,
        sellerAuctionLimit: planSellerLimit,
        buyerBidLimit: planBuyerLimit,
      },
      remainingAuctions,
      remainingBids,
      startDate: upgradeStartDate,
      endDate: upgradeEndDate,
      status: "active",
      paymentRef: paymentRef || "",
      createdBy: "user",
      planTier: newPlan.tier,
      upgradedFrom: currentSub.userSubId
    });

    await upgradedSub.save();

    return res.status(201).json({
      success: true,
      message: "Subscription upgraded successfully",
      upgrade: {
        previousSubscription: {
          userSubId: currentSub.userSubId,
          planName: currentSub.planSnapshot.name,
          endDate: currentSub.endDate
        },
        newSubscription: upgradedSub,
        upgradeCost: upgradeCost,
        remainingCredit: remainingCredit,
        effectiveDate: upgradeStartDate
      }
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Error upgrading subscription",
      error: err.message
    });
  }
};

// ⬇️ NEW: ADMIN — list all purchased plans (UserSubscriptions) with filters + pagination
export const listAllPurchases = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,              // active | expired | cancelled
      userType,            // Seller | Buyer | Seller & Buyer Both
      userId,              // exact User.userId
      planId,              // exact SubscriptionPlan.planId
      q,                   // search in userId / user.name / user.email
      startDate,           // ISO (filter by subscription startDate >=)
      endDate              // ISO (filter by subscription startDate <=)
    } = req.query;

    const pg = Math.max(1, parseInt(page, 10) || 1);
    const lim = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pg - 1) * lim;

    const match = {};
    if (status) match.status = status;
    if (userType) match.userType = userType;
    if (userId) match.userId = userId;
    if (planId) match.planId = planId;

    if (startDate || endDate) {
      match.startDate = {};
      if (startDate) match.startDate.$gte = new Date(startDate);
      if (endDate)   match.startDate.$lte = new Date(endDate);
    }

    // Base pipeline
    const pipeline = [
      { $match: match },
      { $sort: { createdAt: -1 } },

      // Join User (by string userId)
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "userId",
          as: "user"
        }
      },
      { $addFields: { user: { $first: "$user" } } },

      // If q is present, filter by user fields too
      ...(q ? [{
        $match: {
          $or: [
            { userId: { $regex: q, $options: "i" } },
            { "user.name": { $regex: q, $options: "i" } },
            { "user.email": { $regex: q, $options: "i" } }
          ]
        }
      }] : []),

      // Join Plan (by string planId — collection name is subscriptionplans)
      {
        $lookup: {
          from: "subscriptionplans",
          localField: "planId",
          foreignField: "planId",
          as: "plan"
        }
      },
      { $addFields: { plan: { $first: "$plan" } } },

      // Count total after joins/filters
      {
        $facet: {
          rows: [
            { $skip: skip },
            { $limit: lim },
            {
              $project: {
                _id: 0,
                userSubId: 1,
                userId: 1,
                userType: 1,
                status: 1,
                startDate: 1,
                endDate: 1,
                remainingAuctions: 1,
                remainingBids: 1,
                paymentRef: 1,
                createdAt: 1,
                updatedAt: 1,

                // Snapshot (as purchased)
                planSnapshot: 1,

                // Current user (joined)
                user: {
                  _id: 1,
                  userId: 1,
                  name: 1,
                  email: 1,
                  userType: 1,
                  registrationStatus: 1
                },

                // Current plan (joined)
                plan: {
                  _id: 1,
                  planId: 1,
                  name: 1,
                  userType: 1,
                  price: 1,
                  currency: 1,
                  durationDays: 1,
                  sellerAuctionLimit: 1,
                  buyerBidLimit: 1,
                  status: 1,
                }
              }
            }
          ],
          meta: [{ $count: "total" }]
        }
      },
      {
        $project: {
          rows: 1,
          total: { $ifNull: [{ $arrayElemAt: ["$meta.total", 0] }, 0] }
        }
      }
    ];

    const result = await UserSubscription.aggregate(pipeline);
    const rows = result?.[0]?.rows || [];
    const total = result?.[0]?.total || 0;

    return res.json({
      success: true,
      page: pg,
      limit: lim,
      totalPages: Math.ceil(total / lim),
      totalPurchases: total,
      count: rows.length,
      purchases: rows
    });
  } catch (err) {
    console.error("listAllPurchases error:", err);
    return res.status(500).json({
      success: false,
      message: "Error listing purchases",
      error: err.message
    });
  }
};
