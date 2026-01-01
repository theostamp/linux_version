/**
 * PermissionGuard Usage Examples
 *
 * Comprehensive examples showing how to use PermissionGuard
 * and its variants in different scenarios.
 */

'use client';

import React from 'react';
import {
  PermissionGuard,
  MultiPermissionGuard,
  PermissionBadge,
  PermissionAlert,
} from './PermissionGuard';
import { Button } from '@/components/ui/button';
import { Trash2, Edit, DollarSign, Eye } from 'lucide-react';

// ========================================================================
// Example 1: Basic Usage
// ========================================================================

export const BasicExample = () => {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Basic Permission Guard</h2>

      {/* Hide if no permission */}
      <PermissionGuard action="edit">
        <Button>
          <Edit className="w-4 h-4 mr-2" />
          Edit Building
        </Button>
      </PermissionGuard>

      {/* Always visible (for comparison) */}
      <Button variant="outline">
        <Eye className="w-4 h-4 mr-2" />
        View Building (Always Visible)
      </Button>
    </div>
  );
};

// ========================================================================
// Example 2: With Custom Fallback
// ========================================================================

export const FallbackExample = () => {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Custom Fallback</h2>

      {/* Custom fallback component */}
      <PermissionGuard
        action="delete"
        fallback={
          <Button disabled variant="outline">
            <Trash2 className="w-4 h-4 mr-2" />
            Delete (No Permission)
          </Button>
        }
      >
        <Button variant="destructive">
          <Trash2 className="w-4 h-4 mr-2" />
          Delete Building
        </Button>
      </PermissionGuard>
    </div>
  );
};

// ========================================================================
// Example 3: With Tooltip
// ========================================================================

export const TooltipExample = () => {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">With Tooltip Explanation</h2>

      {/* Shows tooltip on hover when no permission */}
      <PermissionGuard action="edit" fallback="tooltip">
        <Button>
          <Edit className="w-4 h-4 mr-2" />
          Edit Building
        </Button>
      </PermissionGuard>

      <p className="text-sm text-gray-600">
        Hover over the button to see why it's disabled (if no permission)
      </p>
    </div>
  );
};

// ========================================================================
// Example 4: Disable Instead of Hide
// ========================================================================

export const DisableExample = () => {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Disable Instead of Hide</h2>

      {/* Disabled state instead of hiding */}
      <PermissionGuard action="delete" disableInsteadOfHide>
        <Button variant="destructive">
          <Trash2 className="w-4 h-4 mr-2" />
          Delete Building
        </Button>
      </PermissionGuard>

      <p className="text-sm text-gray-600">
        Button remains visible but grayed out when no permission
      </p>
    </div>
  );
};

// ========================================================================
// Example 5: Multiple Permissions (ALL required)
// ========================================================================

export const MultiPermissionAllExample = () => {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Multiple Permissions (ALL required)</h2>

      {/* Requires BOTH edit AND manage_financials */}
      <MultiPermissionGuard
        actions={['edit', 'manage_financials']}
        requireAll={true}
      >
        <Button>
          <DollarSign className="w-4 h-4 mr-2" />
          Edit Financial Settings
        </Button>
      </MultiPermissionGuard>

      <p className="text-sm text-gray-600">
        Requires both Edit AND Manage Financials permissions
      </p>
    </div>
  );
};

// ========================================================================
// Example 6: Multiple Permissions (ANY)
// ========================================================================

export const MultiPermissionAnyExample = () => {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Multiple Permissions (ANY)</h2>

      {/* Requires EITHER edit OR manage_financials */}
      <MultiPermissionGuard
        actions={['edit', 'manage_financials']}
        requireAll={false}
      >
        <Button>
          <Edit className="w-4 h-4 mr-2" />
          View/Edit Settings
        </Button>
      </MultiPermissionGuard>

      <p className="text-sm text-gray-600">
        Requires either Edit OR Manage Financials permission
      </p>
    </div>
  );
};

// ========================================================================
// Example 7: Permission Badges
// ========================================================================

