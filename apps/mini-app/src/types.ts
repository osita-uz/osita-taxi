export type OrderStatus = "ACTIVE" | "COMPLETED" | "CANCELLED" | "EXPIRED";
export type OfferStatus = "PENDING" | "ACCEPTED" | "REJECTED";
export type SeatType = "FULL" | "PARTIAL";
export type Luggage = "NONE" | "SMALL" | "LARGE";

export interface User {
  id: number;
  telegramId: string;
  name: string;
  phone: string | null;
  role: string;
}

// Location: parentId=null bo'lsa viloyat, parentId bo'lsa tuman
export interface Location {
  id: number;
  name: string;
  parentId: number | null;
  children?: Location[];
}

export interface Route {
  id: number;
  fromLocationId: number;
  toLocationId: number;
  from: Location;
  to: Location;
}

export interface Order {
  id: number;
  passengerId: number;
  routeId: number;
  route: Route;
  fromPlace: string;
  toPlace: string;
  travelDate: string;
  seatType: SeatType;
  seatCount: number | null;
  luggage: Luggage;
  price: number;
  note: string | null;
  isUrgent: boolean;
  status: OrderStatus;
  isExtended: boolean;
  expiresAt: string;
  createdAt: string;
  viewCount?: number;
  offers?: Offer[];
}

export interface Offer {
  id: number;
  price: number;
  driverName: string;
  driverRating: number;
  isFavorite: boolean;
  status?: OfferStatus;
}

export interface RouteStats {
  min: number | null;
  avg: number | null;
  max: number | null;
  hasEnoughData: boolean;
}

export interface FavoriteDriver {
  passengerId: number;
  driverId: number;
  createdAt: string;
  driver: {
    id: number;
    name: string;
    phone: string | null;
    driver: { rating: number; ratingCount: number } | null;
  };
}

export interface CreateOrderDto {
  routeId: number;
  fromPlace: string;
  toPlace: string;
  travelDate: string;
  seatType: SeatType;
  seatCount?: number;
  luggage: Luggage;
  price: number;
  note?: string;
  isUrgent?: boolean;
}
