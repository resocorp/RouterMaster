# ============================================================
# Test Script: Add User (Subscriber) Functionality
# ============================================================
# This script tests creating subscribers via the API with
# various scenarios to confirm correct behavior.
# 
# Prerequisites:
#   - Backend running on localhost:3000
#   - Valid admin credentials (default: admin / admin123)
# ============================================================

$API_BASE = "http://localhost:3000"
$ADMIN_USER = "admin"
$ADMIN_PASS = "admin123"

$passed = 0
$failed = 0
$total = 0

function Write-TestResult {
    param([string]$Name, [bool]$Success, [string]$Detail = "")
    $script:total++
    if ($Success) {
        $script:passed++
        Write-Host "  PASS: $Name" -ForegroundColor Green
    } else {
        $script:failed++
        Write-Host "  FAIL: $Name" -ForegroundColor Red
        if ($Detail) { Write-Host "        $Detail" -ForegroundColor Yellow }
    }
}

function Invoke-Api {
    param(
        [string]$Method,
        [string]$Path,
        [hashtable]$Body = @{},
        [string]$Token = ""
    )
    $headers = @{ "Content-Type" = "application/json" }
    if ($Token) { $headers["Authorization"] = "Bearer $Token" }

    $params = @{
        Method  = $Method
        Uri     = "$API_BASE$Path"
        Headers = $headers
        ErrorAction = "Stop"
    }
    if ($Method -ne "GET" -and $Body.Count -gt 0) {
        $params["Body"] = ($Body | ConvertTo-Json -Depth 5)
    }

    try {
        $response = Invoke-RestMethod @params
        return @{ Success = $true; Data = $response; StatusCode = 200 }
    } catch {
        $status = 0
        $msg = $_.Exception.Message
        $body = $null
        if ($_.Exception.Response) {
            $status = [int]$_.Exception.Response.StatusCode
            try {
                $reader = [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream())
                $body = $reader.ReadToEnd() | ConvertFrom-Json
                $reader.Close()
            } catch {}
        }
        return @{ Success = $false; StatusCode = $status; Message = $msg; Body = $body }
    }
}

# ============================================================
Write-Host "`n=== STEP 1: Authenticate as Admin ===" -ForegroundColor Cyan
# ============================================================

$loginResult = Invoke-Api -Method "POST" -Path "/auth/login/admin" -Body @{
    username = $ADMIN_USER
    password = $ADMIN_PASS
}

if (-not $loginResult.Success) {
    Write-Host "FATAL: Cannot login as admin. Aborting." -ForegroundColor Red
    Write-Host "  Error: $($loginResult.Message)" -ForegroundColor Yellow
    exit 1
}

$TOKEN = $loginResult.Data.access_token
Write-Host "  Authenticated successfully. Token obtained." -ForegroundColor Green

# ============================================================
Write-Host "`n=== STEP 2: Get available service plans ===" -ForegroundColor Cyan
# ============================================================

$plansResult = Invoke-Api -Method "GET" -Path "/service-plans" -Token $TOKEN
$planId = $null
$planName = "N/A"

if ($plansResult.Success -and $plansResult.Data.Count -gt 0) {
    $planId = $plansResult.Data[0].id
    $planName = $plansResult.Data[0].name
    Write-Host "  Found plan: '$planName' (ID: $planId)" -ForegroundColor Green
} else {
    Write-Host "  No service plans found. Plan-related tests will be skipped." -ForegroundColor Yellow
}

# ============================================================
Write-Host "`n=== STEP 3: Run Tests ===" -ForegroundColor Cyan
# ============================================================

# --- Test 1: Create subscriber with only username + password ---
Write-Host "`n--- Test 1: Minimal subscriber (username + password only) ---"

$ts = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
$testUser1 = "testuser_$ts"

$result = Invoke-Api -Method "POST" -Path "/subscribers" -Token $TOKEN -Body @{
    username    = $testUser1
    password    = "test1234"
    accountType = "regular"
}

Write-TestResult -Name "Create minimal subscriber" -Success $result.Success -Detail ($result.Message)

if ($result.Success) {
    $sub1Id = $result.Data.id
    Write-TestResult -Name "Returns a UUID id" -Success ($sub1Id -match "^[0-9a-f\-]{36}$")
    Write-TestResult -Name "Username matches" -Success ($result.Data.username -eq $testUser1)
    Write-TestResult -Name "passwordPlain is stored" -Success ($result.Data.passwordPlain -eq "test1234")
    Write-TestResult -Name "passwordHash is plaintext (no bcrypt)" -Success ($result.Data.passwordHash -eq "test1234")
    Write-TestResult -Name "Status defaults to active" -Success ($result.Data.status -eq "active")
    Write-TestResult -Name "Enabled defaults to true" -Success ($result.Data.enabled -eq $true)
}

# --- Test 2: Create subscriber with service plan ---
Write-Host "`n--- Test 2: Subscriber with service plan ---"

