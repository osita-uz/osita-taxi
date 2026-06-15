export type OrderStatus = "ACTIVE" | "COMPLETED" | "CANCELLED" | "EXPIRED";
export type OfferStatus = "PENDING" | "ACCEPTED" | "REJECTED";
export type SeatType = "FULL" | "PARTIAL";
export type Luggage = "NONE" | "SMALL" | "LARGE";
export type Role = "PASSENGER" | "DRIVER" | "ADMIN";
export type PriceSource = "SURVEY" | "ACCEPTED_OFFER";

export interface LocationDto {
  id: number;
  name: string;
  parentId: number | null;
  children?: LocationDto[];
}

export interface UserDto {
  id: number;
  telegramId: string;
  name: string;
  phone: string | null;
  role: Role;
}

export interface OfferDto {
  id: number;
  price: number;
  driverName: string;
  driverRating: number;
  isFavorite: boolean;
}

export interface OrderStatusDto {
  id: number;
  status: OrderStatus;
  viewCount: number;
  offerCount: number;
  expiresAt: string;
  isExtended: boolean;
}

export interface RouteStatsDto {
  min: number;
  avg: number;
  max: number;
  hasEnoughData: boolean;
}

export interface JwtPayload {
  userId: number;
  telegramId: string;
  role: Role;
}

export interface CreateOrderBody {
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
