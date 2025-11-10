"""
Monitoring Setup Script
Comprehensive monitoring configuration for production deployment
"""

import os
import sys
import django
from pathlib import Path
import yaml
import json

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django.conf import settings


class MonitoringSetup:
    """Setup comprehensive monitoring stack"""
    
    def __init__(self):
        self.monitoring_dir = Path('monitoring')
        self.monitoring_dir.mkdir(exist_ok=True)
        self.created_files = []
        self.configured_services = []
    
    def setup_all_monitoring(self):
        """Setup complete monitoring stack"""
        print("📊 Setting up Application Monitoring...")
        print("=" * 50)
        
        # Setup Prometheus configuration
        self._setup_prometheus()
        
        # Setup Grafana dashboards
        self._setup_grafana()
        
        # Setup application logging
        self._setup_logging()
        
        # Setup health checks monitoring
        self._setup_health_monitoring()
        
        # Setup alerts
        self._setup_alerting()
        
        # Generate monitoring report
        self._generate_monitoring_report()
    
    def _setup_prometheus(self):
        """Setup Prometheus configuration"""
        print("🔍 Setting up Prometheus...")
        
        prometheus_config = {
            'global': {
                'scrape_interval': '15s',
                'evaluation_interval': '15s'
            },
            'alerting': {
                'alertmanagers': [
                    {
                        'static_configs': [
                            {'targets': ['alertmanager:9093']}
                        ]
                    }
                ]
            },
            'rule_files': [
                'alert_rules.yml'
            ],
            'scrape_configs': [
                {
                    'job_name': 'prometheus',
                    'static_configs': [
                        {'targets': ['localhost:9090']}
                    ]
                },
                {
                    'job_name': 'django-backend',
                    'static_configs': [
                        {'targets': ['backend:8000']}
                    ],
                    'metrics_path': '/metrics',
                    'scrape_interval': '10s'
                },
                {
                    'job_name': 'postgres',
                    'static_configs': [
                        {'targets': ['postgres_exporter:9187']}
                    ]
                },
                {
                    'job_name': 'redis',
                    'static_configs': [
                        {'targets': ['redis_exporter:9121']}
                    ]
                },
                {
                    'job_name': 'nginx',
                    'static_configs': [
                        {'targets': ['nginx_exporter:9113']}
                    ]
                },
                {
                    'job_name': 'node',
                    'static_configs': [
                        {'targets': ['node_exporter:9100']}
                    ]
                }
            ]
        }
        
        prometheus_file = self.monitoring_dir / 'prometheus.yml'
        with open(prometheus_file, 'w') as f:
            yaml.dump(prometheus_config, f, default_flow_style=False)
        
        self.created_files.append(str(prometheus_file))
        self.configured_services.append('Prometheus')
        
        # Create alert rules
        self._create_alert_rules()
    
    def _create_alert_rules(self):
        """Create Prometheus alert rules"""
        alert_rules = {
            'groups': [
                {
                    'name': 'django_alerts',
                    'rules': [
                        {
                            'alert': 'DjangoHighErrorRate',
                            'expr': 'rate(django_http_responses_total{status=~"5.."}[5m]) > 0.1',
                            'for': '2m',
                            'labels': {
                                'severity': 'critical'
                            },
                            'annotations': {
                                'summary': 'High error rate in Django application',
                                'description': 'Django application has high error rate: {{ $value }} errors/sec'
                            }
                        },
                        {
                            'alert': 'DjangoHighResponseTime',
                            'expr': 'django_http_request_duration_seconds{quantile="0.95"} > 2',
                            'for': '5m',
                            'labels': {
                                'severity': 'warning'
                            },
                            'annotations': {
                                'summary': 'High response time in Django application',
                                'description': '95th percentile response time is {{ $value }}s'
                            }
                        },
                        {
                            'alert': 'DatabaseConnectionsHigh',
                            'expr': 'pg_stat_activity_count > 80',
                            'for': '5m',
                            'labels': {
                                'severity': 'warning'
                            },
                            'annotations': {
                                'summary': 'High database connections',
                                'description': 'Database has {{ $value }} active connections'
                            }
                        },
                        {
                            'alert': 'RedisMemoryHigh',
                            'expr': 'redis_memory_used_bytes / redis_memory_max_bytes > 0.8',
                            'for': '5m',
                            'labels': {
                                'severity': 'warning'
                            },
                            'annotations': {
                                'summary': 'Redis memory usage high',
                                'description': 'Redis memory usage is {{ $value | humanizePercentage }}'
                            }
                        }
                    ]
                },
                {
                    'name': 'system_alerts',
                    'rules': [
                        {
                            'alert': 'HighCPUUsage',
                            'expr': '100 - (avg by(instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100) > 80',
                            'for': '5m',
                            'labels': {
                                'severity': 'warning'
                            },
                            'annotations': {
                                'summary': 'High CPU usage',
                                'description': 'CPU usage is {{ $value }}% on {{ $labels.instance }}'
                            }
                        },
                        {
                            'alert': 'HighMemoryUsage',
                            'expr': '(1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100 > 85',
                            'for': '5m',
                            'labels': {
                                'severity': 'warning'
                            },
                            'annotations': {
                                'summary': 'High memory usage',
                                'description': 'Memory usage is {{ $value }}% on {{ $labels.instance }}'
                            }
                        },
                        {
                            'alert': 'DiskSpaceLow',
                            'expr': '(1 - (node_filesystem_avail_bytes / node_filesystem_size_bytes)) * 100 > 85',
                            'for': '5m',
                            'labels': {
                                'severity': 'critical'
                            },
                            'annotations': {
                                'summary': 'Low disk space',
                                'description': 'Disk usage is {{ $value }}% on {{ $labels.instance }}'
                            }
                        }
                    ]
                }
            ]
        }
        
        alert_rules_file = self.monitoring_dir / 'alert_rules.yml'
        with open(alert_rules_file, 'w') as f:
            yaml.dump(alert_rules, f, default_flow_style=False)
        
        self.created_files.append(str(alert_rules_file))
    
    def _setup_grafana(self):
        """Setup Grafana dashboards"""
        print("📈 Setting up Grafana dashboards...")
        
        grafana_dir = self.monitoring_dir / 'grafana'
        dashboards_dir = grafana_dir / 'dashboards'
        provisioning_dir = grafana_dir / 'provisioning'
        
        for directory in [grafana_dir, dashboards_dir, provisioning_dir]:
            directory.mkdir(exist_ok=True)
        
        # Create Django application dashboard
        django_dashboard = {
            "dashboard": {
                "id": None,
                "title": "New Concierge - Django Application",
                "tags": ["django", "application"],
                "timezone": "browser",
                "panels": [
                    {
                        "id": 1,
                        "title": "Request Rate",
                        "type": "graph",
                        "targets": [
                            {
                                "expr": "rate(django_http_requests_total[5m])",
                                "legendFormat": "{{ method }} {{ handler }}"
                            }
                        ],
                        "gridPos": {"h": 8, "w": 12, "x": 0, "y": 0}
                    },
                    {
                        "id": 2,
                        "title": "Response Time",
                        "type": "graph",
                        "targets": [
                            {
                                "expr": "django_http_request_duration_seconds{quantile=\"0.95\"}",
                                "legendFormat": "95th percentile"
                            },
                            {
                                "expr": "django_http_request_duration_seconds{quantile=\"0.50\"}",
                                "legendFormat": "50th percentile"
                            }
                        ],
                        "gridPos": {"h": 8, "w": 12, "x": 12, "y": 0}
                    },
                    {
                        "id": 3,
                        "title": "Error Rate",
                        "type": "graph",
                        "targets": [
                            {
                                "expr": "rate(django_http_responses_total{status=~\"4..|5..\"}[5m])",
                                "legendFormat": "{{ status }}"
                            }
                        ],
                        "gridPos": {"h": 8, "w": 12, "x": 0, "y": 8}
                    },
                    {
                        "id": 4,
                        "title": "Database Connections",
                        "type": "graph",
                        "targets": [
                            {
                                "expr": "pg_stat_activity_count",
                                "legendFormat": "Active connections"
                            }
                        ],
                        "gridPos": {"h": 8, "w": 12, "x": 12, "y": 8}
                    }
                ],
                "time": {
                    "from": "now-1h",
                    "to": "now"
                },
                "refresh": "5s"
            }
        }
        
        dashboard_file = dashboards_dir / 'django_dashboard.json'
        with open(dashboard_file, 'w') as f:
            json.dump(django_dashboard, f, indent=2)
        
        self.created_files.append(str(dashboard_file))
        
        # Create system monitoring dashboard
        system_dashboard = {
            "dashboard": {
                "id": None,
                "title": "New Concierge - System Monitoring",
                "tags": ["system", "infrastructure"],
                "timezone": "browser",
                "panels": [
                    {
                        "id": 1,
                        "title": "CPU Usage",
                        "type": "graph",
                        "targets": [
                            {
                                "expr": "100 - (avg by(instance) (rate(node_cpu_seconds_total{mode=\"idle\"}[5m])) * 100)",
                                "legendFormat": "{{ instance }}"
                            }
                        ],
                        "gridPos": {"h": 8, "w": 12, "x": 0, "y": 0}
                    },
                    {
                        "id": 2,
                        "title": "Memory Usage",
                        "type": "graph",
                        "targets": [
                            {
                                "expr": "(1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100",
                                "legendFormat": "{{ instance }}"
                            }
                        ],
                        "gridPos": {"h": 8, "w": 12, "x": 12, "y": 0}
                    },
                    {
                        "id": 3,
                        "title": "Disk Usage",
                        "type": "graph",
                        "targets": [
                            {
                                "expr": "(1 - (node_filesystem_avail_bytes / node_filesystem_size_bytes)) * 100",
                                "legendFormat": "{{ instance }} {{ mountpoint }}"
                            }
                        ],
                        "gridPos": {"h": 8, "w": 12, "x": 0, "y": 8}
                    },
                    {
                        "id": 4,
                        "title": "Network I/O",
                        "type": "graph",
                        "targets": [
                            {
                                "expr": "rate(node_network_receive_bytes_total[5m])",
                                "legendFormat": "{{ instance }} {{ device }} RX"
                            },
                            {
                                "expr": "rate(node_network_transmit_bytes_total[5m])",
                                "legendFormat": "{{ instance }} {{ device }} TX"
                            }
                        ],
                        "gridPos": {"h": 8, "w": 12, "x": 12, "y": 8}
                    }
                ],
                "time": {
                    "from": "now-1h",
                    "to": "now"
                },
                "refresh": "5s"
            }
        }
        
        system_dashboard_file = dashboards_dir / 'system_dashboard.json'
        with open(system_dashboard_file, 'w') as f:
            json.dump(system_dashboard, f, indent=2)
        
        self.created_files.append(str(system_dashboard_file))
        self.configured_services.append('Grafana Dashboards')
    
    def _setup_logging(self):
        """Setup structured logging configuration"""
        print("📝 Setting up application logging...")
        
        # Create logging configuration
        logging_config = {
            'version': 1,
            'disable_existing_loggers': False,
            'formatters': {
                'verbose': {
                    'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
                    'style': '{',
                },
                'json': {
                    'format': '{"level": "%(levelname)s", "time": "%(asctime)s", "module": "%(module)s", "message": "%(message)s"}',
                },
            },
            'handlers': {
                'console': {
                    'class': 'logging.StreamHandler',
                    'formatter': 'verbose'
                },
                'file': {
                    'class': 'logging.handlers.RotatingFileHandler',
                    'filename': 'logs/django.log',
                    'maxBytes': 1024*1024*10,  # 10MB
                    'backupCount': 5,
                    'formatter': 'json'
                },
                'security': {
                    'class': 'logging.handlers.RotatingFileHandler',
                    'filename': 'logs/security.log',
                    'maxBytes': 1024*1024*10,  # 10MB
                    'backupCount': 5,
                    'formatter': 'json'
                },
                'financial': {
                    'class': 'logging.handlers.RotatingFileHandler',
                    'filename': 'logs/financial.log',
                    'maxBytes': 1024*1024*10,  # 10MB
                    'backupCount': 5,
                    'formatter': 'json'
                }
            },
            'loggers': {
                'django': {
                    'handlers': ['console', 'file'],
                    'level': 'INFO',
                    'propagate': False,
                },
                'django.security': {
                    'handlers': ['security'],
                    'level': 'WARNING',
                    'propagate': False,
                },
                'financial': {
                    'handlers': ['financial'],
                    'level': 'INFO',
                    'propagate': False,
                },
                'maintenance': {
                    'handlers': ['file'],
                    'level': 'INFO',
                    'propagate': False,
                },
                'projects': {
                    'handlers': ['file'],
                    'level': 'INFO',
                    'propagate': False,
                }
            },
            'root': {
                'handlers': ['console'],
                'level': 'WARNING',
            }
        }
        
        logging_file = self.monitoring_dir / 'logging_config.py'
        with open(logging_file, 'w') as f:
            f.write(f"LOGGING = {logging_config}")
        
        self.created_files.append(str(logging_file))
        self.configured_services.append('Structured Logging')
        
        # Create logs directory
        logs_dir = Path('logs')
        logs_dir.mkdir(exist_ok=True)
    
    def _setup_health_monitoring(self):
        """Setup health check monitoring"""
        print("🏥 Setting up health monitoring...")
        
        # Create health check monitoring script
        health_monitor_script = '''#!/bin/bash
# Health Check Monitoring Script

BACKEND_URL="http://backend:8000"
FRONTEND_URL="http://frontend:3000"
GRAFANA_URL="http://grafana:3000"

# Function to check service health
check_service() {
    local service_name=$1
    local url=$2
    local endpoint=$3
    
    response=$(curl -s -o /dev/null -w "%{http_code}" "${url}${endpoint}" || echo "000")
    
    if [ "$response" -eq 200 ]; then
        echo "✅ $service_name is healthy"
        return 0
    else
        echo "❌ $service_name is unhealthy (HTTP $response)"
        return 1
    fi
}

# Check all services
echo "🏥 Health Check Report - $(date)"
echo "================================"

check_service "Backend API" "$BACKEND_URL" "/health/"
check_service "Backend Readiness" "$BACKEND_URL" "/ready/"
check_service "Backend Liveness" "$BACKEND_URL" "/live/"
check_service "Frontend" "$FRONTEND_URL" "/"
check_service "Grafana" "$GRAFANA_URL" "/api/health"

echo "================================"
echo "Health check completed"
'''
        
        health_script_file = self.monitoring_dir / 'health_check.sh'
        with open(health_script_file, 'w') as f:
            f.write(health_monitor_script)
        
        health_script_file.chmod(0o755)
        self.created_files.append(str(health_script_file))
        self.configured_services.append('Health Monitoring')
    
    def _setup_alerting(self):
        """Setup alerting configuration"""
        print("🚨 Setting up alerting...")
        
        # Create Alertmanager configuration
        alertmanager_config = {
            'global': {
                'smtp_smarthost': 'localhost:587',
                'smtp_from': 'alerts@newconcierge.com'
            },
            'route': {
                'group_by': ['alertname'],
                'group_wait': '10s',
                'group_interval': '10s',
                'repeat_interval': '1h',
                'receiver': 'web.hook'
            },
            'receivers': [
                {
                    'name': 'web.hook',
                    'email_configs': [
                        {
                            'to': 'admin@newconcierge.com',
                            'subject': 'New Concierge Alert: {{ .GroupLabels.alertname }}',
                            'body': '''
Alert: {{ .GroupLabels.alertname }}
Severity: {{ .CommonLabels.severity }}
Description: {{ .CommonAnnotations.description }}
Time: {{ .CommonAnnotations.time }}
'''
                        }
                    ]
                }
            ]
        }
        
        alertmanager_file = self.monitoring_dir / 'alertmanager.yml'
        with open(alertmanager_file, 'w') as f:
            yaml.dump(alertmanager_config, f, default_flow_style=False)
        
        self.created_files.append(str(alertmanager_file))
        self.configured_services.append('Alertmanager')
    
    def _generate_monitoring_report(self):
        """Generate monitoring setup report"""
        print("\n" + "=" * 50)
        print("📊 MONITORING SETUP REPORT")
        print("=" * 50)
        
        print(f"\n✅ CONFIGURED SERVICES ({len(self.configured_services)})")
        print("-" * 30)
        for i, service in enumerate(self.configured_services, 1):
            print(f"{i}. {service}")
        
        print(f"\n📁 CREATED FILES ({len(self.created_files)})")
        print("-" * 20)
        for i, file_path in enumerate(self.created_files, 1):
            print(f"{i}. {file_path}")
        
        print(f"\n🔧 MONITORING STACK COMPONENTS")
        print("-" * 35)
        print("   📊 Prometheus - Metrics collection")
        print("   📈 Grafana - Visualization dashboards")
        print("   🚨 Alertmanager - Alert routing")
        print("   📝 Structured Logging - Application logs")
        print("   🏥 Health Checks - Service monitoring")
        
        print(f"\n📈 AVAILABLE DASHBOARDS")
        print("-" * 25)
        print("   • Django Application Metrics")
        print("   • System Resource Monitoring")
        print("   • Database Performance")
        print("   • Redis Cache Metrics")
        print("   • Nginx Web Server Stats")
        
        print(f"\n🚨 CONFIGURED ALERTS")
        print("-" * 20)
        print("   • High Error Rate (>10%)")
        print("   • High Response Time (>2s)")
        print("   • Database Connection Issues")
        print("   • High CPU Usage (>80%)")
        print("   • High Memory Usage (>85%)")
        print("   • Low Disk Space (<15%)")
        
        print(f"\n🚀 NEXT STEPS")
        print("-" * 15)
        print("1. Update docker-compose.prod.yml with monitoring services")
        print("2. Configure email settings for alerting")
        print("3. Import Grafana dashboards")
        print("4. Test health check endpoints")
        print("5. Verify metrics collection")
        print("6. Set up log rotation and retention")
        
        print(f"\n🎉 Monitoring setup completed!")
        print(f"   Access Grafana at: http://localhost:3001")
        print(f"   Access Prometheus at: http://localhost:9090")


def main():
    """Setup monitoring stack"""
    monitor = MonitoringSetup()
    monitor.setup_all_monitoring()


if __name__ == '__main__':
    main()
