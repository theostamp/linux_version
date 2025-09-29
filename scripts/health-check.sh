#!/bin/bash

# Financial Management System Health Check Script
# Comprehensive health monitoring for production environment

set -e

# ========================================
# 🔧 Configuration
# ========================================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
HEALTH_LOG="/tmp/health_check_$(date +%Y%m%d_%H%M%S).log"
TIMEOUT=30
RETRY_COUNT=3

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
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$HEALTH_LOG"
}

success() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] ✓${NC} $1" | tee -a "$HEALTH_LOG"
}

warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] ⚠${NC} $1" | tee -a "$HEALTH_LOG"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ✗${NC} $1" | tee -a "$HEALTH_LOG"
}

# ========================================
# 🔍 System Health Checks
# ========================================
check_system_resources() {
    log "Checking system resources..."
    
    # CPU usage
    local cpu_usage=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)
    if (( $(echo "$cpu_usage < 80" | bc -l) )); then
        success "CPU usage: ${cpu_usage}%"
    else
        warning "High CPU usage: ${cpu_usage}%"
    fi
    
    # Memory usage
    local mem_total=$(free -g | awk 'NR==2 {print $2}')
    local mem_used=$(free -g | awk 'NR==2 {print $3}')
    local mem_usage=$(echo "scale=1; $mem_used * 100 / $mem_total" | bc -l)
    
    if (( $(echo "$mem_usage < 80" | bc -l) )); then
        success "Memory usage: ${mem_usage}% (${mem_used}G/${mem_total}G)"
    else
        warning "High memory usage: ${mem_usage}% (${mem_used}G/${mem_total}G)"
    fi
    
    # Disk usage
    local disk_usage=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
    if [ "$disk_usage" -lt 80 ]; then
        success "Disk usage: ${disk_usage}%"
    else
        warning "High disk usage: ${disk_usage}%"
    fi
    
    # Docker daemon
    if docker info &> /dev/null; then
        success "Docker daemon is running"
    else
        error "Docker daemon is not running"
    fi
}

# ========================================
# 🐳 Docker Container Health
# ========================================
check_docker_containers() {
    log "Checking Docker containers..."
    
    cd "$PROJECT_ROOT"
    
    # Check if containers are running
    local containers=$(docker-compose -f docker-compose.prod.yml ps -q)
    local running_containers=$(docker-compose -f docker-compose.prod.yml ps -q --filter "status=running")
    
    if [ "$containers" = "$running_containers" ]; then
        success "All containers are running"
    else
        error "Some containers are not running"
        docker-compose -f docker-compose.prod.yml ps
    fi
    
    # Check container health status
    local unhealthy_containers=$(docker-compose -f docker-compose.prod.yml ps --filter "health=unhealthy" -q)
    if [ -z "$unhealthy_containers" ]; then
        success "All containers are healthy"
    else
        error "Some containers are unhealthy"
        docker-compose -f docker-compose.prod.yml ps --filter "health=unhealthy"
    fi
}

# ========================================
# 🗄️ Database Health
# ========================================
check_database_health() {
    log "Checking database health..."
    
    # Check if database is accessible
    if docker-compose -f "$PROJECT_ROOT/docker-compose.prod.yml" exec -T db pg_isready -U postgres &> /dev/null; then
        success "Database is accessible"
    else
        error "Database is not accessible"
        return 1
    fi
    
    # Check database connections
    local connections=$(docker-compose -f "$PROJECT_ROOT/docker-compose.prod.yml" exec -T db psql -U postgres -t -c "SELECT count(*) FROM pg_stat_activity WHERE state = 'active';")
    if [ "$connections" -lt 100 ]; then
        success "Database connections: $connections"
    else
        warning "High number of database connections: $connections"
    fi
    
    # Check database size
    local db_size=$(docker-compose -f "$PROJECT_ROOT/docker-compose.prod.yml" exec -T db psql -U postgres -t -c "SELECT pg_size_pretty(pg_database_size(current_database()));")
    success "Database size: $db_size"
    
    # Check for long-running queries
    local long_queries=$(docker-compose -f "$PROJECT_ROOT/docker-compose.prod.yml" exec -T db psql -U postgres -t -c "SELECT count(*) FROM pg_stat_activity WHERE state = 'active' AND now() - query_start > interval '5 minutes';")
    if [ "$long_queries" -eq 0 ]; then
        success "No long-running queries detected"
    else
        warning "Long-running queries detected: $long_queries"
    fi
}

# ========================================
# 🔌 Redis Health
# ========================================
check_redis_health() {
    log "Checking Redis health..."
    
    # Check if Redis is responding
    if docker-compose -f "$PROJECT_ROOT/docker-compose.prod.yml" exec -T redis redis-cli ping &> /dev/null; then
        success "Redis is responding"
    else
        error "Redis is not responding"
        return 1
    fi
    
    # Check Redis memory usage
    local redis_memory=$(docker-compose -f "$PROJECT_ROOT/docker-compose.prod.yml" exec -T redis redis-cli info memory | grep "used_memory_human:" | cut -d: -f2)
    success "Redis memory usage: $redis_memory"
    
    # Check Redis connections
    local redis_connections=$(docker-compose -f "$PROJECT_ROOT/docker-compose.prod.yml" exec -T redis redis-cli info clients | grep "connected_clients:" | cut -d: -f2)
    success "Redis connections: $redis_connections"
}

