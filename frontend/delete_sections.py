file_path = 'd:/Dev/tourist-distribution-management-system-main/frontend/src/App.js'
with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
for i, line in enumerate(lines):
    line_num = i + 1
    # TrendsTab: 1142 to 1476
    if 1142 <= line_num <= 1476: continue
    # DemographicsTab: 1479 to 1786
    if 1479 <= line_num <= 1786: continue
    # ExternalFactorsTab: 1788 to 2121
    if 1788 <= line_num <= 2121: continue
    new_lines.append(line)

with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)
print("Successfully removed unused sections.")
