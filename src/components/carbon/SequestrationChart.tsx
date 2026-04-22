import { useEffect, useRef } from "react";

const SequestrationChart = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = canvas.offsetWidth;
    canvas.height = 320;

    // Clear canvas with a dark, subtle green background
    ctx.fillStyle = "hsl(150, 8%, 6%)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Generate mock data
    const data = Array.from({ length: 12 }, (_, i) => ({
      month: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][i],
      value: 50 + Math.random() * 40 + i * 3,
    }));

    const padding = 50;
    const chartWidth = canvas.width - padding * 2;
    const chartHeight = canvas.height - padding * 2;
    const barWidth = chartWidth / data.length - 10;

    // Find max value
    const maxValue = Math.max(...data.map((d) => d.value));

    // Draw bars and gradient
    data.forEach((point, i) => {
      const x = padding + i * (chartWidth / data.length);
      const barHeight = (point.value / maxValue) * chartHeight;
      const y = canvas.height - padding - barHeight;

      // Gradient for bars (soft green gradient)
      const gradient = ctx.createLinearGradient(x, y, x, canvas.height - padding);
      gradient.addColorStop(0, "hsl(142, 56%, 62%)");
      gradient.addColorStop(1, "hsl(150, 40%, 46%)");

      ctx.fillStyle = gradient;
      ctx.fillRect(x, y, barWidth, barHeight);

      // Draw bar without glow
      ctx.fillRect(x, y, barWidth, barHeight);

      // Draw month labels
      ctx.fillStyle = "#6b7280";
      ctx.font = "12px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(point.month, x + barWidth / 2, canvas.height - padding + 20);

      // Draw values on top
      ctx.fillStyle = "hsl(142,48%,62%)";
      ctx.font = "10px sans-serif";
      ctx.fillText(point.value.toFixed(1), x + barWidth / 2, y - 5);
    });

    // Draw axes
    ctx.strokeStyle = "#1f2937";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, canvas.height - padding);
    ctx.lineTo(canvas.width - padding, canvas.height - padding);
    ctx.stroke();

    // Y-axis labels
    ctx.fillStyle = "#6b7280";
    ctx.font = "12px sans-serif";
    ctx.textAlign = "right";
    for (let i = 0; i <= 5; i++) {
      const value = (maxValue / 5) * i;
      const y = canvas.height - padding - (chartHeight / 5) * i;
      ctx.fillText(value.toFixed(0), padding - 10, y + 4);
    }

    // Title
    ctx.fillStyle = "hsl(142,48%,62%)";
    ctx.font = "16px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("Carbon Sequestration Trends (tCO₂/month)", padding, padding - 20);
  }, []);

  return (
    <div className="w-full">
      <canvas
        ref={canvasRef}
        className="w-full"
        style={{ width: "100%", height: "320px" }}
      />
    </div>
  );
};

export default SequestrationChart;
