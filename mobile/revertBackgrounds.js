// const fs = require('fs');
// const path = require('path');

// const dirs = [path.join(__dirname, 'src'), path.join(__dirname, 'app')];

// const replacements = [
//   // Revert dark backgrounds back to their light equivalents
//   { old: /#0A0A1A/gi, new: '#F3F4F6' },
//   { old: /#131326/gi, new: '#FFFFFF' }, // Note: some might have been E0F2FE or 1A1A2E, but White is a safe default for light mode cards/panels
//   { old: /#1A1A2E/gi, new: '#EEF2FF' }, // Reverting the dark glass to light blue
// ];

// function processDir(dir) {
//   if (!fs.existsSync(dir)) return;
//   const files = fs.readdirSync(dir);
//   for (const file of files) {
//     const fullPath = path.join(dir, file);
//     if (fs.statSync(fullPath).isDirectory()) {
//       processDir(fullPath);
//     } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
//       let content = fs.readFileSync(fullPath, 'utf8');
//       let changed = false;
      
//       for (const { old, new: newStr } of replacements) {
//         if (old.test(content)) {
//           content = content.replace(old, newStr);
//           changed = true;
//         }
//       }
      
//       if (changed) {
//         fs.writeFileSync(fullPath, content);
//         console.log(`Updated ${fullPath}`);
//       }
//     }
//   }
// }

// dirs.forEach(dir => processDir(dir));
// console.log('Done reverting dark backgrounds.');
