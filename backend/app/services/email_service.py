import smtplib
import ssl
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional
from ..core.config import settings

class EmailService:
    """Сервис для отправки email-сообщений через MELSU почту"""
    
    def __init__(self):
        self.smtp_server = settings.MAIL_SERVER
        self.smtp_port = settings.MAIL_PORT
        self.username = settings.MAIL_USERNAME
        self.password = settings.MAIL_PASSWORD
        self.from_email = settings.MAIL_FROM
        self.from_name = settings.MAIL_FROM_NAME
        
    def _create_verification_email_body(self, code: str, user_name: str = None) -> tuple[str, str]:
        """Создает HTML и текстовое содержимое письма с кодом подтверждения"""
        
        user_greeting = f"Здравствуйте, {user_name}!" if user_name else "Здравствуйте!"
        
        # HTML версия
        html_body = f"""
        <!DOCTYPE html>
        <html lang="ru">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Код подтверждения - МелГУ</title>
            <style>
                body {{
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    line-height: 1.6;
                    color: #333;
                    max-width: 600px;
                    margin: 0 auto;
                    padding: 20px;
                    background-color: #f8f9fa;
                }}
                .container {{
                    background-color: white;
                    padding: 30px;
                    border-radius: 10px;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                }}
                .header {{
                    text-align: center;
                    border-bottom: 3px solid #dc2626;
                    padding-bottom: 20px;
                    margin-bottom: 30px;
                }}
                .logo {{
                    font-size: 24px;
                    font-weight: bold;
                    color: #dc2626;
                    margin-bottom: 10px;
                }}
                .code-container {{
                    background: linear-gradient(135deg, #dc2626, #ef4444);
                    color: white;
                    padding: 20px;
                    border-radius: 8px;
                    text-align: center;
                    margin: 25px 0;
                }}
                .verification-code {{
                    font-size: 36px;
                    font-weight: bold;
                    letter-spacing: 8px;
                    margin: 10px 0;
                    font-family: 'Courier New', monospace;
                }}
                .warning {{
                    background-color: #fff3cd;
                    border: 1px solid #ffeaa7;
                    color: #856404;
                    padding: 15px;
                    border-radius: 5px;
                    margin: 20px 0;
                }}
                .footer {{
                    text-align: center;
                    margin-top: 30px;
                    padding-top: 20px;
                    border-top: 1px solid #eee;
                    color: #666;
                    font-size: 14px;
                }}
                .support-info {{
                    background-color: #f8f9fa;
                    padding: 15px;
                    border-radius: 5px;
                    margin: 20px 0;
                    font-size: 14px;
                }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <div class="logo">МелГУ</div>
                    <div>Мурманский арктический государственный университет</div>
                </div>
                
                <h1 style="color: #dc2626; text-align: center;">Код подтверждения</h1>
                
                <p>{user_greeting}</p>
                
                <p>Для завершения регистрации в системе МелГУ используйте следующий код подтверждения:</p>
                
                <div class="code-container">
                    <div>Ваш код подтверждения:</div>
                    <div class="verification-code">{code}</div>
                </div>
                
                <div class="warning">
                    <strong>⚠ Важно:</strong>
                    <ul style="margin: 10px 0; padding-left: 20px;">
                        <li>Код действителен в течение 10 минут</li>
                        <li>Не передавайте код третьим лицам</li>
                        <li>Если вы не запрашивали этот код, проигнорируйте письмо</li>
                    </ul>
                </div>
                
                <div class="support-info">
                    <strong>Техническая поддержка:</strong><br>
                    Email: {settings.MAIL_FROM}<br>
                    Система: Портал МелГУ
                </div>
                
                <div class="footer">
                    <p>Это автоматическое сообщение, не отвечайте на него.</p>
                    <p>&copy; 2025 Мурманский арктический государственный университет</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        # Текстовая версия
        text_body = f"""
МелГУ - Код подтверждения

{user_greeting}

Для завершения регистрации в системе МелГУ используйте следующий код подтверждения:

КОД: {code}

ВАЖНО:
- Код действителен в течение 10 минут
- Не передавайте код третьим лицам
- Если вы не запрашивали этот код, проигнорируйте письмо

Техническая поддержка: {settings.MAIL_FROM}

