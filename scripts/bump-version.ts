/**
 * Version Bump Script
 * 
 * Bumps the version in package.json and validates/updates CHANGELOG.md.
 * 
 * Usage:
 *   bun run version:patch   # 0.5.1 -> 0.5.2
 *   bun run version:minor   # 0.5.1 -> 0.6.0
 *   bun run version:major   # 0.5.1 -> 1.0.0
 * 
 * Workflow:
 *   1. Edit CHANGELOG.md first - add entry under "## v{next_version}"
 *   2. Run this script with the appropriate bump type
 *   3. Script validates changelog entry exists, adds date, updates package.json
 *   4. Commit and push your changes
 */

const PACKAGE_JSON_PATH = "package.json";
const CHANGELOG_PATH = "CHANGELOG.md";

type BumpType = "patch" | "minor" | "major";

function printUsage() {
  console.log(`
Usage: bun run version:[patch|minor|major]

Examples:
  bun run version:patch   # Bug fixes (0.5.1 -> 0.5.2)
  bun run version:minor   # New features (0.5.1 -> 0.6.0)
  bun run version:major   # Breaking changes (0.5.1 -> 1.0.0)

Workflow:
  1. Edit CHANGELOG.md - add your entry under "## v{next_version}"
  2. Run this script
  3. Commit and push
`);
}

function calculateNewVersion(current: string, bumpType: BumpType): string {
  const parts = current.split(".").map(Number);
  const major = parts[0] ?? 0;
  const minor = parts[1] ?? 0;
  const patch = parts[2] ?? 0;
  
  switch (bumpType) {
    case "major":
      return `${major + 1}.0.0`;
    case "minor":
      return `${major}.${minor + 1}.0`;
    case "patch":
      return `${major}.${minor}.${patch + 1}`;
  }
}

function getToday(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

async function main() {
  // Parse arguments
  const bumpType = Bun.argv[2] as BumpType | undefined;
  
  if (!bumpType || !["patch", "minor", "major"].includes(bumpType)) {
    console.error("Error: Invalid or missing bump type.\n");
    printUsage();
    process.exit(1);
  }

  // Read package.json
  console.log("Reading package.json...");
  const packageFile = Bun.file(PACKAGE_JSON_PATH);
  if (!(await packageFile.exists())) {
    console.error("Error: package.json not found.");
    process.exit(1);
  }
  
  const packageJson = await packageFile.json();
  const currentVersion = packageJson.version as string;
  const newVersion = calculateNewVersion(currentVersion, bumpType);
  
  console.log(`Current version: ${currentVersion}`);
  console.log(`New version: ${newVersion} (${bumpType} bump)`);
  console.log();

  // Read CHANGELOG.md
  console.log("Reading CHANGELOG.md...");
  const changelogFile = Bun.file(CHANGELOG_PATH);
  if (!(await changelogFile.exists())) {
    console.error("Error: CHANGELOG.md not found.");
    process.exit(1);
  }
  
  let changelog = await changelogFile.text();
  
  // Look for the new version header
  const versionHeaderRegex = new RegExp(`^## v${newVersion.replace(/\./g, "\\.")}(\\s|$)`, "m");
  const versionHeaderWithDateRegex = new RegExp(
    `^## v${newVersion.replace(/\./g, "\\.")}\\s*\\(\\d{4}-\\d{2}-\\d{2}\\)`,
    "m"
  );
  
  if (!versionHeaderRegex.test(changelog)) {
    console.error(`Error: No changelog entry found for v${newVersion}`);
    console.error();
    console.error("Please add an entry to CHANGELOG.md first:");
    console.error();
    console.error(`  ## v${newVersion}`);
    console.error("  - Your changes here");
    console.error();
    console.error("Then run this script again.");
    process.exit(1);
  }
  
  console.log(`✓ Found changelog entry for v${newVersion}`);
  
  // Add date if not already present
  if (!versionHeaderWithDateRegex.test(changelog)) {
    const today = getToday();
    changelog = changelog.replace(
      new RegExp(`^(## v${newVersion.replace(/\./g, "\\.")})\\s*$`, "m"),
      `$1 (${today})`
    );
    console.log(`✓ Added date: v${newVersion} (${today})`);
  } else {
    console.log(`✓ Date already present in changelog header`);
  }
  
  // Write updated CHANGELOG.md
  await Bun.write(CHANGELOG_PATH, changelog);
  console.log(`✓ Updated CHANGELOG.md`);
  
  // Update package.json
  packageJson.version = newVersion;
  await Bun.write(PACKAGE_JSON_PATH, JSON.stringify(packageJson, null, 2) + "\n");
  console.log(`✓ Updated package.json: ${currentVersion} -> ${newVersion}`);
  
  console.log();
  console.log("Done! Don't forget to commit your changes:");
  console.log(`  git add -A && git commit -m "Release v${newVersion}"`);
}

main().catch((error) => {
  console.error("Unexpected error:", error);
  process.exit(1);
});
