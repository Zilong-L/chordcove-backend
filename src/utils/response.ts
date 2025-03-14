import { ApiResponse } from "../types/models";

/**
 * Create a success response
 * @param data - The data to include in the response
 * @param message - Optional success message
 * @returns A Response object with the success data
 */
export function createSuccessResponse<T>(data: T, message?: string): Response {
  const response: ApiResponse<T> = {
    success: true,
    data,
    message
  };
  
  return new Response(JSON.stringify(response), {
    headers: { "Content-Type": "application/json" }
  });
}

/**
 * Create an error response
 * @param error - The error message
 * @param status - HTTP status code (default: 400)
 * @returns A Response object with the error data
 */
export function createErrorResponse(error: string, status: number = 400): Response {
  const response: ApiResponse = {
    success: false,
    error
  };
  
  return new Response(JSON.stringify(response), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

/**
 * Parse JSON from a request body with error handling
 * @param request - The request object
 * @returns The parsed JSON data or null if parsing fails
 */
export async function parseRequestBody<T>(request: Request): Promise<T | null> {
  try {
    return await request.json() as T;
  } catch (error) {
    console.error("Failed to parse request body:", error);
    return null;
  }
} 