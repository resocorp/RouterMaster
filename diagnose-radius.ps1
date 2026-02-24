# =============================================================================
# RouterMaster - RADIUS Deep Diagnostic & Fix Script
# Run as Administrator for firewall changes
# =============================================================================

$ErrorActionPreference = "Continue"
$pass = 0; $fail = 0; $fixed = 0

function Write-Header($title) {
    $sep = "=" * 60
    Write-Host "`n$sep" -ForegroundColor Cyan
    Write-Host "  $title" -ForegroundColor Cyan
    Write-Host $sep -ForegroundColor Cyan
}

function Check($label, $condition, $detail = "") {
    if ($condition) {
        Write-Host "  [OK]   $label" -ForegroundColor Green
        if ($detail) { Write-Host "         $detail" -ForegroundColor DarkGray }
        $script:pass++
        return $true
    } else {
        Write-Host "  [FAIL] $label" -ForegroundColor Red
        if ($detail) { Write-Host "         $detail" -ForegroundColor Yellow }
        $script:fail++
        return $false
    }
}

# =============================================================================
Write-Header "1. DOCKER CONTAINERS STATUS"
# =============================================================================
$containers = @("radiusnexus-db", "radiusnexus-redis", "radiusnexus-api", "radiusnexus-radius")
foreach ($c in $containers) {
    $status = (docker inspect --format "{{.State.Status}}" $c 2>&1)
    $running = $status -eq "running"
    Check "$c" $running "Status: $status"
    
    if (-not $running -and $c -eq "radiusnexus-radius") {
        Write-Host "  [FIX]  Starting FreeRADIUS container..." -ForegroundColor Yellow
        docker start radiusnexus-radius 2>&1 | Out-Null
        Start-Sleep -Seconds 5
        $status2 = (docker inspect --format "{{.State.Status}}" $c 2>&1)
        if ($status2 -eq "running") {
            Write-Host "  [FIXED] FreeRADIUS started successfully" -ForegroundColor Green
            $script:fixed++
        } else {
            Write-Host "  [ERR]  Failed to start FreeRADIUS. Try: docker compose up -d freeradius" -ForegroundColor Red
        }
    }
}

# =============================================================================
Write-Header "2. UDP PORT BINDING (1812/1813)"
# =============================================================================
Start-Sleep -Seconds 2
$udpPorts = netstat -anp UDP 2>&1
$has1812 = $udpPorts | Select-String ":1812\s"
$has1813 = $udpPorts | Select-String ":1813\s"
Check "UDP 1812 listening on host" ($has1812 -ne $null) "$has1812"
Check "UDP 1813 listening on host" ($has1813 -ne $null) "$has1813"

if (-not $has1812) {
    Write-Host "  [INFO] Docker may need a moment. Checking container port mapping..." -ForegroundColor Yellow
    $portInfo = docker inspect radiusnexus-radius 2>&1 | Select-String "HostPort"
    Write-Host "         $portInfo" -ForegroundColor DarkGray
}

# =============================================================================
Write-Header "3. WINDOWS FIREWALL (UDP 1812-1813)"
# =============================================================================
$fwRules = netsh advfirewall firewall show rule name=all dir=in 2>&1 | Out-String
$hasRadiusRule = $fwRules -match "RADIUS|1812"

if (-not (Check "Firewall rule for RADIUS exists" $hasRadiusRule)) {
    Write-Host "  [FIX]  Creating Windows Firewall rules for RADIUS..." -ForegroundColor Yellow
    
    $isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
    
    if ($isAdmin) {
        netsh advfirewall firewall add rule name="FreeRADIUS Auth UDP 1812" dir=in action=allow protocol=UDP localport=1812 2>&1 | Out-Null
        netsh advfirewall firewall add rule name="FreeRADIUS Acct UDP 1813" dir=in action=allow protocol=UDP localport=1813 2>&1 | Out-Null
        netsh advfirewall firewall add rule name="FreeRADIUS CoA UDP 3799" dir=in action=allow protocol=UDP localport=3799 2>&1 | Out-Null
        Write-Host "  [FIXED] Firewall rules created for UDP 1812, 1813, 3799" -ForegroundColor Green
        $script:fixed++
    } else {
        Write-Host "  [WARN] NOT running as Administrator. Run these manually in elevated PowerShell:" -ForegroundColor Yellow
        Write-Host '         netsh advfirewall firewall add rule name="FreeRADIUS Auth UDP 1812" dir=in action=allow protocol=UDP localport=1812' -ForegroundColor White
        Write-Host '         netsh advfirewall firewall add rule name="FreeRADIUS Acct UDP 1813" dir=in action=allow protocol=UDP localport=1813' -ForegroundColor White
        Write-Host '         netsh advfirewall firewall add rule name="FreeRADIUS CoA UDP 3799" dir=in action=allow protocol=UDP localport=3799' -ForegroundColor White
    }
}

