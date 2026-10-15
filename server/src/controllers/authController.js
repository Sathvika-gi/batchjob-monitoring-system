import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { config } from '../config/config.js';
import { AppError } from '../utils/AppError.js';
import { createAuditLog, auditFromRequest } from '../services/auditService.js';

function signToken(userId) {
  return jwt.sign({ id: userId }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
}

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return next(new AppError('Email and password are required.', 400));
    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+passwordHash');
    if (!user || !(await user.comparePassword(password))) {
      return next(new AppError('Invalid email or password.', 401));
    }
    if (!user.isActive) return next(new AppError('Account is deactivated.', 403));
    user.lastLoginAt = new Date();
    await user.save();
    const token = signToken(user._id);
    await createAuditLog({
      ...auditFromRequest(req), action: 'auth.login',
      resourceType: 'User', resourceId: user._id,
      metadata: { email: user.email, role: user.role },
    });
    res.json({ success: true, token, user: user.toSafeObject() });
  } catch (err) { next(err); }
};

export const logout = async (req, res, next) => {
  try {
    await createAuditLog({
      ...auditFromRequest(req), action: 'auth.logout',
      resourceType: 'User', resourceId: req.userId,
    });
    res.json({ success: true, message: 'Logged out successfully.' });
  } catch (err) { next(err); }
};

export const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId).lean();
    if (!user) return next(new AppError('User not found.', 404));
    res.json({ success: true, user });
  } catch (err) { next(err); }
};
