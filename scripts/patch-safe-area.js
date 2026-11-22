const fs = require('fs');
const path = require('path');

const filesToPatch = [
  {
    path: 'node_modules/react-native-safe-area-context/lib/module/specs/NativeSafeAreaView.js',
    content: "import { View } from 'react-native';\nexport default View;\n"
  },
  {
    path: 'node_modules/react-native-safe-area-context/lib/module/specs/NativeSafeAreaProvider.js',
    content: "import { View } from 'react-native';\nexport default View;\n"
  },
  {
    path: 'node_modules/react-native-safe-area-context/lib/commonjs/specs/NativeSafeAreaView.js',
    content: "const { View } = require('react-native');\nmodule.exports = View;\n"
  },
  {
    path: 'node_modules/react-native-safe-area-context/lib/commonjs/specs/NativeSafeAreaProvider.js',
    content: "const { View } = require('react-native');\nmodule.exports = View;\n"
  },
  {
    path: 'node_modules/react-native-safe-area-context/src/index.tsx',
    content: "export * from '../lib/module/index';\n"
  }
];

for (const { path: relPath, content } of filesToPatch) {
  const fullPath = path.resolve(__dirname, '..', relPath);
  try {
    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(fullPath, content);
  } catch (e) {}
}

// Restore any material-symbols fonts if npm left them in staging folders
try {
  const fontsParent = path.resolve(__dirname, '..', 'node_modules', '@expo-google-fonts');
  if (fs.existsSync(fontsParent)) {
    const entries = fs.readdirSync(fontsParent);
    const targetDir = path.join(fontsParent, 'material-symbols');
    for (const entry of entries) {
      if (entry.startsWith('.material-symbols-')) {
        const stagingDir = path.join(fontsParent, entry);
        if (fs.existsSync(stagingDir) && fs.existsSync(targetDir)) {
          fs.cpSync(stagingDir, targetDir, { recursive: true, force: false });
        }
      }
    }
  }
} catch (e) {}

console.log('Postinstall patches applied successfully.');
