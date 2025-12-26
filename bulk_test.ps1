#
# Dialogflow CX Bulk Test PowerShell Script
# Replaces the web-based bulk test feature with a command-line tool
#
# Usage:
#   .\bulk_test.ps1 -InputCsv <input.csv> [-OutputCsv <output.csv>]
#
# CSV Format Options:
#   Option 1 (Multi-Column): conversation_id, turn1, turn2, turn3, ...
#   Option 2 (Row-per-Turn): conversation_id, user_input
#
# Required Environment Variables (or set in .env file):
#   GOOGLE_CLOUD_PROJECT_ID
#   DIALOGFLOW_LOCATION
#   DIALOGFLOW_AGENT_ID
#   GOOGLE_APPLICATION_CREDENTIALS (path to service account JSON)
#

param(
    [Parameter(Mandatory=$true)]
    [string]$InputCsv,
    
    [Parameter(Mandatory=$false)]
    [string]$OutputCsv = "results_$(Get-Date -Format 'yyyyMMdd_HHmmss').csv",
    
    [Parameter(Mandatory=$false)]
    [int]$MaxConcurrency = 5
)

# ============================================================================
# CONFIGURATION
# ============================================================================

# Load .env file if exists
function Load-EnvFile {
    $envFile = ".env"
    if (Test-Path $envFile) {
        Get-Content $envFile | ForEach-Object {
            if ($_ -match '^\s*([^#][^=]+)=(.*)$') {
                $name = $matches[1].Trim()
                $value = $matches[2].Trim()
                [Environment]::SetEnvironmentVariable($name, $value, "Process")
            }
        }
        Write-Host "[INFO] Loaded environment from .env file" -ForegroundColor Blue
    }
}

Load-EnvFile

# Configuration from environment
$script:ProjectId = $env:GOOGLE_CLOUD_PROJECT_ID
$script:Location = if ($env:DIALOGFLOW_LOCATION) { $env:DIALOGFLOW_LOCATION } else { "global" }
$script:AgentId = $env:DIALOGFLOW_AGENT_ID
$script:CredentialsFile = $env:GOOGLE_APPLICATION_CREDENTIALS
$script:TimeoutMs = if ($env:TEST_TIMEOUT_MS) { [int]$env:TEST_TIMEOUT_MS } else { 30000 }

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

function Write-Info { param($Message) Write-Host "[INFO] $Message" -ForegroundColor Blue }
function Write-Success { param($Message) Write-Host "[SUCCESS] $Message" -ForegroundColor Green }
function Write-Warning { param($Message) Write-Host "[WARNING] $Message" -ForegroundColor Yellow }
function Write-Error { param($Message) Write-Host "[ERROR] $Message" -ForegroundColor Red }
function Write-Progress-Custom { param($Message) Write-Host "[PROGRESS] $Message" -ForegroundColor Cyan -NoNewline }

function Show-Usage {
    Write-Host ""
    Write-Host "Usage: .\bulk_test.ps1 -InputCsv <input.csv> [-OutputCsv <output.csv>]"
    Write-Host ""
    Write-Host "Parameters:"
    Write-Host "  -InputCsv    Path to input CSV file with test conversations"
    Write-Host "  -OutputCsv   Path to output CSV file (default: results_<timestamp>.csv)"
    Write-Host ""
    Write-Host "CSV Format Options:"
    Write-Host "  Option 1 (Multi-Column):"
    Write-Host "    conversation_id, turn1, turn2, turn3"
    Write-Host "    test_conv_1, Hello, I want to book, From NY"
    Write-Host ""
    Write-Host "  Option 2 (Row-per-Turn):"
    Write-Host "    conversation_id, user_input"
    Write-Host "    test_conv_1, Hello"
    Write-Host "    test_conv_1, I want to book"
    Write-Host ""
    Write-Host "Environment Variables:"
    Write-Host "  GOOGLE_CLOUD_PROJECT_ID    - GCP Project ID"
    Write-Host "  DIALOGFLOW_LOCATION        - Dialogflow location (default: global)"
    Write-Host "  DIALOGFLOW_AGENT_ID        - Dialogflow CX Agent ID"
    Write-Host "  GOOGLE_APPLICATION_CREDENTIALS - Path to service account JSON"
    Write-Host ""
}

function Validate-Config {
    $errors = 0

    if ([string]::IsNullOrEmpty($script:ProjectId)) {
        Write-Error "GOOGLE_CLOUD_PROJECT_ID is not set"
        $errors++
    }

    if ([string]::IsNullOrEmpty($script:AgentId)) {
        Write-Error "DIALOGFLOW_AGENT_ID is not set"
        $errors++
    }

    if ([string]::IsNullOrEmpty($script:CredentialsFile)) {
        Write-Error "GOOGLE_APPLICATION_CREDENTIALS is not set"
        $errors++
    }
    elseif (-not (Test-Path $script:CredentialsFile)) {
        Write-Error "Credentials file not found: $($script:CredentialsFile)"
        $errors++
    }

    # Check if gcloud is installed
    try {
        $null = Get-Command gcloud -ErrorAction Stop
    }
    catch {
        Write-Error "gcloud CLI is not installed. Please install Google Cloud SDK."
        $errors++
    }

    if ($errors -gt 0) {
        exit 1
    }
}

