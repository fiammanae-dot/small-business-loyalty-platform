# Device Test Matrix

Use this matrix to track real-device coverage before pilot onboarding.

Status values:

- Supported
- Partially Supported
- Not Tested

## Desktop

| Platform | Browser | Status | Known Issues | Notes |
|---|---|---|---|---|
| Windows | Chrome | Not Tested | None recorded | Primary desktop target |
| Windows | Edge | Not Tested | None recorded | Required Windows validation |
| Windows | Firefox | Not Tested | None recorded | Validate layout and forms |
| macOS | Chrome | Not Tested | None recorded | Optional if available |
| macOS | Safari | Not Tested | None recorded | Optional desktop Safari check |

## Android

| Platform | Browser | Status | Known Issues | Notes |
|---|---|---|---|---|
| Android phone | Chrome | Not Tested | Camera permissions require HTTPS or supported local setup | Primary Android scanner target |
| Android phone | Samsung Internet | Not Tested | Camera permission behavior may differ | Important for Samsung devices |
| Android tablet | Chrome | Not Tested | None recorded | Validate tablet layout |

## iPhone

| Platform | Browser | Status | Known Issues | Notes |
|---|---|---|---|---|
| iPhone | Safari | Not Tested | Camera access usually requires HTTPS | Primary iPhone scanner target |
| iPhone | Chrome | Not Tested | Uses iOS WebKit camera behavior | Validate fallback/manual paste |
| iPad | Safari | Not Tested | Tablet layout may differ | Optional pilot validation |

## Coverage Rules

Minimum pilot coverage:

- Windows Chrome
- Windows Edge
- Android Chrome
- iPhone Safari

Recommended pilot coverage:

- Samsung Internet
- Firefox
- iPad Safari

## Sign-Off

Device QA is complete when:

- No critical scanner issues remain.
- Public customer card works on phone.
- Staff can scan and issue stamps on phone.
- Business Owner dashboard is usable on phone.
- System Administrator management pages are usable on desktop.
