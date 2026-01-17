// Middleware to protect routes and allow only authenticated managers
module.exports = function labourCheck(req, res, next) {
  if (typeof req.isAuthenticated === "function" && req.isAuthenticated()) {
    if (req.user && req.user.role === "LABOUR") return next();
    return res.status(403).json({ error: "forbidden" });
  }

  return res.status(401).json({ error: "unauthorized" });
};
