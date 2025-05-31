import { jwtDecode } from 'jwt-decode';

interface JWTPayload {
  userId: string;
  username: string;
  email: string;
  iat: number;
  exp: number;
  iss: string;
  aud: string;
}

export const isTokenExpired = (token: string): boolean => {
  try {
    const decoded = jwtDecode<JWTPayload>(token);
    const currentTime = Date.now() / 1000;
    return decoded.exp < currentTime;
  } catch {
    return true;
  }
};

export const getTokenPayload = (token: string): JWTPayload | null => {
  try {
    return jwtDecode<JWTPayload>(token);
  } catch {
    return null;
  }
};

export const isTokenValid = (token: string): boolean => {
  try {
    const payload = getTokenPayload(token);
    return payload !== null && !isTokenExpired(token);
  } catch {
    return false;
  }
};
