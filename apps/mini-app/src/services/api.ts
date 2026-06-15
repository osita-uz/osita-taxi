import type {
  User,
  Location,
  Order,
  Offer,
  RouteStats,
  FavoriteDriver,
  CreateOrderDto,
} from "@/types";

const BASE = import.meta.env.VITE_API_URL ?? "/api";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
  }
}

class ApiService {
  private token: string | null = null;

  setToken(t: string) {
    this.token = t;
  }

  private async req<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${BASE}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
        ...(init?.headers ?? {}),
      },
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new ApiError(res.status, text || res.statusText);
    }
    const text = await res.text();
    return text ? (JSON.parse(text) as T) : ({} as T);
  }

  // Auth
  init(initData: string) {
    return this.req<{ token: string; user: User }>("/auth/init", {
      method: "POST",
      body: JSON.stringify({ initData }),
    });
  }

  // Locations — Location modeli (parentId=null = viloyat, parentId = tuman)
  getLocations() {
    return this.req<Location[]>("/locations");
  }

  getLocationChildren(locationId: number) {
    return this.req<Location[]>(`/locations/${locationId}/children`);
  }

  lookupRoute(fromLocationId: number, toLocationId: number) {
    return this.req<{ id: number }>(
      `/routes/lookup?fromLocationId=${fromLocationId}&toLocationId=${toLocationId}`
    );
  }

  getRouteStats(routeId: number) {
    return this.req<RouteStats>(`/routes/${routeId}/stats`);
  }

  getRouteDriversCount(routeId: number) {
    return this.req<{ count: number }>(`/routes/${routeId}/drivers/count`);
  }

  // Orders
  createOrder(data: CreateOrderDto) {
    return this.req<Order>("/orders", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  getOrders() {
    return this.req<Order[]>("/orders");
  }

  getOrder(id: number) {
    return this.req<Order>(`/orders/${id}`);
  }

  cancelOrder(id: number) {
    return this.req<{ success: boolean }>(`/orders/${id}`, { method: "DELETE" });
  }

  extendOrder(id: number) {
    return this.req<Order>(`/orders/${id}/extend`, { method: "PUT" });
  }

  rateOrder(id: number, rating: number, comment?: string) {
    return this.req<{ success: boolean }>(`/orders/${id}/rate`, {
      method: "POST",
      body: JSON.stringify({ rating, comment }),
    });
  }

  // Offers
  getOffers(orderId: number) {
    return this.req<Offer[]>(`/orders/${orderId}/offers`);
  }

  acceptOffer(orderId: number, offerId: number) {
    return this.req<{ driverPhone: string }>(
      `/orders/${orderId}/offers/${offerId}/accept`,
      { method: "POST" }
    );
  }

  // Favorites
  getFavorites() {
    return this.req<FavoriteDriver[]>("/favorites");
  }

  addFavorite(driverId: number) {
    return this.req<{ success: boolean }>(`/favorites/${driverId}`, { method: "POST" });
  }

  removeFavorite(driverId: number) {
    return this.req<{ success: boolean }>(`/favorites/${driverId}`, { method: "DELETE" });
  }

  sendOrderToFavorite(driverId: number, orderId: number) {
    return this.req(`/favorites/${driverId}/order`, {
      method: "POST",
      body: JSON.stringify({ orderId }),
    });
  }
}

export const api = new ApiService();
