#!/bin/bash
#
# Cron script για αυτοματοποιημένη εκτέλεση events
#
# Χρήση:
#     # Καθημερινή εκτέλεση στις 9:00 πμ
#     0 9 * * * /path/to/run_automated_events.sh
#     
#     # Εβδομαδιαία εκτέλεση κάθε Δευτέρα στις 8:00 πμ  
#     0 8 * * 1 /path/to/run_automated_events.sh
#     
#     # Μηνιαία εκτέλεση την 1η κάθε μήνα στις 7:00 πμ
#     0 7 1 * * /path/to/run_automated_events.sh
#

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="$SCRIPT_DIR/logs/automated_events.log"

# Create logs directory if it doesn't exist
mkdir -p "$SCRIPT_DIR/logs"

# Log function
log_message() {
    local level=$1
    local message=$2
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] [$level] $message" >> "$LOG_FILE"
    
    case $level in
        "ERROR")
            echo -e "${RED}[$timestamp] [$level] $message${NC}"
            ;;
        "SUCCESS") 
            echo -e "${GREEN}[$timestamp] [$level] $message${NC}"
            ;;
        "WARNING")
            echo -e "${YELLOW}[$timestamp] [$level] $message${NC}"
            ;;
        "INFO")
            echo -e "${BLUE}[$timestamp] [$level] $message${NC}"
            ;;
        *)
            echo "[$timestamp] [$level] $message"
            ;;
    esac
}

# Main execution
main() {
    log_message "INFO" "🚀 Έναρξη αυτοματοποιημένου script για events"
    
    # Check if Docker is running
    if ! docker ps > /dev/null 2>&1; then
        log_message "ERROR" "❌ Docker δεν είναι ενεργό"
        exit 1
    fi
    
    # Check if container is running
    if ! docker ps --format '{{.Names}}' | grep -q "linux_version-backend-1"; then
        log_message "ERROR" "❌ Container linux_version-backend-1 δεν τρέχει"
        exit 1
    fi
    
    # Copy script to container
    log_message "INFO" "📁 Αντιγραφή script στο container..."
    if docker cp "$SCRIPT_DIR/create_automated_events.py" linux_version-backend-1:/app/; then
        log_message "SUCCESS" "✅ Script αντιγράφηκε επιτυχώς"
    else
        log_message "ERROR" "❌ Αποτυχία αντιγραφής script"
        exit 1
    fi
    
    # Execute the script
    log_message "INFO" "⚡ Εκτέλεση αυτοματοποιημένων events..."
    
    # Capture output and process it
    if output=$(docker exec linux_version-backend-1 python /app/create_automated_events.py 2>&1); then
        # Log the output
        echo "$output" | while IFS= read -r line; do
            if [[ $line == *"✅"* ]]; then
                log_message "SUCCESS" "$line"
            elif [[ $line == *"❌"* ]] || [[ $line == *"ERROR"* ]]; then
                log_message "ERROR" "$line" 
            elif [[ $line == *"⚠️"* ]] || [[ $line == *"WARNING"* ]]; then
                log_message "WARNING" "$line"
            else
                log_message "INFO" "$line"
            fi
        done
        
        log_message "SUCCESS" "🎉 Script ολοκληρώθηκε επιτυχώς"
        
        # Send notification if events were created
        if echo "$output" | grep -q "Δημιουργήθηκαν.*events"; then
            event_count=$(echo "$output" | grep -o "Δημιουργήθηκαν [0-9]*" | grep -o "[0-9]*")
            log_message "SUCCESS" "📬 Δημιουργήθηκαν $event_count νέα events - έλεγχος στο ημερολόγιο!"
        fi
        
    else
        log_message "ERROR" "❌ Αποτυχία εκτέλεσης script"
        echo "$output" | while IFS= read -r line; do
            log_message "ERROR" "$line"
        done
        exit 1
    fi
    
    log_message "INFO" "🏁 Ολοκλήρωση αυτοματοποιημένου script"
}

# Cleanup function
cleanup() {
    log_message "INFO" "🧹 Καθαρισμός προσωρινών αρχείων..."
    # Add any cleanup tasks here if needed
}

# Error handler
error_handler() {
    local line_number=$1
    log_message "ERROR" "💥 Σφάλμα στη γραμμή $line_number"
    cleanup
    exit 1
}

# Set error handler
trap 'error_handler $LINENO' ERR

# Execute main function
main "$@"

# Success cleanup
cleanup

log_message "SUCCESS" "✨ Script ολοκληρώθηκε χωρίς σφάλματα"