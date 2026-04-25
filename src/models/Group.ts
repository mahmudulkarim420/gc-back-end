import mongoose, { Document, Schema } from 'mongoose';

export interface IGroup extends Document {
  name: string;
  imageUrl?: string;
}

const groupSchema = new Schema<IGroup>({
  name: {
    type: String,
    required: true,
    default: 'Sales Team Workspace',
  },
  imageUrl: {
    type: String,
    default: '',
  },
});

const Group = mongoose.model<IGroup>('Group', groupSchema);

export default Group;
