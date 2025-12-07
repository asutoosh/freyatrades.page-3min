# 🔍 How to Check Azure Logs

## Quick Steps to See Error:

1. **Go to Azure Portal**
   - https://portal.azure.com

2. **Navigate to your App Service**
   - Search for "freyatrades"
   - Click on it

3. **View Logs**
   - Click **Monitoring** → **Log stream** (real-time logs)
   - OR Click **Logs** → **App Service Logs** (recent logs)

4. **Copy any error messages** you see

---

## Alternative: Use Azure CLI

If you have Azure CLI installed:

```powershell
# Login
az login

# Stream logs
az webapp log tail --name freyatrades --resource-group freya_group
```

---

## Common Errors & Fixes:

### Error: "Cannot find module"
- **Fix**: Check if all dependencies are in package.json

### Error: "Database connection failed"
- **Fix**: Verify AZURE_COSMOS_CONNECTIONSTRING is set correctly

### Error: "500 Internal Server Error"
- **Fix**: Check application logs for specific error

### Error: "Module not found"
- **Fix**: Ensure build completed successfully

---

**Please share the error message you see in the logs!**