# ============================================================================
# AUTHENTICATION
# ============================================================================

function Get-AccessToken {
    try {
        # Activate service account if credentials file exists
        if ($script:CredentialsFile -and (Test-Path $script:CredentialsFile)) {
            $null = gcloud auth activate-service-account --key-file="$($script:CredentialsFile)" --quiet 2>$null
        }
        
        $token = gcloud auth print-access-token 2>$null
        return $token.Trim()
    }
    catch {
        Write-Error "Failed to get access token: $_"
        return $null
    }
}

# ============================================================================
# DIALOGFLOW CX API FUNCTIONS
# ============================================================================

function Invoke-DetectIntent {
    param(
        [string]$SessionId,
        [string]$Text,
        [string]$AccessToken
    )

    $sessionPath = "projects/$($script:ProjectId)/locations/$($script:Location)/agents/$($script:AgentId)/sessions/$SessionId"
    $apiUrl = "https://$($script:Location)-dialogflow.googleapis.com/v3/${sessionPath}:detectIntent"

    $requestBody = @{
        queryInput = @{
            text = @{
                text = $Text
            }
            languageCode = "en"
        }
    } | ConvertTo-Json -Depth 10

    try {
        $headers = @{
            "Authorization" = "Bearer $AccessToken"
            "Content-Type" = "application/json"
        }

        $response = Invoke-RestMethod -Uri $apiUrl -Method Post -Headers $headers -Body $requestBody -TimeoutSec ($script:TimeoutMs / 1000)
        return $response
    }
    catch {
        return @{
            error = @{
                message = $_.Exception.Message
            }
        }
    }
}

function Parse-DialogflowResponse {
    param($Response)

    $result = @{
        ResponseText = ""
        Intent = "N/A"
        Confidence = 0
        Page = "N/A"
        Error = ""
    }

    try {
        # Check for error
        if ($Response.error) {
            $result.Error = $Response.error.message
            return $result
        }

        # Extract response text
        $responseMessages = $Response.queryResult.responseMessages
        if ($responseMessages) {
            $texts = @()
            foreach ($msg in $responseMessages) {
                if ($msg.text -and $msg.text.text) {
                    $texts += $msg.text.text
                }
            }
            $result.ResponseText = ($texts -join " ").Trim()
        }

        # Extract intent
        if ($Response.queryResult.match.intent.displayName) {
            $result.Intent = $Response.queryResult.match.intent.displayName
        }

        # Extract confidence
        if ($Response.queryResult.match.confidence) {
            $result.Confidence = $Response.queryResult.match.confidence
        }

        # Extract current page
        if ($Response.queryResult.currentPage.displayName) {
            $result.Page = $Response.queryResult.currentPage.displayName
        }
    }
    catch {
        $result.Error = "Parse error: $_"
    }

    return $result
}

# ============================================================================
# CSV PROCESSING
# ============================================================================

function Detect-CsvFormat {
    param([string]$CsvFile)

    $header = Get-Content $CsvFile -First 1
    $columns = $header -split ','
    $colCount = $columns.Count

    # Check if it's multi-column format
    if ($colCount -gt 2) {
        return "multi_column"
    }
    elseif ($header -match "user_input|input|query|message") {
        return "row_per_turn"
    }
    else {
        return "multi_column"
    }
}

function Parse-MultiColumnCsv {
    param([string]$CsvFile)

    $conversations = @()
    $csvData = Import-Csv $CsvFile

    foreach ($row in $csvData) {
        $properties = $row.PSObject.Properties
        $propArray = @($properties)
        
        if ($propArray.Count -eq 0) { continue }

        $convId = $propArray[0].Value
        if ([string]::IsNullOrEmpty($convId)) { continue }

        $turnNum = 1
        for ($i = 1; $i -lt $propArray.Count; $i++) {
            $turnText = $propArray[$i].Value
            if (-not [string]::IsNullOrEmpty($turnText)) {
                $conversations += @{
                    ConversationId = $convId
                    TurnNumber = $turnNum
                    UserInput = $turnText.Trim()
                }
                $turnNum++
            }
        }
    }

    return $conversations
}

function Parse-RowPerTurnCsv {
    param([string]$CsvFile)

    $conversations = @()
    $turnCounts = @{}
    $csvData = Import-Csv $CsvFile

    foreach ($row in $csvData) {
        $convId = $row.conversation_id
        if ([string]::IsNullOrEmpty($convId)) {
            $convId = $row.PSObject.Properties[0].Value
        }

        $userInput = $row.user_input
        if ([string]::IsNullOrEmpty($userInput)) {
            $userInput = $row.PSObject.Properties[1].Value
        }

        if (-not [string]::IsNullOrEmpty($convId) -and -not [string]::IsNullOrEmpty($userInput)) {
            if (-not $turnCounts.ContainsKey($convId)) {
                $turnCounts[$convId] = 1
            }

            $conversations += @{
                ConversationId = $convId
                TurnNumber = $turnCounts[$convId]
                UserInput = $userInput.Trim()
            }

            $turnCounts[$convId]++
        }
    }

    return $conversations
}

