import fs from 'fs';
import path from 'path';

function walkDir(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(function(file) {
        file = dir + '/' + file;
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) { 
            results = results.concat(walkDir(file));
        } else { 
            if (file.endsWith('.tsx') || file.endsWith('.ts')) {
                results.push(file);
            }
        }
    });
    return results;
}

const files = walkDir('./src/components');

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    
    // typography normalizations
    content = content.replace(/text-\[11px\]/g, 'text-sm');
    content = content.replace(/text-\[10px\]/g, 'text-xs');
    content = content.replace(/text-\[9px\]/g, 'text-xs');
    content = content.replace(/text-\[9\.5px\]/g, 'text-xs');
    
    // font-data removal
    content = content.replace(/ font-data/g, '');
    content = content.replace(/font-data /g, '');
    
    // Normalizing specific bad uppercase tags
    content = content.replace(/uppercase font-bold/g, 'uppercase font-medium tracking-wider');
    content = content.replace(/font-bold uppercase/g, 'font-medium uppercase tracking-wider');
    
    fs.writeFileSync(file, content, 'utf8');
    console.log('Fixed', file);
});
