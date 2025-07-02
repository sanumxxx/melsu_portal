
# Базовые auth endpoints
@app.post("/auth/send-verification-code")
async def send_verification_code(request: dict):
    # Простая заглушка для отправки кода
    email = request.get("email", "")
    code = "123456"  # Тестовый код
    return {"message": f"Код отправлен на {email}", "code": code}

@app.post("/auth/verify-code")
async def verify_code(request: dict):
    # Простая заглушка для проверки кода
    return {"message": "Код подтвержден", "success": True}
