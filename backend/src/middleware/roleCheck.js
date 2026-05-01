/**
 * Middleware: Restricts a route to Admin users only.
 * Must be used AFTER the `authenticate` middleware.
 */
function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied. Admin role required.' });
  }
  next();
}

module.exports = { requireAdmin };