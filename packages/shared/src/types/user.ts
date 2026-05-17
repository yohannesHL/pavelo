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
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type User = z.infer<typeof UserSchema>;

// --- User Preferences ---
export const UserPreferencesSchema = z.object({
  budget: z.object({
    min: z.number().min(0).optional(),
    max: z.number().min(0).optional(),
  }).optional(),
  location: z.string().optional(),
  bedrooms: z.number().min(0).max(10).optional(),
  propertyTypes: z.array(z.string()).optional(),
});

export type UserPreferences = z.infer<typeof UserPreferencesSchema>;
