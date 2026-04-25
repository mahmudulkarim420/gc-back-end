import mongoose, { Document, Schema } from 'mongoose';

export interface IMessage extends Document {
  sender: mongoose.Types.ObjectId;
  group: mongoose.Types.ObjectId;
  content: string;
  timestamp: Date;
  type: 'text' | 'image' | 'video';
  reactions: Array<{ userId: string; emoji: string }>;
}

const messageSchema = new Schema<IMessage>(
  {
    sender: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    group: {
      type: Schema.Types.ObjectId,
      ref: 'Group',
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ['text', 'image', 'video'],
      default: 'text',
    },
    reactions: [
      {
        userId: { type: String, required: true },
        emoji: { type: String, required: true },
      },
    ],
  },
  {
    timestamps: { createdAt: 'timestamp', updatedAt: false },
  }
);

const Message = mongoose.model<IMessage>('Message', messageSchema);

export default Message;
