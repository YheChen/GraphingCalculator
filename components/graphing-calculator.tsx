"use client"

import { useState, useEffect, useRef } from "react"
import { evaluate, parse } from "mathjs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, ZoomIn, ZoomOut, RefreshCw, Plus, Trash2, Eye, EyeOff, Info } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

// Define a type for our function entries
type FunctionEntry = {
  id: string
  expression: string
  color: string
  isVisible: boolean
}

// Add this new type for function errors
type FunctionError = {
  [key: string]: string | undefined
}

// Array of preset colors for new functions
const PRESET_COLORS = [
  "#0070f3", // blue
  "#ff0080", // pink
  "#00cc88", // green
  "#f5a623", // orange
  "#7928ca", // purple
  "#ff4d4f", // red
  "#00b8d9", // cyan
  "#8c8c8c", // gray
]

export default function GraphingCalculator() {
  const [functions, setFunctions] = useState<FunctionEntry[]>([
    { id: "func-1", expression: "x^2", color: PRESET_COLORS[0], isVisible: true },
  ])
  const [functionErrors, setFunctionErrors] = useState<FunctionError>({})

  const [xMin, setXMin] = useState(-10)
  const [xMax, setXMax] = useState(10)
  const [yMin, setYMin] = useState(-10)
  const [yMax, setYMax] = useState(10)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Generate a unique ID for new functions
  const generateId = () => `func-${Date.now()}`

  // Add a new function
  const addFunction = () => {
    const newColor = PRESET_COLORS[functions.length % PRESET_COLORS.length]
    setFunctions([
      ...functions,
      {
        id: generateId(),
        expression: "",
        color: newColor,
        isVisible: true,
      },
    ])
  }

  // Remove a function by ID
  const removeFunction = (id: string) => {
    setFunctions(functions.filter((f) => f.id !== id))
    // Also remove any errors for this function
    setFunctionErrors((prev) => {
      const newErrors = { ...prev }
      delete newErrors[id]
      return newErrors
    })
  }

  // Update a function's expression
  const updateExpression = (id: string, expression: string) => {
    setFunctions(functions.map((f) => (f.id === id ? { ...f, expression } : f)))
  }

  // Update a function's color
  const updateColor = (id: string, color: string) => {
    setFunctions(functions.map((f) => (f.id === id ? { ...f, color } : f)))
  }

  // Toggle a function's visibility
  const toggleVisibility = (id: string) => {
    setFunctions(functions.map((f) => (f.id === id ? { ...f, isVisible: !f.isVisible } : f)))
  }

  // Set function error
  const setFunctionError = (id: string, error: string) => {
    setFunctionErrors((prev) => ({ ...prev, [id]: error }))
  }

  // Clear function error
  const clearFunctionError = (id: string) => {
    setFunctionErrors((prev) => {
      const newErrors = { ...prev }
      delete newErrors[id]
      return newErrors
    })
  }

  const drawGraph = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Set dimensions
    const width = canvas.width
    const height = canvas.height

    // Draw axes
    ctx.beginPath()
    ctx.strokeStyle = "#666"
    ctx.lineWidth = 1

    // X-axis
    const yAxisPos = height * (yMax / (yMax - yMin))
    ctx.moveTo(0, yAxisPos)
    ctx.lineTo(width, yAxisPos)

    // Y-axis
    const xAxisPos = width * (-xMin / (xMax - xMin))
    ctx.moveTo(xAxisPos, 0)
    ctx.lineTo(xAxisPos, height)
    ctx.stroke()

    // Draw grid
    ctx.beginPath()
    ctx.strokeStyle = "#ddd"
    ctx.lineWidth = 0.5

    // Vertical grid lines (for x-axis)
    for (let x = Math.ceil(xMin); x <= Math.floor(xMax); x++) {
      if (x === 0) continue // Skip the axis itself
      const xPos = width * ((x - xMin) / (xMax - xMin))
      ctx.moveTo(xPos, 0)
      ctx.lineTo(xPos, height)
    }

    // Horizontal grid lines (for y-axis)
    for (let y = Math.ceil(yMin); y <= Math.floor(yMax); y++) {
      if (y === 0) continue // Skip the axis itself
      const yPos = height * ((yMax - y) / (yMax - yMin))
      ctx.moveTo(0, yPos)
      ctx.lineTo(width, yPos)
    }
    ctx.stroke()

    // Plot each function
    functions.forEach((func) => {
      if (!func.isVisible || !func.expression.trim()) return

      try {
        // Parse the equation once to validate it
        const node = parse(func.expression)

        ctx.beginPath()
        ctx.strokeStyle = func.color
        ctx.lineWidth = 2

        let isFirstPoint = true
        for (let i = 0; i < width; i++) {
          const x = xMin + (i / width) * (xMax - xMin)

          try {
            // Evaluate the function at x
            const y = evaluate(func.expression, { x })

            if (isNaN(y) || !isFinite(y)) continue

            const yPos = height * ((yMax - y) / (yMax - yMin))

            if (yPos < 0 || yPos > height) continue

            if (isFirstPoint) {
              ctx.moveTo(i, yPos)
              isFirstPoint = false
            } else {
              ctx.lineTo(i, yPos)
            }
          } catch (e) {
            // Skip points where evaluation fails
            continue
          }
        }

        ctx.stroke()
        clearFunctionError(func.id)
      } catch (e) {
        if (e instanceof Error) {
          setFunctionError(func.id, e.message)
        } else {
          setFunctionError(func.id, "Invalid equation")
        }
      }
    })
  }

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current) {
        const container = canvasRef.current.parentElement
        if (container) {
          canvasRef.current.width = container.clientWidth
          canvasRef.current.height = container.clientWidth * 0.6 // 3:5 aspect ratio
          drawGraph()
        }
      }
    }

    window.addEventListener("resize", handleResize)
    handleResize() // Initial sizing

    return () => window.removeEventListener("resize", handleResize)
  }, [])

  // Redraw when parameters change
  useEffect(() => {
    drawGraph()
  }, [functions, xMin, xMax, yMin, yMax])

  const handleZoomIn = () => {
    setXMin(xMin * 0.8)
    setXMax(xMax * 0.8)
    setYMin(yMin * 0.8)
    setYMax(yMax * 0.8)
  }

  const handleZoomOut = () => {
    setXMin(xMin * 1.2)
    setXMax(xMax * 1.2)
    setYMin(yMin * 1.2)
    setYMax(yMax * 1.2)
  }

  const handleReset = () => {
    setXMin(-10)
    setXMax(10)
    setYMin(-10)
    setYMax(10)
    setFunctions([{ id: "func-1", expression: "x^2", color: PRESET_COLORS[0], isVisible: true }])
    setFunctionErrors({})
  }

  // Set a preset function
  const setPresetFunction = (expression: string) => {
    // If there's only one function and it's empty, update it
    // Otherwise add a new function
    if (functions.length === 1 && !functions[0].expression) {
      updateExpression(functions[0].id, expression)
    } else {
      const newColor = PRESET_COLORS[functions.length % PRESET_COLORS.length]
      setFunctions([...functions, { id: generateId(), expression, color: newColor, isVisible: true }])
    }
  }

  // Add a custom logarithm with specified base
  const addCustomLogFunction = (base: number) => {
    const expression = `log(x, ${base})`
    const newColor = PRESET_COLORS[functions.length % PRESET_COLORS.length]
    setFunctions([...functions, { id: generateId(), expression, color: newColor, isVisible: true }])
  }

  return (
    <div className="w-full space-y-4">
      <Card>
        <CardContent className="pt-6">
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <Label>Functions</Label>
              <Button variant="outline" size="sm" onClick={addFunction}>
                <Plus className="h-4 w-4 mr-1" /> Add Function
              </Button>
            </div>

            {functions.map((func, index) => (
              <div key={func.id} className="flex gap-2 mb-2 items-start">
                <div className="w-4 h-8 rounded-sm mt-2" style={{ backgroundColor: func.color }} />

                <div className="flex-1">
                  <div className="flex gap-2 mb-1">
                    <Input
                      value={func.expression}
                      onChange={(e) => updateExpression(func.id, e.target.value)}
                      placeholder={`Function ${index + 1} (e.g., x^2, sin(x))`}
                    />

                    <Input
                      type="color"
                      value={func.color}
                      onChange={(e) => updateColor(func.id, e.target.value)}
                      className="w-12 p-1 h-10"
                    />

                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" onClick={() => toggleVisibility(func.id)}>
                            {func.isVisible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>{func.isVisible ? "Hide function" : "Show function"}</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    {functions.length > 1 && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={() => removeFunction(func.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Remove function</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>

                  {functionErrors[func.id] && (
                    <Alert variant="destructive" className="py-2 mb-2">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription className="text-xs">{functionErrors[func.id]}</AlertDescription>
                    </Alert>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="w-full bg-muted/20 rounded-md overflow-hidden">
            <canvas ref={canvasRef} className="w-full" style={{ minHeight: "300px" }} />
          </div>

          <div className="flex justify-center gap-2 mt-4">
            <Button variant="outline" size="icon" onClick={handleZoomIn}>
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={handleZoomOut}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={handleReset}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-4">
            <div>
              <Label>
                X Range: [{xMin.toFixed(1)}, {xMax.toFixed(1)}]
              </Label>
              <div className="flex items-center gap-2">
                <Input type="number" value={xMin} onChange={(e) => setXMin(Number(e.target.value))} className="w-20" />
                <Slider
                  value={[xMin]}
                  min={-100}
                  max={0}
                  step={1}
                  onValueChange={(value) => setXMin(value[0])}
                  className="flex-1"
                />
                <Slider
                  value={[xMax]}
                  min={0}
                  max={100}
                  step={1}
                  onValueChange={(value) => setXMax(value[0])}
                  className="flex-1"
                />
                <Input type="number" value={xMax} onChange={(e) => setXMax(Number(e.target.value))} className="w-20" />
              </div>
            </div>
            <div>
              <Label>
                Y Range: [{yMin.toFixed(1)}, {yMax.toFixed(1)}]
              </Label>
              <div className="flex items-center gap-2">
                <Input type="number" value={yMin} onChange={(e) => setYMin(Number(e.target.value))} className="w-20" />
                <Slider
                  value={[yMin]}
                  min={-100}
                  max={0}
                  step={1}
                  onValueChange={(value) => setYMin(value[0])}
                  className="flex-1"
                />
                <Slider
                  value={[yMax]}
                  min={0}
                  max={100}
                  step={1}
                  onValueChange={(value) => setYMax(value[0])}
                  className="flex-1"
                />
                <Input type="number" value={yMax} onChange={(e) => setYMax(Number(e.target.value))} className="w-20" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <h2 className="text-xl font-semibold mb-2">Function Examples</h2>

          <div className="mb-4">
            <h3 className="text-md font-medium mb-2">Basic Functions</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              <Button variant="outline" onClick={() => setPresetFunction("x^2")}>
                y = x²
              </Button>
              <Button variant="outline" onClick={() => setPresetFunction("x^3")}>
                y = x³
              </Button>
              <Button variant="outline" onClick={() => setPresetFunction("sin(x)")}>
                y = sin(x)
              </Button>
              <Button variant="outline" onClick={() => setPresetFunction("cos(x)")}>
                y = cos(x)
              </Button>
              <Button variant="outline" onClick={() => setPresetFunction("tan(x)")}>
                y = tan(x)
              </Button>
              <Button variant="outline" onClick={() => setPresetFunction("sqrt(x)")}>
                y = √x
              </Button>
              <Button variant="outline" onClick={() => setPresetFunction("abs(x)")}>
                y = |x|
              </Button>
              <Button variant="outline" onClick={() => setPresetFunction("1/x")}>
                y = 1/x
              </Button>
            </div>
          </div>

          <div>
            <div className="flex items-center mb-2">
              <h3 className="text-md font-medium">Logarithm Functions</h3>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" className="ml-1">
                    <Info className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80">
                  <div className="space-y-2">
                    <h4 className="font-medium">Custom Logarithm Syntax</h4>
                    <p className="text-sm">
                      To use a custom logarithm base, use the syntax: <code>log(x, base)</code>
                    </p>
                    <p className="text-sm">
                      Examples:
                      <ul className="list-disc pl-4">
                        <li>
                          <code>log(x, 10)</code> - Base 10 logarithm
                        </li>
                        <li>
                          <code>log(x, 2)</code> - Base 2 logarithm
                        </li>
                        <li>
                          <code>log(x)</code> - Natural logarithm (base e)
                        </li>
                      </ul>
                    </p>
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              <Button variant="outline" onClick={() => setPresetFunction("log(x)")}>
                y = ln(x)
              </Button>
              <Button variant="outline" onClick={() => setPresetFunction("log(x, 10)")}>
                y = log₁₀(x)
              </Button>
              <Button variant="outline" onClick={() => setPresetFunction("log(x, 2)")}>
                y = log₂(x)
              </Button>
            </div>

            <div className="mt-4">
              <Label htmlFor="custom-log-base">Custom Log Base:</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  id="custom-log-base"
                  type="number"
                  placeholder="Enter base (e.g., 5)"
                  className="w-40"
                  min="0"
                  step="any"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const base = Number.parseFloat((e.target as HTMLInputElement).value)
                      if (base > 0 && !isNaN(base)) {
                        addCustomLogFunction(base)
                        ;(e.target as HTMLInputElement).value = ""
                      }
                    }
                  }}
                />
                <Button
                  onClick={(e) => {
                    const input = document.getElementById("custom-log-base") as HTMLInputElement
                    const base = Number.parseFloat(input.value)
                    if (base > 0 && !isNaN(base)) {
                      addCustomLogFunction(base)
                      input.value = ""
                    }
                  }}
                >
                  Add Log Function
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
