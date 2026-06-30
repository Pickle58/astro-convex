const [major, minor] = process.versions.node.split(".").map(Number);

const supported =
  major > 22 ||
  (major === 22 && minor >= 15) ||
  (major === 23 && minor >= 5);

if (!supported) {
  console.error(
    `\nNode ${process.versions.node} is too old for Astro 6 (needs Node >= 22.15.0).\n` +
      "Upgrade Node, then restart your terminal:\n" +
      "  winget upgrade OpenJS.NodeJS.22\n" +
      "  — or —\n" +
      "  nvm install 22 && nvm use 22\n",
  );
  process.exit(1);
}
