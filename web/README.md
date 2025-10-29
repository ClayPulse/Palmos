# Generate certificates for local dev

## Do the below in `web/certificates` folder

1.  Generate a local CA.
    Use devCA.key to install on device later.

```bash
openssl genrsa -out devCA.key 2048
openssl req -x509 -new -nodes -key devCA.key -sha256 -days 3650 -out devCA.crt -subj "/CN=Local Development CA"
```

2. Create a .cnf
   e.g.

```bash
[req]
default_bits       = 2048
prompt             = no
default_md         = sha256
distinguished_name = dn
req_extensions     = req_ext

[dn]
CN = 192.168.1.100

[req_ext]
subjectAltName = @alt_names

[alt_names]
IP.1 = 192.168.1.100
DNS.1 = mypc
DNS.2 = mypc.local
DNS.3 = localhost
```

3. Generate private key

```bash
openssl genrsa -out localhost-key.pem 2048
openssl req -new -key localhost-key.pem -out localhost.csr -config localhost.cnf
```

4. Sign the certificate with CA

```bash
openssl x509 -req -in localhost.csr -CA devCA.crt -CAkey devCA.key -CAcreateserial -out localhost.pem -days 365 -sha256 -extensions req_ext -extfile localhost.cnf
```

5. Install `devCA.crt` on Android.
   First, copy `devCA.crt` from PC to you android device. On Android, go to "settings -> security and privacy -> more security settings -> install from device storage -> CA certificate", then locate `devCA.crt` and install.

# Web Client User Guide

### Installation

You must then configure settings in the app. Specifically, to use Voice Chat, you need to have all STT, LLM, TTS configured; to only use Agentic Chat Terminal or Code Completion, you need to configure LLM.

| Modality | Supported Provider |
| -------- | ------------------ |
| STT      | OpenAI             |
| LLM      | OpenAI             |
| TTS      | OpenAI, ElevenLabs |

(For TTS, you need to enter a voice name or voice ID which you can find from your provider. e.g. “alloy” for OpenAI TTS1, “Maltida” for ElevenLabs.)

### Open File

Click the menu at top-left corner, then click either “new file” to get an empty file or “open file” to select one from your file system.

### Voice Chat

(Make sure you have configured all STT, LLM, TTS providers and API keys)

Click the microphone icon in the bottom toolbar, and grant permission if prompted. Then start chatting using voice. Any code changes will be made in the code view once the request completes.

### Drawing Gesture

Click the pen icon in the bottom toolbar, and start drawing using your cursor. If you wish to restart, simply toggle off and on the pen tool again.

### Agentic Chat Terminal

(Make sure you have configured LLM provider and API key)

Click the “Open Chat View” icon in the bottom toolbar. Then select your desire agent, or define your own by clicking the plus icon. Next, start chatting by typing in text in the input box.

### Code Completion

(Make sure you have configured LLM provider and API key)

Type anything in an open file, then a suggestion would become available in grey text. Press tab key to accept changes, or keep typing to refresh new suggest.
