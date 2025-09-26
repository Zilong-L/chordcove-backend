/**
 * User model interface
 */
export interface User {
	id: number;
	email: string;
	password: string;
	created_at: string;
}

/**
 * Sheet metadata interface
 */
export interface SheetMetadata {
	id: string;
	uploaderId: number;
	title: string;
	sheetType: 'simple' | 'full';
	createdAt: string;
	coverImage: string;
	singers?: Array<{
		id: number;
		name: string;
		role: string;
	}>;
	composers?: Array<{
		id: number;
		name: string;
		role: string;
	}>;
}

/**
 * Refresh token interface
 */
export interface RefreshToken {
	id: string;
	user_id: number;
	token: string;
	device_info: string;
	created_at: string;
	expires_at: string;
}

/**
 * API response interface
 */
export interface ApiResponse<T = any> {
	success: boolean;
	data?: T;
	error?: string;
	message?: string;
}

/**
 * Login request interface
 */
export interface LoginRequest {
	email: string;
	password: string;
}

/**
 * Login response interface
 */
export interface LoginResponse {
	userId: number;
	accessToken: string;
	refreshToken: string;
}

/**
 * Registration request interface
 */
export interface RegistrationRequest {
	email: string;
	password: string;
	verificationCode?: string;
}

/**
 * Sheet upload request interface
 */
export interface SheetUploadRequest {
	title: string;
	coverImage?: string;
	sheetType: 'simple' | 'full';
}

/**
 * Sheet edit request interface
 */
export interface SheetEditRequest {
	id: string;
	title?: string;
	composer?: string;
	singer?: string;
	sheetContent?: string;
	coverImage?: string;
}
