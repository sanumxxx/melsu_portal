# Database and migrations reset script for MelGU (Windows)
# Author: MelGU Development Team
# Date: 2025-07-02

Write-Host "Starting full database and migrations reset for MelGU..." -ForegroundColor Cyan

# Direct database connection parameters
$DB_USER = "melsu_user"
$DB_NAME = "melsu_db"
$DB_HOST = "localhost"
$DB_PASSWORD = "MelsuPortal2024!"

Write-Host "Database connection: $DB_USER@$DB_HOST/$DB_NAME" -ForegroundColor Yellow

# Set PGPASSWORD environment variable for psql
$env:PGPASSWORD = $DB_PASSWORD

# 1. Clear database
Write-Host "Step 1: Full database cleanup..." -ForegroundColor Cyan

try {
    # Execute SQL commands via psql
    $sqlCommands = "DROP SCHEMA public CASCADE; CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO $DB_USER; GRANT ALL ON SCHEMA public TO public;"
    echo $sqlCommands | psql -U $DB_USER -h $DB_HOST -d $DB_NAME
    Write-Host "SUCCESS: Database cleared" -ForegroundColor Green
}
catch {
    Write-Host "ERROR: Failed to clear database!" -ForegroundColor Red
    Write-Host "Please execute commands manually:" -ForegroundColor Yellow
    Write-Host "   psql -U $DB_USER -h $DB_HOST -d $DB_NAME" -ForegroundColor White
    Write-Host "   DROP SCHEMA public CASCADE;" -ForegroundColor White
    Write-Host "   CREATE SCHEMA public;" -ForegroundColor White
    Write-Host "   GRANT ALL ON SCHEMA public TO $DB_USER;" -ForegroundColor White
    Write-Host "   GRANT ALL ON SCHEMA public TO public;" -ForegroundColor White
    exit 1
}

# 2. Clear migration files
Write-Host "Step 2: Clear migration files..." -ForegroundColor Cyan
Remove-Item -Path "alembic\versions\*.py" -Force -ErrorAction SilentlyContinue
Remove-Item -Path "alembic\versions\__pycache__" -Recurse -Force -ErrorAction SilentlyContinue
Write-Host "SUCCESS: Migration files deleted" -ForegroundColor Green

# 3. Create new initial migration
Write-Host "Step 3: Creating new initial migration..." -ForegroundColor Cyan
try {
    python -m alembic revision --autogenerate -m "Initial migration"
    Write-Host "SUCCESS: Initial migration created" -ForegroundColor Green
}
catch {
    Write-Host "ERROR: Failed to create migration!" -ForegroundColor Red
    Write-Host "Make sure you are in backend directory and Python is installed" -ForegroundColor Yellow
    exit 1
}

# 4. Apply migration
Write-Host "Step 4: Applying migration..." -ForegroundColor Cyan
try {
    python -m alembic upgrade head
    Write-Host "SUCCESS: Migration applied" -ForegroundColor Green
}
catch {
    Write-Host "ERROR: Failed to apply migration!" -ForegroundColor Red
    exit 1
}

# 5. Initialize initial data
Write-Host "Step 5: Initialize initial data..." -ForegroundColor Cyan
if (Test-Path "scripts\init_system_roles.py") {
    try {
        python scripts\init_system_roles.py
        Write-Host "SUCCESS: System roles initialized" -ForegroundColor Green
    }
    catch {
        Write-Host "WARNING: Error initializing system roles" -ForegroundColor Yellow
    }
} else {
    Write-Host "WARNING: Script init_system_roles.py not found" -ForegroundColor Yellow
}

# 6. Check migration status
Write-Host "Step 6: Check migration status..." -ForegroundColor Cyan
python -m alembic current

# Clean up environment variable
Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "SUCCESS: Reset completed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "   1. Start server: python run.py" -ForegroundColor White
Write-Host "   2. Check API: http://localhost:8000/docs" -ForegroundColor White
Write-Host "   3. Create administrator via API" -ForegroundColor White
Write-Host ""
Write-Host "For future model changes use:" -ForegroundColor Yellow
Write-Host "   python -m alembic revision --autogenerate -m 'Change description'" -ForegroundColor White
Write-Host "   python -m alembic upgrade head" -ForegroundColor White 