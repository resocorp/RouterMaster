# RadiusNexus API - Postman Testing Guide

## Base Configuration

| Setting | Value |
|---------|-------|
| **Base URL** | `http://localhost:3000/api` |
| **Swagger Docs** | `http://localhost:3000/docs` |
| **Content-Type** | `application/json` |

## Quick Start

1. Import this guide's endpoints into Postman
2. Create an environment with variable `base_url` = `http://localhost:3000/api`
3. Call **Admin Login** first to get a JWT token
4. Set `token` environment variable from the response
5. Use `Bearer {{token}}` in the Authorization header for all protected endpoints

---

## Seeded Test Data

| Entity | Username | Password | Notes |
|--------|----------|----------|-------|
| Admin | `admin` | `admin123` | Super admin, full permissions |
| Subscriber | `testuser` | `test123` | Sample subscriber with plan |

---

## 1. Authentication (`/auth`)

### POST `/auth/login/admin` - Admin Login
```json
{
  "username": "admin",
  "password": "admin123"
}
```
**Response:** `{ access_token, refresh_token, user }` - Save `access_token` as `{{token}}`

### POST `/auth/login/subscriber` - Subscriber Login
```json
{
  "username": "testuser",
  "password": "test123"
}
```

### POST `/auth/refresh` - Refresh Token
```json
{
  "refresh_token": "{{refresh_token}}"
}
```

### GET `/auth/me` - Get Current User Profile
**Auth:** `Bearer {{token}}`

### GET `/auth/health` - Health Check
No auth required.

---

## 2. Subscribers (`/subscribers`)

All endpoints require `Bearer {{token}}` (admin/manager role).

### GET `/subscribers` - List Subscribers (paginated)
**Query params:** `page`, `limit`, `username`, `firstName`, `lastName`, `email`, `phone`, `mobile`, `macCpe`, `staticIpCpe`, `status`, `accountType`, `planId`, `managerId`, `groupId`, `enabled`

### POST `/subscribers` - Create Subscriber
```json
{
  "username": "newuser",
  "password": "secret123",
  "accountType": "regular",
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "planId": "<plan-uuid>"
}
```
Optional fields: `status`, `enabled`, `macCpe`, `macCm`, `macLock`, `ipModeCpe`, `staticIpCpe`, `simUse`, `managerId`, `groupId`, `phone`, `mobile`, `company`, `address`, `city`, `zip`, `country`, `state`, `vatId`, `contractId`, `language`, `comment`, `emailAlerts`, `smsAlerts`, `customAttrs`

### GET `/subscribers/:id` - Get Subscriber

### PUT `/subscribers/:id` - Update Subscriber
```json
{
  "firstName": "Updated Name",
  "enabled": true
}
```

### DELETE `/subscribers/:id` - Delete Subscriber

### POST `/subscribers/:id/add-credits` - Add Prepaid Credits
```json
{
  "amount": 1,
  "paymentType": "cash",
  "remark": "Monthly top-up"
}
```

### POST `/subscribers/:id/add-deposit` - Add Balance Deposit
```json
{
  "amount": 50.00,
  "remark": "Cash deposit"
}
```

### POST `/subscribers/:id/change-service` - Change Service Plan
```json
{
  "newPlanId": "<new-plan-uuid>",
  "scheduleDate": "2026-03-01T00:00:00Z"
}
```
Omit `scheduleDate` for immediate change.

### GET `/subscribers/:id/traffic` - Traffic Report
### GET `/subscribers/:id/auth-log` - Auth Attempt Log
### GET `/subscribers/:id/invoices` - Invoice History
### GET `/subscribers/:id/service-history` - Service Change History

### POST `/subscribers/bulk/enable` - Bulk Enable
```json
{ "ids": ["<uuid1>", "<uuid2>"] }
```

### POST `/subscribers/bulk/disable` - Bulk Disable
```json
{ "ids": ["<uuid1>", "<uuid2>"] }
```

### POST `/subscribers/bulk/delete` - Bulk Delete
```json
{ "ids": ["<uuid1>", "<uuid2>"] }
```

---

## 3. Service Plans (`/service-plans`)

### GET `/service-plans` - List All Plans
### POST `/service-plans` - Create Plan
```json
{
  "name": "20Mbps Unlimited",
  "dlRate": "20M",
  "ulRate": "5M",
  "burstDlRate": "25M",
  "burstUlRate": "8M",
  "capExpiry": true,
  "initialExpiryVal": 30,
  "expiryUnit": "days",
  "grossUnitPrice": 19.99,
  "netUnitPrice": 19.99,
  "enabled": true
}
```

### GET `/service-plans/:id` - Get Plan
### PUT `/service-plans/:id` - Update Plan
### DELETE `/service-plans/:id` - Delete Plan

### GET `/service-plans/:id/special-accounting` - Get Special Accounting Rules
### PUT `/service-plans/:id/special-accounting` - Update Special Accounting Rules
```json
[
  {
    "daysOfWeek": [1, 2, 3, 4, 5],
    "startTime": "00:00:00",
    "endTime": "06:00:00",
    "authAllowed": true,
    "dlRate": "50M",
    "ulRate": "20M"
  }
]
```

