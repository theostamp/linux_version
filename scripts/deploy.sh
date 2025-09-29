#!/bin/bash

# Financial Management System Production Deployment Script
# Comprehensive deployment with safety checks and rollback capabilities

set -e

# ========================================
# 🔧 Configuration
# ========================================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
DEPLOYMENT_LOG="/tmp/deployment_$(date +%Y%m%d_%H%M%S).log"
BACKUP_BEFORE_DEPLOY=true
ROLLBACK_ON_FAILURE=true
HEALTH_CHECK_TIMEOUT=300
DEPLOYMENT_TIMEOUT=1800

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ========================================
# 📋 Logging Functions
# ========================================
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$DEPLOYMENT_LOG"
}

success() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] SUCCESS:${NC} $1" | tee -a "$DEPLOYMENT_LOG"
}

warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1" | tee -a "$DEPLOYMENT_LOG"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1" | tee -a "$DEPLOYMENT_LOG"
    exit 1
}

# ========================================
# 🔍 Pre-deployment Checks
# ========================================
pre_deployment_checks() {
    log "Running pre-deployment checks..."
    
    # Check if we're in the right directory
    if [ ! -f "$PROJECT_ROOT/docker-compose.prod.yml" ]; then
        error "Production docker-compose file not found. Are you in the correct directory?"
    fi
    
    # Check if .env.production exists
    if [ ! -f "$PROJECT_ROOT/.env.production" ]; then
        error "Production environment file (.env.production) not found"
    fi
    
    # Check Docker availability
    if ! command -v docker &> /dev/null; then
        error "Docker is not installed or not in PATH"
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        error "Docker Compose is not installed or not in PATH"
    fi
    
    # Check Docker daemon
    if ! docker info &> /dev/null; then
        error "Docker daemon is not running"
    fi
    
    # Check available disk space
    local available_space=$(df -BG . | awk 'NR==2 {print $4}' | sed 's/G//')
    if [ "$available_space" -lt 10 ]; then
        warning "Low disk space available: ${available_space}G"
    fi
    
    # Check available memory
    local available_memory=$(free -g | awk 'NR==2 {print $7}')
    if [ "$available_memory" -lt 4 ]; then
        warning "Low memory available: ${available_memory}G"
    fi
    
    success "Pre-deployment checks passed"
}

# ========================================
# 🗄️ Pre-deployment Backup
# ========================================
pre_deployment_backup() {
    if [ "$BACKUP_BEFORE_DEPLOY" = true ]; then
        log "Creating pre-deployment backup..."
        
        # Run backup script
        if docker-compose -f "$PROJECT_ROOT/docker-compose.prod.yml" run --rm backup; then
            success "Pre-deployment backup completed"
        else
            warning "Pre-deployment backup failed, but continuing with deployment"
        fi
    fi
}

# ========================================
# 🛑 Stop Current Services
# ========================================
stop_current_services() {
    log "Stopping current services..."
    
    cd "$PROJECT_ROOT"
    
    # Stop services gracefully
    if docker-compose -f docker-compose.prod.yml down --timeout 30; then
        success "Current services stopped"
    else
        warning "Some services may not have stopped gracefully"
    fi
}

# ========================================
# 🧹 Cleanup Old Images
# ========================================
cleanup_old_images() {
    log "Cleaning up old Docker images..."
    
    # Remove dangling images
    docker image prune -f
    
    # Remove unused images (older than 7 days)
    docker image prune -a --filter "until=168h" -f
    
    success "Old images cleaned up"
}

# ========================================
# 🏗️ Build New Images
# ========================================
build_new_images() {
    log "Building new Docker images..."
    
    cd "$PROJECT_ROOT"
    
    # Build backend image
    log "Building backend image..."
    if docker-compose -f docker-compose.prod.yml build backend; then
        success "Backend image built successfully"
    else
        error "Backend image build failed"
    fi
    
    # Build frontend image
    log "Building frontend image..."
    if docker-compose -f docker-compose.prod.yml build frontend; then
        success "Frontend image built successfully"
    else
        error "Frontend image build failed"
    fi
    
    success "All images built successfully"
}

