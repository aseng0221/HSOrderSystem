export interface UserProfile {
  id: string;
  phoneNumber?: string;
  email?: string;
  displayName?: string;
  points: number;
  lastCheckInDate?: number; // timestamp
}
