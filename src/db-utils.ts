import { join, dirname } from "path";
import { Low } from "lowdb";
import { JSONFile } from "lowdb/node";
import { fileURLToPath } from "url";
import { Schema, SentPost } from "./db-types.js";
import crypto from "crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbFile = join(__dirname, "..", "db.json");

class Database {
  private db: Low<Schema>;

  constructor() {
    const adapter = new JSONFile<Schema>(dbFile);
    this.db = new Low(adapter, { sentPosts: [] });
  }

  async init(): Promise<void> {
    await this.db.read();
    this.db.data ||= { sentPosts: [] };
  }

  generateId(filePath: string): string {
    return crypto.createHash("sha256").update(filePath).digest("hex");
  }

  async addSentPost(post: Omit<SentPost, "timestamp">): Promise<void> {
    await this.db.read();

    const newPost: SentPost = {
      ...post,
      timestamp: Date.now(),
    };

    // Check If the post already exists
    const existingPost = this.db.data.sentPosts.find(
      (p) => p.id === newPost.id
    );
    if (existingPost) {
      // Update the timestamp if the post already exists
      existingPost.timestamp = newPost.timestamp;
      this.db.data.sentPosts = this.db.data.sentPosts.filter(
        (p) => p.id !== newPost.id
      );
      this.db.data.sentPosts.push(existingPost);
      console.log("Updated existing post:", existingPost);
    } else {
      this.db.data.sentPosts.push(newPost);
    }
    await this.db.write();
  }

  async wasPostSent(id: string): Promise<boolean> {
    await this.db.read();
    return this.db.data.sentPosts.some(
      (post) =>
        // Check if the ID matches and the post is within the last 3 hours
        post.id === id && post.timestamp > Date.now() - 3 * 60 * 60 * 1000
    );
  }
}

export const database = new Database();
