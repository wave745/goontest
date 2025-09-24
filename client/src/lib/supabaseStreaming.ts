import { supabase } from './supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface ChatMessage {
  id: string;
  stream_id: string;
  user_name: string;
  message: string;
  message_type: 'message' | 'tip' | 'reaction' | 'system';
  solana_address?: string;
  tip_amount?: number;
  created_at: string;
}

export interface StreamMetadata {
  id: string;
  title: string;
  creator_wallet: string;
  creator_name: string;
  status: 'live' | 'offline' | 'ended';
  viewer_count: number;
  start_time: string;
  end_time?: string;
  room_id: string;
  livekit_token?: string;
  thumbnail_url?: string;
}

// Chat management
export class StreamChat {
  private channel: RealtimeChannel | null = null;
  private streamId: string;
  private onMessageCallback?: (message: ChatMessage) => void;
  private onViewerCountCallback?: (count: number) => void;

  constructor(streamId: string) {
    this.streamId = streamId;
  }

  // Subscribe to chat messages and viewer updates
  subscribe(callbacks: {
    onMessage?: (message: ChatMessage) => void;
    onViewerCount?: (count: number) => void;
  }): void {
    this.onMessageCallback = callbacks.onMessage;
    this.onViewerCountCallback = callbacks.onViewerCount;

    // Create channel for this specific stream
    this.channel = supabase.channel(`stream_${this.streamId}`, {
      config: {
        broadcast: { self: true },
      },
    });

    // Listen for new chat messages
    this.channel
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'stream_messages',
        filter: `stream_id=eq.${this.streamId}`,
      }, (payload) => {
        if (this.onMessageCallback) {
          this.onMessageCallback(payload.new as ChatMessage);
        }
      })
      // Listen for viewer count updates
      .on('broadcast', {
        event: 'viewer_count',
      }, (payload) => {
        if (this.onViewerCountCallback) {
          this.onViewerCountCallback(payload.payload.count);
        }
      })
      .subscribe();
  }

  // Send a chat message
  async sendMessage(message: {
    user_name: string;
    message: string;
    message_type?: 'message' | 'tip' | 'reaction';
    solana_address?: string;
    tip_amount?: number;
  }): Promise<ChatMessage | null> {
    try {
      const { data, error } = await supabase
        .from('stream_messages')
        .insert({
          stream_id: this.streamId,
          user_name: message.user_name,
          message: message.message,
          message_type: message.message_type || 'message',
          solana_address: message.solana_address,
          tip_amount: message.tip_amount,
        })
        .select()
        .single();

      if (error) {
        console.error('Error sending message:', error);
        return null;
      }

      return data as ChatMessage;
    } catch (error) {
      console.error('Error sending message:', error);
      return null;
    }
  }

  // Load chat history
  async loadHistory(limit: number = 100): Promise<ChatMessage[]> {
    try {
      const { data, error } = await supabase
        .from('stream_messages')
        .select('*')
        .eq('stream_id', this.streamId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error loading chat history:', error);
        return [];
      }

      return (data as ChatMessage[]).reverse(); // Reverse to show oldest first
    } catch (error) {
      console.error('Error loading chat history:', error);
      return [];
    }
  }

  // Update viewer count (broadcaster only)
  async updateViewerCount(count: number): Promise<void> {
    if (!this.channel) return;

    try {
      await this.channel.send({
        type: 'broadcast',
        event: 'viewer_count',
        payload: { count },
      });
    } catch (error) {
      console.error('Error updating viewer count:', error);
    }
  }

  // Unsubscribe from chat
  unsubscribe(): void {
    if (this.channel) {
      this.channel.unsubscribe();
      this.channel = null;
    }
  }
}