Это автоматическое сообщение, не отвечайте на него.
© 2025 Мурманский арктический государственный университет
        """
        
        return html_body, text_body
    
    def send_verification_code(self, to_email: str, code: str, user_name: str = None) -> bool:
        """Отправляет код подтверждения на email"""
        try:
            # Создаем содержимое письма
            html_body, text_body = self._create_verification_email_body(code, user_name)
            
            # Создаем сообщение
            message = MIMEMultipart("alternative")
            message["Subject"] = f"Код подтверждения МелГУ: {code}"
            message["From"] = f"{self.from_name} <{self.from_email}>"
            message["To"] = to_email
            
            # Добавляем текстовую и HTML части
            text_part = MIMEText(text_body, "plain", "utf-8")
            html_part = MIMEText(html_body, "html", "utf-8")
            
            message.attach(text_part)
            message.attach(html_part)
            
            # Отправляем через SMTP с STARTTLS
            context = ssl.create_default_context()
            
            with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
                server.starttls(context=context)  # Включаем STARTTLS
                server.login(self.username, self.password)
                text = message.as_string()
                server.sendmail(self.from_email, to_email, text)
            
            print(f"[EMAIL] Verification code sent successfully to {to_email}")
            return True
            
        except Exception as e:
            print(f"[EMAIL ERROR] Failed to send verification code to {to_email}: {str(e)}")
            return False
    
    def send_password_reset_code(self, to_email: str, code: str, user_name: str = None) -> bool:
        """Отправляет код для сброса пароля"""
        try:
            user_greeting = f"Здравствуйте, {user_name}!" if user_name else "Здравствуйте!"
            
            html_body = f"""
            <!DOCTYPE html>
            <html lang="ru">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Сброс пароля - МелГУ</title>
                <style>
                    body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa; }}
                    .container {{ background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }}
                    .header {{ text-align: center; border-bottom: 3px solid #dc2626; padding-bottom: 20px; margin-bottom: 30px; }}
                    .logo {{ font-size: 24px; font-weight: bold; color: #dc2626; margin-bottom: 10px; }}
                    .code-container {{ background: linear-gradient(135deg, #dc2626, #ef4444); color: white; padding: 20px; border-radius: 8px; text-align: center; margin: 25px 0; }}
                    .verification-code {{ font-size: 36px; font-weight: bold; letter-spacing: 8px; margin: 10px 0; font-family: 'Courier New', monospace; }}
                    .warning {{ background-color: #fff3cd; border: 1px solid #ffeaa7; color: #856404; padding: 15px; border-radius: 5px; margin: 20px 0; }}
                    .footer {{ text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 14px; }}
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <div class="logo">МелГУ</div>
                        <div>Мурманский арктический государственный университет</div>
                    </div>
                    <h1 style="color: #dc2626; text-align: center;">Сброс пароля</h1>
                    <p>{user_greeting}</p>
                    <p>Для сброса пароля в системе МелГУ используйте следующий код:</p>
                    <div class="code-container">
                        <div>Код для сброса пароля:</div>
                        <div class="verification-code">{code}</div>
                    </div>
                    <div class="warning">
                        <strong>⚠ Важно:</strong>
                        <ul style="margin: 10px 0; padding-left: 20px;">
                            <li>Код действителен в течение 10 минут</li>
                            <li>Если вы не запрашивали сброс пароля, проигнорируйте письмо</li>
                        </ul>
                    </div>
                    <div class="footer">
                        <p>Техническая поддержка: {self.from_email}</p>
                        <p>&copy; 2025 Мурманский арктический государственный университет</p>
                    </div>
                </div>
            </body>
            </html>
            """
            
            message = MIMEMultipart("alternative")
            message["Subject"] = f"Сброс пароля МелГУ: {code}"
            message["From"] = f"{self.from_name} <{self.from_email}>"
            message["To"] = to_email
            
            html_part = MIMEText(html_body, "html", "utf-8")
            message.attach(html_part)
            
            context = ssl.create_default_context()
            
            with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
                server.starttls(context=context)
                server.login(self.username, self.password)
                text = message.as_string()
                server.sendmail(self.from_email, to_email, text)
            
            print(f"[EMAIL] Password reset code sent successfully to {to_email}")
            return True
            
        except Exception as e:
            print(f"[EMAIL ERROR] Failed to send password reset code to {to_email}: {str(e)}")
            return False

# Создаем глобальный экземпляр сервиса
email_service = EmailService() 