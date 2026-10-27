// Shared honest labels; a capability entry is not a replacement for browser tests.
export const fingerprintCapabilities=[
 {property:'UA and client hints',mode:'partial',detail:'Native desktop OS and bundled Chromium only; reduced or exact runtime UA. Headers/low/high-entropy hints must be observed. No cross-OS identity.'},
 {property:'Locale, languages, timezone',mode:'configurable',detail:'Supported context options; diagnosed in the actual page.'},
 {property:'Viewport, screen, DPR',mode:'configurable',detail:'Validated persistent context options; dimensions and DPR are measured.'},
 {property:'Geolocation',mode:'configurable',detail:'Explicit coordinates and permission required. Read granted coordinates with a bounded call; denied without configured consent.'},
 {property:'CPU, device memory, platform',mode:'native-only',detail:'Read actual navigator values; no arbitrary hardware/platform override.'},
 {property:'WebGL',mode:'native-only',detail:'Report native masked/unmasked vendor and renderer when permitted; no vendor/noise spoofing.'},
 {property:'Canvas and audio',mode:'native-only',detail:'Hash controlled native samples; no injected noise or randomized output.'},
 {property:'Fonts',mode:'partial',detail:'Generic-family metrics only, not an installed-font inventory or a spoofed font set.'},
 {property:'WebRTC',mode:'partial',detail:'Experimental requested Chromium policy, not a UDP firewall. Controlled Linux loopback STUN still sends UDP; no candidate addresses in production diagnostics, public STUN/TURN or leak certification.'},
 {property:'Media devices and permissions',mode:'native-only',detail:'Observe permission states and device-kind counts without getUserMedia; no names, device IDs or identity spoofing.'},
 {property:'Feature APIs',mode:'native-only',detail:'Observed runtime availability. No masking of webdriver or removal of fundamental browser protections.'},
 {property:'External DNS leak verification',mode:'unsupported',detail:'Requires opt-in controlled external authoritative DNS infrastructure; local checks/public-IP probes are insufficient.'},
] as const;
