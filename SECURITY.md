# Security Policy & Secret Management

## 🚨 **CRITICAL: Never Commit Secrets**

**DO NOT commit the following to git:**
- API keys (Stripe, Google, etc.)
- OAuth client secrets
- Private keys
- Database credentials
- Webhook signing secrets
- Service account credentials
- Any sensitive configuration values

## ✅ **Best Practices**

### 1. **Use Environment Variables**
Always use environment variables for sensitive data:
```bash
# ✅ Good
STRIPE_SECRET_KEY=${STRIPE_SECRET_KEY}

# ❌ Bad
STRIPE_SECRET_KEY=sk_test_1234567890
```

### 2. **Use .env.example Files**
Create `.env.example` files with placeholder values:
```bash
# .env.example
STRIPE_SECRET_KEY=sk_test_YOUR_KEY_HERE
GOOGLE_CLIENT_ID=YOUR_CLIENT_ID_HERE
```

### 3. **Use Secret Management Services**
- **Railway**: Use Railway's environment variables
- **Vercel**: Use Vercel's environment variables
- **GitHub Secrets**: For CI/CD pipelines

### 4. **Credentials Directory**
The `backend/credentials/` directory is gitignored. Use it for local development only:
- Never commit actual credential files
- Use `.example` files as templates
- Keep real credentials in environment variables

## 🔒 **If Secrets Are Leaked**

If secrets are accidentally committed:

1. **Immediately revoke/regenerate the leaked secrets**
   - Stripe: Regenerate API keys in Stripe Dashboard
   - Google: Regenerate OAuth credentials in Google Cloud Console
   - Other services: Follow their security procedures

2. **Remove from git history** (if possible):
   ```bash
   git filter-branch --force --index-filter \
     "git rm --cached --ignore-unmatch path/to/file" \
     --prune-empty --tag-name-filter cat -- --all
   ```

3. **Update all environment variables** in production services

4. **Monitor for unauthorized access** to affected services

## 📋 **Files That Should Never Contain Secrets**

- `*.md` files (documentation)
- `*.sh` scripts
- `*.py` test files
- `*.json` credential files (use `.example` instead)
- `.env` files (use `.env.example` instead)
- Configuration files in repository root

## 🔍 **Checking for Secrets**

Before committing, check for common secret patterns:
```bash
# Check for Stripe keys
grep -r "sk_test_\|sk_live_\|whsec_" --exclude-dir=node_modules --exclude-dir=venv

# Check for Google credentials
grep -r "GOCSPX-\|AIzaSy" --exclude-dir=node_modules --exclude-dir=venv

# Check for private keys
grep -r "BEGIN PRIVATE KEY\|BEGIN RSA PRIVATE KEY" --exclude-dir=node_modules --exclude-dir=venv
```

## 📚 **Resources**

- [GitHub Secret Scanning](https://docs.github.com/en/code-security/secret-scanning)
- [OWASP Secret Management](https://owasp.org/www-community/vulnerabilities/Use_of_hard-coded_cryptographic_key)
- [12 Factor App: Config](https://12factor.net/config)


