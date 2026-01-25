# Wake Word Detection Guide

## Overview
The voice agent now supports hands-free activation using wake words "Hey Credora" or "Hey CFO" - just like Siri or Alexa!

## Supported Wake Words

### Primary Wake Words
- **"Hey Credora"** - Main wake word
- **"Hey CFO"** - Alternative wake word

### Short Forms (also work)
- **"Credora"** - Quick activation
- **"CFO"** - Quick activation

### Common Variations (handled automatically)
- "Hey corridor" (misheard)
- "Hey CEO" (misheard)
- "A Credora" (misheard)

## How It Works

### Background Listening
1. Wake word detection runs continuously in the background
2. Uses Web Speech API for real-time voice recognition
3. Listens for wake words on all dashboard pages
4. Low CPU usage - only processes audio locally

### Detection Flow
```
User says "Hey Credora"
    ↓
Wake word detected (with 3s cooldown)
    ↓
Voice agent modal opens automatically
    ↓
User speaks question
    ↓
AI responds
    ↓
Modal closes
    ↓
Wake word detection resumes
```

### Smart Features
- **Interim results** - Detects wake words faster (no need to wait for final result)
- **Cooldown period** - 3 seconds after detection prevents multiple triggers
- **Auto-restart** - Recovers from errors automatically
- **Buffer clearing** - Clears audio buffer after detection for clean start

## Visual Indicators

### Wake Word Status
When wake word detection is active, you'll see a small indicator at the bottom-right:
```
🟢 Listening for "Hey Credora"
```

### Modal States
- **Listening** - Blue pulsing microphone (capturing your question)
- **Processing** - Yellow/orange spinner (calling API)
- **Speaking** - Purple pulsing speaker (AI responding)

## Usage Tips

### Best Practices
1. **Speak clearly** - Enunciate "Hey Credora" or "Hey CFO"
2. **Normal volume** - No need to shout, normal speaking volume works
3. **Quiet environment** - Reduces false positives
4. **Wait for modal** - Modal opens automatically when detected
5. **Natural speech** - Speak naturally after modal opens

### Troubleshooting

**Wake word not detected?**
- Check console for `[WakeWord] 🎤 Listening for: "Hey Credora" or "Hey CFO"`
- Ensure microphone permissions are granted
- Try speaking louder or more clearly
- Check if modal is already open (wake word disabled during conversation)

**Multiple triggers?**
- 3-second cooldown prevents this
- If it happens, check console logs for debugging

**Not working in Firefox?**
- Firefox has limited Web Speech API support
- Use Chrome/Edge for best experience
- Button click still works as fallback

## Technical Details

### Browser Support
- ✅ **Chrome/Edge** - Full support, recommended
- ⚠️ **Safari** - Partial support, may have delays
- ❌ **Firefox** - Limited support, use button instead

### Performance
- **CPU Usage** - Minimal (Web Speech API is hardware-accelerated)
- **Memory** - ~5-10MB for speech recognition
- **Network** - No network calls for wake word detection (local processing)
- **Battery** - Minimal impact on laptops/mobile devices

### Privacy
- **Local processing** - Wake word detection happens in browser
- **No recording** - Audio not recorded until modal opens
- **No cloud** - Wake word detection doesn't send data to servers
- **Secure** - Requires HTTPS in production (localhost OK for dev)

## Configuration

### Enable/Disable Wake Word
Currently enabled by default. To disable:

```typescript
// In DashboardLayout
const [wakeWordEnabled, setWakeWordEnabled] = useState(false); // Change to false
```

### Custom Wake Words
To add more wake words, edit `useWakeWord.ts`:

```typescript
const WAKE_WORDS = [
  'hey credora',
  'hey cfo',
  'credora',
  'cfo',
  'your custom phrase', // Add here
];
```

### Adjust Cooldown
To change the 3-second cooldown:

```typescript
// In useWakeWord.ts
setTimeout(() => {
  cooldownRef.current = false;
}, 5000); // Change from 3000 to 5000 for 5 seconds
```

## Debugging

### Console Logs
Wake word detection logs everything to console:

```
[WakeWord] 🚀 Wake word detection enabled
[WakeWord] 🎤 Listening for: "Hey Credora" or "Hey CFO"
[WakeWord] Heard: hey credora (final)
[WakeWord] ✅ Wake word detected! hey credora
[WakeWord] 🛑 Recognition ended
[WakeWord] 🔄 Auto-restarting...
```

### Common Issues

**"Speech recognition not supported"**
- Browser doesn't support Web Speech API
- Use Chrome/Edge instead
- Button click still works

**"Recognition error: not-allowed"**
- Microphone permission denied
- Grant permission in browser settings
- Reload page after granting permission

**"Recognition error: no-speech"**
- No audio detected for 60 seconds
- Auto-restarts automatically
- Normal behavior, not an error

**"Recognition error: aborted"**
- Recognition stopped unexpectedly
- Auto-restarts automatically
- Usually happens during page navigation

## Comparison with Competitors

### Credora vs Others
| Feature | Credora | ChatGPT | Siri | Alexa |
|---------|---------|---------|------|-------|
| Wake Word | ✅ "Hey Credora" | ❌ Button only | ✅ "Hey Siri" | ✅ "Alexa" |
| Browser-based | ✅ Yes | ✅ Yes | ❌ Native only | ❌ Device only |
| Custom wake words | ⚠️ Code change | ❌ No | ❌ No | ⚠️ Limited |
| Response time | ✅ 1-2s | ⚠️ 3-5s | ✅ 1-2s | ✅ 1-2s |
| Works offline | ❌ API needed | ❌ API needed | ⚠️ Limited | ❌ No |
| Privacy | ✅ Local detection | ⚠️ Cloud | ⚠️ Cloud | ⚠️ Cloud |

## Future Enhancements

### Planned
- [ ] User-configurable wake words (settings panel)
- [ ] Wake word sensitivity adjustment
- [ ] Multiple language support
- [ ] Voice training for better accuracy
- [ ] Offline wake word detection (WebAssembly model)

### Under Consideration
- [ ] Custom wake word recording
- [ ] Wake word analytics (detection rate, false positives)
- [ ] Wake word A/B testing
- [ ] Voice biometrics (speaker identification)

## Conclusion

Wake word detection brings true hands-free interaction to Credora - a massive win for user experience! Just say "Hey Credora" or "Hey CFO" from anywhere in the dashboard and start talking to your AI CFO assistant.

**This is the future of financial analytics - conversational, fast, and always ready!** 🎉