// Stream metadata management
export class StreamManager {
  // Create a new stream
  static async createStream(streamData: {
    title: string;
    creator_wallet: string;
    creator_name: string;
    thumbnail_url?: string;
  }): Promise<StreamMetadata | null> {
    try {
      const roomId = `stream_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const { data, error } = await supabase
        .from('stream_metadata')
        .insert({
          title: streamData.title,
          creator_wallet: streamData.creator_wallet,
          creator_name: streamData.creator_name,
          status: 'live',
          viewer_count: 0,
          room_id: roomId,
          thumbnail_url: streamData.thumbnail_url,
          start_time: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating stream:', error);
        return null;
      }

      return data as StreamMetadata;
    } catch (error) {
      console.error('Error creating stream:', error);
      return null;
    }
  }

  // Get stream by ID
  static async getStream(streamId: string): Promise<StreamMetadata | null> {
    try {
      const { data, error } = await supabase
        .from('stream_metadata')
        .select('*')
        .eq('id', streamId)
        .single();

      if (error) {
        console.error('Error getting stream:', error);
        return null;
      }

      return data as StreamMetadata;
    } catch (error) {
      console.error('Error getting stream:', error);
      return null;
    }
  }

  // Get all live streams
  static async getLiveStreams(): Promise<StreamMetadata[]> {
    try {
      const { data, error } = await supabase
        .from('stream_metadata')
        .select('*')
        .eq('status', 'live')
        .order('start_time', { ascending: false });

      if (error) {
        console.error('Error getting live streams:', error);
        return [];
      }

      return data as StreamMetadata[];
    } catch (error) {
      console.error('Error getting live streams:', error);
      return [];
    }
  }

  // Update stream status
  static async updateStreamStatus(streamId: string, status: 'live' | 'offline' | 'ended'): Promise<boolean> {
    try {
      const updateData: any = { status };
      
      if (status === 'ended' || status === 'offline') {
        updateData.end_time = new Date().toISOString();
      }

      const { error } = await supabase
        .from('stream_metadata')
        .update(updateData)
        .eq('id', streamId);

      if (error) {
        console.error('Error updating stream status:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error updating stream status:', error);
      return false;
    }
  }

  // Update viewer count
  static async updateViewerCount(streamId: string, count: number): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('stream_metadata')
        .update({ viewer_count: count })
        .eq('id', streamId);

      if (error) {
        console.error('Error updating viewer count:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error updating viewer count:', error);
      return false;
    }
  }

  // Subscribe to stream metadata changes
  static subscribeToStreams(callback: (streams: StreamMetadata[]) => void): RealtimeChannel {
    const channel = supabase.channel('stream_metadata_changes');
    
    channel
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'stream_metadata',
      }, async () => {
        // Fetch updated live streams
        const streams = await StreamManager.getLiveStreams();
        callback(streams);
      })
      .subscribe();

    return channel;
  }
}

// Database table creation SQL (for reference)
export const STREAMING_SCHEMA_SQL = `
-- Stream metadata table
CREATE TABLE IF NOT EXISTS stream_metadata (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  creator_wallet TEXT NOT NULL,
  creator_name TEXT NOT NULL,
  status TEXT CHECK (status IN ('live', 'offline', 'ended')) DEFAULT 'live',
  viewer_count INTEGER DEFAULT 0,
  start_time TIMESTAMPTZ DEFAULT NOW(),
  end_time TIMESTAMPTZ,
  room_id TEXT UNIQUE NOT NULL,
  livekit_token TEXT,
  thumbnail_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chat messages table
CREATE TABLE IF NOT EXISTS stream_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  stream_id UUID REFERENCES stream_metadata(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  message TEXT NOT NULL,
  message_type TEXT CHECK (message_type IN ('message', 'tip', 'reaction', 'system')) DEFAULT 'message',
  solana_address TEXT,
  tip_amount BIGINT, -- in lamports
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_stream_metadata_status ON stream_metadata(status);
CREATE INDEX IF NOT EXISTS idx_stream_metadata_start_time ON stream_metadata(start_time);
CREATE INDEX IF NOT EXISTS idx_stream_messages_stream_id ON stream_messages(stream_id);
CREATE INDEX IF NOT EXISTS idx_stream_messages_created_at ON stream_messages(created_at);

-- RLS policies (customize based on your auth setup)
ALTER TABLE stream_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE stream_messages ENABLE ROW LEVEL SECURITY;

-- Allow read access to all streams and messages
CREATE POLICY "Allow read access to streams" ON stream_metadata FOR SELECT USING (true);
CREATE POLICY "Allow read access to messages" ON stream_messages FOR SELECT USING (true);

-- Allow creators to insert/update their own streams
CREATE POLICY "Allow creators to manage streams" ON stream_metadata FOR ALL USING (true);

-- Allow authenticated users to send messages
CREATE POLICY "Allow authenticated users to send messages" ON stream_messages FOR INSERT WITH CHECK (true);
`;