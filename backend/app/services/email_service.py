import smtplib
import ssl
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.header import Header
from email.utils import formataddr
from typing import Optional, Tuple
import socket
import time
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
        
    def _test_dns_resolution(self, hostname: str, max_retries: int = 3) -> bool:
        """Тестирует DNS разрешение с повторными попытками"""
        for attempt in range(max_retries):
            try:
                ip_address = socket.gethostbyname(hostname)
                print(f"[EMAIL] ✅ DNS разрешение успешно: {hostname} -> {ip_address}")
                return True
            except socket.gaierror as e:
                print(f"[EMAIL] ⚠️ Попытка {attempt + 1}/{max_retries} DNS разрешения неудачна: {e}")
                if attempt < max_retries - 1:
                    time.sleep(2 ** attempt)  # Экспоненциальная задержка
                continue
        
        print(f"[EMAIL] ❌ Не удалось разрешить DNS имя {hostname} после {max_retries} попыток")
        return False
        
    def _add_anti_spam_headers(self, message: MIMEMultipart) -> None:
        """Добавляет заголовки для предотвращения попадания в спам"""
        # Основные заголовки отправителя
        message["From"] = formataddr((self.from_name, self.from_email))
        message["Reply-To"] = self.from_email
        message["Return-Path"] = self.from_email
        
        # Заголовки для аутентификации
        message["Message-ID"] = f"<{int(time.time())}.{hash(str(time.time()))}@melsu.ru>"
        message["Date"] = time.strftime("%a, %d %b %Y %H:%M:%S %z", time.localtime())
        
        # Заголовки против спама
        message["X-Mailer"] = "МелГУ Portal v1.0"
        message["X-Priority"] = "3"
        message["X-MSMail-Priority"] = "Normal"
        message["Importance"] = "Normal"
        
        # Заголовки для доставляемости
        message["MIME-Version"] = "1.0"
        message["Content-Type"] = "multipart/alternative"
        
        print(f"[EMAIL] ✅ Добавлены заголовки против спама")
        
    def _create_verification_email_body(self, code: str, user_name: str = None) -> Tuple[str, str]:
        """Создает HTML и текстовое содержимое письма с кодом подтверждения"""
        
        user_greeting = f"Здравствуйте, {user_name}!" if user_name else "Здравствуйте!"
        
        # HTML версия
        html_body = f"""<!DOCTYPE html>
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
            <div style="margin-bottom: 15px;">
                <img src="{getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')}/logo.png" 
                     alt="Логотип МелГУ" 
                     style="max-width: 150px; height: auto; display: block; margin: 0 auto; border-radius: 4px;"
                     onerror="this.style.display='none'; this.nextElementSibling.style.display='block';" />
                <div class="logo" style="display: none;">МелГУ</div>
            </div>
            <div style="font-size: 16px; color: #666;">Мелитопольский государственный университет</div>
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
            <p>&copy; 2025 Мелитопольский государственный университет</p>
        </div>
    </div>
</body>
</html>"""
        
        # Текстовая версия
        text_body = f"""МелГУ - Код подтверждения

{user_greeting}

Для завершения регистрации в системе МелГУ используйте следующий код подтверждения:

КОД: {code}

ВАЖНО:
- Код действителен в течение 10 минут
- Не передавайте код третьим лицам
- Если вы не запрашивали этот код, проигнорируйте письмо

Техническая поддержка: {settings.MAIL_FROM}

Это автоматическое сообщение, не отвечайте на него.
© 2025 Мелитопольский государственный университет"""
        
        return html_body, text_body
    
    def send_verification_code(self, to_email: str, code: str, user_name: str = None) -> bool:
        """Отправляет код подтверждения на email с улучшенной обработкой ошибок"""
        print(f"[EMAIL] 🚀 Начинаем отправку кода {code} на {to_email}")
        print(f"[EMAIL] 📋 Настройки SMTP:")
        print(f"[EMAIL]    Сервер: {self.smtp_server}")
        print(f"[EMAIL]    Порт: {self.smtp_port}")
        print(f"[EMAIL]    Пользователь: {self.username}")
        print(f"[EMAIL]    Отправитель: {self.from_name} <{self.from_email}>")
        
        # Предварительная проверка DNS
        print(f"[EMAIL] 🔍 Проверяем DNS разрешение...")
        if not self._test_dns_resolution(self.smtp_server):
            print(f"[EMAIL ERROR] ❌ DNS разрешение неудачно для {self.smtp_server}")
            return False
        
        max_retries = 3
        for attempt in range(max_retries):
            try:
                print(f"[EMAIL] 📝 Попытка {attempt + 1}/{max_retries}: Создаем содержимое письма...")
                html_body, text_body = self._create_verification_email_body(code, user_name)
                
                # Создаем сообщение
                print(f"[EMAIL] 📧 Формируем MIME сообщение...")
                message = MIMEMultipart("alternative")
                
                # Устанавливаем основные заголовки
                message["Subject"] = Header(f"Код подтверждения МелГУ: {code}", 'utf-8')
                message["To"] = to_email
                
                # Добавляем заголовки против спама
                self._add_anti_spam_headers(message)
                
                # Добавляем текстовую и HTML части
                text_part = MIMEText(text_body, "plain", "utf-8")
                html_part = MIMEText(html_body, "html", "utf-8")
                
                message.attach(text_part)
                message.attach(html_part)
                print(f"[EMAIL] ✅ MIME сообщение сформировано")
                
                # Отправляем через SMTP с STARTTLS и таймаутом
                print(f"[EMAIL] 🔗 Подключаемся к SMTP серверу {self.smtp_server}:{self.smtp_port}...")
                context = ssl.create_default_context()
                context.check_hostname = False
                context.verify_mode = ssl.CERT_NONE
                
                with smtplib.SMTP(self.smtp_server, self.smtp_port, timeout=30) as server:
                    print(f"[EMAIL] ✅ SMTP подключение установлено")
                    
                    print(f"[EMAIL] 🔐 Включаем STARTTLS...")
                    server.starttls(context=context)
                    print(f"[EMAIL] ✅ STARTTLS активирован")
                    
                    print(f"[EMAIL] 👤 Аутентификация пользователя {self.username}...")
                    server.login(self.username, self.password)
                    print(f"[EMAIL] ✅ Аутентификация успешна")
                    
                    print(f"[EMAIL] 📤 Отправляем письмо от {self.from_email} к {to_email}...")
                    text = message.as_string()
                    server.sendmail(self.from_email, to_email, text)
                    print(f"[EMAIL] ✅ Письмо отправлено успешно!")
                
                print(f"[EMAIL] 🎉 Код подтверждения успешно отправлен на {to_email}")
                return True
                
            except socket.gaierror as e:
                print(f"[EMAIL ERROR] ❌ DNS ошибка на попытке {attempt + 1}: {str(e)}")
                print(f"[EMAIL ERROR] 🐞 Тип ошибки: {type(e).__name__}")
                if attempt < max_retries - 1:
                    delay = 2 ** attempt
                    print(f"[EMAIL] ⏳ Ожидание {delay} секунд перед повторной попыткой...")
                    time.sleep(delay)
                    continue
                else:
                    print(f"[EMAIL ERROR] ❌ Все попытки исчерпаны. DNS разрешение не удалось.")
                    print(f"[EMAIL ERROR] 💡 Рекомендации:")
                    print(f"[EMAIL ERROR]    1. Проверьте интернет соединение")
                    print(f"[EMAIL ERROR]    2. Проверьте настройки DNS")
                    print(f"[EMAIL ERROR]    3. Убедитесь что {self.smtp_server} доступен")
                    return False
                    
            except smtplib.SMTPAuthenticationError as e:
                print(f"[EMAIL ERROR] ❌ Ошибка аутентификации SMTP: {str(e)}")
                print(f"[EMAIL ERROR] 🔍 Проверьте логин/пароль: {self.username}")
                return False
                
            except smtplib.SMTPConnectError as e:
                print(f"[EMAIL ERROR] ❌ Ошибка подключения к SMTP серверу на попытке {attempt + 1}: {str(e)}")
                print(f"[EMAIL ERROR] 🔍 Проверьте сервер/порт: {self.smtp_server}:{self.smtp_port}")
                if attempt < max_retries - 1:
                    delay = 2 ** attempt
                    print(f"[EMAIL] ⏳ Ожидание {delay} секунд перед повторной попыткой...")
                    time.sleep(delay)
                    continue
                else:
                    return False
                    
            except smtplib.SMTPRecipientsRefused as e:
                print(f"[EMAIL ERROR] ❌ Получатель отклонен: {str(e)}")
                print(f"[EMAIL ERROR] 🔍 Проверьте email адрес: {to_email}")
                return False
                
            except smtplib.SMTPException as e:
                print(f"[EMAIL ERROR] ❌ Общая ошибка SMTP на попытке {attempt + 1}: {str(e)}")
                if attempt < max_retries - 1:
                    delay = 2 ** attempt
                    print(f"[EMAIL] ⏳ Ожидание {delay} секунд перед повторной попыткой...")
                    time.sleep(delay)
                    continue
                else:
                    return False
                    
            except Exception as e:
                print(f"[EMAIL ERROR] ❌ Неожиданная ошибка при отправке кода на {to_email}: {str(e)}")
                print(f"[EMAIL ERROR] 🐞 Тип ошибки: {type(e).__name__}")
                if attempt < max_retries - 1:
                    delay = 2 ** attempt
                    print(f"[EMAIL] ⏳ Ожидание {delay} секунд перед повторной попыткой...")
                    time.sleep(delay)
                    continue
                else:
                    return False
        
        return False
    
    def send_password_reset_code(self, to_email: str, code: str, user_name: str = None) -> bool:
        """Отправляет код для сброса пароля"""
        try:
            user_greeting = f"Здравствуйте, {user_name}!" if user_name else "Здравствуйте!"
            
            html_body = f"""<!DOCTYPE html>
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
            <div style="margin-bottom: 15px;">
                <img src="{getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')}/logo.png" 
                     alt="Логотип МелГУ" 
                     style="max-width: 150px; height: auto; display: block; margin: 0 auto; border-radius: 4px;"
                     onerror="this.style.display='none'; this.nextElementSibling.style.display='block';" />
                <div class="logo" style="display: none;">МелГУ</div>
            </div>
            <div style="font-size: 16px; color: #666;">Мелитопольский государственный университет</div>
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
            <p>&copy; 2025 Мелитопольский государственный университет</p>
        </div>
    </div>
</body>
</html>"""
            
            message = MIMEMultipart("alternative")
            message["Subject"] = Header(f"Сброс пароля МелГУ: {code}", 'utf-8')
            message["To"] = to_email
            
            # Добавляем заголовки против спама
            self._add_anti_spam_headers(message)
            
            html_part = MIMEText(html_body, "html", "utf-8")
            message.attach(html_part)
            
            context = ssl.create_default_context()
            # Отключаем проверку SSL сертификата для серверов с самоподписанными сертификатами
            context.check_hostname = False
            context.verify_mode = ssl.CERT_NONE

            
            with smtplib.SMTP(self.smtp_server, self.smtp_port, timeout=30) as server:
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