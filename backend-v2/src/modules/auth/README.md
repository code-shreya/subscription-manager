# Authentication Module

Complete JWT-based authentication system with user registration, login, token management, and profile updates.

## Features

- ✅ User registration with email/password
- ✅ Secure password hashing (bcrypt, 12 rounds)
- ✅ JWT access tokens (short-lived, 15 minutes)
- ✅ JWT refresh tokens (long-lived, 7 days)
- ✅ Token rotation on refresh
- ✅ Secure token storage in database
- ✅ Password strength validation
- ✅ Protected routes with middleware
- ✅ User profile management
- ✅ Device/IP tracking
- ✅ Token revocation on logout

## API Endpoints

### Public Endpoints (No Authentication Required)

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "name": "John Doe" // optional
}
```

**Response (201):**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "avatar_url": null,
    "email_verified": false,
    "is_active": true,
    "created_at": "2026-02-18T...",
    "updated_at": "2026-02-18T..."
  },
  "tokens": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
    "expiresIn": "15m"
  }
}
```

**Password Requirements:**
- Minimum 8 characters
- Maximum 128 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response (200):** Same as registration

**Errors:**
- `401`: Invalid email or password
- `401`: Account is disabled

#### Refresh Access Token
```http
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response (200):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
  "expiresIn": "15m"
}
```

**Note:** Token rotation is implemented - the old refresh token is revoked and a new one is issued.

#### Logout
```http
POST /api/auth/logout
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response (200):**
```json
{
  "message": "Logged out successfully"
}
```

### Protected Endpoints (Authentication Required)

**Authentication:** Include JWT access token in Authorization header:
```
Authorization: Bearer <access_token>
```

#### Get Current User
```http
GET /api/auth/me
Authorization: Bearer <access_token>
```

**Response (200):**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "name": "John Doe",
  "avatar_url": null,
  "email_verified": false,
  "is_active": true,
  "last_login_at": "2026-02-18T...",
  "created_at": "2026-02-18T...",
  "updated_at": "2026-02-18T..."
}
```

#### Update Profile
```http
PATCH /api/auth/me
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "name": "Jane Doe", // optional
  "avatar_url": "https://example.com/avatar.jpg" // optional
}
```

**Response (200):** Updated user object

## Authentication Flow

### 1. Registration/Login Flow

```
Client                    API                     Database
  |                        |                          |
  |---Register/Login------>|                          |
  |                        |---Create User---------->|
  |                        |<--User Created----------|
  |                        |                          |
  |                        |---Store Refresh Token-->|
  |                        |<--Token Stored----------|
  |                        |                          |
  |<--Access + Refresh-----|                          |
  |    Tokens              |                          |
```

### 2. Protected Request Flow

```
Client                    API                     Middleware
  |                        |                          |
  |---Request + Token----->|                          |
  |                        |---Verify Token---------->|
  |                        |<--User Payload-----------|
  |                        |                          |
  |                        |---Process Request------->|
  |<--Response-------------|                          |
```

### 3. Token Refresh Flow

```
Client                    API                     Database
  |                        |                          |
  |---Refresh Request----->|                          |
  |    (Refresh Token)     |                          |
  |                        |---Verify & Check-------->|
  |                        |    Refresh Token         |
  |                        |<--Token Valid------------|
  |                        |                          |
  |                        |---Revoke Old Token------>|
  |                        |---Store New Token------->|
  |                        |<--Tokens Updated---------|
  |                        |                          |
  |<--New Access +---------|                          |
  |    Refresh Tokens      |                          |
```

## Security Features

### Password Security
- **Bcrypt hashing** with 12 salt rounds
- **Strength validation** on registration
- No password storage in plaintext

### Token Security
- **Short-lived access tokens** (15 minutes)
- **Long-lived refresh tokens** (7 days)
- **Token rotation** on refresh
- **Database storage** of refresh tokens
- **Revocation support** for logout
- **JWT verification** with issuer/audience checks

### Additional Security
- **Device tracking** (IP, User-Agent)
- **Account status checks** (is_active flag)
- **Email case normalization** (lowercase)
- **Error message obfuscation** (avoid user enumeration)

## Middleware Usage

### Protect Routes

```typescript
import { authenticate } from '../../shared/middleware/authenticate';

app.get('/protected', {
  preHandler: authenticate
}, async (request, reply) => {
  // request.user is now available
  const userId = request.user.userId;
  // ...
});
```

### Optional Authentication

```typescript
import { optionalAuthenticate } from '../../shared/middleware/authenticate';

app.get('/public', {
  preHandler: optionalAuthenticate
}, async (request, reply) => {
  if (request.user) {
    // User is authenticated
  } else {
    // User is not authenticated
  }
});
```

## Error Handling

All authentication errors follow a consistent format:

```json
{
  "error": "Error Type",
  "message": "Detailed error message"
}
```

**Common Error Codes:**
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (invalid credentials, expired tokens)
- `404` - Not Found (user not found)
- `409` - Conflict (duplicate email)
- `500` - Internal Server Error

## Testing

Run authentication tests:
```bash
npm test -- auth
```

**Test Coverage:**
- User registration (success, duplicate email, validation)
- User login (success, wrong password, non-existent user)
- Token refresh (success, invalid token, revoked token)
- Logout (success, invalid token)
- Get current user (success, no token, invalid token)
- Profile update (success, validation)
- JWT utilities (generation, verification, decoding)
- Password utilities (hashing, comparison, strength validation)

## Database Schema

### Users Table
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  avatar_url TEXT,
  email_verified BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  last_login_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### Refresh Tokens Table
```sql
CREATE TABLE refresh_tokens (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  token VARCHAR(500) UNIQUE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  is_revoked BOOLEAN DEFAULT FALSE,
  revoked_at TIMESTAMP WITH TIME ZONE,
  device_info JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

## Configuration

Environment variables for authentication:

```env
# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d
```

**Important:** Use a strong, random JWT_SECRET in production (minimum 32 characters).

## Best Practices

1. **Store tokens securely** on client-side (httpOnly cookies or secure storage)
2. **Always use HTTPS** in production
3. **Implement rate limiting** on auth endpoints (prevent brute force)
4. **Rotate JWT_SECRET** periodically in production
5. **Monitor failed login attempts** for security
6. **Implement email verification** before full account access
7. **Add 2FA** for additional security (future enhancement)

## Future Enhancements

- [ ] Email verification flow
- [ ] Password reset functionality
- [ ] Two-factor authentication (2FA)
- [ ] OAuth integration (Google, GitHub)
- [ ] Session management (view active sessions, revoke)
- [ ] Login history tracking
- [ ] Account lockout after failed attempts
- [ ] Password change endpoint
- [ ] Account deletion
