import mongoose, { Schema, type Model, type Types } from "mongoose";

/** Registration council / board master (state medical councils, AYUSH boards, dental councils). */
export interface CouncilDoc {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  state?: string; // absent for national bodies
  createdAt: Date;
  updatedAt: Date;
}

const councilSchema = new Schema<CouncilDoc>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    state: { type: String, trim: true },
  },
  { timestamps: true },
);

export const Council: Model<CouncilDoc> =
  (mongoose.models.Council as Model<CouncilDoc>) ||
  mongoose.model<CouncilDoc>("Council", councilSchema);
