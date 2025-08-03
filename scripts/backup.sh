#!/bin/bash

# Financial Management System Backup Script
# Comprehensive backup for database, files, and configuration

set -e

# ========================================
# 🔧 Configuration
# ========================================
BACKUP_DIR="/backups"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=${BACKUP_RETENTION_DAYS:-30}
COMPRESSION="gzip"

# Database configuration
DB_HOST=${POSTGRES_HOST:-db}
DB_PORT=${POSTGRES_PORT:-5432}
DB_NAME=${POSTGRES_DB:-postgres}
DB_USER=${POSTGRES_USER:-postgres}
DB_PASSWORD=${POSTGRES_PASSWORD:-postgres}

# ========================================
# 📋 Logging Functions
# ========================================
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1"
}

error() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1" >&2
    exit 1
}

# ========================================
# 🔍 Pre-flight Checks
# ========================================
check_dependencies() {
    log "Checking dependencies..."
    
    # Check if pg_dump is available
    if ! command -v pg_dump &> /dev/null; then
        error "pg_dump is not installed"
    fi
    
    # Check if gzip is available
    if ! command -v gzip &> /dev/null; then
        error "gzip is not installed"
    fi
    
    # Check if tar is available
    if ! command -v tar &> /dev/null; then
        error "tar is not installed"
    fi
    
    log "Dependencies check passed"
}

# ========================================
# 🗄️ Database Backup
# ========================================
backup_database() {
    log "Starting database backup..."
    
    local db_backup_file="$BACKUP_DIR/database_$DATE.sql"
    local db_backup_compressed="$db_backup_file.gz"
    
    # Set PostgreSQL password
    export PGPASSWORD="$DB_PASSWORD"
    
    # Create database backup
    pg_dump \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        --verbose \
        --clean \
        --if-exists \
        --create \
        --no-owner \
        --no-privileges \
        --format=plain \
        --file="$db_backup_file"
    
    if [ $? -eq 0 ]; then
        log "Database backup completed: $db_backup_file"
        
        # Compress the backup
        gzip "$db_backup_file"
        log "Database backup compressed: $db_backup_compressed"
        
        # Verify the backup
        if gzip -t "$db_backup_compressed"; then
            log "Database backup verification passed"
        else
            error "Database backup verification failed"
        fi
    else
        error "Database backup failed"
    fi
}

# ========================================
# 📁 Files Backup
# ========================================
backup_files() {
    log "Starting files backup..."
    
    local files_backup="$BACKUP_DIR/files_$DATE.tar.gz"
    
    # Create files backup (media and static files)
    tar -czf "$files_backup" \
        -C /vol \
        media static \
        2>/dev/null || true
    
    if [ -f "$files_backup" ]; then
        log "Files backup completed: $files_backup"
        
        # Verify the backup
        if tar -tzf "$files_backup" >/dev/null 2>&1; then
            log "Files backup verification passed"
        else
            error "Files backup verification failed"
        fi
    else
        log "Warning: No files to backup or backup failed"
    fi
}

# ========================================
# ⚙️ Configuration Backup
# ========================================
backup_configuration() {
    log "Starting configuration backup..."
    
    local config_backup="$BACKUP_DIR/config_$DATE.tar.gz"
    
    # Create configuration backup
    tar -czf "$config_backup" \
        -C /app \
        new_concierge_backend/settings_prod.py \
        requirements.txt \
        entrypoint.sh \
        2>/dev/null || true
    
    if [ -f "$config_backup" ]; then
        log "Configuration backup completed: $config_backup"
        
        # Verify the backup
        if tar -tzf "$config_backup" >/dev/null 2>&1; then
            log "Configuration backup verification passed"
        else
            error "Configuration backup verification failed"
        fi
    else
        log "Warning: Configuration backup failed"
    fi
}

# ========================================
# 📊 Logs Backup
# ========================================
backup_logs() {
    log "Starting logs backup..."
    
    local logs_backup="$BACKUP_DIR/logs_$DATE.tar.gz"
    
    # Create logs backup
    tar -czf "$logs_backup" \
        -C /app/logs \
        . \
        2>/dev/null || true
    
    if [ -f "$logs_backup" ]; then
        log "Logs backup completed: $logs_backup"
        
        # Verify the backup
        if tar -tzf "$logs_backup" >/dev/null 2>&1; then
            log "Logs backup verification passed"
        else
            error "Logs backup verification failed"
        fi
    else
        log "Warning: No logs to backup or backup failed"
    fi
}

