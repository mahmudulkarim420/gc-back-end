import express from 'express';
import Group from '../models/Group';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const groups = await Group.find();
    res.status(200).json(groups);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching groups' });
  }
});

export default router;
