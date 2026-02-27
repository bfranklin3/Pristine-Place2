# Email Setup Guide

The "Report an Issue" form uses email to route issue reports to the appropriate committees. This guide explains how to set up email functionality.

## Current Setup: Nodemailer

The system is currently configured to use Nodemailer with SMTP. This works with any email provider (Gmail, Outlook, Yahoo, custom SMTP, etc.).

### Step 1: Configure Environment Variables

1. Copy the example file:
   ```bash
   cp .env.local.example .env.local
   ```

2. Edit `.env.local` and add your email credentials

### Step 2: Gmail Setup (Recommended for Testing)

If using Gmail:

1. **Enable 2-Factor Authentication** on your Google account
   - Go to https://myaccount.google.com/security
   - Enable 2-Step Verification

2. **Generate an App Password**
   - Go to https://myaccount.google.com/apppasswords
   - Select "Mail" and your device
   - Copy the 16-character password

3. **Update .env.local**:
   ```env
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=abcd efgh ijkl mnop  # Your 16-char app password (remove spaces)
   EMAIL_FROM=noreply@pristineplace.us
   ```

### Step 3: Test the Form

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Navigate to http://localhost:3000/resident-portal/report-issue

3. Submit a test issue report

4. Check the recipient email inbox

## Updating Email Recipients

Email routing is configured in [`lib/email/routing-config.ts`](lib/email/routing-config.ts).

To change who receives emails for a specific category:

```typescript
{
  id: "landscaping",
  label: "Common Area Landscaping",
  description: "Dead plants, irrigation issues, or grounds maintenance concerns",
  icon: "Trees",
  primaryRecipient: "landscaping@pristineplace.us", // Change this
  ccRecipients: ["bod@pristineplace.us"],           // Optional CC
  needsLocation: true,
}
```

## Switching to Resend (Optional)

If you prefer to use Resend (a modern, developer-friendly email service):

### 1. Install Resend
```bash
npm install resend
```

### 2. Get API Key
- Sign up at https://resend.com
- Create an API key
- Add to `.env.local`:
  ```env
  RESEND_API_KEY=re_...
  ```

### 3. Update Email Service
Edit [`lib/email/service.ts`](lib/email/service.ts):
- Comment out the Nodemailer implementation
- Uncomment the Resend implementation at the bottom of the file

### 4. Verify Domain (Production)
For production, verify your sending domain in Resend's dashboard.

## Production Deployment

### Option A: Using Gmail SMTP (Simple)
- Use a dedicated Gmail account for sending
- Add environment variables to your hosting provider (Vercel, etc.)

### Option B: Using Custom SMTP
- Configure your domain's SMTP server details
- Update `.env.local` with your SMTP credentials

### Option C: Using Resend (Recommended for Production)
- Professional email delivery
- Better deliverability
- Email analytics
- Simple integration

## Troubleshooting

### "Invalid login" error
- Double-check your email and password
- For Gmail, ensure you're using an App Password, not your regular password
- Verify 2FA is enabled on your Google account

### Emails not arriving
- Check spam/junk folders
- Verify `EMAIL_FROM` is a valid email address
- For Gmail, the `EMAIL_FROM` can be different from `EMAIL_USER`

### "Connection timeout" error
- Check `EMAIL_HOST` and `EMAIL_PORT` are correct
- Verify your firewall isn't blocking outgoing SMTP connections
- Try port 465 (SSL) instead of 587 (TLS)

### Testing locally
- Use a service like Mailtrap.io for testing emails without sending real emails
- Configure Mailtrap SMTP credentials in `.env.local`

## Email Service File Structure

```
lib/email/
├── routing-config.ts    # Email routing rules (who gets what)
├── service.ts           # Email sending abstraction layer

app/actions/
├── report-issue.ts      # Server action that sends emails

app/(portal)/resident-portal/report-issue/
└── page.tsx             # The issue report form
```

## Security Notes

- **Never commit `.env.local`** to version control (it's in .gitignore)
- Use App Passwords for Gmail, not your account password
- Rotate email credentials periodically
- For production, use environment variables in your hosting platform
