import { type UserRole } from "@/store/useAuthStore";

export type DemoAccount = {
  label: string;
  email: string;
  password: string;
  role: UserRole;
};

export const demoAccounts: DemoAccount[] = [
  {
    label: "User",
    email: "user@helpdesk.local",
    password: "12345@",
    role: "user",
  },
  {
    label: "Agent",
    email: "agent@helpdesk.local",
    password: "12345@",
    role: "agent",
  },
  {
    label: "Admin",
    email: "admin@helpdesk.local",
    password: "12345@",
    role: "admin",
  },
];