# =============================================================================
Write-Header "4. FREERADIUS CLIENTS.CONF"
# =============================================================================
$radiusRunning = (docker inspect --format "{{.State.Status}}" radiusnexus-radius 2>&1) -eq "running"
if ($radiusRunning) {
    $clientsConf = docker exec radiusnexus-radius cat /etc/raddb/clients.conf 2>&1
    if ($clientsConf -match "error" -or $clientsConf -match "No such file") {
        $clientsConf = docker exec radiusnexus-radius cat /etc/freeradius/clients.conf 2>&1
    }
    if ($clientsConf -match "error" -or $clientsConf -match "No such file") {
        $clientsConf = docker exec radiusnexus-radius find / -name "clients.conf" -type f 2>&1
        Write-Host "  [INFO] clients.conf locations: $clientsConf" -ForegroundColor Yellow
    }
    
    $clientsStr = $clientsConf -join "`n"
    Check "clients.conf has mikrotik entry (192.168.50.2)" ($clientsStr -match "192\.168\.50\.2") "Found MikroTik client"
    Check "clients.conf has docker network entry" ($clientsStr -match "172\." -or $clientsStr -match "dockernet") "Docker NAT covered"
    
    Write-Host "`n  Current clients.conf:" -ForegroundColor DarkGray
    $clientsConf | ForEach-Object { Write-Host "    $_" -ForegroundColor DarkGray }
} else {
    Write-Host "  [SKIP] FreeRADIUS not running, cannot check clients.conf" -ForegroundColor Yellow
}

# =============================================================================
Write-Header "5. DATABASE - NAS DEVICES"
# =============================================================================
$nasDevices = docker exec radiusnexus-db psql -U radiusnexus -d radiusnexus -t -c "SELECT name, ip_address, type, secret FROM nas_devices;" 2>&1
$nasStr = ($nasDevices -join "`n")
Write-Host "  NAS Devices in DB:" -ForegroundColor DarkGray
$nasDevices | ForEach-Object { if ($_.Trim()) { Write-Host "    $_" -ForegroundColor DarkGray } }
Check "NAS device with IP 192.168.50.2 exists" ($nasStr -match "192\.168\.50\.2")

# =============================================================================
Write-Header "6. DATABASE - TEST SUBSCRIBER"
# =============================================================================
$subInfo = docker exec radiusnexus-db psql -U radiusnexus -d radiusnexus -x -t -c "SELECT username, status, enabled, plan_id FROM subscribers WHERE username = 'testuser';" 2>&1
$subStr = ($subInfo -join " ")
Check "Subscriber 'testuser' exists" ($subStr -match "testuser")
Check "Subscriber is active" ($subStr -match "active")
Check "Subscriber is enabled" ($subStr -match "enabled.*t")
Check "Subscriber has plan assigned" ($subStr -match "plan_id.*[0-9a-f]")

# =============================================================================
Write-Header "7. API ENDPOINT TEST"
# =============================================================================
try {
    $health = Invoke-WebRequest -Uri "http://localhost:3000/api/health/services" -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
    Check "API health endpoint responds" ($health.StatusCode -eq 200) "Status: $($health.StatusCode)"
} catch {
    Check "API health endpoint responds" $false "Error: $_"
}