# ========================================
# 🚀 Deploy Services
# ========================================
deploy_services() {
    log "Deploying services..."
    
    cd "$PROJECT_ROOT"
    
    # Start services in order
    log "Starting database and Redis..."
    if docker-compose -f docker-compose.prod.yml up -d db redis; then
        success "Database and Redis started"
    else
        error "Failed to start database and Redis"
    fi
    
    # Wait for database to be ready
    log "Waiting for database to be ready..."
    local db_ready=false
    for i in {1..30}; do
        if docker-compose -f docker-compose.prod.yml exec -T db pg_isready -U postgres &> /dev/null; then
            db_ready=true
            break
        fi
        sleep 2
    done
    
    if [ "$db_ready" = false ]; then
        error "Database failed to become ready"
    fi
    
    success "Database is ready"
    
    # Start backend
    log "Starting backend service..."
    if docker-compose -f docker-compose.prod.yml up -d backend; then
        success "Backend service started"
    else
        error "Failed to start backend service"
    fi
    
    # Wait for backend to be ready
    log "Waiting for backend to be ready..."
    local backend_ready=false
    for i in {1..60}; do
        if curl -f http://localhost:8000/api/health/ &> /dev/null; then
            backend_ready=true
            break
        fi
        sleep 5
    done
    
    if [ "$backend_ready" = false ]; then
        error "Backend service failed to become ready"
    fi
    
    success "Backend service is ready"
    
    # Start frontend
    log "Starting frontend service..."
    if docker-compose -f docker-compose.prod.yml up -d frontend; then
        success "Frontend service started"
    else
        error "Failed to start frontend service"
    fi
    
    # Start nginx
    log "Starting nginx service..."
    if docker-compose -f docker-compose.prod.yml up -d nginx; then
        success "Nginx service started"
    else
        error "Failed to start nginx service"
    fi
    
    # Start monitoring services
    log "Starting monitoring services..."
    if docker-compose -f docker-compose.prod.yml up -d prometheus grafana; then
        success "Monitoring services started"
    else
        warning "Failed to start monitoring services"
    fi
    
    success "All services deployed successfully"
}

# ========================================
# 🔍 Health Checks
# ========================================
run_health_checks() {
    log "Running health checks..."
    
    local health_checks_passed=true
    
    # Check backend health
    log "Checking backend health..."
    if curl -f http://localhost:8000/api/health/ &> /dev/null; then
        success "Backend health check passed"
    else
        error "Backend health check failed"
        health_checks_passed=false
    fi
    
    # Check frontend health
    log "Checking frontend health..."
    if curl -f http://localhost:3000/api/health &> /dev/null; then
        success "Frontend health check passed"
    else
        error "Frontend health check failed"
        health_checks_passed=false
    fi
    
    # Check nginx health
    log "Checking nginx health..."
    if curl -f http://localhost/health &> /dev/null; then
        success "Nginx health check passed"
    else
        error "Nginx health check failed"
        health_checks_passed=false
    fi
    
    # Check database health
    log "Checking database health..."
    if docker-compose -f "$PROJECT_ROOT/docker-compose.prod.yml" exec -T db pg_isready -U postgres &> /dev/null; then
        success "Database health check passed"
    else
        error "Database health check failed"
        health_checks_passed=false
    fi
    
    # Check Redis health
    log "Checking Redis health..."
    if docker-compose -f "$PROJECT_ROOT/docker-compose.prod.yml" exec -T redis redis-cli ping &> /dev/null; then
        success "Redis health check passed"
    else
        error "Redis health check failed"
        health_checks_passed=false
    fi
    
    if [ "$health_checks_passed" = true ]; then
        success "All health checks passed"
    else
        error "Some health checks failed"
    fi
}

# ========================================
    # 🔄 Rollback Function
# ========================================
rollback_deployment() {
    log "Rolling back deployment..."
    
    cd "$PROJECT_ROOT"
    
    # Stop all services
    docker-compose -f docker-compose.prod.yml down --timeout 30
    
    # Restore from backup if available
    if [ -f "/backups/latest_backup.sql.gz" ]; then
        log "Restoring from backup..."
        # Implementation depends on your backup strategy
        warning "Backup restoration not implemented in this script"
    fi
    
    # Restart previous version
    if docker-compose -f docker-compose.prod.yml up -d; then
        success "Rollback completed"
    else
        error "Rollback failed"
    fi
}

