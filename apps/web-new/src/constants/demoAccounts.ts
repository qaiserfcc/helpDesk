import type { UserRole } from "@/store/useAuthStore";

export type DemoAccount = {
  label: string;
  email: string;
  password: string;
  role: UserRole;
  name?: string;
};

export const demoAccounts: DemoAccount[] = [
  {
    label: "User",
    email: "user@helpdesk.local",
    password: "12345@",
    role: "user",
    name: "User Demo",
  },
  {
    label: "Agent",
    email: "agent@helpdesk.local",
    password: "12345@",
    role: "agent",
    name: "Agent Demo",
  },
  {
    label: "Admin",
    email: "admin@helpdesk.local",
    password: "12345@",
    role: "admin",
    name: "Admin Demo",
  },
];