# Test authorize via API
try {
    $authBody = '{"username":"testuser","password":"test123","nas_ip":"192.168.50.2","nas_port":"1","calling_station":"AA:BB:CC:DD:EE:FF"}'
    $authResp = Invoke-WebRequest -Uri "http://localhost:3000/api/radius/authorize" -Method POST -ContentType "application/json" -Body $authBody -UseBasicParsing -TimeoutSec 5
    $authJson = $authResp.Content | ConvertFrom-Json
    Check "API authorize returns 200" ($authResp.StatusCode -eq 200) "Status: $($authResp.StatusCode)"
    Check "Reply contains Mikrotik-Rate-Limit" ($authJson.'Mikrotik-Rate-Limit' -ne $null) "Value: $($authJson.'Mikrotik-Rate-Limit')"
    Check "Reply contains Acct-Interim-Interval" ($authJson.'Acct-Interim-Interval' -ne $null) "Value: $($authJson.'Acct-Interim-Interval')"
} catch {
    $errStatus = $_.Exception.Response.StatusCode.value__
    Check "API authorize returns 200" $false "Got HTTP $errStatus - $_"
}

# =============================================================================
Write-Header "8. FREERADIUS INTERNAL radtest"
# =============================================================================
if ($radiusRunning) {
    $radtest = docker exec radiusnexus-radius radtest testuser test123 127.0.0.1 0 testing123 2>&1
    $radtestStr = $radtest -join "`n"
    Check "radtest (internal) returns Access-Accept" ($radtestStr -match "Access-Accept") "$radtestStr"
} else {
    Write-Host "  [SKIP] FreeRADIUS not running" -ForegroundColor Yellow
}

# =============================================================================
Write-Header "9. NETWORK CONNECTIVITY TO MIKROTIK"
# =============================================================================
$pingResult = ping 192.168.50.2 -n 2 -w 1000 2>&1
$pingStr = $pingResult -join " "
Check "Can ping MikroTik (192.168.50.2)" ($pingStr -match "Reply from 192.168.50.2")

# =============================================================================
Write-Header "10. FREERADIUS RECENT ERRORS"
# =============================================================================
if ($radiusRunning) {
    $recentLogs = docker logs radiusnexus-radius --tail 20 2>&1
    $errors = $recentLogs | Where-Object { $_ -match "Error|error|unknown client|reject|failed" }
    if ($errors) {
        Write-Host "  Recent FreeRADIUS errors:" -ForegroundColor Yellow
        $errors | ForEach-Object { Write-Host "    $_" -ForegroundColor Yellow }
    } else {
        Write-Host "  [OK]   No recent errors in FreeRADIUS logs" -ForegroundColor Green
    }
} else {
    Write-Host "  [SKIP] FreeRADIUS not running" -ForegroundColor Yellow
}

# =============================================================================
Write-Header "SUMMARY"
# =============================================================================
Write-Host ""
Write-Host "  Checks PASSED : $pass" -ForegroundColor Green
if ($fail -gt 0) { Write-Host "  Checks FAILED : $fail" -ForegroundColor Red }
else { Write-Host "  Checks FAILED : $fail" -ForegroundColor Green }
if ($fixed -gt 0) { Write-Host "  Auto-FIXED    : $fixed" -ForegroundColor Yellow }
Write-Host ""

if ($fail -gt 0) {
    Write-Host "  REMAINING ISSUES - Manual steps needed:" -ForegroundColor Red
    Write-Host ""
    Write-Host "  1. If FreeRADIUS is still down:" -ForegroundColor White
    Write-Host "     docker compose up -d freeradius" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  2. If firewall rules are missing (run as Admin):" -ForegroundColor White
    Write-Host '     netsh advfirewall firewall add rule name="FreeRADIUS Auth" dir=in action=allow protocol=UDP localport=1812' -ForegroundColor Cyan
    Write-Host '     netsh advfirewall firewall add rule name="FreeRADIUS Acct" dir=in action=allow protocol=UDP localport=1813' -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  3. If clients.conf is stale, restart FreeRADIUS:" -ForegroundColor White
    Write-Host "     docker restart radiusnexus-radius" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  4. On MikroTik - verify RADIUS secret matches:" -ForegroundColor White
    Write-Host "     /radius set 0 secret=testing" -ForegroundColor Cyan
    Write-Host ""
} else {
    Write-Host "  All checks PASSED! RADIUS should be reachable from MikroTik." -ForegroundColor Green
}
