import fs from 'fs';

const file = './src/components/HoyView.tsx';
let content = fs.readFileSync(file, 'utf8');

// Replace standard weird typography combinations in HoyView classNames
content = content.replace(/uppercase tracking-\[0\.[0-9]+em\]/g, 'tracking-normal');
content = content.replace(/uppercase tracking-[a-z]+/g, 'tracking-normal');
content = content.replace(/text-sm font-bold/g, 'text-base font-semibold');
content = content.replace(/text-xs text-\[\#a2b29f\] text-center py-12 uppercase tracking-wide/g, 'text-sm text-[#a2b29f] text-center py-12');
content = content.replace(/ font-mono /g, ' text-sm font-medium ');

fs.writeFileSync(file, content, 'utf8');
console.log('Fixed', file);
