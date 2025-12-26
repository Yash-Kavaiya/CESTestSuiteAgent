#!/bin/bash
#
# Dialogflow CX Bulk Test Shell Script
# Replaces the web-based bulk test feature with a command-line tool
#
# Usage:
#   ./bulk_test.sh <input_csv> [output_csv]
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
# Optional Environment Variables:
#   MAX_CONCURRENCY (default: 5)
#   TEST_TIMEOUT_MS (default: 30000)
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# ============================================================================
# CONFIGURATION
# ============================================================================

# Load .env file if exists
if [ -f ".env" ]; then
    export $(grep -v '^#' .env | xargs)
fi

# Required configuration
PROJECT_ID="${GOOGLE_CLOUD_PROJECT_ID:-}"
LOCATION="${DIALOGFLOW_LOCATION:-global}"
AGENT_ID="${DIALOGFLOW_AGENT_ID:-}"
CREDENTIALS_FILE="${GOOGLE_APPLICATION_CREDENTIALS:-}"

# Optional configuration
MAX_CONCURRENCY="${MAX_CONCURRENCY:-5}"
TIMEOUT_MS="${TEST_TIMEOUT_MS:-30000}"

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_progress() {
    echo -e "${CYAN}[PROGRESS]${NC} $1"
}

show_usage() {
    echo ""
    echo "Usage: $0 <input_csv> [output_csv]"
    echo ""
    echo "Arguments:"
    echo "  input_csv   - Path to input CSV file with test conversations"
    echo "  output_csv  - Path to output CSV file (default: results_<timestamp>.csv)"
    echo ""
    echo "CSV Format Options:"
    echo "  Option 1 (Multi-Column):"
    echo "    conversation_id, turn1, turn2, turn3"
    echo "    test_conv_1, Hello, I want to book, From NY"
    echo ""
    echo "  Option 2 (Row-per-Turn):"
    echo "    conversation_id, user_input"
    echo "    test_conv_1, Hello"
    echo "    test_conv_1, I want to book"
    echo ""
    echo "Environment Variables:"
    echo "  GOOGLE_CLOUD_PROJECT_ID    - GCP Project ID"
    echo "  DIALOGFLOW_LOCATION        - Dialogflow location (default: global)"
    echo "  DIALOGFLOW_AGENT_ID        - Dialogflow CX Agent ID"
    echo "  GOOGLE_APPLICATION_CREDENTIALS - Path to service account JSON"
    echo "  MAX_CONCURRENCY            - Max parallel conversations (default: 5)"
    echo ""
}

validate_config() {
    local errors=0

    if [ -z "$PROJECT_ID" ]; then
        log_error "GOOGLE_CLOUD_PROJECT_ID is not set"
        errors=$((errors + 1))
    fi

    if [ -z "$AGENT_ID" ]; then
        log_error "DIALOGFLOW_AGENT_ID is not set"
        errors=$((errors + 1))
    fi

    if [ -z "$CREDENTIALS_FILE" ]; then
        log_error "GOOGLE_APPLICATION_CREDENTIALS is not set"
        errors=$((errors + 1))
    elif [ ! -f "$CREDENTIALS_FILE" ]; then
        log_error "Credentials file not found: $CREDENTIALS_FILE"
        errors=$((errors + 1))
    fi

    # Check if gcloud is installed
    if ! command -v gcloud &> /dev/null; then
        log_error "gcloud CLI is not installed. Please install Google Cloud SDK."
        errors=$((errors + 1))
    fi

    # Check if jq is installed
    if ! command -v jq &> /dev/null; then
        log_error "jq is not installed. Please install jq for JSON processing."
        errors=$((errors + 1))
    fi

    if [ $errors -gt 0 ]; then
        exit 1
    fi
}

# ============================================================================
# AUTHENTICATION
# ============================================================================

get_access_token() {
    # Use service account credentials to get access token
    if [ -n "$CREDENTIALS_FILE" ] && [ -f "$CREDENTIALS_FILE" ]; then
        gcloud auth activate-service-account --key-file="$CREDENTIALS_FILE" --quiet 2>/dev/null
    fi
    gcloud auth print-access-token 2>/dev/null
}

# ============================================================================
# DIALOGFLOW CX API FUNCTIONS
# ============================================================================

