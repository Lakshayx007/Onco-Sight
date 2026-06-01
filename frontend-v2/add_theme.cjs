const fs = require('fs');
const path = require('path');
const chartsDir = path.join(__dirname, 'src', 'components', 'charts');
const files = fs.readdirSync(chartsDir).filter(f => f.endsWith('.jsx'));

files.forEach(file => {
  const filePath = path.join(chartsDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  if (!content.includes('theme={theme}') && content.includes('<ReactECharts')) {
    content = content.replace(/<ReactECharts([^>]*)>/g, (match, p1) => {
      // Add key={theme} and theme={theme}
      if (p1.includes('theme=')) return match;
      return `<ReactECharts key={theme} theme={theme} ${p1.trim()}>`;
    });
    fs.writeFileSync(filePath, content);
    console.log(`Updated ${file}`);
  }
});