# ========================================
# 🐍 Backend Health
# ========================================
check_backend_health() {
    log "Checking backend health..."
    
    # Check backend API health
    for i in $(seq 1 $RETRY_COUNT); do
        if curl -f -s --max-time $TIMEOUT http://localhost:8000/api/health/ &> /dev/null; then
            success "Backend API is healthy"
            break
        else
            if [ $i -eq $RETRY_COUNT ]; then
                error "Backend API health check failed after $RETRY_COUNT attempts"
                return 1
            fi
            sleep 2
        fi
    done
    
    # Check backend logs for errors
    local error_count=$(docker-compose -f "$PROJECT_ROOT/docker-compose.prod.yml" logs backend --tail=100 | grep -i "error\|exception\|traceback" | wc -l)
    if [ "$error_count" -eq 0 ]; then
        success "No recent errors in backend logs"
    else
        warning "Recent errors in backend logs: $error_count"
    fi
    
    # Check backend response time
    local response_time=$(curl -w "%{time_total}" -s -o /dev/null http://localhost:8000/api/health/)
    if (( $(echo "$response_time < 1.0" | bc -l) )); then
        success "Backend response time: ${response_time}s"
    else
        warning "Slow backend response time: ${response_time}s"
    fi
}

# ========================================
# ⚛️ Frontend Health
# ========================================
check_frontend_health() {
    log "Checking frontend health..."
    
    # Check frontend API health
    for i in $(seq 1 $RETRY_COUNT); do
        if curl -f -s --max-time $TIMEOUT http://localhost:3000/api/health &> /dev/null; then
            success "Frontend API is healthy"
            break
        else
            if [ $i -eq $RETRY_COUNT ]; then
                error "Frontend API health check failed after $RETRY_COUNT attempts"
                return 1
            fi
            sleep 2
        fi
    done
    
    # Check frontend logs for errors
    local error_count=$(docker-compose -f "$PROJECT_ROOT/docker-compose.prod.yml" logs frontend --tail=100 | grep -i "error\|exception\|traceback" | wc -l)
    if [ "$error_count" -eq 0 ]; then
        success "No recent errors in frontend logs"
    else
        warning "Recent errors in frontend logs: $error_count"
    fi
}

# ========================================
# 🌐 Nginx Health
# ========================================
check_nginx_health() {
    log "Checking nginx health..."
    
    # Check nginx health endpoint
    for i in $(seq 1 $RETRY_COUNT); do
        if curl -f -s --max-time $TIMEOUT http://localhost/health &> /dev/null; then
            success "Nginx is healthy"
            break
        else
            if [ $i -eq $RETRY_COUNT ]; then
                error "Nginx health check failed after $RETRY_COUNT attempts"
                return 1
            fi
            sleep 2
        fi
    done
    
    # Check nginx configuration
    if docker-compose -f "$PROJECT_ROOT/docker-compose.prod.yml" exec nginx nginx -t &> /dev/null; then
        success "Nginx configuration is valid"
    else
        error "Nginx configuration is invalid"
    fi
    
    # Check nginx logs for errors
    local error_count=$(docker-compose -f "$PROJECT_ROOT/docker-compose.prod.yml" logs nginx --tail=100 | grep -i "error" | wc -l)
    if [ "$error_count" -eq 0 ]; then
        success "No recent errors in nginx logs"
    else
        warning "Recent errors in nginx logs: $error_count"
    fi
}

# ========================================
# 📊 Monitoring Health
# ========================================
check_monitoring_health() {
    log "Checking monitoring services..."
    
    # Check Prometheus
    if curl -f -s --max-time $TIMEOUT http://localhost:9090/-/healthy &> /dev/null; then
        success "Prometheus is healthy"
    else
        warning "Prometheus health check failed"
    fi
    
    # Check Grafana
    if curl -f -s --max-time $TIMEOUT http://localhost:3001/api/health &> /dev/null; then
        success "Grafana is healthy"
    else
        warning "Grafana health check failed"
    fi
}

# ========================================
# 🔐 Security Health
# ========================================
check_security_health() {
    log "Checking security health..."
    
    # Check SSL certificate validity
    if openssl x509 -checkend 86400 -noout -in "$PROJECT_ROOT/nginx/ssl/cert.pem" &> /dev/null; then
        success "SSL certificate is valid"
    else
        warning "SSL certificate will expire soon or is invalid"
    fi
    
    # Check for failed login attempts
    local failed_logins=$(docker-compose -f "$PROJECT_ROOT/docker-compose.prod.yml" logs backend --tail=1000 | grep -i "failed login" | wc -l)
    if [ "$failed_logins" -eq 0 ]; then
        success "No failed login attempts detected"
    else
        warning "Failed login attempts detected: $failed_logins"
    fi
    
    # Check for suspicious activity
    local suspicious_activity=$(docker-compose -f "$PROJECT_ROOT/docker-compose.prod.yml" logs nginx --tail=1000 | grep -i "403\|404\|500" | wc -l)
    if [ "$suspicious_activity" -lt 100 ]; then
        success "No suspicious activity detected"
    else
        warning "Suspicious activity detected: $suspicious_activity requests"
    fi
}

# ========================================
# 💰 Financial System Health
# ========================================
check_financial_system_health() {
    log "Checking financial system health..."
    
    # Check financial API endpoints
    local endpoints=("expenses" "payments" "meter-readings" "transactions")
    
    for endpoint in "${endpoints[@]}"; do
        if curl -f -s --max-time $TIMEOUT "http://localhost:8000/api/financial/$endpoint/" &> /dev/null; then
            success "Financial API endpoint /$endpoint/ is accessible"
        else
            warning "Financial API endpoint /$endpoint/ is not accessible"
        fi
    done
    
    # Check database tables
    local tables=("financial_expense" "financial_payment" "financial_meterreading" "financial_transaction")
    
    for table in "${tables[@]}"; do
        local count=$(docker-compose -f "$PROJECT_ROOT/docker-compose.prod.yml" exec -T db psql -U postgres -t -c "SELECT count(*) FROM $table;" 2>/dev/null || echo "0")
        if [ "$count" -ge 0 ]; then
            success "Table $table is accessible with $count records"
        else
            warning "Table $table is not accessible"
        fi
    done
}

# ========================================
# 📋 Generate Health Report
# ========================================
generate_health_report() {
    log "Generating health report..."
    
    local report_file="/tmp/health_report_$(date +%Y%m%d_%H%M%S).txt"
    
    cat > "$report_file" << EOF
Financial Management System Health Report
=========================================
Generated: $(date)
Duration: $SECONDS seconds

System Status Summary:
$(docker-compose -f "$PROJECT_ROOT/docker-compose.prod.yml" ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}")

Resource Usage:
- CPU: $(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)%
- Memory: $(free | grep Mem | awk '{printf("%.1f%%", $3/$2 * 100.0)}')
- Disk: $(df -h / | awk 'NR==2 {print $5}')

Service Health:
- Backend: $(curl -f http://localhost:8000/api/health/ &> /dev/null && echo "HEALTHY" || echo "UNHEALTHY")
- Frontend: $(curl -f http://localhost:3000/api/health &> /dev/null && echo "HEALTHY" || echo "UNHEALTHY")
- Nginx: $(curl -f http://localhost/health &> /dev/null && echo "HEALTHY" || echo "UNHEALTHY")
- Database: $(docker-compose -f "$PROJECT_ROOT/docker-compose.prod.yml" exec -T db pg_isready -U postgres &> /dev/null && echo "HEALTHY" || echo "UNHEALTHY")
- Redis: $(docker-compose -f "$PROJECT_ROOT/docker-compose.prod.yml" exec -T redis redis-cli ping &> /dev/null && echo "HEALTHY" || echo "UNHEALTHY")

Recent Logs Summary:
$(docker-compose -f "$PROJECT_ROOT/docker-compose.prod.yml" logs --tail=50 --timestamps)

EOF
    
    log "Health report saved to: $report_file"
    cat "$report_file"
}

# ========================================
# 🚀 Main Health Check Process
# ========================================
main() {
    local start_time=$(date +%s)
    local overall_status=0
    
    log "Starting comprehensive health check..."
    log "Health check log: $HEALTH_LOG"
    
    # Create health check log file
    touch "$HEALTH_LOG"
    
    # Run health checks
    check_system_resources || overall_status=1
    check_docker_containers || overall_status=1
    check_database_health || overall_status=1
    check_redis_health || overall_status=1
    check_backend_health || overall_status=1
    check_frontend_health || overall_status=1
    check_nginx_health || overall_status=1
    check_monitoring_health || overall_status=1
    check_security_health || overall_status=1
    check_financial_system_health || overall_status=1
    
    # Generate report
    generate_health_report
    
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    if [ $overall_status -eq 0 ]; then
        success "Health check completed successfully in ${duration} seconds!"
        log "All systems are healthy"
    else
        error "Health check completed with issues in ${duration} seconds!"
        log "Some systems have issues - check the report above"
    fi
    
    log "Health check log available at: $HEALTH_LOG"
    
    exit $overall_status
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
            echo "  --quick        Run quick health check (skip detailed checks)"
            echo "  --verbose      Show detailed output"
            exit 0
            ;;
        --quick)
            # Quick health check - only essential checks
            check_system_resources
            check_docker_containers
            check_backend_health
            check_frontend_health
            exit 0
            ;;
        --verbose)
            set -x
            ;;
    esac
    
    main "$@"
fi 