# HandsOnHub – Virtual ECE Breadboard & Circuit Simulator

A high-fidelity, interactive, browser-based Electronics and Computer Engineering (ECE) breadboard and circuit simulation platform. Designed for students, educators, and makers to construct, test, and analyze electronic circuits directly on a skeuomorphic solderless breadboard with real-time Modified Nodal Analysis (MNA) solving.

---

## ⚡ Key Features

### 1. Realistic Hardware Breadboard Engine
- **Authentic MB-102 Design**: Modeled after standard 830-tie-point solderless breadboards with an authentic white ABS plastic chassis preserved across both Light and Dark modes.
- **Precision Coordinates**:
  - Top & bottom column coordinate headers (`1` to `30`) with bold milestone indicators (`1`, `5`, `10`, `15`, `20`, `25`, `30`).
  - Dual-sided row letters (`a`–`e` and `f`–`j`) on both left and right margins for easy lead referencing.
- **Dual Power Bus Rails**: Continuous red (+) and blue (−) polarity stripes with clear `+` and `−` symbols on both ends.
- **Recessed IC DIP Trough**: Molded center 0.3" channel with center alignment groove designed for IC bridging between row sets `e` and `f`.
- **Skeuomorphic Sockets**: Dual phosphor-bronze spring clips with metallic reflection and connection glow rings.

### 2. Comprehensive ECE Curriculum Experiments
Pre-loaded with verified experiment presets for standard ECE / EE laboratory courses:
- **Kirchhoff's Laws (KVL & KCL)**: Verification of $\sum V = 0$ along closed loops and $\sum I_{in} = \sum I_{out}$ at tie-point junctions with energy conservation checks.
- **Thevenin's & Norton's Theorems**: DC network reduction, open-circuit voltage ($V_{th}$), short-circuit current ($I_n$), and equivalent resistance ($R_{th}$) verification.
- **Semiconductor Devices**: V-I forward and reverse conduction characteristics of PN junction diodes and Zener diodes.
- **Boolean Logic Gates**: Combinational circuits, half/full adders, and subtractors using AND, OR, NOT, NAND, NOR, XOR, and XNOR gates.
- **Combinational MSI Circuits**: 4:1 Multiplexers (MUX) and 2:4 / 3:8 Decoders.
- **Sequential Logic & Flip-Flops**: D Flip-Flops, JK Flip-Flops, and synchronous/asynchronous binary counters.
- **Display Systems**: BCD-to-7-Segment Decoder / Driver (74LS47) driving real-time 7-segment LED displays.
- **Sensors & Peripherals**: LDR (Light Dependent Resistor) optoelectronic sensing and Infrared (IR) obstacle detection.

### 3. Hardware-Accurate Component Library
- **Sources**: DC Batteries, Precision DC Voltage Sources, Ground nodes, Signal Generators / Clock oscillators.
- **Passives**: Color-band decoded Resistors, Electrolytic & Ceramic Capacitors, Inductors, Potentiometers.
- **Semiconductors**: Diodes (1N4007), Zener Diodes, LEDs with photorealistic diffuse glow, NPN/PNP Transistors.
- **Digital ICs**: 7400 Quad NAND, 7404 Hex Inverter, 7408 Quad AND, 7432 Quad OR, 7486 Quad XOR, 7474 Dual D-FF, 7476 Dual JK-FF, 7447 BCD Decoder.
- **Sensors**: Light Dependent Resistor (LDR), Infrared (IR) Obstacle Sensor.
- **Instruments**: Digital Multimeter (Voltage/Current/Resistance), dedicated Inline Ammeter, Voltmeter, and Oscilloscope.
- **Controls**: Pushbuttons (momentary tactile), SPST Toggle Switches, SPDT Slide Switches.
- **Jumper Wires**: 8 standard color codes (Red, Black, Blue, Green, Yellow, Orange, Purple, White) with animated current flow telemetry.

