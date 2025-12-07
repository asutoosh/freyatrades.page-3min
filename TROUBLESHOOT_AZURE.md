# 🔧 Troubleshooting Azure App Service

## Step 1: Check App Status

1. Go to **Azure Portal** → **freyatrades** App Service
2. Check the **Overview** page
3. Verify **Status** shows "Running"

## Step 2: Check Logs

### Option A: Log Stream (Real-time)
1. Click **Monitoring** → **Log stream**
2. You'll see live logs
3. Look for errors (red text)

### Option B: Application Logs
1. Click **Monitoring** → **Logs**
2. Enable **Application Logging** if not enabled
3. Click **Application Logs** → View logs

### Option C: Using Azure CLI
```powershell
az webapp log tail --name freyatrades --resource-group freya_group
```

## Step 3: Common Issues

### Issue: App Not Starting
**Symptoms**: 500 error, blank page
**Fix**: 
- Check logs for startup errors
- Verify Node.js version (should be 20)
- Check if all environment variables are set

### Issue: Database Connection
**Symptoms**: Connection timeout, database errors
**Fix**:
- Verify `AZURE_COSMOS_CONNECTIONSTRING` is correct
- Check Cosmos DB firewall allows Azure services
- Verify database name

### Issue: Missing Environment Variables
**Symptoms**: App crashes, "undefined" errors
**Fix**:
- Go to **Configuration** → **Application settings**
- Ensure all required variables are set
- Click **Save** and **Restart**

### Issue: Build Failed
**Symptoms**: Deployment succeeded but app won't start
**Fix**:
- Check **Deployment Center** → **Logs**
- Verify build completed successfully

## Step 4: Restart App Service

1. Go to **freyatrades** App Service
2. Click **Restart** button (top toolbar)
3. Wait 1-2 minutes
4. Try accessing site again

## Step 5: Check Application Insights (if enabled)

1. Click **Monitoring** → **Application Insights**
2. Check for exceptions/errors
3. View request telemetry

---

## Quick Diagnostic Commands

If you have Azure CLI:

```powershell
# Check app status
az webapp show --name freyatrades --resource-group freya_group --query state

# Restart app
az webapp restart --name freyatrades --resource-group freya_group

# View recent logs
az webapp log download --name freyatrades --resource-group freya_group --log-file logs.zip
```

---

**Please share:**
1. What error message do you see? (screenshot if possible)
2. What do the Azure logs show?
3. Is the app status "Running"?

