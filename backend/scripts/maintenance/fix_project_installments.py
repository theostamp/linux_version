#!/usr/bin/env python
"""
Script to fix projects with installments payment method that have incorrect expenses.

This script:
1. Finds projects with payment_method='installments' but installments <= 1
2. Checks if expenses are created as one-time instead of installments
3. Fixes the expenses by recreating them with proper installments
"""

import os
import sys
import django
from django.conf import settings
from django.db import transaction
from django.utils import timezone
from datetime import timedelta
from decimal import Decimal

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from projects.models import Project, Offer
from financial.models import Expense
from scheduled_maintenance.models import ScheduledMaintenance, PaymentSchedule
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


def find_projects_with_installment_issues():
    """Find projects that have installment payment method but incorrect installments value"""
    issues = []
    
    # Find projects with payment_method='installments'
    projects = Project.objects.filter(payment_method='installments')
    
    for project in projects:
        issue = {
            'project': project,
            'issue_type': None,
            'current_installments': project.installments,
            'expenses': [],
        }
        
        # Check if installments is <= 1
        if not project.installments or project.installments <= 1:
            issue['issue_type'] = 'installments_not_set'
            issue['message'] = f"Project {project.id} has payment_method='installments' but installments={project.installments}"
        
        # Check expenses for this project
        expenses = Expense.objects.filter(
            project=project
        ).order_by('date')
        
        if expenses.exists():
            # Check if there's only one expense (should be multiple for installments)
            if expenses.count() == 1:
                expense = expenses.first()
                # Check if it's a one-time expense (not an installment)
                if 'Δόση' not in expense.title and 'Προκαταβολή' not in expense.title:
                    issue['issue_type'] = 'one_time_expense_instead_of_installments'
                    issue['message'] = f"Project {project.id} has one-time expense instead of installments"
                    issue['expenses'] = list(expenses.values('id', 'title', 'amount', 'date'))
            else:
                # Check if all expenses are installments
                installment_count = sum(1 for exp in expenses if 'Δόση' in exp.title or 'Προκαταβολή' in exp.title)
                if installment_count < expenses.count():
                    issue['issue_type'] = 'mixed_expenses'
                    issue['message'] = f"Project {project.id} has mixed expense types"
                    issue['expenses'] = list(expenses.values('id', 'title', 'amount', 'date'))
        
        # Check if there's an accepted offer with installments
        accepted_offer = Offer.objects.filter(
            project=project,
            status='accepted'
        ).first()
        
        if accepted_offer:
            issue['offer'] = accepted_offer
            issue['offer_installments'] = accepted_offer.installments
            issue['offer_payment_method'] = accepted_offer.payment_method
            
            # If offer has installments > 1 but project doesn't, that's the issue
            if accepted_offer.installments and accepted_offer.installments > 1:
                if not project.installments or project.installments <= 1:
                    issue['issue_type'] = 'project_installments_mismatch'
                    issue['message'] = (
                        f"Project {project.id} has installments={project.installments} "
                        f"but accepted offer has installments={accepted_offer.installments}"
                    )
        
        if issue['issue_type']:
            issues.append(issue)
    
    return issues


