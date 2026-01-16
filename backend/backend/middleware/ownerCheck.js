// Middleware to protect routes and allow only authenticated owners
module.exports = function ownerCheck(req, res, next) {
  // Rely only on Passport sessions for authentication
  if (typeof req.isAuthenticated === "function" && req.isAuthenticated()) {
    if (req.user && req.user.role === "OWNER") return next();
    return res.status(403).json({ error: "forbidden" });
  }

  return res.status(401).json({ error: "unauthorized" });
};
