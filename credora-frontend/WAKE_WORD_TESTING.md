# Wake Word Testing Checklist

## Pre-Testing Setup
- [ ] Browser: Chrome or Edge (recommended)
- [ ] Microphone: Connected and working
- [ ] Permissions: Microphone access granted
- [ ] Environment: Quiet room (reduces false positives)
- [ ] Console: Open DevTools console for logs

## Test 1: Wake Word Detection Initialization
**Expected**: Wake word detection starts automatically on dashboard load

1. Navigate to any dashboard page (e.g., `/dashboard`)
2. Check console for: `[WakeWord] 🚀 Wake word detection enabled`
3. Check console for: `[WakeWord] 🎤 Listening for: "Hey Credora" or "Hey CFO"`
4. Look for small indicator at bottom-right: "Listening for 'Hey Credora'"

**Result**: ✅ Pass / ❌ Fail

---

## Test 2: "Hey Credora" Wake Word
**Expected**: Modal opens automatically when saying "Hey Credora"

1. Say clearly: **"Hey Credora"**
2. Check console for: `[WakeWord] Heard: hey credora (final)`
3. Check console for: `[WakeWord] ✅ Wake word detected!`
4. Voice agent modal should open automatically
5. Modal should start listening immediately

**Result**: ✅ Pass / ❌ Fail

---

## Test 3: "Hey CFO" Wake Word
**Expected**: Modal opens automatically when saying "Hey CFO"

1. Close modal if open (press ESC)
2. Wait 3 seconds (cooldown period)
3. Say clearly: **"Hey CFO"**
4. Check console for: `[WakeWord] Heard: hey cfo (final)`
5. Check console for: `[WakeWord] ✅ Wake word detected!`
6. Voice agent modal should open automatically

**Result**: ✅ Pass / ❌ Fail

---

## Test 4: Short Form Wake Words
**Expected**: Modal opens with just "Credora" or "CFO"

1. Close modal if open (press ESC)
2. Wait 3 seconds
3. Say clearly: **"Credora"**
4. Modal should open
5. Close modal, wait 3 seconds
6. Say clearly: **"CFO"**
7. Modal should open

**Result**: ✅ Pass / ❌ Fail

---

## Test 5: Cooldown Prevention
**Expected**: Multiple wake words within 3 seconds don't trigger multiple times

1. Close modal if open
2. Wait 3 seconds
3. Say: **"Hey Credora"** (modal opens)
4. Immediately say: **"Hey Credora"** again (within 3 seconds)
5. Modal should NOT close and reopen
6. Check console - should see cooldown preventing second trigger

**Result**: ✅ Pass / ❌ Fail

---

## Test 6: Wake Word Disabled During Conversation
**Expected**: Wake word detection pauses when modal is open

1. Say: **"Hey Credora"** (modal opens)
2. Check console - wake word detection should stop
3. Say: **"Hey Credora"** again while modal is open
4. Should NOT trigger anything (modal already open)
5. Close modal (ESC)
6. Check console for: `[WakeWord] 🔄 Auto-restarting...`
7. Wake word detection should resume

**Result**: ✅ Pass / ❌ Fail

---

## Test 7: Full Conversation Flow
**Expected**: Complete voice interaction from wake word to response

1. Say: **"Hey Credora"**
2. Modal opens and starts listening
3. Say: **"What is my revenue?"**
4. Check console for transcript
5. Processing spinner should show
6. AI should speak response
7. Modal should auto-restart listening
8. Close modal (ESC)
9. Wake word detection resumes

**Result**: ✅ Pass / ❌ Fail

---

## Test 8: Cross-Page Functionality
**Expected**: Wake word works on all dashboard pages

1. Navigate to `/dashboard` - Say "Hey Credora" → ✅ Works
2. Navigate to `/campaigns` - Say "Hey Credora" → ✅ Works
3. Navigate to `/pnl` - Say "Hey Credora" → ✅ Works
4. Navigate to `/forecast` - Say "Hey Credora" → ✅ Works
5. Navigate to `/insights` - Say "Hey Credora" → ✅ Works

**Result**: ✅ Pass / ❌ Fail

---

## Test 9: Auto-Restart After Errors
**Expected**: Wake word detection recovers from errors automatically

1. Wait 60 seconds without speaking (triggers no-speech error)
2. Check console for: `[WakeWord] ❌ Error: no-speech`
3. Check console for: `[WakeWord] 🔄 Auto-restarting...`
4. Say: **"Hey Credora"** after restart
5. Modal should open normally

