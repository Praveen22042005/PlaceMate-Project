import os, re

def get_depth(filepath):
    # Normalized path relative to src
    rel = os.path.relpath(filepath, 'e:/Projects/PlaceMate-Project/src')
    return rel.count(os.sep)

def refactor_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    if 'auth.currentUser' not in content:
        return

    # Determine relative path to AuthContext
    depth = get_depth(filepath)
    prefix = '../' * depth if depth > 0 else './'
    auth_path = f"{prefix}contexts/AuthContext"

    # Add import useAuth
    if 'useAuth' not in content:
        import_match = list(re.finditer(r'^import .*;\n', content, re.MULTILINE))
        if import_match:
            last_import = import_match[-1]
            content = content[:last_import.end()] + f"import {{ useAuth }} from '{auth_path}';\n" + content[last_import.end():]
        else:
            content = f"import {{ useAuth }} from '{auth_path}';\n" + content

    # Add const { user } = useAuth();
    if 'const { user }' not in content:
        comp_match = re.search(r'(export default function \w+\(.*?\)\s*\{|const \w+ = \(.*?\)\s*=>\s*\{)', content)
        if comp_match:
            comp_start = comp_match.end()
            content = content[:comp_start] + '\n  const { user } = useAuth();' + content[comp_start:]

    # Replace auth.currentUser with user
    content = content.replace('auth.currentUser', 'user')

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

    print(f'Refactored {filepath}')

for root, dirs, files in os.walk('e:/Projects/PlaceMate-Project/src'):
    for file in files:
        if file.endswith('.tsx') or file.endswith('.ts'):
            refactor_file(os.path.join(root, file))
