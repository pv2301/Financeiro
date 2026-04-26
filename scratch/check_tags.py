import sys
import re

def check_jsx_balance(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Remove strings and comments to avoid false positives
    content = re.sub(r'/\*.*?\*/', '', content, flags=re.DOTALL)
    content = re.sub(r'//.*', '', content)
    
    # Find all tags
    # This regex is still a bit naive but better
    all_tags = re.findall(r'<(/?[a-zA-Z0-9\._]+)(\s+[^>]*?)?(/?)>', content)
    
    stack = []
    errors = []
    
    for tag_name, attrs, self_closing in all_tags:
        if self_closing == '/':
            continue
            
        if tag_name.startswith('/'):
            name = tag_name[1:]
            if not stack:
                errors.append(f"Unexpected closing tag: </{name}>")
            else:
                top = stack.pop()
                if top != name:
                    errors.append(f"Mismatched tag: expected </{top}>, found </{name}>")
        else:
            stack.append(tag_name)
            
    if stack:
        errors.append(f"Unclosed tags: {', '.join(stack)}")
        
    for err in errors:
        print(err)
    
    if not errors:
        print("All tags seem balanced!")

if __name__ == "__main__":
    check_jsx_balance(sys.argv[1])
