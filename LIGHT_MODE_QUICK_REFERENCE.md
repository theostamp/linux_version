# ⚡ Light Mode - Quick Reference Card

## 🚀 Γρήγορη Εκκίνηση

```bash
# 1. Clone & Setup
git clone https://github.com/theostamp/linux_version.git
cd linux_version
find . -name "*.sh" -type f | xargs chmod +x

# 2. Start Light Mode
./start_dev_light.sh

# 3. Access
# Frontend: http://localhost:3001
# Backend:  http://localhost:8000
```

## 📊 Σύγκριση Modes

| | Light Mode | Full Mode |
|---|---|---|
| **RAM** | ~700MB | ~1.2GB |
| **Time** | ~30s | ~60s |
| **Services** | 4 containers | 7 containers |
| **Document Parser** | ❌ | ✅ |

## 🔧 Χρήσιμες Εντολές

```bash
# Εναλλαγή Modes
./start_dev_light.sh    # Light Mode
./startup.sh           # Full Mode
docker-compose down    # Stop όλα

# Έλεγχος
docker-compose ps                    # Status
docker stats --no-stream            # Resources
./check_document_parser.sh          # Document Parser
```

## ⚠️ Περιορισμοί Light Mode

**Δεν λειτουργούν:**
- 📄 Document Parser
- 🔄 Background Tasks
- ⏰ Scheduled Tasks
- 📧 Email Notifications

**Λειτουργούν κανονικά:**
- 💰 Financial Management
- 🏠 Building Management
- 🔧 Maintenance
- 📢 Communication
- 📊 Reports

## 🎯 Πότε να Χρησιμοποιείς

**✅ Light Mode:**
- Καθημερινή development
- UI/UX improvements
- API development
- Περιορισμένη RAM

**❌ Full Mode:**
- Document Parser
- Background tasks
- Production testing
- Scheduled tasks

## 🆘 Troubleshooting

```bash
# Containers δεν ξεκινούν
docker system prune -f

# Port conflicts
netstat -tulpn | grep :3001

# Database issues
docker logs linux_version-db-1
```

---
**📖 Πλήρης Οδηγός**: [LIGHT_MODE_INSTALLATION.md](LIGHT_MODE_INSTALLATION.md)



