"""
API Documentation Generator
Generates comprehensive OpenAPI/Swagger documentation
"""

import os
import sys
import django
from pathlib import Path

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django.urls import get_resolver
from rest_framework.schemas.openapi import AutoSchema
from rest_framework.views import APIView


class APIDocumentationGenerator:
    """Generate comprehensive API documentation"""
    
    def __init__(self):
        self.api_info = {
            "title": "New Concierge Building Management API",
            "version": "1.0.0",
            "description": "Comprehensive API for multi-tenant building management system",
            "contact": {
                "name": "Development Team",
                "email": "dev@newconcierge.com"
            }
        }
    
    def generate_openapi_schema(self):
        """Generate OpenAPI schema"""
        schema = {
            "openapi": "3.0.0",
            "info": self.api_info,
            "servers": [
                {"url": "https://api.newconcierge.com", "description": "Production"},
                {"url": "http://localhost:8000", "description": "Development"}
            ],
            "paths": self._generate_paths(),
            "components": {
                "schemas": self._generate_schemas(),
                "securitySchemes": {
                    "bearerAuth": {
                        "type": "http",
                        "scheme": "bearer",
                        "bearerFormat": "JWT"
                    }
                }
            },
            "security": [{"bearerAuth": []}]
        }
        return schema
    
    def _generate_paths(self):
        """Generate API paths documentation"""
        paths = {
            "/api/auth/login/": {
                "post": {
                    "tags": ["Authentication"],
                    "summary": "User login",
                    "requestBody": {
                        "required": True,
                        "content": {
                            "application/json": {
                                "schema": {
                                    "type": "object",
                                    "properties": {
                                        "email": {"type": "string"},
                                        "password": {"type": "string"}
                                    }
                                }
                            }
                        }
                    },
                    "responses": {
                        "200": {"description": "Login successful"},
                        "401": {"description": "Invalid credentials"}
                    }
                }
            },
            "/api/buildings/": {
                "get": {
                    "tags": ["Buildings"],
                    "summary": "List buildings",
                    "responses": {
                        "200": {"description": "Buildings list"}
                    }
                },
                "post": {
                    "tags": ["Buildings"],
                    "summary": "Create building",
                    "responses": {
                        "201": {"description": "Building created"}
                    }
                }
            },
            "/api/financial/transactions/": {
                "get": {
                    "tags": ["Financial"],
                    "summary": "List transactions",
                    "responses": {
                        "200": {"description": "Transactions list"}
                    }
                }
            }
        }
        return paths
    
    def _generate_schemas(self):
        """Generate data schemas"""
        schemas = {
            "Building": {
                "type": "object",
                "properties": {
                    "id": {"type": "integer"},
                    "name": {"type": "string"},
                    "address": {"type": "string"},
                    "city": {"type": "string"}
                }
            },
            "Transaction": {
                "type": "object",
                "properties": {
                    "id": {"type": "integer"},
                    "amount": {"type": "number"},
                    "type": {"type": "string"},
                    "description": {"type": "string"}
                }
            }
        }
        return schemas
    
    def generate_documentation(self):
        """Generate complete API documentation"""
        schema = self.generate_openapi_schema()
        
        # Save OpenAPI schema
        import json
        with open('api_schema.json', 'w') as f:
            json.dump(schema, f, indent=2)
        
        print("✅ API documentation generated successfully!")
        return schema


def main():
    """Generate API documentation"""
    generator = APIDocumentationGenerator()
    generator.generate_documentation()


if __name__ == '__main__':
    main()
