export interface SentPost {
  id: string;
  timestamp: number;
  locationName: string;
  categoryName: string;
  productName: string;
}

export interface Schema {
  sentPosts: SentPost[];
}
