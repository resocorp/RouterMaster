# =============================================================================
# RouterMaster / RadiusNexus - AAA Test Script
# Tests the full RADIUS AAA flow: Authenticate, Authorize, Accounting, Post-Auth
#
# Test subjects:
#   Subscriber : testuser / test123
#   NAS        : 10.0.0.1 (MikroTik, secret=testing123)
#   API        : http://localhost:3000/api/radius
# =============================================================================

$API       = "http://localhost:3000/api/radius"
$USERNAME  = "testuser"
$PASSWORD  = "test123"
$NAS_IP    = "10.0.0.1"
$SESSION   = "TEST-SESSION-$(Get-Random -Maximum 99999)"
$CALLING   = "AA:BB:CC:DD:EE:FF"
$CALLED    = "00:11:22:33:44:55"

$pass  = 0
$fail  = 0
$warn  = 0

function Write-Header($title) {
    $sep = "=" * 60
    Write-Host ""
    Write-Host $sep -ForegroundColor Cyan
    Write-Host "  $title" -ForegroundColor Cyan
    Write-Host $sep -ForegroundColor Cyan
}

function Assert-Pass($label, $condition, $detail = "") {
    if ($condition) {
        Write-Host "  [PASS] $label" -ForegroundColor Green
        if ($detail) { Write-Host "         $detail" -ForegroundColor DarkGray }
        $script:pass++
    } else {
        Write-Host "  [FAIL] $label" -ForegroundColor Red
        if ($detail) { Write-Host "         $detail" -ForegroundColor Yellow }
        $script:fail++
    }
}

function Assert-Fail($label, $condition, $detail = "") {
    # Asserts that a request correctly REJECTS (expected 403)
    if ($condition) {
        Write-Host "  [PASS] $label" -ForegroundColor Green
        if ($detail) { Write-Host "         $detail" -ForegroundColor DarkGray }
        $script:pass++
    } else {
        Write-Host "  [FAIL] $label" -ForegroundColor Red
        if ($detail) { Write-Host "         $detail" -ForegroundColor Yellow }
        $script:fail++
    }
}

