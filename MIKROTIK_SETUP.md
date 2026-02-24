# MikroTik Router Configuration for RouterMaster/RadiusNexus

This guide shows how to configure your MikroTik router to authenticate users against the RadiusNexus RADIUS server.

---

## Prerequisites

- **RADIUS Server**: Running at `10.255.0.9:1812` (your PC's IP)
- **RADIUS Secret**: `testing123`
- **MikroTik Router**: Accessible on your local network (e.g., `192.168.88.1`)

---

## Step 1: Add MikroTik Router to FreeRADIUS Clients

Your MikroTik router needs to be registered as a RADIUS client. 

### Option A: Add via Database (Recommended)

The router is already registered in the database as a NAS device:
- **Name**: Main MikroTik
- **IP Address**: `10.0.0.1`
- **Type**: mikrotik
- **Secret**: `testing123`

**If your MikroTik has a different IP**, update the database:

```sql
-- Connect to database
docker exec -it radiusnexus-db psql -U radiusnexus -d radiusnexus

-- Update the NAS IP to your actual MikroTik IP
UPDATE nas_devices 
SET ip_address = '192.168.88.1'  -- Replace with your MikroTik's actual IP
WHERE name = 'Main MikroTik';

-- Verify
SELECT name, ip_address, type, secret FROM nas_devices;
```

### Option B: Add via FreeRADIUS clients.conf (Alternative)

Edit `docker/freeradius/clients.conf` and add:

```conf
client mikrotik {
    ipaddr = 192.168.88.1      # Your MikroTik router IP
    secret = testing123
    shortname = mikrotik-router
}
```

Then restart FreeRADIUS:
```bash
docker restart radiusnexus-radius
```

---

## Step 2: Configure MikroTik Router

Connect to your MikroTik via Winbox or SSH and run these commands:

### 2.1 Add RADIUS Server

```routeros
/radius
add address=10.255.0.9 secret=testing123 service=ppp,hotspot,login timeout=3s

# Verify
/radius print
```

**Expected output:**
```
 0   address=10.255.0.9 secret="testing123" service=ppp,hotspot,login timeout=3s
```

### 2.2 Enable RADIUS Authentication

```routeros
# Enable RADIUS for PPP (PPPoE/PPTP/L2TP)
/ppp aaa
set use-radius=yes

# Enable RADIUS for HotSpot (if using HotSpot)
/ip hotspot profile
set [find] use-radius=yes

# Verify
/ppp aaa print
/ip hotspot profile print
```

---

## Step 3: Test User Credentials

Use the test subscriber already in the database:

| Field | Value |
|-------|-------|
| **Username** | `testuser` |
| **Password** | `test123` |
| **Status** | Active |
| **Service Plan** | 10Mbps Unlimited |
| **Download Speed** | 10240 kbps (10 Mbps) |
| **Upload Speed** | 5120 kbps (5 Mbps) |
| **Expiry** | 30 days from creation |
| **Simultaneous Sessions** | 1 |

---

## Step 4: Test Authentication

### Method 1: PPPoE Test (Recommended)

1. **Create PPPoE Server on MikroTik:**

```routeros
# Add PPPoE server on bridge interface
/interface pppoe-server server
add interface=bridge service-name=isp disabled=no

# Set PPP profile to use RADIUS
/ppp profile
set default use-radius=yes
```

2. **Connect from Client:**
   - Create a PPPoE connection on your Windows PC or another device
   - **Username**: `testuser`
   - **Password**: `test123`
   - **Expected**: Connection succeeds, speed limited to 10Mbps down / 5Mbps up

### Method 2: HotSpot Test

1. **Create HotSpot on MikroTik:**

```routeros
# Quick HotSpot setup (follow wizard)
/ip hotspot setup

# Ensure profile uses RADIUS
/ip hotspot profile
set [find] use-radius=yes
```

2. **Connect from Client:**
   - Connect to the HotSpot WiFi/network
   - Open browser, enter credentials at login page:
     - **Username**: `testuser`
     - **Password**: `test123`
   - **Expected**: Login succeeds, internet access granted

### Method 3: Router Login Test (Admin Access)

```routeros
# Enable RADIUS for router login
/user aaa
set use-radius=yes

# Try SSH/Winbox login with testuser/test123
# Expected: Login succeeds (if user has proper permissions)
```

---

## Step 5: Verify RADIUS Communication

### Check FreeRADIUS Logs

```bash
# Watch RADIUS authentication in real-time
docker logs -f radiusnexus-radius
```

**Expected output on successful auth:**
```
(0) Received Access-Request Id 123 from 192.168.88.1:12345
(0) User-Name = "testuser"
(0) Sent Access-Accept Id 123 to 192.168.88.1:12345
(0)   Mikrotik-Rate-Limit = "5120k/10240k"
(0)   Session-Timeout = 2592000
(0)   Acct-Interim-Interval = 300
```

### Check API Logs

```bash
# Watch API processing
docker logs -f radiusnexus-api | Select-String "authorize|authenticate|accounting"
```

### Check Database Sessions

```bash
# View active sessions
docker exec radiusnexus-db psql -U radiusnexus -d radiusnexus -c "
SELECT username, nas_ip, framed_ip, start_time, session_time 
FROM radacct 
WHERE stop_time IS NULL 
ORDER BY start_time DESC 
LIMIT 5;
"
```

---

## Expected Behavior

### On Successful Login:
1. **Authentication**: User credentials validated against database
2. **Authorization**: RADIUS returns these attributes to MikroTik:
   - `Mikrotik-Rate-Limit`: `5120k/10240k` (5Mbps up / 10Mbps down)
   - `Session-Timeout`: Time until session expires
   - `Acct-Interim-Interval`: `300` (send accounting updates every 5 minutes)
3. **Accounting**: MikroTik sends:
   - **Start**: When user connects
   - **Interim-Update**: Every 5 minutes with traffic stats
   - **Stop**: When user disconnects

### Speed Limits Applied:
- **Download**: 10 Mbps (10240 kbps)
- **Upload**: 5 Mbps (5120 kbps)
- MikroTik automatically applies these via `Mikrotik-Rate-Limit` attribute

### Session Tracking:
- All sessions logged in `radacct` table
- Traffic usage tracked and updated in real-time
- Post-auth attempts logged in `radpostauth` table

---

## Troubleshooting

### Issue: "Access-Reject" or Login Fails

**Check 1: RADIUS server reachable?**
```routeros
# From MikroTik, ping RADIUS server
/ping 10.255.0.9 count=5
```

**Check 2: Correct secret?**
```bash
# Check NAS device secret in database
docker exec radiusnexus-db psql -U radiusnexus -d radiusnexus -c "
SELECT name, ip_address, secret FROM nas_devices;
"
```

**Check 3: User enabled?**
```bash
# Check subscriber status
docker exec radiusnexus-db psql -U radiusnexus -d radiusnexus -c "
SELECT username, status, enabled, plan_id FROM subscribers WHERE username = 'testuser';
"
```

**Check 4: Firewall blocking?**
```bash
# Ensure UDP 1812/1813 are open on Windows Firewall
netsh advfirewall firewall show rule name="FreeRADIUS"
```

### Issue: No Speed Limit Applied

**Check MikroTik received attributes:**
```routeros
# View active PPP sessions
/ppp active print detail

# Look for "rate-limit" field
```

**Check service plan:**
```bash
docker exec radiusnexus-db psql -U radiusnexus -d radiusnexus -c "
SELECT name, rate_dl, rate_ul FROM service_plans WHERE id = '00000000-0000-0000-0000-000000000020';
"
```

### Issue: Accounting Not Working

**Check MikroTik accounting settings:**
```routeros
/radius print
# Ensure "service" includes your connection type (ppp, hotspot, etc.)
```

**Check accounting logs:**
```bash
docker logs radiusnexus-radius | grep -i "accounting"
```

---

## Advanced: Create Additional Test Users

### Via API (Postman/curl):

```bash
# Login as admin first
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# Use the returned token to create subscriber
curl -X POST http://localhost:3000/api/subscribers \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "username": "testuser2",
    "password": "test456",
    "planId": "00000000-0000-0000-0000-000000000020",
    "firstName": "Test",
    "lastName": "User2",
    "email": "test2@example.com"
  }'
```

### Via Database:

```sql
-- Connect to database
docker exec -it radiusnexus-db psql -U radiusnexus -d radiusnexus

-- Create new subscriber
INSERT INTO subscribers (
  id, tenant_id, username, password_hash, account_type, status, enabled,
  plan_id, sim_use, first_name, last_name, email,
  dl_limit_bytes, ul_limit_bytes, total_limit_bytes, time_limit_secs, expiry_date
) VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000001',
  'testuser2',
  crypt('test456', gen_salt('bf')),  -- bcrypt hash
  'regular',
  'active',
  true,
  '00000000-0000-0000-0000-000000000020',
  1,
  'Test',
  'User2',
  'test2@example.com',
  0, 0, 0, 0,
  NOW() + INTERVAL '30 days'
);
```

---

## Summary

1. **Update NAS IP** in database to match your MikroTik's actual IP
2. **Configure MikroTik** to use RADIUS server at `10.255.0.9:1812` with secret `testing123`
3. **Test login** with `testuser` / `test123`
4. **Verify** speed limits (10Mbps down / 5Mbps up) are applied
5. **Monitor** logs and database for authentication/accounting records

Your RADIUS server is fully functional and ready for production use!
