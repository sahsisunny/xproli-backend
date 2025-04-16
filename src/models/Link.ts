import mongoose, { Document, Schema } from 'mongoose';

export interface ILink extends Document {
  ownerId: mongoose.Types.ObjectId;
  domain: string;
  slug: string;
  destinationUrl: string;
  title?: string;
  description?: string;
  tags?: string[];
  expiresAt?: Date;
  passwordProtected?: boolean;
  password?: string;
  analyticsEnabled: boolean;
  utmParameters?: {
    source?: string;
    medium?: string;
    campaign?: string;
    term?: string;
    content?: string;
  };
  metadata?: {
    title?: string;
    description?: string;
    image?: string;
  };
  createdAt?: Date;
  stats?: {
    totalClicks?: number;
    uniqueCountries?: number;
    uniqueDevices?: number;
    uniqueBrowsers?: number;
    referrerBreakdown?: Record<string, number>;
    countryBreakdown?: Record<string, number>;
    deviceBreakdown?: Record<string, number>;
    browserBreakdown?: Record<string, number>;
    utmBreakdown?: {
      source?: Record<string, number>;
      medium?: Record<string, number>;
      campaign?: Record<string, number>;
      term?: Record<string, number>;
      content?: Record<string, number>;
    };
  };
  clickEvents?: mongoose.Types.ObjectId[]; // Array of ClickEvent IDs
}

const linkSchema = new Schema<ILink>({
  ownerId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  domain: {
    type: String,
    required: true,
    default: 'xpro.li'
  },
  slug: {
    type: String,
    required: true,
    unique: true
  },
  destinationUrl: {
    type: String,
    required: true
  },
  title: String,
  description: String,
  tags: [String],
  expiresAt: Date,
  passwordProtected: {
    type: Boolean,
    default: false
  },
  password: {
    type: String,
    select: false
  },
  analyticsEnabled: {
    type: Boolean,
    default: true
  },
  utmParameters: {
    source: String,
    medium: String,
    campaign: String,
    term: String,
    content: String
  },
  metadata: {
    title: String,
    description: String,
    image: String
  }
}, {
  timestamps: true
});

// Indexes
linkSchema.index({ ownerId: 1, slug: 1 }, { unique: true });
linkSchema.index({ slug: 1, domain: 1 }, { unique: true });

export const Link = mongoose.model<ILink>('Link', linkSchema); 