-- Add name column to employees table
ALTER TABLE employees ADD COLUMN IF NOT EXISTS name TEXT;

-- Update existing records to combine first_name and last_name
UPDATE employees SET name = TRIM(first_name || ' ' || COALESCE(last_name, '')) WHERE name IS NULL;

-- Create a function to automatically update name when first_name or last_name changes
CREATE OR REPLACE FUNCTION update_employee_name()
RETURNS TRIGGER AS $$
BEGIN
    NEW.name = TRIM(NEW.first_name || ' ' || COALESCE(NEW.last_name, ''));
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update name
DROP TRIGGER IF EXISTS update_employee_name_trigger ON employees;
CREATE TRIGGER update_employee_name_trigger
    BEFORE INSERT OR UPDATE OF first_name, last_name ON employees
    FOR EACH ROW
    EXECUTE FUNCTION update_employee_name();