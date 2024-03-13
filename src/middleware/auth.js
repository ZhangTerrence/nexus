const isAuthenticated = (redirectUrl = "/login") => {
  return (req, res, next) => {
    if (!(req.session.user && req.session.id)) {
      return res.redirect(redirectUrl);
    } else {
      next();
    }
  };
};

export default isAuthenticated;
