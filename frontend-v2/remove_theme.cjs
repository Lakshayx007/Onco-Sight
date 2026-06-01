const fs = require('fs');
const path = require('path');
const chartsDir = path.join(__dirname, 'src', 'components', 'charts');
const files = fs.readdirSync(chartsDir).filter(f => f.endsWith('.jsx'));
files.forEach(file => {
  const filePath = path.join(chartsDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  if (content.includes('theme={theme}')) {
    content = content.replace(/theme=\{theme\}\s*/g, '');
    fs.writeFileSync(filePath, content);
    console.log(`Reverted ${file}`);
  }
});
