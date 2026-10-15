import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  email: {
    type: String, required: true, unique: true,
    lowercase: true, trim: true, maxlength: 200,
    match: [/^\S+@\S+\.\S+$/, 'Invalid email format'],
  },
  passwordHash: { type: String, required: true, select: false },
  role: { type: String, enum: ['admin', 'operator', 'viewer'], default: 'viewer' },
  isActive: { type: Boolean, default: true },
  lastLoginAt: { type: Date },
}, { timestamps: true });

userSchema.index({ role: 1 });

userSchema.methods.comparePassword = async function (plainPassword) {
  return bcrypt.compare(plainPassword, this.passwordHash);
};

userSchema.methods.toSafeObject = function () {
  const obj = this.toObject();
  delete obj.passwordHash;
  return obj;
};

export const User = mongoose.model('User', userSchema);
