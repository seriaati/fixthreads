interface ImageProps {
  url: string;
}

interface VideoProps {
  url: string;
  type?: string;
  width?: number;
  height?: number;
}

interface MediaItem {
  url: string;
  kind: "image" | "video";
}

interface ReplyToProps {
  username: string;
  verified: boolean;
  code: string;
  caption: string;
}

interface ContentProps {
  description: string;
  title: string;
  images: ImageProps[];
  username: string;
  post?: string;
  imageType: string;
  video: VideoProps[];
  oembedStat: string;
  quotedPost?: QuotedPostProps;
  userAgent: string;
  // Components V2 embed data (shared)
  avatar?: string;
  verified?: boolean;
  // Components V2 embed data (posts)
  caption?: string;
  media?: MediaItem[];
  likeCount?: number;
  replyCount?: number;
  takenAt?: number;
  edited?: boolean;
  paidPartnership?: boolean;
  replyTo?: ReplyToProps;
  // Components V2 embed data (users)
  fullName?: string;
  followerCount?: number;
  bioLink?: string;
}

interface DataProps {
  type: string;
  content: ContentProps;
}

interface OembedPostProps {
  author_name: string;
  author_url: string;
  provider_name: string;
  provider_url: string;
  title: string;
  type: string;
  version: string;
}

interface QuotedPostProps {
  username: string;
  caption: string;
  quoted: boolean;
  unavailable?: boolean;
  verified?: boolean;
  avatar?: string;
  code?: string;
  likeCount?: number;
  replyCount?: number;
  takenAt?: number;
  media?: MediaItem[];
}
