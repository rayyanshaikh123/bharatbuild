// Middleware to protect routes and allow only authenticated purchase managers
module.exports = function purchaseManagerCheck(req, res, next) {
  if (typeof req.isAuthenticated === "function" && req.isAuthenticated()) {
    if (req.user && req.user.role === "PURCHASE_MANAGER") return next();
    return res.status(403).json({ error: "forbidden" });
  }

  return res.status(401).json({ error: "unauthorized" });
};
