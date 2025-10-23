#!/usr/bin/env python3
import re
import os

pages_dir = "client/src/pages"
files = [
    "photos.tsx", "recent-real.tsx", "ai-profile.tsx", "coins.tsx",
    "recent.tsx", "post-detail.tsx", "chat-simple.tsx", "chat.tsx",
    "upload.tsx", "studio-real.tsx", "home-new.tsx", "studio.tsx"
]

for filename in files:
    filepath = os.path.join(pages_dir, filename)
    if not os.path.exists(filepath):
        continue
    
    with open(filepath, 'r') as f:
        content = f.read()
    
    # Remove the flex wrapper and Sidebar pattern
    # Pattern: <div className="flex">...<Sidebar />...<main className="flex-1">
    content = re.sub(
        r'<div className="flex">\s*<Sidebar />\s*<main className="flex-1">',
        '',
        content,
        flags=re.MULTILINE
    )
    
    # Remove closing tags that were part of the wrapper
    # Find and remove </main></div> patterns that were wrapper closings
    lines = content.split('\n')
    new_lines = []
    skip_next = False
    
    for i, line in enumerate(lines):
        # Skip closing main and div tags that are likely from sidebar wrapper
        if '</main>' in line and '</div>' in lines[i+1] if i+1 < len(lines) else False:
            skip_next = True
            continue
        if skip_next and '</div>' in line:
            skip_next = False
            continue
        new_lines.append(line)
    
    content = '\n'.join(new_lines)
    
    with open(filepath, 'w') as f:
        f.write(content)

print("Sidebar removed from all files")