**Result**: ✅ Pass / ❌ Fail

---

## Test 10: Button Click Still Works
**Expected**: Floating button works alongside wake word

1. Click floating microphone button (bottom-right)
2. Modal should open
3. Speak question
4. Get response
5. Close modal
6. Wake word detection should resume

**Result**: ✅ Pass / ❌ Fail

---

## Test 11: Misheard Variations
**Expected**: Common misheard phrases still trigger wake word

1. Say: **"Hey corridor"** (common mishearing)
2. Should trigger wake word detection
3. Say: **"A Credora"** (another variation)
4. Should trigger wake word detection

**Result**: ✅ Pass / ❌ Fail

---

## Test 12: Chat History Integration
**Expected**: Voice conversations saved to chat history

1. Say: **"Hey Credora"**
2. Ask: **"What is my total revenue?"**
3. Get response
4. Close modal
5. Navigate to `/chat` page
6. Check chat history - should see your question and AI response

**Result**: ✅ Pass / ❌ Fail

---

## Performance Tests

### Test 13: Response Time
**Expected**: Total interaction time < 3 seconds

1. Say: **"Hey Credora"**
2. Start timer
3. Say: **"What is my revenue?"**
4. Stop timer when AI starts speaking
5. Time should be < 3 seconds (ideally 1-2 seconds)

**Result**: ⏱️ _____ seconds

---

### Test 14: CPU Usage
**Expected**: Minimal CPU impact from wake word detection

1. Open Task Manager / Activity Monitor
2. Check CPU usage with wake word detection running
3. Should be < 5% CPU usage
4. No significant battery drain

**Result**: 💻 _____ % CPU

---

### Test 15: Memory Usage
**Expected**: Reasonable memory footprint

1. Open DevTools → Memory tab
2. Check memory usage
3. Wake word detection should use < 20MB
4. No memory leaks over time

**Result**: 🧠 _____ MB

---

## Edge Cases

### Test 16: Background Noise
**Expected**: Wake word detection handles background noise

1. Play background music or TV
2. Say: **"Hey Credora"** clearly
3. Should still detect wake word
4. False positives should be rare

**Result**: ✅ Pass / ❌ Fail

---

### Test 17: Multiple Tabs
**Expected**: Wake word works in active tab only

1. Open dashboard in two tabs
2. Say: **"Hey Credora"** in Tab 1
3. Modal should open in Tab 1 only
4. Switch to Tab 2
5. Say: **"Hey Credora"**
6. Modal should open in Tab 2

**Result**: ✅ Pass / ❌ Fail

---

### Test 18: Page Refresh
**Expected**: Wake word detection restarts after refresh

1. Say: **"Hey Credora"** (verify working)
2. Refresh page (F5)
3. Wait for page load
4. Check console for wake word initialization
5. Say: **"Hey Credora"** again
6. Should work normally

**Result**: ✅ Pass / ❌ Fail

---

## Browser Compatibility

### Test 19: Chrome/Edge
- [ ] Wake word detection works
- [ ] Modal opens automatically
- [ ] Voice recognition accurate
- [ ] Speech synthesis clear

**Result**: ✅ Pass / ❌ Fail

---

### Test 20: Safari
- [ ] Wake word detection works (may be slower)
- [ ] Modal opens automatically
- [ ] Voice recognition works
- [ ] Speech synthesis works

**Result**: ✅ Pass / ⚠️ Partial / ❌ Fail

---

### Test 21: Firefox
- [ ] Wake word detection (expected to fail)
- [ ] Button click fallback works
- [ ] Voice agent works via button

**Result**: ⚠️ Expected Limitation

---

## Summary

**Total Tests**: 21
**Passed**: _____ / 21
**Failed**: _____ / 21
**Partial**: _____ / 21

**Critical Issues**: 
- [ ] None
- [ ] List any critical issues here

**Minor Issues**:
- [ ] None
- [ ] List any minor issues here

**Recommendations**:
- [ ] Ready for production
- [ ] Needs fixes before production
- [ ] Needs more testing

---

## Notes

Add any additional observations, bugs, or suggestions here:

```
[Your notes here]
```

---

## Sign-off

**Tester**: _______________
**Date**: _______________
**Browser**: _______________
**OS**: _______________
**Result**: ✅ Approved / ⚠️ Approved with notes / ❌ Rejected
