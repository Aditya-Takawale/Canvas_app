export interface User {
  id: number;
  username: string;
  email: string;
  password: string;
  role: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserCreationAttributes {
  username: string;
  email: string;
  password: string;
  role?: string;
}

export interface UserResponse {
  id: number;
  username: string;
  email: string;
  role: string;
  createdAt: Date;
  updatedAt: Date;
}