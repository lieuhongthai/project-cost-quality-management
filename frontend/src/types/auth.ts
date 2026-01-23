export interface AuthUser {
  id: number;
  username: string;
  positionId: number;
  mustChangePassword: boolean;
  permissions: string[];
}

export interface AuthResponse {
  accessToken: string;
  user: AuthUser;
}
