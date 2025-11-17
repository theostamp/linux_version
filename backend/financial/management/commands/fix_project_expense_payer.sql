-- SQL script to fix payer_responsibility for project expenses
-- Specifically fixes "Επισκευή Όψεων Κτιρίου" expenses for Βουλής 6 -Demo building
-- Also includes related advance payments (προκαταβολές) for the same project
-- 
-- Usage: Execute this SQL script directly on the database
-- Make sure to replace the schema name if needed (e.g., 'public' or tenant schema)

-- First, let's see what we're working with (main expenses)
SELECT 
    e.id,
    b.name as building_name,
    e.title,
    e.amount,
    e.date,
    e.category,
    e.payer_responsibility,
    e.notes
FROM financial_expense e
JOIN buildings_building b ON e.building_id = b.id
WHERE 
    b.name ILIKE '%Βουλής 6%'
    AND e.title ILIKE '%Επισκευή Όψεων%'
    AND (e.category = 'maintenance_project' OR e.category = 'project')
    AND e.payer_responsibility = 'resident';

-- Also check for related advance payments (προκαταβολές)
SELECT 
    e.id,
    b.name as building_name,
    e.title,
    e.amount,
    e.date,
    e.category,
    e.payer_responsibility,
    e.notes
FROM financial_expense e
JOIN buildings_building b ON e.building_id = b.id
WHERE 
    b.name ILIKE '%Βουλής 6%'
    AND (e.notes ILIKE '%Προκαταβολή%' OR e.title ILIKE '%Προκαταβολή%')
    AND (e.category = 'maintenance_project' OR e.category = 'project')
    AND e.payer_responsibility = 'resident';

-- Update the main expenses to set payer_responsibility to 'owner'
UPDATE financial_expense
SET payer_responsibility = 'owner'
WHERE id IN (
    SELECT e.id
    FROM financial_expense e
    JOIN buildings_building b ON e.building_id = b.id
    WHERE 
        b.name ILIKE '%Βουλής 6%'
        AND e.title ILIKE '%Επισκευή Όψεων%'
        AND (e.category = 'maintenance_project' OR e.category = 'project')
        AND e.payer_responsibility = 'resident'
);

-- Update related advance payments (προκαταβολές) to set payer_responsibility to 'owner'
UPDATE financial_expense
SET payer_responsibility = 'owner'
WHERE id IN (
    SELECT e.id
    FROM financial_expense e
    JOIN buildings_building b ON e.building_id = b.id
    WHERE 
        b.name ILIKE '%Βουλής 6%'
        AND (e.notes ILIKE '%Προκαταβολή%' OR e.title ILIKE '%Προκαταβολή%')
        AND (e.category = 'maintenance_project' OR e.category = 'project')
        AND e.payer_responsibility = 'resident'
);

-- Verify the update
SELECT 
    e.id,
    b.name as building_name,
    e.title,
    e.amount,
    e.date,
    e.category,
    e.payer_responsibility,
    e.notes
FROM financial_expense e
JOIN buildings_building b ON e.building_id = b.id
WHERE 
    b.name ILIKE '%Βουλής 6%'
    AND e.title ILIKE '%Επισκευή Όψεων%'
    AND (e.category = 'maintenance_project' OR e.category = 'project');

-- Summary: Count expenses by payer_responsibility
SELECT 
    e.payer_responsibility,
    COUNT(*) as count,
    SUM(e.amount) as total_amount
FROM financial_expense e
JOIN buildings_building b ON e.building_id = b.id
WHERE 
    b.name ILIKE '%Βουλής 6%'
    AND e.title ILIKE '%Επισκευή Όψεων%'
    AND (e.category = 'maintenance_project' OR e.category = 'project')
GROUP BY e.payer_responsibility;