### GET `/service-plans/:id/dynamic-rates` - Get Dynamic Rate Rules
### PUT `/service-plans/:id/dynamic-rates` - Update Dynamic Rate Rules

### POST `/service-plans/bulk/enable` - Bulk Enable Plans
```json
{ "ids": ["<uuid1>", "<uuid2>"] }
```

### POST `/service-plans/bulk/disable` - Bulk Disable Plans

---

## 4. Managers (`/managers`)

### GET `/managers` - List Managers
### POST `/managers` - Create Manager
```json
{
  "username": "manager1",
  "password": "pass123",
  "firstName": "John",
  "lastName": "Manager",
  "email": "manager@test.com",
  "isSuper": false,
  "permissions": {
    "list_users": true,
    "register_users": true,
    "edit_users": true,
    "billing": true
  }
}
```

### GET `/managers/:id` - Get Manager
### PUT `/managers/:id` - Update Manager
### DELETE `/managers/:id` - Delete Manager

### POST `/managers/:id/credit` - Credit/Debit Balance
```json
{ "amount": 100.00, "remark": "Initial deposit" }
```

### GET `/managers/:id/financials` - Financial Summary

---

## 5. NAS Devices (`/nas`)

### GET `/nas` - List NAS Devices
### POST `/nas` - Create NAS Device
```json
{
  "name": "Main Router",
  "type": "mikrotik",
  "ipAddress": "192.168.1.1",
  "secret": "testing123",
  "coaPort": 3799,
  "description": "Core MikroTik router"
}
```

### GET `/nas/:id` - Get NAS Device
### PUT `/nas/:id` - Update NAS Device
### DELETE `/nas/:id` - Delete NAS Device

---

## 6. IP Pools (`/ip-pools`)

### GET `/ip-pools` - List IP Pools
### POST `/ip-pools` - Create IP Pool
```json
{
  "name": "Pool-1",
  "startIp": "10.0.0.1",
  "endIp": "10.0.0.254",
  "subnet": "10.0.0.0/24"
}
```

### GET `/ip-pools/:id` - Get IP Pool
### PUT `/ip-pools/:id` - Update IP Pool
### DELETE `/ip-pools/:id` - Delete IP Pool

---

## 7. Access Points (`/access-points`)

### GET `/access-points` - List Access Points
### POST `/access-points` - Create Access Point
```json
{
  "name": "AP-Lobby",
  "macAddress": "AA:BB:CC:DD:EE:FF",
  "ipAddress": "192.168.10.1",
  "location": "Main Lobby"
}
```

### GET `/access-points/:id` - Get Access Point
### PUT `/access-points/:id` - Update Access Point
### DELETE `/access-points/:id` - Delete Access Point

---

## 8. User Groups (`/user-groups`)

### GET `/user-groups` - List User Groups
### POST `/user-groups` - Create User Group
```json
{
  "name": "VIP Customers",
  "description": "Premium tier customers"
}
```

### GET `/user-groups/:id` - Get User Group
### PUT `/user-groups/:id` - Update User Group
### DELETE `/user-groups/:id` - Delete User Group

---

## 9. Billing (`/billing`)

### GET `/billing/invoices` - List Invoices
**Query params:** `page`, `limit`

### GET `/billing/invoices/:id` - Get Invoice
### POST `/billing/invoices` - Create Manual Invoice
```json
{
  "subscriberId": "<subscriber-uuid>",
  "type": "deposit",
  "serviceName": "Manual credit",
  "netPrice": 10.00,
  "vatAmount": 0,
  "grossPrice": 10.00,
  "quantity": 1
}
```

### GET `/billing/summary` - Revenue Summary
**Query params:** `from` (ISO date), `to` (ISO date)

### GET `/billing/invoices/:id/pdf` - Download Invoice PDF

---

## 10. Cards / Vouchers (`/cards`)

### GET `/cards/series` - List Card Series
### POST `/cards/series` - Create Card Series + Generate Cards
```json
{
  "name": "Promo March",
  "quantity": 100,
  "prefix": "PRO",
  "pinLength": 10,
  "passwordLength": 6,
  "planId": "<plan-uuid>",
  "creditAmount": 1,
  "validTill": "2026-12-31"
}
```

### GET `/cards/series/:id` - Get Card Series
### GET `/cards/series/:id/cards` - List Cards in Series
**Query params:** `page`, `limit`

### POST `/cards/activate` - Activate a Card
```json
{ "pin": "PRO12345678", "username": "testuser" }
```

### POST `/cards/series/:id/revoke` - Revoke Active Cards in Series
### GET `/cards/series/:id/export` - Export Cards as CSV

---

## 11. IAS - Instant Access Service (`/ias`)

