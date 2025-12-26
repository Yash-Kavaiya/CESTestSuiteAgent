# Dialogflow CX Bulk Test CLI

Command-line tools to run bulk conversation tests against your Dialogflow CX agent without using the web interface.

## Prerequisites

1. **Google Cloud SDK** - Install from https://cloud.google.com/sdk/docs/install
2. **Service Account** - A GCP service account with Dialogflow API access
3. **For Bash script**: `jq` for JSON processing (`apt install jq` or `brew install jq`)

## Setup

1. Copy your service account JSON file to the project directory
2. Configure environment variables in `.env`:

```env
GOOGLE_CLOUD_PROJECT_ID=your-project-id
DIALOGFLOW_LOCATION=global
DIALOGFLOW_AGENT_ID=your-agent-id
GOOGLE_APPLICATION_CREDENTIALS=./your-service-account.json
```

## Usage

### PowerShell (Windows)

```powershell
# Basic usage
.\bulk_test.ps1 -InputCsv input.csv

# With custom output file
.\bulk_test.ps1 -InputCsv input.csv -OutputCsv results.csv
```

### Bash (Linux/Mac/WSL)

```bash
# Make executable
chmod +x bulk_test.sh

# Basic usage
./bulk_test.sh input.csv

# With custom output file
./bulk_test.sh input.csv results.csv
```

## CSV Input Formats

### Option 1: Multi-Column (Recommended)

Each row is one conversation. First column is the ID, subsequent columns are turns.

```csv
conversation_id,turn1,turn2,turn3
test_greeting,Hello,How are you,Goodbye
test_booking,I want to book,From NYC,Tomorrow
```

### Option 2: Row-per-Turn

One turn per row. Conversations are grouped by ID.

```csv
conversation_id,user_input
test_greeting,Hello
test_greeting,How are you
test_greeting,Goodbye
test_booking,I want to book
test_booking,From NYC
```

## Output Format

The output CSV contains:

| Column | Description |
|--------|-------------|
| conversationId | Conversation identifier |
| turnNumber | Turn sequence number |
| userInput | User's input text |
| agentResponse | Agent's response |
| intent | Matched intent name |
| confidence | Intent match confidence (0-1) |
| page | Current Dialogflow page |
| error | Error message (if any) |
| timestamp | ISO timestamp |

## Example

```powershell
# Run with sample file
.\bulk_test.ps1 -InputCsv bulk_test_sample.csv -OutputCsv my_results.csv
```

Output:
```
============================================
   Dialogflow CX Bulk Test PowerShell      
============================================

[INFO] Starting bulk test simulation...
[INFO] Input file: bulk_test_sample.csv
[INFO] Output file: my_results.csv
[INFO] Project: your-project-id
[INFO] Agent: your-agent-id
[SUCCESS] Authentication successful
[INFO] Detected CSV format: multi_column
[INFO] Found 3 conversations with 9 total turns

[INFO] Processing conversation: test_greeting
[INFO] Processing conversation: test_booking
[INFO] Processing conversation: test_order
[PROGRESS] Processed: 9/9 turns (100%)

[SUCCESS] Bulk test completed!

============================================
                 SUMMARY                    
============================================
Total Conversations: 3
Total Turns:         9
Passed:              9
Failed:              0
Output File:         my_results.csv
============================================
```
