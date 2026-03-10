export interface Branch {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  distance?: number; // Distance in km from user
  openTime: string;
  closeTime: string;
  image?: string;
}
