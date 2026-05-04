/** Core Mural API types */

export interface MuralWidget {
  id: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  text?: string;
  title?: string;
  htmlText?: string;
  parentId?: string | null;
  shape?: string;
  style?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Workspace {
  id: string;
  name: string;
  [key: string]: unknown;
}

export interface Room {
  id: string;
  name: string;
  [key: string]: unknown;
}

export interface Mural {
  id: string;
  title?: string;
  name?: string;
  [key: string]: unknown;
}

export interface MuralApiResponse<T> {
  value: T[];
  next?: string;
}

export interface TokenData {
  access_token: string;
  refresh_token: string;
  expires_at: number;
}