# ========================================
# 🧹 Cleanup Old Backups
# ========================================
cleanup_old_backups() {
    log "Cleaning up old backups (older than $RETENTION_DAYS days)..."
    
    local deleted_count=0
    
    # Find and delete old backup files
    find "$BACKUP_DIR" -name "*.sql.gz" -mtime +$RETENTION_DAYS -delete
    find "$BACKUP_DIR" -name "*.tar.gz" -mtime +$RETENTION_DAYS -delete
    
    deleted_count=$(find "$BACKUP_DIR" -name "*.sql.gz" -mtime +$RETENTION_DAYS | wc -l)
    deleted_count=$((deleted_count + $(find "$BACKUP_DIR" -name "*.tar.gz" -mtime +$RETENTION_DAYS | wc -l)))
    
    log "Cleaned up $deleted_count old backup files"
}

# ========================================
# 📋 Create Backup Summary
# ========================================
create_backup_summary() {
    log "Creating backup summary..."
    
    local summary_file="$BACKUP_DIR/backup_summary_$DATE.txt"
    
    cat > "$summary_file" << EOF
Financial Management System Backup Summary
==========================================
Date: $(date)
Backup ID: $DATE
Retention Days: $RETENTION_DAYS

Backup Files Created:
$(find "$BACKUP_DIR" -name "*$DATE*" -type f | sort)

Backup Statistics:
- Database: $(find "$BACKUP_DIR" -name "database_$DATE.sql.gz" -type f | wc -l) files
- Files: $(find "$BACKUP_DIR" -name "files_$DATE.tar.gz" -type f | wc -l) files
- Configuration: $(find "$BACKUP_DIR" -name "config_$DATE.tar.gz" -type f | wc -l) files
- Logs: $(find "$BACKUP_DIR" -name "logs_$DATE.tar.gz" -type f | wc -l) files

Total Backup Size:
$(du -sh "$BACKUP_DIR"/*$DATE* 2>/dev/null | awk '{sum+=$1} END {print sum " total"}')

System Information:
- Database: $DB_NAME@$DB_HOST:$DB_PORT
- Backup Directory: $BACKUP_DIR
- Compression: $COMPRESSION

EOF
    
    log "Backup summary created: $summary_file"
}

# ========================================
# 🔍 Verify Backup Integrity
# ========================================
verify_backup_integrity() {
    log "Verifying backup integrity..."
    
    local backup_files=(
        "database_$DATE.sql.gz"
        "files_$DATE.tar.gz"
        "config_$DATE.tar.gz"
        "logs_$DATE.tar.gz"
    )
    
    local failed_verifications=0
    
    for file in "${backup_files[@]}"; do
        local file_path="$BACKUP_DIR/$file"
        
        if [ -f "$file_path" ]; then
            case "$file" in
                *.sql.gz)
                    if gzip -t "$file_path" 2>/dev/null; then
                        log "✓ Database backup integrity verified"
                    else
                        error "✗ Database backup integrity check failed"
                        failed_verifications=$((failed_verifications + 1))
                    fi
                    ;;
                *.tar.gz)
                    if tar -tzf "$file_path" >/dev/null 2>&1; then
                        log "✓ Archive backup integrity verified"
                    else
                        error "✗ Archive backup integrity check failed"
                        failed_verifications=$((failed_verifications + 1))
                    fi
                    ;;
            esac
        else
            log "Warning: Backup file not found: $file"
        fi
    done
    
    if [ $failed_verifications -eq 0 ]; then
        log "All backup integrity checks passed"
    else
        error "$failed_verifications backup integrity checks failed"
    fi
}

# ========================================
# 📧 Send Backup Notification (Optional)
# ========================================
send_backup_notification() {
    if [ -n "$BACKUP_NOTIFICATION_EMAIL" ]; then
        log "Sending backup notification..."
        
        local subject="Financial System Backup - $DATE"
        local body="Backup completed successfully at $(date)
        
Backup ID: $DATE
Files created: $(find "$BACKUP_DIR" -name "*$DATE*" -type f | wc -l)
Total size: $(du -sh "$BACKUP_DIR"/*$DATE* 2>/dev/null | awk '{sum+=$1} END {print sum}')
        
Backup location: $BACKUP_DIR"
        
        echo "$body" | mail -s "$subject" "$BACKUP_NOTIFICATION_EMAIL" || \
            log "Warning: Failed to send backup notification email"
    fi
}

# ========================================
# 🚀 Main Backup Process
# ========================================
main() {
    log "Starting Financial Management System backup process..."
    
    # Create backup directory if it doesn't exist
    mkdir -p "$BACKUP_DIR"
    
    # Run pre-flight checks
    check_dependencies
    
    # Perform backups
    backup_database
    backup_files
    backup_configuration
    backup_logs
    
    # Verify backup integrity
    verify_backup_integrity
    
    # Create backup summary
    create_backup_summary
    
    # Cleanup old backups
    cleanup_old_backups
    
    # Send notification
    send_backup_notification
    
    log "Backup process completed successfully!"
    
    # List created backup files
    log "Backup files created:"
    find "$BACKUP_DIR" -name "*$DATE*" -type f -exec ls -lh {} \;
}

# ========================================
# 🎯 Script Entry Point
# ========================================
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
    main "$@"
fi 