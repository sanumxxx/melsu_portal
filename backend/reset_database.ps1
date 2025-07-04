# MELSU Portal - Database Reset Script (PowerShell)
# Author: Sasha Honcharov (sanumxxx@yandex.ru)

Write-Host "Database Reset for MELSU Portal" -ForegroundColor Blue
Write-Host "===============================" -ForegroundColor Blue
Write-Host ""

# Check if we're in the correct directory
if (!(Test-Path "alembic.ini")) {
    Write-Host "ERROR: alembic.ini not found. Make sure you're in the backend directory" -ForegroundColor Red
    exit 1
}

# Load environment variables
if (Test-Path "../.env") {
    Get-Content "../.env" | ForEach-Object {
        if ($_ -match "^([^#].*)=(.*)$") {
            [System.Environment]::SetEnvironmentVariable($matches[1], $matches[2])
        }
    }
    Write-Host "Environment variables loaded" -ForegroundColor Green
} else {
    Write-Host "WARNING: .env file not found, using defaults" -ForegroundColor Yellow
}

# Get database connection parameters
$DB_HOST = if ($env:DB_HOST) { $env:DB_HOST } else { "localhost" }
$DB_PORT = if ($env:DB_PORT) { $env:DB_PORT } else { "5432" }
$DB_NAME = if ($env:DB_NAME) { $env:DB_NAME } else { "melsu_db" }
$DB_USER = if ($env:DB_USER) { $env:DB_USER } else { "melsu_user" }

Write-Host "Connection parameters:" -ForegroundColor Blue
Write-Host "   Database: $DB_NAME" -ForegroundColor White
Write-Host "   User: $DB_USER" -ForegroundColor White  
Write-Host "   Host: $DB_HOST`:$DB_PORT" -ForegroundColor White
Write-Host ""

# Confirmation
Write-Host "WARNING: All data in the database will be deleted!" -ForegroundColor Yellow
$confirmation = Read-Host "Continue? (y/N)"
if (($confirmation -ne "y") -and ($confirmation -ne "Y")) {
    Write-Host "Operation cancelled" -ForegroundColor Blue
    exit 0
}

Write-Host "Starting database reset..." -ForegroundColor Blue

# Drop all tables
Write-Host "Dropping all tables..." -ForegroundColor Yellow
$dropTablesScript = @"
DO `$`$ DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
    END LOOP;
END `$`$;
"@

try {
    & psql -U $DB_USER -h $DB_HOST -d $DB_NAME -c $dropTablesScript 2>$null
    Write-Host "All tables dropped" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Failed to drop tables" -ForegroundColor Red
    exit 1
}

# Clear migration history
Write-Host "Clearing migration history..." -ForegroundColor Yellow
try {
    & psql -U $DB_USER -h $DB_HOST -d $DB_NAME -c "DROP TABLE IF EXISTS alembic_version CASCADE;" 2>$null
} catch {
    # Ignore errors, table might not exist
}

# Create all tables
Write-Host "Creating tables..." -ForegroundColor Yellow
try {
    if (Test-Path "venv\Scripts\alembic.exe") {
        & .\venv\Scripts\alembic.exe upgrade head
    } else {
        & alembic upgrade head
    }
    Write-Host "Tables created" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Failed to create tables" -ForegroundColor Red
    exit 1
}

# Initialize base data
Write-Host "Initializing base data..." -ForegroundColor Yellow
try {
    $startupCommand = "from app.startup import startup_application; startup_application()"
    if (Test-Path "venv\Scripts\python.exe") {
        & .\venv\Scripts\python.exe -c $startupCommand
    } else {
        & python -c $startupCommand
    }
    Write-Host "Base data initialized" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Failed to initialize data" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Database successfully reset and initialized!" -ForegroundColor Green
Write-Host "What was done:" -ForegroundColor Blue
Write-Host "   - Dropped all tables" -ForegroundColor White
Write-Host "   - Cleared migration history" -ForegroundColor White
Write-Host "   - Created new tables" -ForegroundColor White
Write-Host "   - Initialized system roles" -ForegroundColor White
Write-Host "   - Initialized field types" -ForegroundColor White
Write-Host "   - Initialized base departments" -ForegroundColor White
Write-Host "   - Created department assignment request template" -ForegroundColor White
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "   1. Create admin: python scripts/create_admin.py" -ForegroundColor White
Write-Host "   2. Add faculties and departments via admin panel" -ForegroundColor White
Write-Host "   3. Configure users and roles" -ForegroundColor White
Write-Host "" 