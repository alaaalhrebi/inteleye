import { useRef } from "react";
import { cn } from "../lib/utils";

type Props = {
  children: React.ReactNode;
  className?: string;
  radius?: string;
  size?: number;
  intensity?: number;
};

export default function SpotlightBorder({
  children,
  className,
  radius = "2xl",
  size = 460,
  intensity = 0.5,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);

  function handleMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!ref.current) return;

    const rect = ref.current.getBoundingClientRect();

    ref.current.style.setProperty(
      "--spot-x",
      `${e.clientX - rect.left}px`
    );

    ref.current.style.setProperty(
      "--spot-y",
      `${e.clientY - rect.top}px`
    );
  }

  function handleLeave() {
    if (!ref.current) return;

    ref.current.style.setProperty("--spot-x", "-9999px");
    ref.current.style.setProperty("--spot-y", "-9999px");
  }

  return (
    <div
      ref={ref}
      onPointerMove={handleMove}
      onPointerLeave={handleLeave}
      style={
        {
          "--spot-x": "-9999px",
          "--spot-y": "-9999px",
          "--size": `${size}px`,
          "--intensity": intensity,
        } as React.CSSProperties
      }
      className={cn(
        "relative overflow-hidden rounded-2xl",
        className
      )}
    >
      {/* Border */}
      <div
        className={`
          pointer-events-none
          absolute
          inset-0
          rounded-${radius}
          border
          border-white/10
        `}
      />

      {/* Spotlight */}
      <div
        className="
          pointer-events-none
          absolute
          inset-0
          rounded-2xl
          opacity-0
          transition-opacity
          duration-300
          group-hover:opacity-100
        "
        style={{
          background: `radial-gradient(circle var(--size) at var(--spot-x) var(--spot-y),
          rgba(255,255,255,var(--intensity)),
          transparent 60%)`,
          mixBlendMode: "screen",
        }}
      />

      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}
