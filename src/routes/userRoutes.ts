import express from 'express';
import User from '../models/User';
import { getIO } from '../config/socket';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const users = await User.find({}, 'username email avatarUrl');
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching users' });
  }
});

// Update Profile
router.put('/profile', async (req, res) => {
  const { userId, username, avatarUrl } = req.body;
  try {
    const user = await User.findByIdAndUpdate(
      userId,
      { username, avatarUrl },
      { new: true }
    ).select('-passwordHash');
    
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    // Notify others
    getIO().emit('user_updated', user);
    
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: 'Error updating profile' });
  }
});

// Change Password
router.put('/change-password', async (req, res) => {
  const { userId, currentPassword, newPassword } = req.body;
  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) return res.status(400).json({ message: 'Incorrect current password' });

    user.passwordHash = newPassword; // Will be hashed by pre-save hook
    await user.save();

    res.status(200).json({ message: 'Password updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error changing password' });
  }
});

// Delete Account
router.delete('/account', async (req, res) => {
  const { userId } = req.body;
  try {
    const user = await User.findByIdAndDelete(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Notify others
    getIO().emit('user_deleted', userId);

    res.status(200).json({ message: 'Account deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting account' });
  }
});

export default router;