### 4. Component Details Dossier (Inspector)
Selecting any placed component opens a detailed technical dossier in the aside panel:
- **Live Electrical Telemetry**: Real-time terminal voltage, branch current, and power dissipation.
- **Pinout Blueprint**: Metallic contact pin identification badges and connection node mapping.
- **Interactive Tuning**: Immediate parameter sliders and inputs (resistance, capacitance, supply voltage, frequency, switch states).
- **Physical & Mathematical Theory**: Built-in pedagogical background explaining the governing device equations (e.g., Shockley diode equation, Ohm's law, Boolean truth tables).

### 5. Lab Log & Telemetry Ledger
An integrated bottom console designed for academic lab record keeping:
- **Activity Steps Log**: Chronological audit trail logging every breadboard interaction (component placements, movements, wire routing, parameter tweaks, switch toggles, and deletions).
- **Live Readings Table**: Tabular ledger monitoring every component's operational voltage, current, power, and digital status.
- **Snapshot Capture**: Record timestamped measurement snapshots with custom observation notes during experimental runs.
- **KVL / KCL Verifier**: Instant nodal continuity analysis and energy conservation balance calculations ($\sum P_{src} = \sum P_{load}$).
- **CSV & Clipboard Export**: One-click download of all steps and measurement tables to CSV or TSV clipboard format for lab report documentation.

### 6. Responsive Workspace & Device Adaptation
- **Fluid Proportional Aside Panels**: Both the Component Library and Inspector panels automatically scale with device viewport width (`vw`), keeping the breadboard centered and visible on phones, tablets, laptops, and ultra-wide screens.
- **Draggable Splitters**: Interactive vertical splitters allow arbitrary manual resizing, with double-click reset and one-click chevron collapse/expand toggles.
- **Touch & Gesture Support**: Pinch-to-zoom, two-finger pan, and single-tap placement/wiring on mobile devices.
- **Simulation Control**: Instant Start / Stop simulation toggle with live DC nodal solver and transient engine synchronization.

---

## 🛠️ Technology Stack

- **Framework**: React 19 + TypeScript
- **Bundler & Tooling**: Vite, Oxlint
- **Canvas Rendering**: HTML5 Canvas via [React-Konva](https://github.com/konvajs/react-konva) & [Konva](https://konvajs.org/)
- **Circuit Simulation Engine**: Custom Modified Nodal Analysis (MNA) DC solver & Transient Integration Engine
- **State Management**: Zustand with Zundo undo/redo history middleware
- **Icons**: Lucide React
- **Styling**: Vanilla CSS (Tailored HSL design system with glassmorphism and theme switching)

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher recommended)
- npm or pnpm

### Installation

```bash
# Clone the repository
git clone https://github.com/Jaykrai11/HandsOnHub_Electronics.git

# Navigate to the client directory
cd HandsOnHub_Electronics/client

# Install dependencies
npm install
```

### Running the Development Server

```bash
npm run dev
```

The application will start locally at:
```
http://localhost:5173/
```

### Building for Production

```bash
npm run build
```

---

## ⌨️ Controls & Shortcuts

| Action | Control |
|---|---|
| **Select / Move** | Click and drag any component |
| **Route Jumper Wire** | Select **Wire** tool (`W`), click starting hole, click target hole |
| **Change Wire Color** | Click any color swatch in the toolbar palette |
| **Rotate Component** | Press `R` or click the Rotate toolbar button |
| **Flip Component** | Click Flip Horizontal in toolbar |
| **Delete Selected** | Press `Delete` / `Backspace` or click Delete button |
| **Pan Canvas** | Hold Middle Mouse Button and drag, or activate Pan tool (`H`) |
| **Zoom In / Out** | Mouse Wheel Scroll, or `+` / `−` toolbar zoom buttons |
| **Fit to Screen** | Click the Maximize icon (`[]`) in the canvas controls |
| **Undo / Redo** | `Ctrl+Z` / `Ctrl+Y` |
| **Open Lab Log** | Click **Lab Log** in the top navigation bar |
| **Toggle Theme** | Click the Sun / Moon icon in the top right |

---

## 📄 License

This project is licensed under the MIT License.
