const { auth } = require('./auth');

function admin(req, res, next) {
  auth(req, res, () => {
    if (req.user.role !== 'admin' && req.user.role !== 'owner') {
      return res.status(403).json({ error: 'Acceso denegado' });
    }
    next();
  });
}

function owner(req, res, next) {
  auth(req, res, () => {
    if (req.user.role !== 'owner') {
      return res.status(403).json({ error: 'Solo el owner puede hacer esto' });
    }
    next();
  });
}

module.exports = { admin, owner };   