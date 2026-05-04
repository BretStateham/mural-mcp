import type { Mural, MuralWidget, Room, Workspace } from "../types.js";
import { getAccessToken } from "../auth/token-store.js";

const API_BASE = "https://app.mural.co/api/public/v1";

async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await getAccessToken();
  const url = path.startsWith("http") ? path : `${API_BASE}${path}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Mural API ${response.status}: ${body}`);
  }

  return response.json() as Promise<T>;
}

// ── Workspaces ──

export async function listWorkspaces(): Promise<Workspace[]> {
  const data = await apiRequest<{ value: Workspace[] }>("/workspaces");
  return data.value;
}

// ── Rooms ──

export async function listRooms(workspaceId: string): Promise<Room[]> {
  const data = await apiRequest<{ value: Room[] }>(
    `/workspaces/${workspaceId}/rooms`,
  );
  return data.value;
}

// ── Murals ──

export async function listMurals(workspaceId: string, roomId?: string): Promise<Mural[]> {
  const path = roomId
    ? `/rooms/${roomId}/murals`
    : `/workspaces/${workspaceId}/murals`;
  const data = await apiRequest<{ value: Mural[] }>(path);
  return data.value;
}

export async function getMural(muralId: string): Promise<Mural> {
  return apiRequest<Mural>(`/murals/${muralId}`);
}

// ── Widgets ──

export async function getWidgets(muralId: string): Promise<MuralWidget[]> {
  const allWidgets: MuralWidget[] = [];
  const basePath = `/murals/${muralId}/widgets`;
  let cursor: string | undefined;

  do {
    const path = cursor ? `${basePath}?next=${encodeURIComponent(cursor)}` : basePath;
    const data: { value: MuralWidget[]; next?: string } =
      await apiRequest<{ value: MuralWidget[]; next?: string }>(path);
    allWidgets.push(...data.value);
    cursor = data.next;
  } while (cursor);

  return allWidgets;
}

export async function getWidget(muralId: string, widgetId: string): Promise<MuralWidget> {
  return apiRequest<MuralWidget>(`/murals/${muralId}/widgets/${widgetId}`);
}

export async function createWidget(
  muralId: string,
  widget: Record<string, unknown>,
): Promise<MuralWidget> {
  return apiRequest<MuralWidget>(`/murals/${muralId}/widgets`, {
    method: "POST",
    body: JSON.stringify(widget),
  });
}

export async function updateWidget(
  muralId: string,
  widgetId: string,
  updates: Record<string, unknown>,
): Promise<MuralWidget> {
  return apiRequest<MuralWidget>(`/murals/${muralId}/widgets/${widgetId}`, {
    method: "PATCH",
    body: JSON.stringify(updates),
  });
}

export async function deleteWidget(
  muralId: string,
  widgetId: string,
): Promise<void> {
  await apiRequest<void>(`/murals/${muralId}/widgets/${widgetId}`, {
    method: "DELETE",
  });
}