def fix_project_installments(project, offer=None, target_installments=None):
    """
    Fix a project's installments and recreate expenses if needed.
    
    Args:
        project: The Project instance to fix
        offer: The accepted Offer (optional, will try to find it)
        target_installments: Target number of installments (optional, will use offer's value)
    """
    if not offer:
        offer = Offer.objects.filter(
            project=project,
            status='accepted'
        ).first()
    
    if not offer:
        logger.warning(f"No accepted offer found for project {project.id}")
        return False
    
    # Determine target installments
    if not target_installments:
        target_installments = offer.installments
    
    if not target_installments or target_installments <= 1:
        logger.warning(f"Offer {offer.id} has invalid installments={target_installments}")
        return False
    
    logger.info(f"Fixing project {project.id}: Setting installments={target_installments}")
    
    with transaction.atomic():
        # Update project with correct installments
        project.installments = target_installments
        project.payment_method = offer.payment_method
        project.advance_payment = offer.advance_payment
        project.final_cost = offer.amount
        project.save()
        
        logger.info(f"Updated project {project.id} with installments={target_installments}")
        
        # Check if we need to recreate expenses
        # Find expenses that are not installments
        one_time_expenses = Expense.objects.filter(
            project=project
        ).exclude(
            title__icontains='Δόση'
        ).exclude(
            title__icontains='Προκαταβολή'
        )
        
        if one_time_expenses.exists():
            # Check if they're paid or old
            paid_expenses = one_time_expenses.exclude(paid_amount__isnull=True).exclude(paid_amount=0)
            old_expenses = one_time_expenses.filter(created_at__lt=timezone.now() - timedelta(hours=24))
            
            if paid_expenses.exists():
                logger.warning(
                    f"⚠️ Cannot delete paid expenses for project {project.id}. "
                    f"Please fix manually."
                )
                return False
            
            if old_expenses.exists():
                logger.warning(
                    f"⚠️ Cannot delete old expenses (>24h) for project {project.id}. "
                    f"Please fix manually."
                )
                return False
            
            # Safe to delete and recreate
            logger.info(f"Deleting {one_time_expenses.count()} one-time expenses for project {project.id}")
            one_time_expenses.delete()
            
            # Recreate expenses using update_project_schedule
            from projects.views import update_project_schedule
            logger.info(f"Recreating expenses for project {project.id}")
            update_project_schedule(project, offer)
            logger.info(f"✅ Successfully recreated expenses for project {project.id}")
            return True
        else:
            logger.info(f"No one-time expenses found for project {project.id}. Expenses are already correct.")
            return True


def main():
    """Main function to find and fix projects with installment issues"""
    logger.info("=" * 80)
    logger.info("PROJECT INSTALLMENTS FIX SCRIPT")
    logger.info("=" * 80)
    
    # Find issues
    logger.info("\n1. Scanning for projects with installment issues...")
    issues = find_projects_with_installment_issues()
    
    if not issues:
        logger.info("✅ No issues found! All projects with installments are configured correctly.")
        return
    
    logger.info(f"\nFound {len(issues)} projects with issues:\n")
    
    for i, issue in enumerate(issues, 1):
        project = issue['project']
        logger.info(f"{i}. Project ID: {project.id}")
        logger.info(f"   Title: {project.title}")
        logger.info(f"   Issue: {issue['message']}")
        logger.info(f"   Current installments: {issue['current_installments']}")
        if 'offer' in issue:
            logger.info(f"   Offer installments: {issue['offer_installments']}")
        if issue['expenses']:
            logger.info(f"   Expenses: {len(issue['expenses'])} found")
            for exp in issue['expenses'][:3]:  # Show first 3
                logger.info(f"     - {exp['title']}: {exp['amount']}€ ({exp['date']})")
        logger.info("")
    
    # Ask for confirmation
    print("\n" + "=" * 80)
    response = input(f"Do you want to fix these {len(issues)} projects? (yes/no): ").strip().lower()
    
    if response not in ['yes', 'y']:
        logger.info("Aborted by user.")
        return
    
    # Fix issues
    logger.info("\n2. Fixing projects...")
    fixed_count = 0
    failed_count = 0
    
    for issue in issues:
        project = issue['project']
        offer = issue.get('offer')
        
        try:
            if fix_project_installments(project, offer):
                fixed_count += 1
                logger.info(f"✅ Fixed project {project.id}")
            else:
                failed_count += 1
                logger.warning(f"❌ Failed to fix project {project.id}")
        except Exception as e:
            failed_count += 1
            logger.error(f"❌ Error fixing project {project.id}: {e}", exc_info=True)
    
    # Summary
    logger.info("\n" + "=" * 80)
    logger.info("SUMMARY")
    logger.info("=" * 80)
    logger.info(f"Total issues found: {len(issues)}")
    logger.info(f"Fixed: {fixed_count}")
    logger.info(f"Failed: {failed_count}")
    logger.info("=" * 80)


if __name__ == '__main__':
    main()



