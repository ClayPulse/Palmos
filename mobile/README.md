# Android release
```bash
npx cap sync
# Build .aab file
npx cap build android --keystorepath "<path_to_keystore>" --keystorepass "<keystore_pass>" --keystorealias "<keystore_alias>" --keystorealiaspass "<keystore_alias_pass>" --androidreleasetype AAB --signing-type jarsigner
```

Then, `mobile/android/app/build/outputs/bundle/release/app-released.aab` is a signed .aab ready for publishing.