import mongoose, { Document, Schema } from 'mongoose';

export interface IClickEvent extends Document {
  linkId: mongoose.Types.ObjectId;
  timestamp: Date;
  ip: string;
  country?: string;
  city?: string;
  device: string;
  browser: string;
  os: string;
  referrer?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
}

const clickEventSchema = new Schema<IClickEvent>({
  linkId: {
    type: Schema.Types.ObjectId,
    ref: 'Link',
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  ip: {
    type: String,
    required: true
  },
  country: String,
  city: String,
  device: {
    type: String,
    required: true
  },
  browser: {
    type: String,
    required: true
  },
  os: {
    type: String,
    required: true
  },
  referrer: String,
  utmSource: String,
  utmMedium: String,
  utmCampaign: String
}, {
  timestamps: true
});

// Indexes for efficient querying
clickEventSchema.index({ linkId: 1, timestamp: -1 });
clickEventSchema.index({ timestamp: -1 });

export const ClickEvent = mongoose.model<IClickEvent>('ClickEvent', clickEventSchema); 