### GET `/ias/templates` - List IAS Templates
### POST `/ias/templates` - Create IAS Template
```json
{
  "name": "Guest 1-Hour",
  "planId": "<plan-uuid>",
  "expiryMode": "from_activation",
  "activationTimeSecs": 3600,
  "dlLimitMb": 500,
  "ulLimitMb": 100,
  "totalLimitMb": 0,
  "timeLimitSecs": 3600,
  "simUse": 1
}
```

### GET `/ias/templates/:id` - Get IAS Template
### PUT `/ias/templates/:id` - Update IAS Template
### DELETE `/ias/templates/:id` - Delete IAS Template

### POST `/ias/activate` - Activate IAS Session from MAC
```json
{ "templateId": "<template-uuid>", "macAddress": "AA:BB:CC:DD:EE:FF" }
```

---

## 12. Online Sessions (`/online-sessions`)

### GET `/online-sessions` - List Active Sessions
**Query params:** `page`, `limit`

### GET `/online-sessions/count` - Count Active Sessions
### GET `/online-sessions/user/:username` - Sessions by Username
### GET `/online-sessions/history` - Full Session History
**Query params:** `page`, `limit`

### POST `/online-sessions/disconnect/user/:username` - Disconnect User (all sessions)
### POST `/online-sessions/disconnect/session/:id` - Disconnect Specific Session

**WebSocket:** Connect to `ws://localhost:3000/sessions` for real-time session updates.

---

## 13. Reports (`/reports`)

### GET `/reports/dashboard` - Dashboard Overview
Returns subscriber stats, today's revenue, and monthly revenue.

### GET `/reports/traffic` - Traffic Summary
**Query params:** `from` (ISO date), `to` (ISO date)

### GET `/reports/top-users` - Top Users by Traffic
**Query params:** `limit` (default 20)

### GET `/reports/auth-failures` - Auth Failure Log
**Query params:** `limit` (default 100)

### GET `/reports/revenue` - Revenue Report
**Query params:** `from` (ISO date), `to` (ISO date)

### GET `/reports/subscriber-stats` - Subscriber Statistics
Returns total, active, disabled, expired, and online counts.

### GET `/reports/syslog` - System Log
**Query params:** `level` (info/warn/error), `limit` (default 200)

---

## 14. Settings (`/settings`)

### GET `/settings/tenant` - Get Tenant Info
### PUT `/settings/tenant` - Update Tenant Info
```json
{
  "name": "My ISP",
  "address": "123 Main St",
  "phone": "+1234567890"
}
```

### GET `/settings` - Get System Settings
### PUT `/settings` - Update System Settings
```json
{
  "ucpEditData": true,
  "ucpChangePassword": true,
  "ucpRedeemVoucher": true,
  "ucpViewInvoices": true
}
```

---

## 15. Notifications (`/notifications`)

### GET `/notifications/templates` - List Notification Templates
### GET `/notifications/templates/:id` - Get Template
### POST `/notifications/templates` - Create/Update Template
```json
{
  "slug": "welcome",
  "channel": "email",
  "subject": "Welcome to {{company}}",
  "body": "Hello {{firstName}}, your account is active."
}
```

### DELETE `/notifications/templates/:id` - Delete Template

### POST `/notifications/send-test` - Send Test Notification
```json
{ "type": "email", "to": "test@example.com", "subject": "Test", "message": "Hello!" }
```
or
```json
{ "type": "sms", "to": "+1234567890", "message": "Test SMS" }
```

---

## 16. Subscriber Portal (`/portal`)

Requires subscriber authentication (use subscriber login token).

### GET `/portal/profile` - Get My Profile
### PUT `/portal/profile` - Update My Profile
```json
{ "firstName": "John", "lastName": "Doe", "email": "john@test.com" }
```

### POST `/portal/change-password` - Change Password
```json
{ "oldPassword": "test123", "newPassword": "newpass456" }
```

### POST `/portal/redeem-voucher` - Redeem Voucher
```json
{ "pin": "VOUCHER123" }
```

### GET `/portal/invoices` - My Invoices
### GET `/portal/usage` - My Traffic Usage (last 30 days)
### GET `/portal/plans` - Available Plans for Self-Service

---

## 17. RADIUS (Internal - FreeRADIUS only)

These endpoints are used internally by FreeRADIUS and excluded from Swagger.

### POST `/radius/authorize` - Authorization
### POST `/radius/authenticate` - Authentication
### POST `/radius/accounting` - Accounting
### POST `/radius/post-auth` - Post-Authentication

---

## Postman Tips

### Setting up Authorization automatically
In the **Admin Login** request, go to the **Tests** tab and add:
```javascript
if (pm.response.code === 200) {
  var json = pm.response.json();
  pm.environment.set("token", json.access_token);
  pm.environment.set("refresh_token", json.refresh_token);
}
```

Then in your Collection settings, set Authorization to **Bearer Token** with value `{{token}}`.

### Swagger Auto-Discovery
Visit `http://localhost:3000/docs` in your browser to see all endpoints with interactive testing via Swagger UI. You can also import the OpenAPI spec directly into Postman from `http://localhost:3000/docs-json`.
