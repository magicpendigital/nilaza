const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");
const config = getDefaultConfig(projectRoot);

// Native embedding starts Metro from the app directory. Keep that directory as
// the server root so `expo export:embed` resolves the native `index.js` entry.
// Expo web starts from the workspace and requests `./apps/mobile/index`; that
// one virtual entry is handled below by the scoped resolver alias.
config.server.unstable_serverRoot = projectRoot;

config.watchFolders = [
  projectRoot,
  path.resolve(workspaceRoot, "packages"),
  path.resolve(workspaceRoot, "node_modules")
];

const existingBlockList = Array.isArray(config.resolver.blockList)
  ? config.resolver.blockList
  : config.resolver.blockList
  ? [config.resolver.blockList]
  : [];

config.resolver.blockList = [
  ...existingBlockList,
  /.*[/\\]apps[/\\]web[/\\].*/,
  /.*[/\\]apps[/\\]admin[/\\].*/
];

config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules")
];

const mobileDependencyPrefixes = ["react", "react-dom", "react-native", "@expo/metro-runtime"];
const defaultResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  const normalizedModuleName = moduleName.replace(/\\/g, "/");
  const isMonorepoEntrypoint = [
    "./apps/mobile/index",
    "apps/mobile/index",
    "./apps/mobile/index.js",
    "apps/mobile/index.js"
  ].includes(normalizedModuleName);

  // Expo's monorepo manifest can use a workspace-relative entry URL even
  // though Metro is serving from apps/mobile. Resolve that virtual URL to the
  // app entry for every platform so native development builds can load too.
  if (isMonorepoEntrypoint) {
    return {
      type: "sourceFile",
      filePath: path.join(projectRoot, "index.js")
    };
  }

  const shouldUseMobileDependency = mobileDependencyPrefixes.some(
    (dependencyName) => moduleName === dependencyName || moduleName.startsWith(`${dependencyName}/`)
  );

  if (shouldUseMobileDependency) {
    return {
      type: "sourceFile",
      filePath: require.resolve(moduleName, { paths: [projectRoot] })
    };
  }

  return defaultResolveRequest
    ? defaultResolveRequest(context, moduleName, platform)
    : context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
