# Security Model - Secure by Default

## Overview
This application implements a **secure by default** approach where all endpoints require explicit permissions unless explicitly configured otherwise.

## Permission Scopes

### Core Scopes
- **`SCOPE_read:market_data`** - Access to bazaar items, skyblock items, and metrics
- **`SCOPE_read:plans`** - Access to view subscription plans
- **`SCOPE_read:subscription`** - Access to user's own subscription
- **`SCOPE_use:pro`** - Access to advanced trading strategies
- **`SCOPE_manage:plans`** - Admin access to manage subscription plans

### Endpoint Security Matrix

| Endpoint | Permission Required | Description |
|----------|-------------------|-------------|
| `/api/bazaar/**` | `SCOPE_read:market_data` | Market data access |
| `/api/skyblock/**` | `SCOPE_read:market_data` | Skyblock data access |
| `/api/metrics/**` | `SCOPE_read:market_data` | Metrics and analytics |
| `/api/plans` | `SCOPE_read:plans` | View subscription plans |
| `/api/me/subscription` | `SCOPE_read:subscription` | User's subscription |
| `/api/strategies/**` | `SCOPE_use:pro` | Advanced trading strategies |
| `/api/admin/**` | `SCOPE_manage:plans` | Admin operations |

### Public Endpoints (No Auth Required)
- `/actuator/health` - Health check
- `/v3/api-docs/**` - API documentation
- `/swagger-ui/**` - Swagger UI
- `/api/v1/billing/webhook/stripe` - Stripe webhooks

## Development Testing

For development, you can use these tokens to test different permission levels:

### Free Tier (Basic Access)
```
read:market_data
```
- Access to: bazaar items, skyblock items, metrics

### Pro Tier
```
read:market_data read:plans read:subscription use:pro
```
- Access to: everything above + plans, subscription, strategies

### Admin Tier
```
read:market_data read:plans read:subscription use:pro manage:plans
```
- Access to: everything + admin operations

## Security Principles

1. **Secure by Default** - All endpoints locked unless explicitly permitted
2. **Principle of Least Privilege** - Users get minimum required permissions
3. **Explicit Permission Model** - Clear scope-based access control
4. **Audit Trail** - All authenticated requests are logged
5. **Rate Limiting** - Critical endpoints are rate-limited

## Configuration

### Environment Variables
```bash
# Auth Configuration
AUTH_JWKS_URI=https://your-domain.auth0.com/.well-known/jwks.json
AUTH_ISSUER_URI=https://your-domain.auth0.com/
AUTH_AUDIENCE=https://modern-bazaar.api
AUTH_MOCK_ENABLED=false  # Set to true only for development
```

### Adding New Endpoints
When adding new endpoints, always consider:
1. What permission scope is required?
2. Is this endpoint sensitive?
3. Should it be rate-limited?
4. Does it need audit logging?

Example:
```java
@GetMapping("/sensitive-data")
@PreAuthorize("hasAuthority('SCOPE_read:sensitive')")
@RateLimiter(name = "sensitiveEndpoint")
public SensitiveData getSensitiveData() {
    // Implementation
}
```