if ($planId) {
    $testUser2 = "testplan_$ts"
    $result = Invoke-Api -Method "POST" -Path "/subscribers" -Token $TOKEN -Body @{
        username    = $testUser2
        password    = "plan1234"
        accountType = "regular"
        planId      = $planId
    }

    Write-TestResult -Name "Create subscriber with plan" -Success $result.Success -Detail ($result.Message)

    if ($result.Success) {
        $sub2Id = $result.Data.id
        Write-TestResult -Name "Plan ID is set" -Success ($result.Data.planId -eq $planId)
        Write-TestResult -Name "passwordPlain stored" -Success ($result.Data.passwordPlain -eq "plan1234")
    }
} else {
    Write-Host "  SKIP: No plans available" -ForegroundColor Yellow
}

# --- Test 3: Duplicate username should fail ---
Write-Host "`n--- Test 3: Duplicate username rejection ---"

$result = Invoke-Api -Method "POST" -Path "/subscribers" -Token $TOKEN -Body @{
    username    = $testUser1
    password    = "dupe1234"
    accountType = "regular"
}

Write-TestResult -Name "Duplicate username returns error" -Success (-not $result.Success)
Write-TestResult -Name "Error status is 409 Conflict" -Success ($result.StatusCode -eq 409) -Detail "Got status: $($result.StatusCode)"

# --- Test 4: Password too short should fail ---
Write-Host "`n--- Test 4: Password validation (too short) ---"

$testUser4 = "testshort_$ts"
$result = Invoke-Api -Method "POST" -Path "/subscribers" -Token $TOKEN -Body @{
    username    = $testUser4
    password    = "ab"
    accountType = "regular"
}

Write-TestResult -Name "Short password rejected by backend" -Success (-not $result.Success) -Detail "Status: $($result.StatusCode)"

# --- Test 5: Fetch subscriber and verify password is readable ---
Write-Host "`n--- Test 5: Fetch subscriber - password visible ---"

if ($sub1Id) {
    $result = Invoke-Api -Method "GET" -Path "/subscribers/$sub1Id" -Token $TOKEN

    Write-TestResult -Name "GET subscriber succeeds" -Success $result.Success -Detail ($result.Message)

    if ($result.Success) {
        Write-TestResult -Name "passwordPlain is returned in GET" -Success ($result.Data.passwordPlain -eq "test1234")
        Write-TestResult -Name "Password is readable (not hashed)" -Success ($result.Data.passwordPlain -eq "test1234" -and $result.Data.passwordPlain -notmatch '^\$2[aby]?\$')
    }
}

# --- Test 6: Update password and verify it's stored as plaintext ---
Write-Host "`n--- Test 6: Update password ---"

if ($sub1Id) {
    $result = Invoke-Api -Method "PUT" -Path "/subscribers/$sub1Id" -Token $TOKEN -Body @{
        password = "updated9999"
    }

    Write-TestResult -Name "Update password succeeds" -Success $result.Success -Detail ($result.Message)

    if ($result.Success) {
        Write-TestResult -Name "Updated passwordPlain is plaintext" -Success ($result.Data.passwordPlain -eq "updated9999")
        Write-TestResult -Name "Updated passwordHash is plaintext" -Success ($result.Data.passwordHash -eq "updated9999")
    }
}

# --- Test 7: Empty planId/managerId/groupId should not cause UUID error ---
Write-Host "`n--- Test 7: Empty optional UUID fields handled ---"

$testUser7 = "testempty_$ts"
$result = Invoke-Api -Method "POST" -Path "/subscribers" -Token $TOKEN -Body @{
    username    = $testUser7
    password    = "empty1234"
    accountType = "regular"
}

Write-TestResult -Name "Create without planId/managerId/groupId" -Success $result.Success -Detail ($result.Message)

if ($result.Success) {
    $sub7Id = $result.Data.id
    Write-TestResult -Name "planId is null" -Success ($null -eq $result.Data.planId)
    Write-TestResult -Name "managerId is null" -Success ($null -eq $result.Data.managerId)
    Write-TestResult -Name "groupId is null" -Success ($null -eq $result.Data.groupId)
}

# ============================================================
Write-Host "`n=== STEP 4: Cleanup - Delete test subscribers ===" -ForegroundColor Cyan
# ============================================================

$deleteIds = @($sub1Id, $sub2Id, $sub7Id) | Where-Object { $_ }
foreach ($did in $deleteIds) {
    $result = Invoke-Api -Method "DELETE" -Path "/subscribers/$did" -Token $TOKEN
    if ($result.Success) {
        Write-Host "  Deleted: $did" -ForegroundColor DarkGray
    } else {
        Write-Host "  Failed to delete: $did ($($result.Message))" -ForegroundColor Yellow
    }
}

# ============================================================
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  RESULTS: $passed/$total passed, $failed failed" -ForegroundColor $(if ($failed -eq 0) { "Green" } else { "Red" })
Write-Host "========================================`n" -ForegroundColor Cyan

if ($failed -gt 0) { exit 1 }
