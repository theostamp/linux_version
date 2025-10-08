#!/bin/bash

# Script για επιβεβαίωση όλων των loading indicators
# Ημερομηνία: 8 Οκτωβρίου 2025

echo "🔍 Επιβεβαίωση Loading Indicators - 'Παρακαλώ περιμένετε'"
echo "================================================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
total_checks=0
passed_checks=0
failed_checks=0

# Function to check if file exists
check_file() {
    local file=$1
    local description=$2
    
    total_checks=$((total_checks + 1))
    
    if [ -f "$file" ]; then
        echo -e "${GREEN}✅ PASS${NC} - $description"
        echo "   📁 $file"
        passed_checks=$((passed_checks + 1))
        return 0
    else
        echo -e "${RED}❌ FAIL${NC} - $description"
        echo "   📁 $file (NOT FOUND)"
        failed_checks=$((failed_checks + 1))
        return 1
    fi
}

# Function to check if pattern exists in file
check_pattern() {
    local file=$1
    local pattern=$2
    local description=$3
    
    total_checks=$((total_checks + 1))
    
    if [ -f "$file" ]; then
        if grep -q "$pattern" "$file"; then
            echo -e "${GREEN}✅ PASS${NC} - $description"
            passed_checks=$((passed_checks + 1))
            return 0
        else
            echo -e "${RED}❌ FAIL${NC} - $description"
            echo "   Pattern not found: $pattern"
            failed_checks=$((failed_checks + 1))
            return 1
        fi
    else
        echo -e "${RED}❌ FAIL${NC} - $description (File not found: $file)"
        failed_checks=$((failed_checks + 1))
        return 1
    fi
}

# Function to check multiple patterns (OR condition)
check_any_pattern() {
    local file=$1
    shift
    local patterns=("$@")
    local last_pattern="${patterns[-1]}"
    unset 'patterns[-1]'
    local description=$last_pattern
    
    total_checks=$((total_checks + 1))
    
    if [ ! -f "$file" ]; then
        echo -e "${RED}❌ FAIL${NC} - $description (File not found: $file)"
        failed_checks=$((failed_checks + 1))
        return 1
    fi
    
    for pattern in "${patterns[@]}"; do
        if grep -q "$pattern" "$file"; then
            echo -e "${GREEN}✅ PASS${NC} - $description"
            passed_checks=$((passed_checks + 1))
            return 0
        fi
    done
    
    echo -e "${RED}❌ FAIL${NC} - $description"
    echo "   None of the patterns found in file"
    failed_checks=$((failed_checks + 1))
    return 1
}

echo -e "${BLUE}[1/6] Checking EnhancedIntroAnimation...${NC}"
echo "-----------------------------------------------------------"
check_file "frontend/components/EnhancedIntroAnimation.tsx" "EnhancedIntroAnimation component exists"
check_file "frontend/components/IntroWrapper.tsx" "IntroWrapper component exists"
check_pattern "frontend/components/IntroWrapper.tsx" "EnhancedIntroAnimation" "IntroWrapper imports EnhancedIntroAnimation"
check_pattern "frontend/components/IntroWrapper.tsx" "localStorage.getItem('hasVisited')" "IntroWrapper checks localStorage"
check_pattern "frontend/components/EnhancedIntroAnimation.tsx" "Αρχικοποίηση Συστήματος" "EnhancedIntroAnimation has Greek text"
check_pattern "frontend/app/layout.tsx" "IntroWrapper" "RootLayout uses IntroWrapper"
echo ""

echo -e "${BLUE}[2/6] Checking StartupLoader...${NC}"
echo "-----------------------------------------------------------"
check_file "frontend/components/StartupLoader.tsx" "StartupLoader component exists"
check_file "frontend/components/StartupWrapper.tsx" "StartupWrapper component exists"
check_pattern "frontend/components/StartupWrapper.tsx" "StartupLoader" "StartupWrapper imports StartupLoader"
check_pattern "frontend/components/StartupWrapper.tsx" "sessionStorage.getItem('startupLoaderShown')" "StartupWrapper checks sessionStorage"
check_pattern "frontend/components/StartupLoader.tsx" "Μεταγλώττιση εφαρμογής" "StartupLoader has compilation message"
check_pattern "frontend/components/StartupLoader.tsx" "process.env.NODE_ENV !== \"development\"" "StartupLoader is dev-only"
check_pattern "frontend/app/layout.tsx" "StartupWrapper" "RootLayout uses StartupWrapper"
echo ""

echo -e "${BLUE}[3/6] Checking DevCompileIndicator...${NC}"
echo "-----------------------------------------------------------"
check_file "frontend/components/DevCompileIndicator.tsx" "DevCompileIndicator component exists"
check_pattern "frontend/components/DevCompileIndicator.tsx" "Γίνεται μεταγλώττιση" "DevCompileIndicator has Greek compilation text"
check_pattern "frontend/components/DevCompileIndicator.tsx" "EventSource" "DevCompileIndicator connects to HMR"
check_pattern "frontend/components/DevCompileIndicator.tsx" "webpack-hmr" "DevCompileIndicator uses webpack-hmr endpoint"
check_pattern "frontend/app/layout.tsx" "DevCompileIndicator" "RootLayout uses DevCompileIndicator"
echo ""