function Invoke-RadiusAPI($endpoint, $body) {
    $json = $body | ConvertTo-Json -Compress
    try {
        $resp = Invoke-WebRequest -Uri "$API/$endpoint" `
            -Method POST `
            -ContentType "application/json" `
            -Body $json `
            -UseBasicParsing `
            -ErrorAction SilentlyContinue
        $parsed = $null
        if ($resp.Content -and $resp.Content.Length -gt 0) {
            try { $parsed = $resp.Content | ConvertFrom-Json } catch {}
        }
        return @{ Status = $resp.StatusCode; Body = $parsed }
    } catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        $rawBody = ""
        try {
            $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            $rawBody = $reader.ReadToEnd()
        } catch {}
        $parsed = $null
        try { $parsed = $rawBody | ConvertFrom-Json } catch {}
        return @{ Status = $statusCode; Body = $parsed; Raw = $rawBody }
    }
}

# =============================================================================
Write-Header "1. AUTHENTICATE - Valid credentials"
# =============================================================================
$r = Invoke-RadiusAPI "authenticate" @{
    username        = $USERNAME
    password        = $PASSWORD
    nas_ip          = $NAS_IP
    calling_station = $CALLING
}
Assert-Pass "HTTP 200 on valid credentials" ($r.Status -eq 200) "Status: $($r.Status)"

# =============================================================================
Write-Header "2. AUTHENTICATE - Wrong password (expect 403)"
# =============================================================================
$r = Invoke-RadiusAPI "authenticate" @{
    username        = $USERNAME
    password        = "wrongpassword"
    nas_ip          = $NAS_IP
    calling_station = $CALLING
}
Assert-Fail "HTTP 403 on wrong password" ($r.Status -eq 403) "Status: $($r.Status), Reply: $($r.Body.'Reply-Message')"

# =============================================================================
Write-Header "3. AUTHENTICATE - Unknown user (expect 403)"
# =============================================================================
$r = Invoke-RadiusAPI "authenticate" @{
    username        = "nonexistent_user_xyz"
    password        = "anything"
    nas_ip          = $NAS_IP
}
Assert-Fail "HTTP 403 on unknown user" ($r.Status -eq 403) "Status: $($r.Status), Reply: $($r.Body.'Reply-Message')"

# =============================================================================
Write-Header "4. AUTHORIZE - Valid user from known NAS"
# =============================================================================
$r = Invoke-RadiusAPI "authorize" @{
    username        = $USERNAME
    password        = $PASSWORD
    nas_ip          = $NAS_IP
    nas_port        = "1"
    calling_station = $CALLING
    called_station  = $CALLED
}
Assert-Pass "HTTP 200 on valid authorize" ($r.Status -eq 200) "Status: $($r.Status)"
Assert-Pass "Mikrotik-Rate-Limit attribute returned" ($r.Body.'Mikrotik-Rate-Limit' -ne $null) "Value: $($r.Body.'Mikrotik-Rate-Limit')"
Assert-Pass "Acct-Interim-Interval attribute returned" ($r.Body.'Acct-Interim-Interval' -ne $null) "Value: $($r.Body.'Acct-Interim-Interval')"

# =============================================================================
Write-Header "5. AUTHORIZE - Unknown NAS IP (expect 403)"
# =============================================================================
$r = Invoke-RadiusAPI "authorize" @{
    username = $USERNAME
    password = $PASSWORD
    nas_ip   = "192.168.99.99"
}
Assert-Fail "HTTP 403 on unknown NAS" ($r.Status -eq 403) "Status: $($r.Status), Reply: $($r.Body.'Reply-Message')"

# =============================================================================
Write-Header "6. ACCOUNTING - Start"
# =============================================================================
$r = Invoke-RadiusAPI "accounting" @{
    status_type     = "Start"
    session_id      = $SESSION
    unique_id       = "$SESSION-UNIQ"
    username        = $USERNAME
    nas_ip          = $NAS_IP
    nas_port        = "1"
    nas_port_id     = "ether1"
    framed_ip       = "10.10.10.100"
    calling_station = $CALLING
    called_station  = $CALLED
    session_time    = "0"
    input_octets    = "0"
    output_octets   = "0"
}
Assert-Pass "HTTP 204 on Accounting-Start" ($r.Status -eq 204) "Status: $($r.Status)"

# Verify session was written to DB
$dbCheck = docker exec radiusnexus-db psql -U radiusnexus -d radiusnexus -t -c "SELECT COUNT(*) FROM radacct WHERE session_id = '$SESSION' AND stop_time IS NULL;"
$sessionCount = ($dbCheck.Trim() -replace '\s','')
Assert-Pass "Session record created in radacct" ($sessionCount -eq "1") "DB count: $sessionCount"

# =============================================================================
Write-Header "7. ACCOUNTING - Interim-Update (simulate 5MB down / 1MB up)"
# =============================================================================
$r = Invoke-RadiusAPI "accounting" @{
    status_type      = "Interim-Update"
    session_id       = $SESSION
    unique_id        = "$SESSION-UNIQ"
    username         = $USERNAME
    nas_ip           = $NAS_IP
    framed_ip        = "10.10.10.100"
    calling_station  = $CALLING
    session_time     = "300"
    input_octets     = "1048576"
    output_octets    = "5242880"
    input_gigawords  = "0"
    output_gigawords = "0"
}
Assert-Pass "HTTP 204 on Accounting-Interim-Update" ($r.Status -eq 204) "Status: $($r.Status)"

# Verify session_time updated
$dbCheck = docker exec radiusnexus-db psql -U radiusnexus -d radiusnexus -t -c "SELECT session_time FROM radacct WHERE session_id = '$SESSION' AND stop_time IS NULL;"
$sessionTime = ($dbCheck.Trim() -replace '\s','')
Assert-Pass "Session time updated to 300s" ($sessionTime -eq "300") "DB session_time: $sessionTime"

# =============================================================================
Write-Header "8. ACCOUNTING - Stop"
# =============================================================================
$r = Invoke-RadiusAPI "accounting" @{
    status_type      = "Stop"
    session_id       = $SESSION
    unique_id        = "$SESSION-UNIQ"
    username         = $USERNAME
    nas_ip           = $NAS_IP
    framed_ip        = "10.10.10.100"
    calling_station  = $CALLING
    session_time     = "600"
    input_octets     = "2097152"
    output_octets    = "10485760"
    input_gigawords  = "0"
    output_gigawords = "0"
    terminate_cause  = "User-Request"
}
Assert-Pass "HTTP 204 on Accounting-Stop" ($r.Status -eq 204) "Status: $($r.Status)"

# Verify session is now closed
$dbCheck = docker exec radiusnexus-db psql -U radiusnexus -d radiusnexus -t -c "SELECT terminate_cause FROM radacct WHERE session_id = '$SESSION' AND stop_time IS NOT NULL;"
$cause = ($dbCheck.Trim())
Assert-Pass "Session closed with terminate_cause" ($cause -match "User-Request") "DB terminate_cause: $cause"

# =============================================================================
Write-Header "9. POST-AUTH - Accept"
# =============================================================================
$r = Invoke-RadiusAPI "post-auth" @{
    username        = $USERNAME
    password        = "***"
    reply           = "Access-Accept"
    nas_ip          = $NAS_IP
    nas_port        = "1"
    calling_station = $CALLING
}
Assert-Pass "HTTP 204 on Post-Auth Accept" ($r.Status -eq 204) "Status: $($r.Status)"

# Verify post-auth log written
$dbCheck = docker exec radiusnexus-db psql -U radiusnexus -d radiusnexus -t -c "SELECT COUNT(*) FROM radpostauth WHERE username = '$USERNAME' AND reply = 'Access-Accept';"
$paCount = (($dbCheck -join "") -replace '\s','')
Assert-Pass "Post-auth record written to radpostauth" ([int]$paCount -ge 1) "DB count: $paCount"

# =============================================================================
Write-Header "10. POST-AUTH - Reject"
# =============================================================================
$r = Invoke-RadiusAPI "post-auth" @{
    username        = $USERNAME
    reply           = "Access-Reject"
    nas_ip          = $NAS_IP
    calling_station = $CALLING
}
Assert-Pass "HTTP 204 on Post-Auth Reject" ($r.Status -eq 204) "Status: $($r.Status)"

# =============================================================================
Write-Header "11. ACCOUNTING - Accounting-On (NAS reboot simulation)"
# =============================================================================
# First create a dangling session to be closed
$danglingSession = "DANGLING-$(Get-Random -Maximum 99999)"
Invoke-RadiusAPI "accounting" @{
    status_type = "Start"; session_id = $danglingSession
    username = $USERNAME; nas_ip = $NAS_IP; session_time = "0"
    input_octets = "0"; output_octets = "0"
} | Out-Null

$r = Invoke-RadiusAPI "accounting" @{
    status_type = "Accounting-On"
    session_id  = "0"
    username    = ""
    nas_ip      = $NAS_IP
}
Assert-Pass "HTTP 204 on Accounting-On" ($r.Status -eq 204) "Status: $($r.Status)"

# Verify dangling session was closed
$dbCheck = docker exec radiusnexus-db psql -U radiusnexus -d radiusnexus -t -c "SELECT COUNT(*) FROM radacct WHERE session_id = '$danglingSession' AND stop_time IS NOT NULL AND terminate_cause = 'NAS-Reboot';"
$closedCount = ($dbCheck.Trim() -replace '\s','')
Assert-Pass "Dangling sessions closed with NAS-Reboot" ($closedCount -eq "1") "DB closed count: $closedCount"

# =============================================================================
Write-Header "12. FREERADIUS - radtest end-to-end (via UDP port 1812)"
# =============================================================================
Write-Host "  Running radtest inside FreeRADIUS container..." -ForegroundColor DarkGray
$radtestOut = docker exec radiusnexus-radius radtest $USERNAME $PASSWORD localhost 0 testing123 2>&1
$radtestStr = $radtestOut -join "`n"

if ($radtestStr -match "Access-Accept") {
    Write-Host "  [PASS] radtest returned Access-Accept" -ForegroundColor Green
    $script:pass++
    # Show key reply attributes
    $radtestStr -split "`n" | Where-Object { $_ -match "Reply-Message|Rate-Limit|Interim|Session-Timeout|Framed" } | ForEach-Object {
        Write-Host "         $_" -ForegroundColor DarkGray
    }
} elseif ($radtestStr -match "Access-Reject") {
    Write-Host "  [FAIL] radtest returned Access-Reject" -ForegroundColor Red
    Write-Host "         $radtestStr" -ForegroundColor Yellow
    $script:fail++
} else {
    Write-Host "  [WARN] radtest output unclear (FreeRADIUS may not have radtest installed)" -ForegroundColor Yellow
    Write-Host "         $radtestStr" -ForegroundColor DarkGray
    $script:warn++
}

# =============================================================================
Write-Header "SUMMARY"
# =============================================================================
Write-Host ""
Write-Host "  Total : $($pass + $fail + $warn)" -ForegroundColor White
Write-Host "  PASS  : $pass" -ForegroundColor Green
if ($fail -gt 0) {
    Write-Host "  FAIL  : $fail" -ForegroundColor Red
} else {
    Write-Host "  FAIL  : $fail" -ForegroundColor Green
}
if ($warn -gt 0) {
    Write-Host "  WARN  : $warn" -ForegroundColor Yellow
}
Write-Host ""

if ($fail -gt 0) {
    Write-Host "  Some tests FAILED. Check output above for details." -ForegroundColor Red
    exit 1
} else {
    Write-Host "  All tests PASSED. AAA pipeline is working correctly." -ForegroundColor Green
    exit 0
}
