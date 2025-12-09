# Test Azure Endpoints

## Quick Tests

### 1. Test Root (should redirect)
```bash
curl https://freyatrades.azurewebsites.net/
```

### 2. Test Main Page
```bash
curl https://freyatrades.azurewebsites.net/money-glitch
```

### 3. Test API Endpoints
```bash
# Precheck API
curl https://freyatrades.azurewebsites.net/api/precheck

# Signals API
curl https://freyatrades.azurewebsites.net/api/signals
```

### 4. Check Browser Console
Open browser DevTools (F12) → Console tab
Look for JavaScript errors

