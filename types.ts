import { ObjectId } from "mongodb";

export type Editables = {
  caption?: {
    text: string;
    hashTags: string[];
    mentions: string[];
    keywords: string[];
    emojis: string[];
  };
  location?: string;
  tags?: {
    accountId: string;
    coordinates?: { x: number; y: number };
    index?: number;
  }[];
};

export type Location = {
  name: string;
  color: string;
  presentationStyle: string;
  zIndex: number;
  scale: number;
  rotation: number;
  translation: { x: number; y: number };
};

export type Link = {
  url: string;
  title: string;
  color: string;
  presentationStyle: string;
  zIndex: number;
  scale: number;
  rotation: number;
  translation: { x: number; y: number };
};

export type Highlighted = {
  highlightId: ObjectId;
  timestamp: Date;
};

export type Media = {
  type: "photo" | "video";
  backgroundAudioUrl: string;
  url: string;
  width: number;
  height: number;
  duration: number;
};

export type Caption = {
  text: string;
  color: string;
  presentationStyle: string;
  enteringAnimation: string;
  fontFamily: string;
  scale: number;
  rotation: number;
  translation: { x: number; y: number };
};