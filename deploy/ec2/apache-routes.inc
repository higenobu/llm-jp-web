# Include INSIDE the llm-jp.com HTTPS VirtualHost.
ProxyRequests Off
ProxyPassInherit Off
ProxyPreserveHost Off
SSLProxyEngine On
SSLProxyVerify require
SSLProxyCheckPeerName On
SSLProxyCheckPeerExpire On
SSLProxyCACertificateFile /etc/pki/tls/certs/ca-bundle.crt
SSLProxyVerifyDepth 4

# Exact exclusions must precede the API prefix. Do not exclude /llmjp as a prefix.
ProxyPassMatch "^/llmjp$" "!"
ProxyPassMatch "^/llmjp/(classify|personality|personality/text)$" "!"
AliasMatch "^/llmjp$" "/var/www/llmjp-web/index.html"
AliasMatch "^/llmjp/classify$" "/var/www/llmjp-web/classify.html"
AliasMatch "^/llmjp/personality$" "/var/www/llmjp-web/personality.html"
AliasMatch "^/llmjp/personality/text$" "/var/www/llmjp-web/personality-text.html"
<Directory "/var/www/llmjp-web">
    Options -Indexes
    AllowOverride None
    Require all granted
    ForceType text/html
</Directory>

RedirectMatch 302 "^/$" "/llmjp"
RedirectMatch 302 "^/llmjp/$" "/llmjp"
ProxyPass "/llmjp/" "https://api.kcg.edu/llmjp/" connectiontimeout=15 timeout=1800 retry=0 disablereuse=On
ProxyPassReverse "/llmjp/" "https://api.kcg.edu/llmjp/"
LimitRequestBody 10485760
Header always set Cache-Control "no-store"
