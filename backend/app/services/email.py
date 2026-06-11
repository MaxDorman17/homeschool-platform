"""Email service for sending password resets and username reminders."""
from datetime import datetime, timedelta
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.config import get_settings

settings = get_settings()


def send_reset_email(recipient_email: str, reset_url: str, username: str) -> bool:
    """
    Send a password reset or username reminder email.
    In production, configure SMTP settings. For now, logs to file (debug mode).
    """
    if settings.DEBUG:
        # Debug mode: save to file instead of sending email
        os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
        log_path = os.path.join(settings.UPLOAD_DIR, "emails.log")
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        
        email_content = f"""
Email sent: {timestamp}
To: {recipient_email}
From: homeschool@{settings.APP_NAME.lower().replace(' ', '')}.com
Subject: Password Reset - {settings.APP_NAME}

Hello {username},

You requested to reset your password or retrieve your username.

Click this link to reset your password:
{reset_url}

This link expires in 15 minutes.

If you didn't request this, please ignore this email.

Best regards,
{settings.APP_NAME} Team
        """
        
        with open(log_path, "a") as f:
            f.write(email_content + "\n" + "="*50 + "\n\n")
        
        print(f"Email logged to {log_path}")
        return True
    
    # Production: send via SMTP
    try:
        msg = MIMEMultipart()
        msg["From"] = settings.EMAIL_FROM
        msg["To"] = recipient_email
        msg["Subject"] = f"Password Reset - {settings.APP_NAME}"
        
        html_body = f"""
        <html>
        <body>
            <h2>📚 {settings.APP_NAME}</h2>
            <p>Hello {username},</p>
            <p>You requested to reset your password or retrieve your username.</p>
            <p>Click the link below to reset your password:</p>
            <p><a href="{reset_url}" style="background: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset Password</a></p>
            <p>This link expires in 15 minutes.</p>
            <p>If you didn't request this, please ignore this email.</p>
            <p>Best regards,<br>{settings.APP_NAME} Team</p>
        </body>
        </html>
        """
        
        msg.attach(MIMEText(html_body, "html"))
        
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            server.starttls()
            server.login(settings.EMAIL_USERNAME, settings.EMAIL_PASSWORD)
            server.send_message(msg)
        
        return True
    except Exception as e:
        print(f"Email send failed: {str(e)}")
        return False
