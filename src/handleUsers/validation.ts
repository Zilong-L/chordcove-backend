import { z } from 'zod';

// Email validation schema
export const emailSchema = z.string().email({
  message: "Invalid email address format"
});

// Password validation schema
export const passwordSchema = z.string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number")
  // .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character");

// Initial registration request validation schema (email only)
export const registrationSchema = z.object({
  email: emailSchema
});

// Verification request validation schema (email, code, and password)
export const verificationSchema = z.object({
  email: emailSchema,
  code: z.string().length(6, "Verification code must be 6 digits"),
  password: passwordSchema
});

export type RegistrationRequest = z.infer<typeof registrationSchema>;
export type VerificationRequest = z.infer<typeof verificationSchema>;

/**
 * Validates initial registration data (email only)
 * @param data The registration data to validate
 * @returns Validation result with either validated data or error messages
 */
export function validateRegistrationData(data: unknown) {
  const result = registrationSchema.safeParse(data);
  return result;
}

/**
 * Validates verification data including password requirements
 * @param data The verification data to validate
 * @returns Validation result with either validated data or error messages
 */
export function validateVerificationData(data: unknown) {
  const result = verificationSchema.safeParse(data);
  return result;
} 