# Buddy — Configuration Reference

All configuration lives in `config.json` in `%APPDATA%\Buddy\`.
Edit it in any text editor and restart Buddy.

## buddy

| Key | Type | Default | Description |
|---|---|---|---|
| `userName` | string | `"Friend"` | Your name — used in AI messages |
| `userRole` | string | `"Professional"` | Your role — Gemini context |
| `size` | string | `"medium"` | `small` / `medium` / `large` |
| `speed` | number | `1.5` | Walk speed (1=slow, 2=fast) |
| `language` | string | `"auto"` | Override language e.g. `"French"`. `"auto"` = detect from system |

## notifications

Controls bubble display duration in seconds per event type.

```json
"notifications": {
  "defaultDurationSecs": 6,
  "meetingDurationSecs": 10,
  "healthDurationSecs": 8,
  "shiftDurationSecs": 8,
  "idleDurationSecs": 6,
  "jokeDurationSecs": 7
}
```

## shift

```json
"shift": {
  "start": "09:00",
  "end": "18:00",
  "workDays": [1,2,3,4,5]
}
```

`workDays`: 0=Sunday … 6=Saturday

## health

```json
"health": {
  "enabled": true,
  "postureReminderMins": 45,
  "eyeBreakMins": 20,
  "waterReminderMins": 60,
  "stretchReminderMins": 90
}
```

## plugins

```json
"plugins": {
  "system":        { "enabled": true,  "pollIntervalSecs": 30, "idleIntervalSecs": 120, "jokeIntervalHours": 1, "cpuWarnPercent": 80, "ramWarnPercent": 85 },
  "outlook":       { "enabled": false, "pollIntervalSecs": 60, "meetingAlertMins": 10, "showNewEmails": true },
  "teams":         { "enabled": false, "pollIntervalSecs": 30, "showUnreadMessages": true },
  "window":        { "enabled": true,  "pollIntervalSecs": 15 },
  "teamsKeepAlive":{ "enabled": false, "intervalMins": 4 }
}
```

## customMessages

Add your own timed messages:

```json
"customMessages": [
  {
    "id": "my_reminder",
    "triggerTime": "10:30",
    "days": [1,2,3,4,5],
    "message": "Check your inbox before the standup."
  }
]
```

Gemini will rewrite it in Buddy's voice automatically.