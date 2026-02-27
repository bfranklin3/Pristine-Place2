// components/AccessibilityWidget.tsx

"use client"

import { useState, useEffect } from "react"
import { X } from "lucide-react"

export function AccessibilityWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [isVisible, setIsVisible] = useState(true)
  const [fontSize, setFontSize] = useState(100)
  const [reducedMotion, setReducedMotion] = useState(false)

  useEffect(() => {
    const hidden = localStorage.getItem("accessibility-widget-hidden")
    if (hidden === "true") setIsVisible(false)

    const savedTextSize = localStorage.getItem("textSize")
    if (savedTextSize) {
      const size = parseInt(savedTextSize)
      setFontSize(size)
      document.documentElement.style.fontSize = `${size}%`
    }

    const savedReducedMotion = localStorage.getItem("reducedMotion")
    if (savedReducedMotion === "true") {
      setReducedMotion(true)
      document.documentElement.classList.add("reduce-motion")
    }
  }, [])

  const hideWidget = () => {
    localStorage.setItem("accessibility-widget-hidden", "true")
    setIsVisible(false)
  }

  const adjustFontSize = (delta: number) => {
    const newSize = Math.min(150, Math.max(80, fontSize + delta))
    setFontSize(newSize)
    document.documentElement.style.fontSize = `${newSize}%`
    localStorage.setItem("textSize", newSize.toString())
  }

  const resetSettings = () => {
    setFontSize(100)
    setReducedMotion(false)
    document.documentElement.style.fontSize = "100%"
    document.documentElement.classList.remove("reduce-motion")
    localStorage.removeItem("textSize")
    localStorage.removeItem("reducedMotion")
  }

  const toggleReducedMotion = () => {
    const next = !reducedMotion
    setReducedMotion(next)
    if (next) {
      document.documentElement.classList.add("reduce-motion")
    } else {
      document.documentElement.classList.remove("reduce-motion")
    }
    localStorage.setItem("reducedMotion", next.toString())
  }

  if (!isVisible) return null

  return (
    <>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed right-0 bottom-24 z-50 text-white shadow-lg transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-blue-300 rounded-l-lg py-3 px-2 md:py-6 md:px-3 hover:px-3 md:hover:px-4 hover:opacity-90"
        style={{ backgroundColor: "#0066CC" }}
        aria-label="Accessibility Options"
        title="Accessibility Options"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="w-5 h-5 md:w-6 md:h-6"
          aria-hidden="true"
        >
          <circle cx="12" cy="4" r="2" />
          <path d="M19 13v-2c-1.54.02-3.09-.75-4.07-1.83l-1.29-1.43c-.17-.19-.38-.34-.61-.45-.01 0-.01-.01-.02-.01H13c-.35-.2-.75-.3-1.19-.26C10.76 7.11 10 8.04 10 9.09V15c0 1.1.9 2 2 2h5v5h2v-5.5c0-1.1-.9-2-2-2h-3v-3.45c1.29 1.07 3.25 1.94 5 1.95zm-6.17 5c-.41 1.16-1.52 2-2.83 2-1.66 0-3-1.34-3-3 0-1.31.84-2.41 2-2.83V12.1c-2.28.46-4 2.48-4 4.9 0 2.76 2.24 5 5 5 2.42 0 4.44-1.72 4.9-4h-2.07z" />
        </svg>
      </button>

      {/* Panel */}
      {isOpen && (
        <div className="fixed right-2 bottom-40 z-50 bg-white rounded-lg shadow-2xl border-2 border-pp-slate-200 w-80 max-w-[calc(100vw-1rem)]">
          <div
            className="text-white px-4 py-3 rounded-t-lg flex items-center justify-between"
            style={{ backgroundColor: "#0066CC" }}
          >
            <h3 className="font-semibold" style={{ fontSize: "var(--step-1)" }}>
              Accessibility Options
            </h3>
            <button
              onClick={() => setIsOpen(false)}
              className="hover:bg-black/20 rounded p-1 transition-colors"
              aria-label="Close accessibility options"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-4 stack-lg">
            {/* Text Size */}
            <div className="stack-xs">
              <h4 className="font-semibold text-pp-slate-800">Text Size</h4>
              <div className="cluster bg-pp-slate-50 rounded-lg p-3" style={{ justifyContent: "space-between" }}>
                <button
                  onClick={() => adjustFontSize(-10)}
                  disabled={fontSize <= 80}
                  className="text-white px-4 py-2 rounded font-bold transition-colors disabled:cursor-not-allowed"
                  style={{ backgroundColor: fontSize <= 80 ? "#D1D5DB" : "#0066CC" }}
                  aria-label="Decrease text size"
                >
                  A-
                </button>
                <span className="font-medium text-pp-slate-700">{fontSize}%</span>
                <button
                  onClick={() => adjustFontSize(10)}
                  disabled={fontSize >= 150}
                  className="text-white px-4 py-2 rounded font-bold transition-colors disabled:cursor-not-allowed"
                  style={{ backgroundColor: fontSize >= 150 ? "#D1D5DB" : "#0066CC" }}
                  aria-label="Increase text size"
                >
                  A+
                </button>
              </div>
              <button
                onClick={resetSettings}
                className="text-fluid-sm underline"
                style={{ color: "#0066CC" }}
              >
                Reset to default
              </button>
            </div>

            {/* Reduced Motion */}
            <div className="stack-xs">
              <h4 className="font-semibold text-pp-slate-800">Motion</h4>
              <button
                onClick={toggleReducedMotion}
                className={`w-full cluster p-3 rounded-lg border-2 transition-all ${
                  reducedMotion
                    ? "text-white"
                    : "bg-white border-pp-slate-300 text-pp-slate-700 hover:border-blue-600"
                }`}
                style={
                  reducedMotion
                    ? { backgroundColor: "#0066CC", borderColor: "#0066CC", justifyContent: "space-between" }
                    : { justifyContent: "space-between" }
                }
                aria-pressed={reducedMotion}
              >
                <span className="font-medium">Reduced Motion</span>
                <div
                  className={`w-12 h-6 rounded-full relative transition-colors ${
                    reducedMotion ? "bg-blue-800" : "bg-pp-slate-300"
                  }`}
                >
                  <div
                    className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                      reducedMotion ? "translate-x-6" : ""
                    }`}
                  />
                </div>
              </button>
              <p className="text-fluid-sm text-pp-slate-500">Stops animations and transitions</p>
            </div>

            {/* Footer Links */}
            <div className="pt-3 border-t border-pp-slate-200 stack-xs">
              <a
                href="/accessibility"
                className="text-fluid-sm underline"
                style={{ color: "#0066CC" }}
              >
                Learn more about our accessibility commitment
              </a>
              <button
                onClick={hideWidget}
                className="text-pp-slate-500 hover:text-pp-slate-700 text-fluid-sm underline"
              >
                Hide accessibility widget
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
