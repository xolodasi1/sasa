export interface SearchResult {
  id: { kind: string; channelId: string };
  snippet: {
    channelTitle: string;
    title: string;
    description: string;
    thumbnails: { default: { url: string }; medium: { url: string }; high: { url: string } };
  };
}

export interface ChannelStat {
  id: string;
  snippet: {
    title: string;
    description: string;
    thumbnails: { default: { url: string }; medium: { url: string }; high: { url: string } };
  };
  statistics: {
    viewCount: string;
    subscriberCount: string;
    hiddenSubscriberCount: boolean;
    videoCount: string;
  };
}
