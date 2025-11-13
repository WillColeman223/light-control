import React, { useEffect, useState } from "react";

// Simple single-file React component to control Govee lights.
// Instructions: put this file in a Create React App / Vite project as src/App.jsx
// or adapt into an index.html using React CDN. See companion README below.

const GOVEe_API_KEY = "f4b87beb-7426-4751-9cbd-811d08300ea8"; // <-- YOUR KEY (see security note)
const API_BASE = "https://developer-api.govee.com/v1";

export default function App() {
  const [devices, setDevices] = useState([]);
  const [selected, setSelected] = useState(null);
  const [color, setColor] = useState("#ffffff");
  const [brightness, setBrightness] = useState(100);
  const [isOn, setIsOn] = useState(true);
  const [status, setStatus] = useState("");

  useEffect(() => {
    fetchDevices();
  }, []);

  async function fetchDevices() {
    setStatus("Fetching devices...");
    try {
      const res = await fetch(`${API_BASE}/devices`, {
        headers: {
          "Content-Type": "application/json",
          "Govee-API-Key": GOVEe_API_KEY,
        },
      });
      const j = await res.json();
      if (!res.ok) throw new Error(JSON.stringify(j));

      // The response structure may contain a .data.devices array (see Govee docs)
      const found = j.data?.devices || j.devices || [];
      setDevices(found);
      setStatus(`Found ${found.length} devices`);
      if (found.length) setSelected(found[0]);
    } catch (err) {
      console.error(err);
      setStatus("Failed to fetch devices. Check API key and network.");
    }
  }

  // Convert hex color to RGB object
  function hexToRgb(hex) {
    const parsed = hex.replace(/^#/, "");
    const bigint = parseInt(parsed, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return { r, g, b };
  }

  async function sendControl(command) {
    if (!selected) {
      setStatus("Select a device first");
      return;
    }

    const body = {
      device: selected.device || selected.deviceId || selected.device && selected.device.deviceId || selected.deviceId,
      model: selected.model || selected.device && selected.device.model || selected.model || selected.deviceType,
      command: command,
    };

    // Clean up if device/model keys are nested
    // Govee expects: { device: "DEVICE_ID", model: "MODEL", command: { name: "brightness", value: 50 } }

    try {
      setStatus("Sending command...");
      const res = await fetch(`${API_BASE}/devices/control`, {
        method: "PUT", // some docs use PUT, some POST — Govee accepts PUT for control
        headers: {
          "Content-Type": "application/json",
          "Govee-API-Key": GOVEe_API_KEY,
        },
        body: JSON.stringify(body),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(JSON.stringify(j));
      setStatus("Command sent — check your lights");
    } catch (err) {
      console.error(err);
      setStatus("Failed to send command: " + err.message);
    }
  }

  function handleSetColor() {
    const { r, g, b } = hexToRgb(color);
    const cmd = { name: "color", value: { r, g, b } };
    sendControl(cmd);
  }

  function handleSetBrightness() {
    const val = Math.max(0, Math.min(100, Math.round(brightness)));
    const cmd = { name: "brightness", value: val };
    sendControl(cmd);
  }

  function handlePower(on) {
    const cmd = { name: "turn", value: on ? "on" : "off" };
    setIsOn(on);
    sendControl(cmd);
  }

  return (
    <div className="p-6 max-w-2xl mx-auto font-sans">
      <h1 className="text-2xl font-bold mb-4">Govee Web Controller</h1>
      <p className="mb-4 text-sm text-gray-600">This demo talks directly to the Govee Developer API from the browser. <strong>Warning:</strong> embedding your API key in client-side code is insecure. See README below.</p>

      <div className="mb-4">
        <button className="px-3 py-2 rounded mr-2 bg-gray-200" onClick={fetchDevices}>Refresh devices</button>
        <span className="text-sm ml-2">{status}</span>
      </div>

      <div className="mb-4">
        <label className="block text-sm mb-1">Device</label>
        <select className="w-full p-2 border rounded" value={selected ? JSON.stringify(selected) : ""} onChange={(e) => setSelected(JSON.parse(e.target.value))}>
          {devices.length === 0 && <option value="">-- no devices --</option>}
          {devices.map((d, i) => (
            <option key={i} value={JSON.stringify(d)}>
              {d.deviceName || d.name || d.model || d.deviceId}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-4">
        <label className="block text-sm mb-1">Color</label>
        <div className="flex items-center gap-2">
          <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="w-12 h-12 p-0 border rounded" />
          <button className="px-3 py-2 rounded bg-blue-500 text-white" onClick={handleSetColor}>Set color</button>
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-sm mb-1">Brightness ({brightness}%)</label>
        <div className="flex items-center gap-2">
          <input type="range" min="0" max="100" value={brightness} onChange={(e) => setBrightness(e.target.value)} />
          <button className="px-3 py-2 rounded bg-blue-500 text-white" onClick={handleSetBrightness}>Set brightness</button>
        </div>
      </div>

      <div className="mb-6">
        <label className="block text-sm mb-1">Power</label>
        <div className="flex gap-2">
          <button className="px-3 py-2 rounded bg-green-500 text-white" onClick={() => handlePower(true)}>Turn ON</button>
          <button className="px-3 py-2 rounded bg-red-500 text-white" onClick={() => handlePower(false)}>Turn OFF</button>
        </div>
      </div>

      <div className="mt-8 p-4 border rounded bg-gray-50">
        <h2 className="font-semibold mb-2">README & Security</h2>
        <ol className="list-decimal list-inside text-sm">
          <li>To host on GitHub Pages: create a React app (Create React App or Vite), drop this component into <code>src/App.jsx</code>, build, and publish the <code>build</code> or <code>dist</code> folder to GitHub Pages.</li>
          <li><strong>Security:</strong> The Govee API key is powerful. Do <strong>not</strong> commit it to a public repo. Prefer a server-side proxy (serverless function) that stores the key as a secret and forwards commands from your frontend to Govee.</li>
          <li>If you want a quick but insecure demo: this file uses an in-file constant <code>GOVEe_API_KEY</code> so it will work if you publish the site, but anyone can read the key from the client.</li>
        </ol>
      </div>
    </div>
  );
}

/* End of file */
