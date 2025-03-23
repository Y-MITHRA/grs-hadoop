const isAuthenticated = (req, res, next) => {
  // Check if user is authenticated via session
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  // Add user information to the request object
  req.user = {
    _id: req.session.userId,
    role: req.session.userRole,
    name: req.session.userName,
    email: req.session.userEmail
  };

  next();
};

module.exports = {
  isAuthenticated
}; 