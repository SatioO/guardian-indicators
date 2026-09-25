# Pinned G Script toolchain

`gscript-toolchain.mjs` is the Guardian app's own G Script bundler, contract discovery,
sandbox and validators, built from the app repo with `npm run gscript:toolchain`.
`package.json` pins the compiler and sandbox packages to the exact versions that app build
runs, and records the build in its `toolchain` field (also stamped into every manifest this
Registry builds as `build.toolchain`).

Replace both files only with a new app build, in a reviewed PR, then `npm install`.