export const BadgeExample = () => {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Permission Badges</h2>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium w-32">View:</span>
          <PermissionBadge action="view" />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm font-medium w-32">Edit:</span>
          <PermissionBadge action="edit" />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm font-medium w-32">Delete:</span>
          <PermissionBadge action="delete" />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm font-medium w-32">Manage Financials:</span>
          <PermissionBadge action="manage_financials" />
        </div>
      </div>
    </div>
  );
};

// ========================================================================
// Example 8: Permission Alert
// ========================================================================

export const AlertExample = () => {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Permission Alert</h2>

      {/* Shows alert box if no permission, content if has permission */}
      <PermissionAlert action="manage_financials">
        <div className="p-4 border rounded-lg bg-green-50 border-green-200">
          <h3 className="font-semibold text-green-900 mb-2">
            Financial Settings
          </h3>
          <p className="text-sm text-green-800">
            You have access to manage financial settings.
          </p>
        </div>
      </PermissionAlert>
    </div>
  );
};

// ========================================================================
// Example 9: Real-World Usage (Page Component)
// ========================================================================

export const RealWorldExample = () => {
  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Building Management</h1>

        <div className="flex gap-2">
          {/* View button - always visible */}
          <Button variant="outline">
            <Eye className="w-4 h-4 mr-2" />
            View Details
          </Button>

          {/* Edit button - only if has permission */}
          <PermissionGuard action="edit" fallback="tooltip">
            <Button>
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </Button>
          </PermissionGuard>

          {/* Delete button - only if has permission */}
          <PermissionGuard action="delete" fallback="tooltip">
            <Button variant="destructive">
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
          </PermissionGuard>
        </div>
      </div>

      {/* Permission-gated content */}
      <PermissionAlert action="manage_financials">
        <div className="p-4 border rounded-lg">
          <h2 className="text-lg font-semibold mb-2">Financial Overview</h2>
          <p className="text-sm text-gray-600">
            Current Reserve: €5,000
          </p>
        </div>
      </PermissionAlert>

      {/* Permission badges */}
      <div className="p-4 bg-gray-50 rounded-lg">
        <h3 className="text-sm font-semibold mb-3">Your Permissions:</h3>
        <div className="flex flex-wrap gap-3">
          <PermissionBadge action="view" />
          <PermissionBadge action="edit" />
          <PermissionBadge action="delete" />
          <PermissionBadge action="manage_financials" />
        </div>
      </div>
    </div>
  );
};

// ========================================================================
// All Examples in One Page
// ========================================================================

export const PermissionGuardExamplesPage = () => {
  return (
    <div className="container mx-auto py-8 space-y-8">
      <h1 className="text-3xl font-bold mb-8">PermissionGuard Examples</h1>

      <div className="space-y-8 divide-y">
        <BasicExample />
        <FallbackExample />
        <TooltipExample />
        <DisableExample />
        <MultiPermissionAllExample />
        <MultiPermissionAnyExample />
        <BadgeExample />
        <AlertExample />
        <RealWorldExample />
      </div>

      <div className="mt-12 p-6 bg-blue-50 rounded-lg">
        <h2 className="text-lg font-semibold text-blue-900 mb-2">
          💡 Pro Tips
        </h2>
        <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
          <li>Use <code className="bg-blue-100 px-1 rounded">fallback="tooltip"</code> for better UX</li>
          <li>Use <code className="bg-blue-100 px-1 rounded">disableInsteadOfHide</code> to show user what they're missing</li>
          <li>Use <code className="bg-blue-100 px-1 rounded">MultiPermissionGuard</code> when action requires multiple permissions</li>
          <li>Use <code className="bg-blue-100 px-1 rounded">PermissionBadge</code> to show permission status</li>
          <li>Use <code className="bg-blue-100 px-1 rounded">PermissionAlert</code> for full-page permission gates</li>
        </ul>
      </div>
    </div>
  );
};

export default PermissionGuardExamplesPage;
