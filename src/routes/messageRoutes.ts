import express from 'express';
import { getMessages } from '../controllers/messageController';

const router = express.Router();

router.get('/', getMessages);

export default router;
