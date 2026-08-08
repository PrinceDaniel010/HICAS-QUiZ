const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

function signStudentToken(studentId) {
  return jwt.sign({ sid: studentId, type: 'student' }, JWT_SECRET, { expiresIn: '12h' });
}

function signAdminToken(username, role) {
  return jwt.sign({ username, role, type: 'admin' }, JWT_SECRET, { expiresIn: '8h' });
}

function getToken(req) {
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) return header.slice(7);
  return null;
}

function requireStudent(req, res, next) {
  const token = getToken(req);
  if (!token) return res.status(401).json({ error: 'Not registered. Please sign in again.' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (payload.type !== 'student') throw new Error('wrong type');
    req.studentId = payload.sid;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Your session has expired. Please sign in again.' });
  }
}

function requireAdmin(req, res, next) {
  const token = getToken(req);
  if (!token) return res.status(401).json({ error: 'Admin login required.' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (payload.type !== 'admin') throw new Error('wrong type');
    req.adminUsername = payload.username;
    req.adminRole = payload.role || 'organizer';
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Admin session expired. Please log in again.' });
  }
}

function requireOwner(req, res, next) {
  if (req.adminRole !== 'owner') {
    return res.status(403).json({ error: 'Only the owner account can manage organizer logins.' });
  }
  next();
}

module.exports = { signStudentToken, signAdminToken, requireStudent, requireAdmin, requireOwner, JWT_SECRET };
