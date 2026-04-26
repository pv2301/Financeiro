import os
import re

def check_lucide_imports(directory):
    for root, dirs, files in os.walk(directory):
        for file in files:
            if file.endswith('.tsx'):
                path = os.path.join(root, file)
                with open(path, 'r', encoding='utf-8') as f:
                    content = f.read()
                    
                # Find lucide-react imports
                import_match = re.search(r"import\s*\{([^}]+)\}\s*from\s*['\"]lucide-react['\"]", content)
                if import_match:
                    imported_icons = [i.strip() for i in import_match.group(1).split(',')]
                    
                    # Find potential icon usages: <IconName ... />
                    # This is a simplified check
                    potential_usages = re.findall(r"<([A-Z][a-zA-Z0-9]+)\s*[^/>]*/?>", content)
                    
                    # List of known common non-icon components to ignore
                    ignore = {'Route', 'Routes', 'Navigate', 'Link', 'BrowserRouter', 'Router', 'App', 'Layout', 'ProtectedRoute', 'AuthProvider', 'ErrorBoundary', 'Tooltip', 'ConfirmDialog', 'motion', 'AnimatePresence', 'Student', 'Invoice', 'ClassInfo', 'ServiceItem', 'FloatingBulkActions', 'ProcessingStats', 'FixedBillingTable', 'ConsumptionTable', 'IntegralBillingTable', 'IntegralModals', 'TemplateModal', 'ImportStudentsModal', 'ImportPaymentsModal', 'ImportConsumptionModal', 'EditServiceModal', 'DeleteDataModal', 'LogoManagerModal', 'RoleProtectedRoute', 'Provider', 'Cell', 'Bar', 'Legend', 'Area', 'XAxis', 'YAxis', 'CartesianGrid', 'ResponsiveContainer', 'Pie', 'BarChart', 'AreaChart', 'PieChart'}
                    
                    missing = []
                    for usage in potential_usages:
                        if usage not in imported_icons and usage not in ignore and not usage.startswith('Fragment'):
                            # Also check if it's imported from somewhere else
                            if f"import {usage}" not in content and f"import {{ {usage}" not in content and f"const {usage}" not in content and f"function {usage}" not in content:
                                missing.append(usage)
                    
                    if missing:
                        print(f"File: {path}")
                        print(f"  Missing imports: {set(missing)}")

if __name__ == "__main__":
    check_lucide_imports('src')
