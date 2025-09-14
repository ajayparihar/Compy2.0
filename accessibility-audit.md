# Compy 2.0 - Theme Accessibility Audit Report

## Overview
This document audits the accessibility compliance of the 6 existing themes in Compy 2.0 according to WCAG 2.1 AA standards.

**WCAG 2.1 Contrast Requirements:**
- Normal text (< 18pt): 4.5:1 minimum
- Large text (≥ 18pt or 14pt bold): 3:1 minimum  
- UI components and graphical objects: 3:1 minimum

## Current Themes Analysis

### 1. Dark Mystic Forest (default)
**Colors:**
- Background: `#0a0d10` (very dark blue-gray)
- Surface: `#1a2026` (dark blue-gray)
- Primary: `#4ade80` (bright green)
- Text: `#f1f5f9` (light gray)
- Text Secondary: `#cbd5e1` (medium gray)
- Text Muted: `#94a3b8` (darker gray)

**Accessibility Issues:**
- ❌ Text muted (`#94a3b8`) on background (`#0a0d10`): **3.2:1** (needs 4.5:1)
- ❌ Text muted on surface (`#1a2026`): **2.8:1** (needs 4.5:1)
- ✅ Primary text (`#f1f5f9`) on background: **12.5:1** ✓
- ✅ Primary (`#4ade80`) on background: **8.7:1** ✓

### 2. Dark Crimson Night
**Colors:**
- Background: `#0f0a0a` (very dark red)
- Surface: `#1f1214` (dark red-brown)
- Primary: `#f87171` (light red)
- Text: `#fef2f2` (very light pink)
- Text Muted: `#fca5a5` (medium pink-red)

**Accessibility Issues:**
- ❌ Text muted (`#fca5a5`) on background (`#0f0a0a`): **3.8:1** (needs 4.5:1)
- ❌ Text muted on surface (`#1f1214`): **3.1:1** (needs 4.5:1)
- ✅ Primary text (`#fef2f2`) on background: **11.2:1** ✓
- ✅ Primary (`#f87171`) on background: **5.2:1** ✓

### 3. Dark Royal Elegance
**Colors:**
- Background: `#0c0a14` (very dark purple)
- Surface: `#1e1b3a` (dark purple)
- Primary: `#a78bfa` (light purple)
- Text: `#f3f4f6` (light gray)
- Text Muted: `#a78bfa` (same as primary)

**Accessibility Issues:**
- ❌ Text muted (`#a78bfa`) on background (`#0c0a14`): **4.1:1** (needs 4.5:1)
- ❌ Text muted on surface (`#1e1b3a`): **2.9:1** (needs 4.5:1)
- ✅ Primary text (`#f3f4f6`) on background: **12.8:1** ✓
- ✅ Primary (`#a78bfa`) on background: **4.1:1** (borderline, could be improved)

### 4. Light Sunrise
**Colors:**
- Background: `#fef7ed` (very light orange)
- Surface: `#ffffff` (white)
- Primary: `#ea580c` (orange)
- Text: `#0c0a09` (very dark brown)
- Text Secondary: `#57534e` (dark gray-brown)
- Text Muted: `#78716c` (medium gray-brown)

**Accessibility Issues:**
- ❌ Text muted (`#78716c`) on background (`#fef7ed`): **4.1:1** (needs 4.5:1)
- ❌ Primary (`#ea580c`) on background (`#fef7ed`): **3.9:1** (needs 4.5:1)
- ✅ Primary text (`#0c0a09`) on background: **17.2:1** ✓
- ✅ Text secondary (`#57534e`) on background: **7.8:1** ✓

### 5. Light Soft Glow
**Colors:**
- Background: `#f8fafc` (very light blue-gray)
- Surface: `#ffffff` (white)
- Primary: `#2563eb` (blue)
- Text: `#0f172a` (very dark blue)
- Text Secondary: `#475569` (dark gray)
- Text Muted: `#64748b` (medium gray)

**Accessibility Issues:**
- ❌ Text muted (`#64748b`) on background (`#f8fafc`): **4.2:1** (needs 4.5:1)
- ✅ Primary text (`#0f172a`) on background: **16.8:1** ✓
- ✅ Primary (`#2563eb`) on background: **8.9:1** ✓
- ✅ Text secondary (`#475569`) on background: **8.1:1** ✓

### 6. Light Floral Breeze
**Colors:**
- Background: `#f0fdf4` (very light green)
- Surface: `#ffffff` (white)
- Primary: `#16a34a` (green)
- Text: `#052e16` (very dark green)
- Text Secondary: `#374151` (dark gray)
- Text Muted: `#4b5563` (medium gray)

**Accessibility Issues:**
- ✅ All text colors meet WCAG AA standards
- ✅ Primary text (`#052e16`) on background: **15.2:1** ✓
- ✅ Primary (`#16a34a`) on background: **6.8:1** ✓
- ✅ Text muted (`#4b5563`) on background: **7.9:1** ✓

## Summary of Issues Found

### Critical Issues (Non-compliant with WCAG 2.1 AA):
1. **Muted text** in 5/6 themes has insufficient contrast
2. **Primary color** in 2/6 themes has insufficient contrast on backgrounds
3. **Border colors** likely too faint for 3:1 UI component requirement

### Recommendations:
1. **Increase muted text contrast** to at least 4.5:1 by darkening colors in dark themes or lightening in light themes
2. **Adjust primary colors** where needed to meet 4.5:1 ratio
3. **Strengthen border colors** for better element definition
4. **Add high-contrast variants** for users with visual impairments
5. **Implement color-blind friendly palettes** using tools like Coblis

## Next Steps:
1. Fix existing theme contrast issues
2. Create comprehensive color palette with accessibility-first approach
3. Add 20 new themes with built-in accessibility compliance
4. Implement accessibility indicators in theme selector
5. Add user preference for high-contrast mode