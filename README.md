# 🧑‍🚀 Buddy — AI Desktop Companion

A tiny astronaut who lives on your taskbar, powered by Claude AI.
Buddy walks, stumbles, slides, dances, and delivers smart context-aware
notifications from your calendar, emails, Teams, system, and more.

## Features

- AI-powered messages — every notification generated live by Claude
- Microsoft 365 — Outlook emails, calendar, Teams messages
- System awareness — CPU spikes, RAM, accurate real-time stats
- App context — detects VS Code, Excel, Teams and gives relevant tips
- Health nudges — posture, eyes, water, stretch (only during shift hours)
- Shift tracking — start, end, and warning alerts
- Custom scheduled messages — your own reminders in config.json
- Locale-aware — responds in the language of the machine's region
- Personality rotates by time of day — warm mornings, dry afternoons
- Animations — walk, slide, stumble, fall, tired, dance, bored
- Click and drag interactions — all AI-powered with witty reactions
- Size toggle — Small / Medium / Large via right-click tray
- Teams keepalive — keeps your status green automatically

## Install

Download the latest `Buddy-Setup.exe` from
[Releases](https://github.com/YOUR_GITHUB_USERNAME/buddy/releases/latest)
and run it.

## First-time setup

The setup screen appears on first launch. Enter:
1. Your name and role (personalises Buddy's messages)
2. Your Anthropic API key — free at https://console.anthropic.com
3. Azure credentials — optional, unlocks Outlook + Teams

## Development

```bash
git clone https://github.com/YOUR_GITHUB_USERNAME/buddy
cd buddy
npm install
cp .env.example .env
# fill in .env with your keys
npm start
```

## Build installer

```bash
npm run build
# outputs dist/Buddy-Setup-1.0.0.exe
```

## Documentation

- [Configuration guide](CONFIGURATION.md)
- [Plugin development](PLUGINS.md)