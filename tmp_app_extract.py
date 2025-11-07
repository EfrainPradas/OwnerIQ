from pathlib import Path
text = Path('frontend/src/App.js').read_text()
start = text.index('function PropertiesView(')
rest = text[start:]
try:
    end_offset = rest.index('\nfunction ', 1)
except ValueError:
    end_offset = len(rest)
properties_block = rest[:end_offset]
print(properties_block[:500])
print('---BLOCK-LENGTH---', len(properties_block))
