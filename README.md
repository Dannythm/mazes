# 🧩 Kid Maze Explorer

A local network 2D maze game for iPad & PC designed for kids aged 5 and 7!

## Features

- 📱 **iPad & PC Friendly**: Touch swipe gesture controls on iPad (feels like solving on pen and paper with a crayon trail), plus Mouse dragging and Keyboard (Arrow keys & WASD) on PC.
- 🦄 **Kid Themes & Avatars**:
  - **Magic Theme**: Unicorns 🦄, Fairies 🧚, Magic Wands 🪄, Sparkles ✨ & Magic Forest styling.
  - **Space & Dino Theme**: Rockets 🚀, Dinosaurs 🦖, Race Cars 🏎️, Planets 🪐 & Cosmic/Jurassic styling.
- 🎨 **Custom Maze Generator**:
  - Shapes: Square, Rectangle, Circle (polar concentric), Triangle, Hexagon, Star.
  - Intersection Angles: 90° crisp corners vs Smooth rounded corners.
  - Fractal Dimension & Complexity Slider (4x4 to 24x24).
  - **Visual Difficulty Rating Gauge**: Color bar transitions dynamically from Blue/Green (Very Easy) -> Orange (Medium) -> Red (Hard) -> Black (Extreme).
- ⭐️ **Story Mode**:
  - Multi-chapter worlds (10 mazes per group).
  - Star rating system (1 to 3 stars based on item collection & moves).
  - Star gate unlock requirement (25 stars required to unlock World 2).
- 🔊 **Web Audio Synthesizer**: Pure sound effects (pops, item pickup chimes, victory fanfare) with **no background music** to preserve battery & CPU on 1st generation iPad devices.
- 👥 **Profiles & High Scores**: Create profiles for each child with individual stats (mazes solved, moves, time, resets, and stars).

---

## 🚀 How to Run on PC

1. Open PowerShell / Terminal in `G:\python\labirynths`:
   ```bash
   go run cmd/server/main.go
   ```

2. The server will launch and display:
   - PC local web address: `http://localhost:8080`
   - iPad / Local Network address: `http://<YOUR-PC-LOCAL-IP>:8080`

---

## 📱 How to Connect from iPad

1. Ensure your iPad is connected to the same Wi-Fi network as your PC.
2. Open the **Camera App** on your iPad and point it at the network address printed in your PC terminal, OR open Safari and type `http://<YOUR-PC-LOCAL-IP>:8080`.
3. Tap "Share" -> "Add to Home Screen" in Safari for a full-screen, app-like experience!
