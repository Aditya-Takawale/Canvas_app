# Cursor Visualization User Guide

## Introduction

The Canvas App now features a dedicated cursor visualization mode that shows the cursors of all registered users in a room without requiring user switching. This guide will help you understand how to use this feature effectively.

## Getting Started

### Accessing Cursor Visualization Mode

When you open the Canvas App, the Cursor Visualization Mode is enabled by default. You'll see a blue bar at the top of the interface with a button that allows you to switch between modes:

- **Cursors-only Mode**: Shows cursors of all users without user switching (default)
- **Multi-user Mode**: The original implementation that allows switching between users

### Understanding the Interface

In Cursor Visualization Mode, the interface includes:

1. **Top Bar**: Shows your current user info and allows toggling between modes
2. **Cursor Display Button**: Shows your cursor icon and name, click to expand the cursor panel
3. **Cursor Status Indicator**: Shows whether cursor display is enabled or disabled
4. **Tool Info**: Shows your current active tool
5. **Canvas Area**: The main drawing area where you'll see other users' cursors
6. **Status Bar**: Shows room info and keyboard shortcut reminders

## Working with Cursors

### Seeing Other Users' Cursors

When other users are active in the same room:
- Their cursors will appear on your screen in their assigned color
- Each cursor shows the user's name and their chosen cursor icon
- The cursor movements update in real-time as users move their mouse

### Toggling Cursor Visibility

If the cursor display becomes distracting:
- Press the **C** key to toggle cursor visibility on/off
- The cursor status indicator will show whether cursors are visible
- This affects only your view; other users can still see cursors if they have them enabled

### Viewing All Active Users

To see all users currently in the room:
1. Click on your user button in the top bar (shows your cursor icon and name)
2. A panel will expand showing all active users
3. Each user entry shows:
   - User name
   - User color
   - User cursor icon
   - Online status

## Drawing with Attribution

### Creating Objects with User Identity

When you draw or create objects:
- Each object is automatically attributed to you
- Objects maintain your assigned color
- Your user ID is stored with each object for proper attribution

### Understanding Object Attribution

The system helps identify who created what:
- Drawing colors are determined by the selected brush color, not user identity
- Objects are internally attributed to their creator (for tracking purposes)
- Cursor colors indicate user identity but don't affect drawing colors
- The selected tool colors in the toolbar determine the drawing color

## Tips for Effective Collaboration

1. **Keep an eye on cursors**: Watch where others are working to avoid conflicts
2. **Use the cursor display panel**: Check who's online in your room
3. **Toggle cursor visibility**: Turn off cursors temporarily if they're distracting
4. **Communicate**: Use the cursor position to point at areas you're discussing

## Troubleshooting

If you experience issues with cursor visualization:

1. **Cursors not showing**:
   - Check if cursor visibility is toggled on (press C)
   - Verify that other users are actually in the room

2. **Lagging cursor updates**:
   - This could be due to network latency
   - Check your internet connection

3. **Wrong cursor color/attribution**:
   - Try refreshing the page
   - Ensure you're logged in with the correct account

## Switching Between Modes

You can switch between Cursor Visualization Mode and Multi-user Mode at any time:

1. Click the mode toggle button in the blue bar at the top
2. Your canvas state will be preserved when switching modes
3. All user attributions and colors remain consistent between modes