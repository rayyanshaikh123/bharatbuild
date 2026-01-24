// Middleware to protect routes and allow only authenticated QA engineers
module.exports = function qaEngineerCheck(req, res, next) {
  if (typeof req.isAuthenticated === "function" && req.isAuthenticated()) {
    if (req.user && req.user.role === "QA_ENGINEER") return next();
    return res.status(403).json({ error: "forbidden" });
  }

  return res.status(401).json({ error: "unauthorized" });
};
