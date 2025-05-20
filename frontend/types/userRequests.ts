// frontend/types/userRequests.ts

export interface UserRequest {
  id: number;
  title: string;
  description: string;
  type?: string;
  is_urgent: boolean;
  building: number;
  created_by: number;
  created_by_username: string;
  status: string;
  created_at: string;
  updated_at?: string;
  supporter_count: number;
  supporter_usernames: string[];
  is_supported?: boolean;
  supporters?: number[]; // ✅ ΠΡΟΣΤΕΘΗΚΕ αυτό για να συμφωνεί με το backend
}

export interface UserRequestType {
  id: number;
  name: string;
  description: string;
  icon: string;
}
export interface UserRequestStatus {
  id: number;
  name: string;
  description: string;
}
export interface UserRequestStatusType {
  id: number;
  name: string;
  description: string;
  icon: string;
}
export interface UserRequestStatusTypeWithStatus {
  id: number;
  name: string;
  description: string;
  icon: string;
  status: string;
}