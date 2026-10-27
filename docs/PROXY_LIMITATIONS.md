> **Master-stage update:** Fresh host validation accepts canonical DNS/IPv4/plain or bracketed IPv6 and rejects embedded ports/malformed/ambiguous numeric addresses. IPv6 transport/provider reachability is not certified. HTTP407/no-forward/no-direct-fallback and SOCKS proxy-received unresolved hostname now have real fixtures. Controlled Linux STUN records UDP even with the requested policy and HTTP proxy: experimental, not a firewall; no public DNS/STUN certificate. Production probe sandbox is explicit; fresh Windows execution pending.

# Proxy configuration, verification and limits

Profiles use Chromium's per-context HTTP/HTTPS/SOCKS5 proxy options. Credentials are loaded only in the main process through Windows DPAPI, not returned to the renderer, logged or exported. There is no production plaintext fallback. A pending credential write is rejected if an assigned profile starts or shutdown begins.

- HTTP: local real-browser forwarding and Basic authentication are covered.
- HTTPS proxy transport: new tests reject an untrusted proxy certificate without insecure TLS flags. The positive trusted-CA/Basic-auth test passed in final run 40565021705 on disposable Windows CI; arbitrary provider compatibility remains unverified. It generates ephemeral CA/leaf keys, imports its CA into the disposable elevated runner's machine trust store, and removes it afterward. No production trust-store change or certificate-bypass flag is introduced. This controlled proxy test is not a certificate audit of every provider.
- SOCKS5: unauthenticated forwarding is covered. **Authenticated SOCKS5 remains disabled**, including retained credentials during protocol changes. No insecure local credential-relay workaround is added.
- HTTP Basic credentials over a plain HTTP proxy are not encrypted by the proxy transport. Use a trusted HTTPS proxy or other appropriate network protection if this matters to your threat model; DPAPI only protects storage at rest.

## Status semantics

Save is not a connectivity check. Explicit **Test** starts a temporary verified Chromium, loads api.ipify.org through the selected proxy under bounded timeouts, validates a real IPv4/IPv6 literal, and records the observed public IP or a redacted failure. The fixed production endpoint is not a remotely supplied URL; controlled endpoint injection is used in local integration tests only. Latency is total probe duration, including browser work/runtime verification, not a pure network RTT.

Failure never silently unassigns the proxy or retries directly. Tests run two differently configured profiles simultaneously and compare actual forwarding/storage, then remove the proxy and assert the destination receives no direct fallback request. One successful public-IP request does not establish all-protocol traffic protection.

Region is a user-entered label, not a detected country or automatic locale/timezone setting. Custom DNS, VPNs, corporate trust interception and provider-specific authentication need separate environment testing. No TLS-error bypass is enabled.

## DNS/WebRTC

The fingerprint diagnostic reports a local-only ICE type/protocol summary without STUN/TURN or saved addresses; the requested Chromium UDP policy is also checked against an ownership-verified browser command line when OS inspection is available. These are deliberately **partial** observations. Public DNS/STUN leak verification requires controlled external infrastructure and explicit network consent. No definitive no-leak badge is displayed. Do not infer safety for WebRTC, DNS, extensions, OS traffic or every browser API from a single IP probe.
