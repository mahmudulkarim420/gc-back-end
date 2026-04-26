import { Server as SocketServer } from 'socket.io';
import { Server as HttpServer } from 'http';
import Message from '../models/Message';
import Group from '../models/Group';

interface ServerToClientEvents {
  receive_message: (message: any) => void;
  message_updated: (message: any) => void;
  message_deleted: (messageId: string) => void;
  online_users: (userIds: string[]) => void;
  user_typing: (username: string) => void;
  user_stop_typing: (username: string) => void;
  reaction_updated: (message: any) => void;
  group_created: (group: any) => void;
  group_updated: (group: any) => void;
  group_deleted: (groupId: string) => void;
}

interface ClientToServerEvents {
  typing: (username: string, room: string) => void;
  stop_typing: (username: string, room: string) => void;
  join_group: (groupId: string) => void;
  register_user: (userId: string) => void;
  send_message: (data: { senderId: string; groupId: string; content: string; type: 'text' | 'image' | 'video' }) => void;
  edit_message: (data: { messageId: string; content: string; room: string }) => void;
  delete_message: (data: { messageId: string; room: string }) => void;
  add_reaction: (data: { messageId: string; userId: string; emoji: string; room: string }) => void;
  create_group: (data: { name: string; imageUrl?: string }) => void;
  update_group: (data: { groupId: string; newName?: string; newImage?: string }) => void;
  delete_group: (groupId: string) => void;
}

interface InterServerEvents {}

interface SocketData {}

let ioInstance: any;

export const initSocket = (server: HttpServer) => {
  const io = new SocketServer<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData
  >(server, {
    cors: {
      origin: [
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'https://gc-front-end-xrud.vercel.app',
        process.env.FRONTEND_URL?.replace(/\/$/, ''),
      ].filter(Boolean) as string[],
      methods: ['GET', 'POST'],
      credentials: true
    },
  });

  ioInstance = io;

  const onlineUsers = new Map<string, string>(); // socketId -> userId

  io.on('connection', (socket) => {
    console.log(`[Socket] New connection: ${socket.id} | Origin: ${socket.handshake.headers.origin}`);

    socket.on('register_user', (userId) => {
      onlineUsers.set(socket.id, userId);
      const onlineList = Array.from(onlineUsers.values()).filter(Boolean);
      io.emit('online_users', onlineList);
      console.log(`[Socket] User registered: ${userId} (socket: ${socket.id}). Online count: ${onlineUsers.size}`);
    });

    socket.on('disconnect', (reason) => {
      const userId = onlineUsers.get(socket.id);
      onlineUsers.delete(socket.id);
      const onlineList = Array.from(onlineUsers.values()).filter(Boolean);
      io.emit('online_users', onlineList);
      console.log(`[Socket] User disconnected: ${userId} (${socket.id}). Reason: ${reason}. Online count: ${onlineUsers.size}`);
    });

    // Group Switching
    socket.on('join_group', (groupId) => {
      // Leave all other rooms except their own socket.id
      socket.rooms.forEach(room => {
        if (room !== socket.id) socket.leave(room);
      });
      socket.join(groupId);
      console.log(`[Socket] Socket ${socket.id} joined group: ${groupId}`);
    });

    socket.on('send_message', async (data) => {
      try {
        const { senderId, groupId, content, type } = data;
        console.log(`[Socket] send_message from ${senderId} to group ${groupId}: "${content.substring(0, 50)}"`);
        if (!senderId || !groupId || !content) {
          console.warn('[Socket] send_message missing required fields:', { senderId, groupId, content });
          return;
        }
        const newMessage = new Message({ sender: senderId, group: groupId, content, type, reactions: [] });
        await newMessage.save();
        const populatedMessage = await newMessage.populate('sender', 'username email avatarUrl');
        console.log(`[Socket] Message saved & emitted. ID: ${newMessage._id}`);
        io.to(groupId).emit('receive_message', populatedMessage);
      } catch (error) {
        console.error('[Socket] Error handling send_message:', error);
      }
    });

    // Typing Indicators
    socket.on('typing', (username, room) => {
      socket.to(room).emit('user_typing', username);
    });

    socket.on('stop_typing', (username, room) => {
      socket.to(room).emit('user_stop_typing', username);
    });

    // Reactions Toggle Logic
    socket.on('add_reaction', async ({ messageId, userId, emoji, room }) => {
      try {
        const message = await Message.findById(messageId);
        if (!message) return;
        const existingReaction = message.reactions.find(r => r.userId === userId && r.emoji === emoji);
        let updatedMessage;
        if (existingReaction) {
          updatedMessage = await Message.findByIdAndUpdate(messageId, { $pull: { reactions: { userId, emoji } } }, { new: true }).populate('sender', 'username email avatarUrl');
        } else {
          updatedMessage = await Message.findByIdAndUpdate(messageId, { $push: { reactions: { userId, emoji } } }, { new: true }).populate('sender', 'username email avatarUrl');
        }
        if (updatedMessage) io.to(room).emit('reaction_updated', updatedMessage);
      } catch (error) {
        console.error('Error toggling reaction:', error);
      }
    });

    socket.on('edit_message', async ({ messageId, content, room }) => {
      try {
        const updatedMessage = await Message.findByIdAndUpdate(messageId, { content }, { new: true }).populate('sender', 'username email avatarUrl');
        if (updatedMessage) io.to(room).emit('message_updated', updatedMessage);
      } catch (error) {
        console.error('Error editing message:', error);
      }
    });

    socket.on('delete_message', async ({ messageId, room }) => {
      try {
        await Message.findByIdAndDelete(messageId);
        io.to(room).emit('message_deleted', messageId);
      } catch (error) {
        console.error('Error deleting message:', error);
      }
    });

    // Group Management
    socket.on('create_group', async (data: any) => {
      try {
        const { name, imageUrl } = typeof data === 'string' ? { name: data, imageUrl: '' } : data;
        const newGroup = new Group({ name, imageUrl });
        await newGroup.save();
        io.emit('group_created', newGroup);
      } catch (error) {
        console.error('Error creating group:', error);
      }
    });

    socket.on('update_group', async ({ groupId, newName, newImage }) => {
      try {
        const updateData: any = {};
        if (newName) updateData.name = newName;
        if (newImage) updateData.imageUrl = newImage;
        
        const updatedGroup = await Group.findByIdAndUpdate(groupId, updateData, { new: true });
        io.emit('group_updated', updatedGroup);
      } catch (error) {
        console.error('Error updating group:', error);
      }
    });

    socket.on('delete_group', async (groupId) => {
      try {
        await Group.findByIdAndDelete(groupId);
        await Message.deleteMany({ group: groupId });
        io.emit('group_deleted', groupId);
      } catch (error) {
        console.error('Error deleting group:', error);
      }
    });
  });

  return io;
};

export const getIO = () => {
  if (!ioInstance) {
    throw new Error('Socket.io not initialized');
  }
  return ioInstance;
};
