# Privacy Notice - CES TestSuiteAgent

## Overview

CES TestSuiteAgent is a testing platform for Dialogflow CX conversational AI agents. This document describes how we handle data.

## Data We Collect

### Test Data
- **Conversation logs**: User inputs and agent responses during testing
- **Test results**: Pass/fail status, execution times, intent matching
- **Agent configurations**: Project IDs, agent IDs, locations (no credentials stored)

### Responsible AI Test Data
- **Adversarial prompts**: Test prompts used for safety testing
- **Safety analysis**: Vulnerability scores, safety assessments
- **AI-generated analysis**: Gemini AI evaluations of agent responses

## Data Storage

- All data is stored locally in SQLite database (`./data/database.sqlite`)
- Uploaded CSV files are retained for 1 hour for retry capability, then deleted
- No data is transmitted to external services except:
  - **Google Dialogflow CX**: For agent testing
  - **Google Gemini AI**: For safety analysis

## Data Retention

- Test results and conversation logs are stored indefinitely by default
- To delete data, remove the SQLite database file
- Uploaded files are automatically cleaned after 1 hour

## Third-Party Services

| Service | Purpose | Data Sent |
|---------|---------|-----------|
| Dialogflow CX | Agent testing | Test inputs, session IDs |
| Google Gemini AI | Safety analysis | Prompts and responses for evaluation |

## Your Rights

- **Access**: View all stored data via the application UI
- **Deletion**: Delete the SQLite database to remove all data
- **Export**: Download test results as CSV from the application

## Security Measures

- Rate limiting (100 requests per 15 minutes)
- Input validation on all API endpoints
- Error message sanitization
- Parameterized database queries

## Contact

For questions about data handling, please open an issue on the project repository.

---

*Last updated: February 2026*
