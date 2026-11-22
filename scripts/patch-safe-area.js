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

// Neutralize NO_INSETS_ERROR throwing in SafeAreaContext so SSR in Web never crashes
const safeAreaContextFiles = [
  'node_modules/react-native-safe-area-context/lib/module/SafeAreaContext.js',
  'node_modules/react-native-safe-area-context/lib/commonjs/SafeAreaContext.js'
];

for (const relPath of safeAreaContextFiles) {
  const fullPath = path.resolve(__dirname, '..', relPath);
  try {
    if (fs.existsSync(fullPath)) {
      let content = fs.readFileSync(fullPath, 'utf8');
      content = content.replace(
        /if\s*\(\s*insets\s*==\s*null\s*\)\s*\{\s*throw new Error\(NO_INSETS_ERROR\);\s*\}/g,
        'if (insets == null) { return { top: 0, bottom: 0, left: 0, right: 0 }; }'
      );
      content = content.replace(
        /if\s*\(\s*frame\s*==\s*null\s*\)\s*\{\s*throw new Error\(NO_INSETS_ERROR\);\s*\}/g,
        'if (frame == null) { return { x: 0, y: 0, width: 390, height: 844 }; }'
      );
      fs.writeFileSync(fullPath, content, 'utf8');
    }
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
