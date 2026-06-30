import { authGet, authPost } from "./client";
import type { PostCategory } from "../constants";

export type Post = {
  id: string;
  category: PostCategory;
  title: string;
  authorId: string;
  createdAt?: string;
};

export type Comment = {
  id: string;
  authorId: string;
  content: string;
  createdAt?: string;
};

export type PostDetail = Post & { content: string; comments: Comment[] };

export const backendListPosts = (t: string, buildingId: string) =>
  authGet<Post[]>(`/buildings/${buildingId}/posts`, t);

export const backendGetPost = (t: string, postId: string) =>
  authGet<PostDetail>(`/posts/${postId}`, t);

export const backendCreatePost = (
  t: string,
  buildingId: string,
  body: { category?: PostCategory; title: string; content: string },
) => authPost<Post>(`/buildings/${buildingId}/posts`, t, body);

export const backendCreateComment = (t: string, postId: string, content: string) =>
  authPost<Comment>(`/posts/${postId}/comments`, t, { content });
