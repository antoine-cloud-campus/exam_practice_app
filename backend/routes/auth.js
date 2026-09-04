const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Joi = require('joi');
const rateLimit = require('express-rate-limit');
const User = require('../models/User');
const auth = require('../middleware/auth');
const logger = require('../config/logger');

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { msg: 'Too many attempts, please try again later' },
});

const isProduction = process.env.NODE_ENV === 'production';

const setAuthCookie = (res, token) => {
  res.cookie('token', token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    maxAge: 3600 * 1000,
  });
};

const registerSchema = Joi.object({
  username: Joi.string().min(3).max(30).required(),
  password: Joi.string().min(8).required(),
});

const loginSchema = Joi.object({
  username: Joi.string().required(),
  password: Joi.string().required(),
});

/**
 * Register a new user account.
 *
 * @function register
 * @memberof module:routes/auth
 * @route POST /api/auth/register
 * @access Public - rate-limited to 10 requests / 15 min per IP
 * @param {string} req.body.username - Desired username (3-30 characters, required)
 * @param {string} req.body.password - Password (min 8 characters, required, hashed with bcrypt before storage)
 * @returns {Object} 200 - `{ msg: 'Registration successful' }`
 * @returns {Object} 400 - `{ msg }` when validation fails or the username is already taken
 * @returns {Object} 429 - Too many attempts from this IP
 * @returns {Object} 500 - `{ msg: 'Server Error' }` on unexpected failure
 */
async function register(req, res) {
  const { error } = registerSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ msg: error.details[0].message });
  }

  const { username, password } = req.body;

  try {
    let user = await User.findOne({ username });
    if (user) {
      return res.status(400).json({ msg: 'User already exists' });
    }

    user = new User({ username, password });

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);

    await user.save();

    res.json({ msg: 'Registration successful' });
  } catch (err) {
    logger.error(err.message);
    res.status(500).send('Server Error');
  }
}

/**
 * Authenticate a user and issue a JWT as an httpOnly auth cookie.
 *
 * @function login
 * @memberof module:routes/auth
 * @route POST /api/auth/login
 * @access Public - rate-limited to 10 requests / 15 min per IP
 * @param {string} req.body.username - Account username
 * @param {string} req.body.password - Account password
 * @returns {Object} 200 - `{ msg: 'Logged in' }`, sets a `token` httpOnly cookie (1h expiry)
 * @returns {Object} 400 - `{ msg: 'Invalid credentials' }` or a Joi validation message
 * @returns {Object} 429 - Too many attempts from this IP
 * @returns {Object} 500 - `{ msg: 'Server Error' }` on unexpected failure
 */
async function login(req, res) {
  const { error } = loginSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ msg: error.details[0].message });
  }

  const { username, password } = req.body;

  try {
    let user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({ msg: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ msg: 'Invalid credentials' });
    }

    const payload = { user: { id: user.id } };
    jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: 3600 }, (err, token) => {
      if (err) throw err;
      setAuthCookie(res, token);
      res.json({ msg: 'Logged in' });
    });
  } catch (err) {
    logger.error(err.message);
    res.status(500).send('Server Error');
  }
}

/**
 * Log the current user out by clearing the auth cookie.
 * The cookie is httpOnly, so it can only be cleared server-side.
 *
 * @function logout
 * @memberof module:routes/auth
 * @route POST /api/auth/logout
 * @access Public
 * @returns {Object} 200 - `{ msg: 'Logged out' }`
 */
function logout(req, res) {
  res.clearCookie('token', { httpOnly: true, secure: isProduction, sameSite: isProduction ? 'none' : 'lax' });
  res.json({ msg: 'Logged out' });
}

/**
 * Check whether the current auth cookie is present and valid.
 * Used by the frontend on load to determine authentication state.
 *
 * @function me
 * @memberof module:routes/auth
 * @route GET /api/auth/me
 * @access Private - requires a valid auth cookie
 * @returns {Object} 200 - `{ user: { id } }` decoded from the JWT
 * @returns {Object} 401 - No token or an invalid/expired token
 */
function me(req, res) {
  res.json({ user: req.user });
}

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.post('/logout', logout);
router.get('/me', auth, me);

module.exports = router;
