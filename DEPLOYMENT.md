# Deployment Guide

## Railway Deployment

This application is designed to be deployed on Railway with secure environment variable management.

### Required Environment Variables

For production deployment, you **must** set the following environment variables in your Railway dashboard:

#### Admin Credentials

- `ADMIN_USERNAME` - The username for the admin account
  - Example: `admin` or `root`
  - Required in production

- `ADMIN_PASSWORD` - The password for the admin account
  - **Must meet security requirements:**
    - At least 8 characters long
    - Contains at least one uppercase letter
    - Contains at least one lowercase letter
    - Contains at least one number
    - Contains at least one special character
  - Example: `MySecureP@ssw0rd`
  - Required in production

#### Database Configuration

Railway automatically provides the `DATABASE_URL` environment variable when you provision a PostgreSQL database. No manual configuration needed.

### Setting Environment Variables on Railway

1. Go to your Railway project dashboard
2. Click on your service/deployment
3. Navigate to the **Variables** tab
4. Click **+ New Variable**
5. Add each required variable:
   - Variable name: `ADMIN_USERNAME`
   - Value: Your chosen admin username
   - Click **Add**
   
6. Repeat for `ADMIN_PASSWORD`:
   - Variable name: `ADMIN_PASSWORD`
   - Value: Your secure admin password
   - Click **Add**

7. Your application will automatically restart with the new environment variables

### Deployment Steps

1. **Connect Your Repository**
   - Link your GitHub repository to Railway
   - Railway will automatically detect the Node.js application

2. **Provision PostgreSQL Database**
   - Add a PostgreSQL database from the Railway dashboard
   - Railway will automatically set the `DATABASE_URL` environment variable

3. **Set Environment Variables**
   - Follow the steps above to set `ADMIN_USERNAME` and `ADMIN_PASSWORD`

4. **Deploy**
   - Railway will automatically build and deploy your application
   - The database schema will be pushed automatically on startup

5. **Access Your Application**
   - Railway will provide a public URL for your application
   - Navigate to `/login` to access the admin panel
   - Use your configured credentials to log in

### Local Development

For local development, the application uses default credentials:
- Username: `admin`
- Password: `061167@abcdeF1`

You can override these by creating a `.env` file:

```env
ADMIN_USERNAME=your_username
ADMIN_PASSWORD=your_password
```

**Note:** The `.env` file is ignored by git and should never be committed to your repository.

### Security Notes

- **Never commit credentials** to your repository
- **Always use environment variables** for sensitive configuration
- **Use strong passwords** that meet the security requirements
- In production, the application will **fail to start** if `ADMIN_USERNAME` or `ADMIN_PASSWORD` are not set
- Password validation is enforced:
  - Development: Warns about weak passwords but allows them
  - Production: Throws an error and prevents startup if password is weak

### Troubleshooting

#### "Authentication failed - invalid password" on Railway

This error occurs when the password hash on Railway doesn't match your current credentials. To fix:

1. Set the `ADMIN_PASSWORD` environment variable in Railway
2. Redeploy your application
3. Try logging in again with the new credentials

#### Application Won't Start in Production

Check the Railway logs for errors. Common issues:

- Missing `ADMIN_USERNAME` or `ADMIN_PASSWORD` environment variables
- Password doesn't meet security requirements
- Database connection issues

#### Password Requirements Not Met

If you see this error, ensure your password has:
- At least 8 characters
- One uppercase letter (A-Z)
- One lowercase letter (a-z)
- One number (0-9)
- One special character (!@#$%^&*, etc.)

Example valid passwords:
- `SecureP@ss123`
- `Railway2024!`
- `MyApp#2024`

## Other Deployment Platforms

The same environment variable configuration applies to other platforms:

### Vercel
Set environment variables in Project Settings → Environment Variables

### Heroku
Use `heroku config:set ADMIN_USERNAME=your_username ADMIN_PASSWORD=your_password`

### Render
Set environment variables in the service's Environment tab

### Docker
Pass environment variables using `-e` flag or docker-compose.yml:
```yaml
environment:
  - ADMIN_USERNAME=your_username
  - ADMIN_PASSWORD=your_password
```
