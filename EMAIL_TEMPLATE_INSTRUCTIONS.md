# Supabase Email Templates Configuration

To set up the email template for email verification in your Supabase project, follow these instructions:

## 1. Go to Supabase Dashboard
Log in to your [Supabase Dashboard](https://supabase.com/dashboard) and navigate to your project.

## 2. Navigate to Authentication > Email Templates
From the sidebar, go to **Authentication**, then click on **Email Templates** under the Configuration section.

## 3. Configure the "Confirm signup" Template

Select the "**Confirm signup**" template and configure the following:

### Subject:
`Verify your email for exmb`

### Message Body (HTML):

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify your email</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background-color: #f4f4f5;
      color: #18181b;
      line-height: 1.5;
      margin: 0;
      padding: 0;
      -webkit-font-smoothing: antialiased;
    }
    .container {
      max-width: 600px;
      margin: 40px auto;
      background-color: #ffffff;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    }
    .header {
      background-color: #09090b;
      color: #ffffff;
      padding: 32px 40px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 600;
      letter-spacing: -0.02em;
    }
    .content {
      padding: 40px;
      text-align: center;
    }
    .content p {
      margin: 0 0 24px 0;
      font-size: 16px;
      color: #3f3f46;
    }
    .button-container {
      margin: 32px 0;
    }
    .button {
      display: inline-block;
      background-color: #09090b;
      color: #ffffff;
      text-decoration: none;
      padding: 14px 28px;
      border-radius: 8px;
      font-weight: 500;
      font-size: 16px;
      transition: background-color 0.2s;
    }
    .button:hover {
      background-color: #27272a;
    }
    .note {
      font-size: 14px;
      color: #71717a;
      margin-top: 24px;
    }
    .footer {
      background-color: #fafafa;
      padding: 24px;
      text-align: center;
      border-top: 1px solid #f4f4f5;
    }
    .footer p {
      margin: 0;
      font-size: 12px;
      color: #a1a1aa;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>exmb</h1>
    </div>
    <div class="content">
      <h2>Verify your email address</h2>
      <p>Thanks for starting your prep with us. Please verify your email address to get access to your personalized question banks and mock testing environment.</p>
      
      <div class="button-container">
        <!-- Supabase uses {{ .ConfirmationURL }} to inject the actual link -->
        <a href="{{ .ConfirmationURL }}" class="button">Verify Email</a>
      </div>
      
      <p class="note">If you didn't request this, you can safely ignore this email.</p>
    </div>
    <div class="footer">
      <p>&copy; 2024 exmb. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
```

Important: Keep `{{ .ConfirmationURL }}` in the template, as Supabase will replace this with the actual verification URL.

## 4. Ensure Site URL is Configured
Go to **Authentication > URL Configuration** and ensure your **Site URL** is set to the URL where your app is hosted, so users are redirected properly after clicking the verification link.
