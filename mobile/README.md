# Android release
```bash
npx cap sync
# Build .aab file (will fail signing, use the next command to fix)
npx cap build android --keystorepath "<path_to_keystore>" --keystorepass "<keystore_pass>" --keystorealias "<keystore_alias>" --keystorealiaspass "<keystore_alias_pass>" --androidreleasetype AAB
# Sign the .aab
jarsigner -verbose -keystore "<path_to_keystore>" "<path_to_aab>" "<keystore_alias>"
```

Then, `mobile/android/app/build/outputs/bundle/release/app-released.aab` is a signed .aab ready for publishing.