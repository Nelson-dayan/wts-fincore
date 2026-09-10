export type AdminUser = {
  _id: string;
  name: string;
  email: string;
  role: "admin" | "employee";
  isActive: boolean;
  phone?: string;
  createdAt: string;
  updatedAt?: string;
};

export type NewUserForm = {
  name: string;
  email: string;
  password: string;
  phoneNumber: string;
  role: "admin" | "employee";
};
