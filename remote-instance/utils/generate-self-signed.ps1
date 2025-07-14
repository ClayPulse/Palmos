# Only use this on trusted systems and for development purposes.
mkdir certs
openssl req -nodes -new -x509 -keyout certs/key.pem -out certs/cert.pem -days 365 -subj "/"
