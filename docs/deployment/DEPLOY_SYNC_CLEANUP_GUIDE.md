# Deploy Sync - Cleanup & Maintenance Guide

## After PR Merge

Once the Pull Request is merged to `main`, follow these cleanup steps:

## Step 1: Update Vercel/Railway to Main Branch

### Vercel
1. Go to Vercel Dashboard → Project Settings → Git
2. Set **Production Branch** to `main` (if not already)
3. Verify that preview branches include `main`
4. Trigger a new deployment from `main` branch

### Railway
1. Railway should automatically deploy from `main` branch
2. Verify deployment completed successfully
3. Check logs for any errors

## Step 2: Verify Production Deployment

1. **Check Vercel Production URL**
   - Open production URL
   - Verify app loads correctly
   - Test API calls

2. **Check Railway Backend**
   - Verify backend is receiving requests
   - Check logs for errors
   - Verify CORS/CSRF settings are correct

## Step 3: Clean Up Branch

### Local Cleanup
```bash
# Switch to main branch
git checkout main

# Pull latest changes
git pull origin main

# Delete local deploy-sync branch
git branch -d deploy-sync
```

### Remote Cleanup
```bash
# Delete remote deploy-sync branch
git push origin --delete deploy-sync
```

**Note**: Only delete the branch after confirming:
- ✅ PR is merged
- ✅ Production deployment is working
- ✅ No issues reported

## Step 4: Clean Up Backup Files

### Stash Cleanup
```bash
# List stashes
git stash list

# If backup stash is no longer needed, delete it
git stash drop stash@{0}  # Replace with correct stash index
```

### Temporary Files Cleanup
```bash
# Remove backup diff files
rm /tmp/deploy-sync-diff-backup-*.txt

# Remove backup directory (if created)
rm -rf /tmp/deploy-sync-backup
```

## Step 5: Update Documentation

If needed, update:
- Main deployment documentation
- Environment setup guides
- Any references to old proxy configuration

## Step 6: Monitor Production

After cleanup, monitor production for:
- ✅ No increase in errors
- ✅ API calls working correctly
- ✅ Proxy routing functioning properly
- ✅ No performance degradation

## Rollback Plan (If Needed)

If issues arise after merge:

1. **Revert the Merge**
   ```bash
   git checkout main
   git revert -m 1 <merge-commit-hash>
   git push origin main
   ```

2. **Or Create Hotfix Branch**
   ```bash
   git checkout -b hotfix/proxy-fix main
   # Make fixes
   git commit -m "Fix: Proxy configuration issue"
   git push origin hotfix/proxy-fix
   # Create PR and merge
   ```

## Verification Checklist

- [ ] PR merged to `main`
- [ ] Vercel production deployment successful
- [ ] Railway backend working correctly
- [ ] All tests passing
- [ ] No errors in production logs
- [ ] Local `deploy-sync` branch deleted
- [ ] Remote `deploy-sync` branch deleted
- [ ] Backup files cleaned up
- [ ] Documentation updated (if needed)

## Notes

- Keep backup files until production is stable (at least 24-48 hours)
- Monitor production closely after merge
- Be ready to rollback if critical issues arise
- Document any issues encountered for future reference