# ========================================
# 📊 Post-deployment Tasks
# ========================================
post_deployment_tasks() {
    log "Running post-deployment tasks..."
    
    # Run database migrations
    log "Running database migrations..."
    if docker-compose -f "$PROJECT_ROOT/docker-compose.prod.yml" exec -T backend python manage.py migrate; then
        success "Database migrations completed"
    else
        error "Database migrations failed"
    fi
    
    # Collect static files
    log "Collecting static files..."
    if docker-compose -f "$PROJECT_ROOT/docker-compose.prod.yml" exec -T backend python manage.py collectstatic --noinput; then
        success "Static files collected"
    else
        error "Static files collection failed"
    fi
    
    # Clear cache
    log "Clearing cache..."
    if docker-compose -f "$PROJECT_ROOT/docker-compose.prod.yml" exec -T backend python manage.py shell -c "from django.core.cache import cache; cache.clear()"; then
        success "Cache cleared"
    else
        warning "Cache clearing failed"
    fi
    
    success "Post-deployment tasks completed"
}

# ========================================
# 📋 Deployment Summary
# ========================================
deployment_summary() {
    log "Generating deployment summary..."
    
    local summary_file="/tmp/deployment_summary_$(date +%Y%m%d_%H%M%S).txt"
    
    cat > "$summary_file" << EOF
Financial Management System Deployment Summary
==============================================
Deployment Date: $(date)
Deployment Duration: $SECONDS seconds
Deployment Status: SUCCESS

Services Deployed:
$(docker-compose -f "$PROJECT_ROOT/docker-compose.prod.yml" ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}")

Health Check Results:
- Backend: $(curl -f http://localhost:8000/api/health/ &> /dev/null && echo "HEALTHY" || echo "UNHEALTHY")
- Frontend: $(curl -f http://localhost:3000/api/health &> /dev/null && echo "HEALTHY" || echo "UNHEALTHY")
- Nginx: $(curl -f http://localhost/health &> /dev/null && echo "HEALTHY" || echo "UNHEALTHY")
- Database: $(docker-compose -f "$PROJECT_ROOT/docker-compose.prod.yml" exec -T db pg_isready -U postgres &> /dev/null && echo "HEALTHY" || echo "UNHEALTHY")
- Redis: $(docker-compose -f "$PROJECT_ROOT/docker-compose.prod.yml" exec -T redis redis-cli ping &> /dev/null && echo "HEALTHY" || echo "UNHEALTHY")

System Resources:
- CPU Usage: $(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)%
- Memory Usage: $(free | grep Mem | awk '{printf("%.1f%%", $3/$2 * 100.0)}')
- Disk Usage: $(df -h / | awk 'NR==2 {print $5}')

Access URLs:
- Frontend: https://yourdomain.com
- Backend API: https://api.yourdomain.com
- Grafana: http://localhost:3001
- Prometheus: http://localhost:9090

EOF
    
    log "Deployment summary saved to: $summary_file"
    cat "$summary_file"
}

# ========================================
# 🚀 Main Deployment Process
# ========================================
main() {
    local start_time=$(date +%s)
    
    log "Starting Financial Management System deployment..."
    log "Deployment log: $DEPLOYMENT_LOG"
    
    # Create deployment log file
    touch "$DEPLOYMENT_LOG"
    
    # Run deployment steps
    pre_deployment_checks
    pre_deployment_backup
    stop_current_services
    cleanup_old_images
    build_new_images
    deploy_services
    post_deployment_tasks
    run_health_checks
    deployment_summary
    
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    success "Deployment completed successfully in ${duration} seconds!"
    log "Deployment log available at: $DEPLOYMENT_LOG"
}

# ========================================
# 🎯 Script Entry Point
# ========================================
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
    # Handle command line arguments
    case "${1:-}" in
        --help|-h)
            echo "Usage: $0 [OPTIONS]"
            echo "Options:"
            echo "  --help, -h     Show this help message"
            echo "  --rollback     Rollback to previous deployment"
            echo "  --no-backup    Skip pre-deployment backup"
            echo "  --no-rollback  Disable automatic rollback on failure"
            exit 0
            ;;
        --rollback)
            rollback_deployment
            exit 0
            ;;
        --no-backup)
            BACKUP_BEFORE_DEPLOY=false
            ;;
        --no-rollback)
            ROLLBACK_ON_FAILURE=false
            ;;
    esac
    
    # Set up error handling
    if [ "$ROLLBACK_ON_FAILURE" = true ]; then
        trap 'error "Deployment failed. Rolling back..." && rollback_deployment' ERR
    fi
    
    main "$@"
fi 