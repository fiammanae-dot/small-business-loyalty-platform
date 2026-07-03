# QR Scanner Validation

Use this document to validate scanner behavior on real devices.

## Test Template

```text
Device:
Browser:
User Role:
QR Source:
Lighting:
Expected:
Observed:
Pass/Fail:
Notes:
```

## Camera Permission Tests

| Test | Expected Behavior | Observed Behavior | Pass/Fail |
|---|---|---|---|
| Camera permission granted | Camera opens and scanner starts |  |  |
| Camera permission denied | User sees manual token fallback |  |  |
| Camera permission previously denied | User sees safe instruction and manual fallback |  |  |

## Camera Device Tests

| Test | Expected Behavior | Observed Behavior | Pass/Fail |
|---|---|---|---|
| Single camera device | Scanner starts |  |  |
| Multiple camera devices | Switch Camera is available if supported |  |  |
| Front camera | QR can be scanned if camera supports it |  |  |
| Rear camera | QR scans reliably |  |  |

## QR Detection Tests

| Test | Expected Behavior | Observed Behavior | Pass/Fail |
|---|---|---|---|
| QR detection speed | Valid QR redirects quickly |  |  |
| Low light | Scanner either detects or user can retry/manual paste |  |  |
| Bright light | Scanner detects without glare issues |  |  |
| Printed QR | Scanner detects |  |  |
| Phone screen QR | Scanner detects |  |  |
| Tablet QR | Scanner detects |  |  |

## Token Validation Tests

| Test | Expected Behavior | Observed Behavior | Pass/Fail |
|---|---|---|---|
| Valid QR | Opens `/scan/{token}` and shows valid customer |  |  |
| Invalid QR | Shows invalid loyalty QR message |  |  |
| Expired QR | Shows unavailable QR if expired behavior exists |  |  |
| Disabled QR | Shows unavailable QR |  |  |
| Wrong business QR | Shows wrong-business message |  |  |
| Non-Loyalty Card UAE QR | Shows not a Loyalty Card UAE customer card |  |  |

## Stamp Flow Validation

After valid scan:

- [ ] Customer summary appears.
- [ ] Program summary appears.
- [ ] Current progress appears.
- [ ] Add stamp controls are visible.
- [ ] Multiple stamp reason is required.
- [ ] Reward Ready indicator appears when eligible.
- [ ] No duplicate stamp is created from double-click.

## Sign-Off

Scanner is pilot-ready when:

- Staff can scan on Android Chrome.
- Staff can scan on iPhone Safari or use manual fallback.
- Wrong-business QR is blocked.
- Invalid QR is safe.
- Stamp issuance remains unchanged and audited.
