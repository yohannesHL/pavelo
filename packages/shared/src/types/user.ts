import { z } from "zod";

// --- Role Types ---
export const UserRole = z.enum(["buyer", "seller", "agent"]);
export type UserRole = z.infer<typeof UserRole>;

// --- User Schema ---
export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().min(1).max(100),
  role: UserRole,
  avatarUrl: z.string().url().nullable().optional(),
  phone: z.string().nullable().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type User = z.infer<typeof UserSchema>;

// --- User Preferences (buyer-focused) ---
export const BuyerPreferencesSchema = z.object({
  budget: z
    .object({
      min: z.number().min(0).optional(),
      max: z.number().min(0).optional(),
    })
    .optional(),
  locations: z.array(z.string()).default([]),
  bedrooms: z
    .object({
      min: z.number().min(0).optional(),
      max: z.number().min(0).optional(),
    })
    .optional(),
  propertyTypes: z.array(z.string()).default([]),
  features: z.array(z.string()).default([]),
  mustHave: z.array(z.string()).default([]),
  niceToHave: z.array(z.string()).default([]),
});

export type BuyerPreferences = z.infer<typeof BuyerPreferencesSchema>;

// --- Signup Input ---
export const SignupInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  name: z.string().min(1).max(100),
  role: UserRole,
  phone: z.string().optional(),
});
export type SignupInput = z.infer<typeof SignupInputSchema>;

// --- Login Input ---
export const LoginInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
export type LoginInput = z.infer<typeof LoginInputSchema>;

// --- Auth Session ---
export const AuthSessionSchema = z.object({
  user: UserSchema,
  accessToken: z.string(),
  refreshToken: z.string().optional(),
  expiresAt: z.number(),
});
export type AuthSession = z.infer<typeof AuthSessionSchema>;
