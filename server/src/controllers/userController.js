import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { AppError } from '../utils/AppError.js';
import { createAuditLog, auditFromRequest } from '../services/auditService.js';

export const getUsers = async (req, res, next) => {
  try {
    const { role, isActive, search, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (role) filter.role = role;
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    if (search) filter.$or = [{ name: new RegExp(search, 'i') }, { email: new RegExp(search, 'i') }];
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [users, total] = await Promise.all([
      User.find(filter).skip(skip).limit(parseInt(limit)).sort({ createdAt: -1 }).lean(),
      User.countDocuments(filter),
    ]);
    res.json({ success: true, data: users, pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) } });
  } catch (err) { next(err); }
};

export const createUser = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ name, email, passwordHash, role: role || 'viewer' });
    await createAuditLog({ ...auditFromRequest(req), action: 'user.create', resourceType: 'User', resourceId: user._id, metadata: { email, role } });
    res.status(201).json({ success: true, data: user.toSafeObject() });
  } catch (err) { next(err); }
};

export const getUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).lean();
    if (!user) return next(new AppError('User not found.', 404));
    res.json({ success: true, data: user });
  } catch (err) { next(err); }
};

export const updateUser = async (req, res, next) => {
  try {
    const { name, email } = req.body;
    // Users can only update their own profile unless admin
    if (req.user.role !== 'admin' && req.params.id !== req.userId.toString()) {
      return next(new AppError('Not authorized to update this user.', 403));
    }
    const update = {};
    if (name) update.name = name;
    if (email) update.email = email.toLowerCase().trim();
    const user = await User.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true }).lean();
    if (!user) return next(new AppError('User not found.', 404));
    await createAuditLog({ ...auditFromRequest(req), action: 'user.update', resourceType: 'User', resourceId: user._id, metadata: update });
    res.json({ success: true, data: user });
  } catch (err) { next(err); }
};

export const updateUserRole = async (req, res, next) => {
  try {
    const { role } = req.body;
    if (!['admin', 'operator', 'viewer'].includes(role)) return next(new AppError('Invalid role.', 400));
    const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true }).lean();
    if (!user) return next(new AppError('User not found.', 404));
    await createAuditLog({ ...auditFromRequest(req), action: 'user.role_change', resourceType: 'User', resourceId: user._id, metadata: { newRole: role } });
    res.json({ success: true, data: user });
  } catch (err) { next(err); }
};

export const updateUserStatus = async (req, res, next) => {
  try {
    const { isActive } = req.body;
    const user = await User.findByIdAndUpdate(req.params.id, { isActive }, { new: true }).lean();
    if (!user) return next(new AppError('User not found.', 404));
    await createAuditLog({ ...auditFromRequest(req), action: 'user.status_change', resourceType: 'User', resourceId: user._id, metadata: { isActive } });
    res.json({ success: true, data: user });
  } catch (err) { next(err); }
};
