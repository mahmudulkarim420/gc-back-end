import { Request, Response } from 'express';
import Message from '../models/Message';

export const getMessages = async (req: Request, res: Response) => {
  try {
    const { groupId } = req.query;
    if (!groupId) return res.status(400).json({ message: 'GroupId is required' });

    const messages = await Message.find({ group: groupId as string })
      .sort({ timestamp: -1 })
      .limit(50)
      .populate('sender', 'username email avatarUrl');
    
    // Reverse to get them in chronological order
    res.status(200).json(messages.reverse());
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ message: 'Error fetching messages' });
  }
};