# ============================================================================
# MAIN EXECUTION
# ============================================================================

function Run-BulkTest {
    param(
        [string]$InputFile,
        [string]$OutputFile
    )

    # Validate input file
    if (-not (Test-Path $InputFile)) {
        Write-Error "Input file not found: $InputFile"
        exit 1
    }

    Write-Host ""
    Write-Host "============================================" -ForegroundColor Cyan
    Write-Host "   Dialogflow CX Bulk Test PowerShell      " -ForegroundColor Cyan
    Write-Host "============================================" -ForegroundColor Cyan
    Write-Host ""

    Write-Info "Starting bulk test simulation..."
    Write-Info "Input file: $InputFile"
    Write-Info "Output file: $OutputFile"
    Write-Info "Project: $($script:ProjectId)"
    Write-Info "Agent: $($script:AgentId)"
    Write-Info "Location: $($script:Location)"
    Write-Host ""

    # Get access token
    Write-Info "Authenticating with Google Cloud..."
    $accessToken = Get-AccessToken
    if ([string]::IsNullOrEmpty($accessToken)) {
        Write-Error "Failed to get access token"
        exit 1
    }
    Write-Success "Authentication successful"

    # Detect CSV format
    $csvFormat = Detect-CsvFormat -CsvFile $InputFile
    Write-Info "Detected CSV format: $csvFormat"

    # Parse CSV
    if ($csvFormat -eq "multi_column") {
        $conversations = Parse-MultiColumnCsv -CsvFile $InputFile
    }
    else {
        $conversations = Parse-RowPerTurnCsv -CsvFile $InputFile
    }

    $totalTurns = $conversations.Count
    $uniqueConvs = ($conversations | Select-Object -ExpandProperty ConversationId -Unique).Count

    Write-Info "Found $uniqueConvs conversations with $totalTurns total turns"
    Write-Host ""

    # Initialize results
    $results = @()
    $currentConv = ""
    $sessionId = ""
    $processed = 0
    $passed = 0
    $failed = 0

    # Process each turn
    foreach ($turn in $conversations) {
        # Start new session for new conversation
        if ($turn.ConversationId -ne $currentConv) {
            $currentConv = $turn.ConversationId
            $sessionId = "bulk-test-$(Get-Date -Format 'yyyyMMddHHmmss')-$(Get-Random)"
            Write-Host ""
            Write-Info "Processing conversation: $currentConv"
        }

        # Call Dialogflow API
        $response = Invoke-DetectIntent -SessionId $sessionId -Text $turn.UserInput -AccessToken $accessToken
        $parsed = Parse-DialogflowResponse -Response $response

        # Get timestamp
        $timestamp = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")

        # Create result object
        $result = [PSCustomObject]@{
            conversationId = $turn.ConversationId
            turnNumber = $turn.TurnNumber
            userInput = $turn.UserInput
            agentResponse = $parsed.ResponseText
            intent = $parsed.Intent
            confidence = $parsed.Confidence
            page = $parsed.Page
            error = $parsed.Error
            timestamp = $timestamp
        }

        $results += $result
        $processed++

        # Track pass/fail
        if ([string]::IsNullOrEmpty($parsed.Error)) {
            $passed++
        }
        else {
            $failed++
        }

        # Show progress
        $percent = [math]::Round(($processed / $totalTurns) * 100)
        Write-Host "`r[PROGRESS] Processed: $processed/$totalTurns turns ($percent%)  " -ForegroundColor Cyan -NoNewline
    }

    Write-Host ""
    Write-Host ""

    # Export results to CSV
    $results | Export-Csv -Path $OutputFile -NoTypeInformation -Encoding UTF8

    # Summary
    Write-Success "Bulk test completed!"
    Write-Host ""
    Write-Host "============================================" -ForegroundColor Cyan
    Write-Host "                 SUMMARY                    " -ForegroundColor Cyan
    Write-Host "============================================" -ForegroundColor Cyan
    Write-Host "Total Conversations: " -NoNewline; Write-Host "$uniqueConvs" -ForegroundColor Cyan
    Write-Host "Total Turns:         " -NoNewline; Write-Host "$totalTurns" -ForegroundColor Cyan
    Write-Host "Passed:              " -NoNewline; Write-Host "$passed" -ForegroundColor Green
    Write-Host "Failed:              " -NoNewline; Write-Host "$failed" -ForegroundColor Red
    Write-Host "Output File:         " -NoNewline; Write-Host "$OutputFile" -ForegroundColor Yellow
    Write-Host "============================================" -ForegroundColor Cyan
}

# ============================================================================
# ENTRY POINT
# ============================================================================

# Validate configuration
Validate-Config

# Run bulk test
Run-BulkTest -InputFile $InputCsv -OutputFile $OutputCsv