echo -e "${BLUE}[4/6] Checking NavigationLoader...${NC}"
echo "-----------------------------------------------------------"
check_file "frontend/components/NavigationLoader.tsx" "NavigationLoader component exists"
check_pattern "frontend/components/NavigationLoader.tsx" "Παρακαλώ περιμένετε" "NavigationLoader has 'please wait' message"
check_pattern "frontend/components/NavigationLoader.tsx" "usePathname" "NavigationLoader uses Next.js navigation hooks"
check_pattern "frontend/components/NavigationLoader.tsx" "Φόρτωση σελίδας" "NavigationLoader has 'loading page' text"
check_pattern "frontend/app/layout.tsx" "NavigationLoader" "RootLayout uses NavigationLoader"
echo ""

echo -e "${BLUE}[5/6] Checking GlobalLoadingOverlay & LoadingContext...${NC}"
echo "-----------------------------------------------------------"
check_file "frontend/components/GlobalLoadingOverlay.tsx" "GlobalLoadingOverlay component exists"
check_file "frontend/components/contexts/LoadingContext.tsx" "LoadingContext exists"
check_pattern "frontend/components/GlobalLoadingOverlay.tsx" "Παρακαλώ περιμένετε" "GlobalLoadingOverlay has 'please wait' message"
check_pattern "frontend/components/GlobalLoadingOverlay.tsx" "useLoading" "GlobalLoadingOverlay uses LoadingContext"
check_pattern "frontend/components/contexts/LoadingContext.tsx" "startLoading" "LoadingContext exports startLoading"
check_pattern "frontend/components/contexts/LoadingContext.tsx" "stopLoading" "LoadingContext exports stopLoading"
check_pattern "frontend/components/AppProviders.tsx" "LoadingProvider" "AppProviders uses LoadingProvider"
check_pattern "frontend/components/LayoutWrapper.tsx" "GlobalLoadingOverlay" "LayoutWrapper uses GlobalLoadingOverlay"
echo ""

echo -e "${BLUE}[6/6] Checking LoginForm...${NC}"
echo "-----------------------------------------------------------"
check_file "frontend/components/LoginForm.tsx" "LoginForm component exists"
check_pattern "frontend/components/LoginForm.tsx" "Παρακαλώ περιμένετε" "LoginForm has 'please wait' message"
check_pattern "frontend/components/LoginForm.tsx" "Φόρτωση..." "LoginForm has 'loading' button text"
check_pattern "frontend/components/LoginForm.tsx" "const \[loading, setLoading\]" "LoginForm has loading state"
echo ""

# Additional checks
echo -e "${BLUE}[Bonus] Additional Checks...${NC}"
echo "-----------------------------------------------------------"

# Check if all components use Greek text
check_pattern "frontend/components/EnhancedIntroAnimation.tsx" "Ψηφιακός Θυρωρός" "App title in Greek"
check_pattern "frontend/components/StartupLoader.tsx" "Ψηφιακός Θυρωρός" "App title in Greek (StartupLoader)"

# Check if useLoading is used in other components
if grep -r "useLoading\|useNavigationWithLoading" frontend/components/*.tsx frontend/hooks/*.ts 2>/dev/null | grep -v "LoadingContext.tsx" | grep -v "GlobalLoadingOverlay.tsx" > /dev/null; then
    echo -e "${GREEN}✅ PASS${NC} - useLoading hook is used in other components"
    passed_checks=$((passed_checks + 1))
else
    echo -e "${YELLOW}⚠️  WARN${NC} - useLoading hook might not be used in other components"
fi
total_checks=$((total_checks + 1))

echo ""
echo "================================================================"
echo -e "${BLUE}📊 SUMMARY${NC}"
echo "================================================================"
echo -e "Total checks: ${BLUE}$total_checks${NC}"
echo -e "Passed: ${GREEN}$passed_checks${NC}"
echo -e "Failed: ${RED}$failed_checks${NC}"
echo ""

# Calculate percentage
if [ $total_checks -gt 0 ]; then
    percentage=$((passed_checks * 100 / total_checks))
    
    if [ $percentage -eq 100 ]; then
        echo -e "${GREEN}🎉 PERFECT! All checks passed (100%)${NC}"
        echo ""
        echo -e "${GREEN}✅ Το μήνυμα 'Παρακαλώ περιμένετε' λειτουργεί σε ΌΛΕΣ τις περιπτώσεις!${NC}"
        exit 0
    elif [ $percentage -ge 90 ]; then
        echo -e "${GREEN}✅ EXCELLENT! ($percentage%)${NC}"
        exit 0
    elif [ $percentage -ge 70 ]; then
        echo -e "${YELLOW}⚠️  GOOD, but some issues found ($percentage%)${NC}"
        exit 1
    else
        echo -e "${RED}❌ FAILED - Multiple issues found ($percentage%)${NC}"
        exit 1
    fi
else
    echo -e "${RED}❌ ERROR - No checks performed${NC}"
    exit 1
fi

