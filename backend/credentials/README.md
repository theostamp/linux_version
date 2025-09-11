# Google Document AI Credentials

This directory should contain your Google Cloud service account credentials.

## Setup Instructions

1. **Create a Google Cloud Project**
   - Go to [Google Cloud Console](https://console.cloud.google.com)
   - Create a new project or select an existing one

2. **Enable Document AI API**
   - Navigate to APIs & Services > Library
   - Search for "Document AI API"
   - Click Enable

3. **Create a Document AI Processor**
   - Go to Document AI in the console
   - Create a new processor (choose "Invoice Parser" or "Form Parser")
   - Note the Processor ID

4. **Create Service Account**
   - Go to IAM & Admin > Service Accounts
   - Create a new service account
   - Grant role: "Document AI API User"
   - Create and download JSON key

5. **Place Credentials**
   - Rename the downloaded JSON file to `google-document-ai-credentials.json`
   - Place it in this directory (`backend/credentials/`)

6. **Update Environment Variables**
   Add to your `.env` file:
   ```
   GOOGLE_CLOUD_PROJECT_ID=your-project-id
   GOOGLE_CLOUD_LOCATION=us  # or eu
   GOOGLE_DOCUMENT_AI_PROCESSOR_ID=your-processor-id
   ```

## Security Note

⚠️ **NEVER commit credentials to git!**

The `.gitignore` file already excludes this directory, but always verify:
- Check that `*.json` files in this directory are not tracked
- Use `git status` before committing
- Store production credentials securely (e.g., environment variables, secret management service)

## Testing Without Real Credentials

The system includes a fallback mode that works without Google credentials:
- Documents will be processed with mock data
- Useful for development and testing
- To enable: Leave the environment variables empty