detect_intent() {
    local session_id="$1"
    local text="$2"
    local access_token="$3"

    local session_path="projects/${PROJECT_ID}/locations/${LOCATION}/agents/${AGENT_ID}/sessions/${session_id}"
    local api_url="https://${LOCATION}-dialogflow.googleapis.com/v3/${session_path}:detectIntent"

    local request_body=$(cat <<EOF
{
    "queryInput": {
        "text": {
            "text": "${text}"
        },
        "languageCode": "en"
    }
}
EOF
)

    local response=$(curl -s -X POST "$api_url" \
        -H "Authorization: Bearer ${access_token}" \
        -H "Content-Type: application/json" \
        -d "$request_body" \
        --max-time $((TIMEOUT_MS / 1000)))

    echo "$response"
}

parse_response() {
    local response="$1"

    # Extract response text
    local response_text=$(echo "$response" | jq -r '
        .queryResult.responseMessages[]? | 
        select(.text != null) | 
        .text.text[]? // empty
    ' 2>/dev/null | tr '\n' ' ' | sed 's/  */ /g' | sed 's/^ *//;s/ *$//')

    # Extract intent
    local intent=$(echo "$response" | jq -r '.queryResult.match.intent.displayName // "N/A"' 2>/dev/null)

    # Extract confidence
    local confidence=$(echo "$response" | jq -r '.queryResult.match.confidence // 0' 2>/dev/null)

    # Extract current page
    local page=$(echo "$response" | jq -r '.queryResult.currentPage.displayName // "N/A"' 2>/dev/null)

    # Check for errors
    local error=$(echo "$response" | jq -r '.error.message // empty' 2>/dev/null)

    echo "${response_text}|${intent}|${confidence}|${page}|${error}"
}

# ============================================================================
# CSV PROCESSING
# ============================================================================

detect_csv_format() {
    local csv_file="$1"
    local header=$(head -1 "$csv_file")
    local col_count=$(echo "$header" | awk -F',' '{print NF}')

    # Check if it's multi-column format (more than 2 columns or specific patterns)
    if [ "$col_count" -gt 2 ]; then
        echo "multi_column"
    elif echo "$header" | grep -qi "user_input\|input\|query\|message"; then
        echo "row_per_turn"
    else
        echo "multi_column"
    fi
}

parse_multi_column_csv() {
    local csv_file="$1"
    local output_file="$2"

    # Skip header, process each row
    tail -n +2 "$csv_file" | while IFS= read -r line || [ -n "$line" ]; do
        # Parse CSV line properly (handle quoted fields)
        local conv_id=$(echo "$line" | awk -F',' '{gsub(/^"|"$/, "", $1); print $1}')
        
        # Get all turns (columns after the first)
        local turns=$(echo "$line" | awk -F',' '{
            for(i=2; i<=NF; i++) {
                gsub(/^"|"$/, "", $i);
                if($i != "") print $i
            }
        }')

        local turn_num=1
        echo "$turns" | while IFS= read -r turn_text || [ -n "$turn_text" ]; do
            if [ -n "$turn_text" ]; then
                echo "${conv_id}|${turn_num}|${turn_text}" >> "$output_file"
                turn_num=$((turn_num + 1))
            fi
        done
    done
}

parse_row_per_turn_csv() {
    local csv_file="$1"
    local output_file="$2"

    # Track turn numbers per conversation
    declare -A turn_counts

    tail -n +2 "$csv_file" | while IFS= read -r line || [ -n "$line" ]; do
        local conv_id=$(echo "$line" | awk -F',' '{gsub(/^"|"$/, "", $1); print $1}')
        local user_input=$(echo "$line" | awk -F',' '{gsub(/^"|"$/, "", $2); print $2}')

        if [ -n "$conv_id" ] && [ -n "$user_input" ]; then
            # Get current turn number for this conversation
            local turn_num=${turn_counts[$conv_id]:-1}
            echo "${conv_id}|${turn_num}|${user_input}" >> "$output_file"
            turn_counts[$conv_id]=$((turn_num + 1))
        fi
    done
}

# ============================================================================
# MAIN EXECUTION
# ============================================================================

run_bulk_test() {
    local input_csv="$1"
    local output_csv="$2"

    # Validate input file
    if [ ! -f "$input_csv" ]; then
        log_error "Input file not found: $input_csv"
        exit 1
    fi

    log_info "Starting bulk test simulation..."
    log_info "Input file: $input_csv"
    log_info "Output file: $output_csv"
    log_info "Project: $PROJECT_ID"
    log_info "Agent: $AGENT_ID"
    log_info "Location: $LOCATION"
    echo ""

    # Get access token
    log_info "Authenticating with Google Cloud..."
    local access_token=$(get_access_token)
    if [ -z "$access_token" ]; then
        log_error "Failed to get access token"
        exit 1
    fi
    log_success "Authentication successful"

    # Detect CSV format
    local csv_format=$(detect_csv_format "$input_csv")
    log_info "Detected CSV format: $csv_format"

    # Create temp file for parsed conversations
    local temp_file=$(mktemp)
    trap "rm -f $temp_file" EXIT

    # Parse CSV based on format
    if [ "$csv_format" = "multi_column" ]; then
        parse_multi_column_csv "$input_csv" "$temp_file"
    else
        parse_row_per_turn_csv "$input_csv" "$temp_file"
    fi

    # Count total turns and conversations
    local total_turns=$(wc -l < "$temp_file" | tr -d ' ')
    local unique_convs=$(cut -d'|' -f1 "$temp_file" | sort -u | wc -l | tr -d ' ')

    log_info "Found $unique_convs conversations with $total_turns total turns"
    echo ""

    # Write CSV header
    echo "conversationId,turnNumber,userInput,agentResponse,intent,confidence,page,error,timestamp" > "$output_csv"

    # Process conversations
    local current_conv=""
    local session_id=""
    local processed=0
    local passed=0
    local failed=0

    while IFS='|' read -r conv_id turn_num user_input || [ -n "$conv_id" ]; do
        # Start new session for new conversation
        if [ "$conv_id" != "$current_conv" ]; then
            current_conv="$conv_id"
            session_id="bulk-test-$(date +%s)-${RANDOM}"
            log_progress "Processing conversation: $conv_id"
        fi

        # Escape user input for JSON
        local escaped_input=$(echo "$user_input" | sed 's/\\/\\\\/g' | sed 's/"/\\"/g' | sed 's/\n/\\n/g')

        # Call Dialogflow API
        local response=$(detect_intent "$session_id" "$escaped_input" "$access_token")
        local parsed=$(parse_response "$response")

        # Parse the response
        IFS='|' read -r response_text intent confidence page error <<< "$parsed"

        # Get timestamp
        local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

        # Escape fields for CSV
        local csv_user_input=$(echo "$user_input" | sed 's/"/""/g')
        local csv_response=$(echo "$response_text" | sed 's/"/""/g')
        local csv_error=$(echo "$error" | sed 's/"/""/g')

        # Write result to CSV
        echo "\"$conv_id\",$turn_num,\"$csv_user_input\",\"$csv_response\",\"$intent\",$confidence,\"$page\",\"$csv_error\",\"$timestamp\"" >> "$output_csv"

        processed=$((processed + 1))

        # Track pass/fail
        if [ -n "$error" ]; then
            failed=$((failed + 1))
        else
            passed=$((passed + 1))
        fi

        # Show progress
        local percent=$((processed * 100 / total_turns))
        printf "\r${CYAN}[PROGRESS]${NC} Processed: %d/%d turns (%d%%)  " "$processed" "$total_turns" "$percent"

    done < "$temp_file"

    echo ""
    echo ""

    # Summary
    log_success "Bulk test completed!"
    echo ""
    echo "============================================"
    echo "                 SUMMARY                    "
    echo "============================================"
    echo -e "Total Conversations: ${CYAN}$unique_convs${NC}"
    echo -e "Total Turns:         ${CYAN}$total_turns${NC}"
    echo -e "Passed:              ${GREEN}$passed${NC}"
    echo -e "Failed:              ${RED}$failed${NC}"
    echo -e "Output File:         ${YELLOW}$output_csv${NC}"
    echo "============================================"
}

# ============================================================================
# ENTRY POINT
# ============================================================================

main() {
    echo ""
    echo "============================================"
    echo "   Dialogflow CX Bulk Test Shell Script    "
    echo "============================================"
    echo ""

    # Check arguments
    if [ $# -lt 1 ]; then
        show_usage
        exit 1
    fi

    local input_csv="$1"
    local output_csv="${2:-results_$(date +%Y%m%d_%H%M%S).csv}"

    # Validate configuration
    validate_config

    # Run bulk test
    run_bulk_test "$input_csv" "$output_csv"
}

main "$@"
