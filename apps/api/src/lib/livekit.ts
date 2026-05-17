/**
 * LiveKit Service — Room management & token generation (S6-01)
 *
 * Wraps the LiveKit server SDK to provide:
 * - Access token generation with room grants
 * - Room management (create, delete, list)
 * - Participant management
 *
 * Configured via environment variables:
 *   LIVEKIT_URL      — LiveKit server URL (default: http://localhost:7880)
 *   LIVEKIT_API_KEY  — API key (default: devkey)
 *   LIVEKIT_API_SECRET — API secret (default: secret)
 */

import {
  AccessToken,
  RoomServiceClient,
  type VideoGrant,
} from "livekit-server-sdk";

// --- Configuration ---

const LIVEKIT_URL = process.env.LIVEKIT_URL || "http://localhost:7880";
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY || "devkey";
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET || "secret";
const TOKEN_TTL_SECONDS = 3600; // 1 hour

// --- Room Service Client (lazy init) ---

let _roomService: RoomServiceClient | null = null;

function getRoomService(): RoomServiceClient {
  if (!_roomService) {
    _roomService = new RoomServiceClient(
      LIVEKIT_URL,
      LIVEKIT_API_KEY,
      LIVEKIT_API_SECRET
    );
  }
  return _roomService;
}

// --- Token Generation ---

/**
 * Generate a LiveKit access token for a participant.
 *
 * @param roomName - The room to grant access to
 * @param participantIdentity - Unique identity for the participant
 * @param participantName - Display name
 * @param options - Additional grant options
 * @returns JWT access token string
 */
export async function generateToken(
  roomName: string,
  participantIdentity: string,
  participantName: string,
  options: {
    canPublish?: boolean;
    canSubscribe?: boolean;
    canPublishData?: boolean;
    ttl?: number;
    metadata?: string;
  } = {}
): Promise<string> {
  const {
    canPublish = true,
    canSubscribe = true,
    canPublishData = true,
    ttl = TOKEN_TTL_SECONDS,
    metadata,
  } = options;

  const grant: VideoGrant = {
    room: roomName,
    roomJoin: true,
    canPublish,
    canSubscribe,
    canPublishData,
  };

  const token = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
    identity: participantIdentity,
    name: participantName,
    ttl,
    metadata,
  });

  token.addGrant(grant);
  return await token.toJwt();
}

// --- Room Management ---

/**
 * Create a new LiveKit room.
 */
export async function createRoom(
  roomName: string,
  options: {
    emptyTimeout?: number;
    maxParticipants?: number;
  } = {}
) {
  const { emptyTimeout = 300, maxParticipants = 3 } = options;
  const service = getRoomService();

  return service.createRoom({
    name: roomName,
    emptyTimeout,
    maxParticipants,
  });
}

/**
 * Delete a LiveKit room.
 */
export async function deleteRoom(roomName: string) {
  const service = getRoomService();
  return service.deleteRoom(roomName);
}

/**
 * List participants in a room.
 */
export async function listParticipants(roomName: string) {
  const service = getRoomService();
  return service.listParticipants(roomName);
}

/**
 * List all active rooms.
 */
export async function listRooms() {
  const service = getRoomService();
  return service.listRooms();
}

/**
 * Generate a room name for a voice session.
 * Format: voice-{userId}-{timestamp}
 */
export function generateRoomName(userId: string): string {
  const ts = Date.now().toString(36);
  const short = userId.slice(0, 8);
  return `voice-${short}-${ts}`;
}

// --- Exports ---

export const livekitConfig = {
  url: LIVEKIT_URL,
  apiKey: LIVEKIT_API_KEY,
  // NEVER export the secret
  wsUrl: LIVEKIT_URL.replace("http", "ws"),
} as const;
