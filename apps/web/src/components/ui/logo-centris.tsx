import type * as React from "react";
import { cn } from "@/lib/utils";

export interface LogoCentrisProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Clase de tamaño aplicada al SVG horizontal (ej. `h-[26px]` o `h-7`). */
  svgClassName?: string;
}

/**
 * Lockup horizontal oficial "Órbita Vínculo" de Centris para encabezados y barra lateral.
 */
export function LogoCentris({
  className,
  svgClassName = "h-7 w-auto",
  ...props
}: LogoCentrisProps) {
  return (
    <span
      className={cn("inline-flex items-center text-foreground", className)}
      {...props}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 940 256"
        aria-hidden={true}
        className={cn("block shrink-0", svgClassName)}
      >
        <g>
          <path
            fill="currentColor"
            d="M 37.94 180.00 A 104 104 0 0 1 180.00 37.94 L 158.00 76.04 A 60 60 0 0 0 76.04 158.00 Z"
          />
          <path
            fill="currentColor"
            d="M 218.06 76.00 A 104 104 0 0 1 76.00 218.06 L 98.00 179.96 A 60 60 0 0 0 179.96 98.00 Z"
          />
          <path
            fill="#C1F429"
            d="M 153.46 120.93 A 10 10 0 0 1 153.46 135.07 L 135.07 153.46 A 10 10 0 0 1 120.93 153.46 L 102.54 135.07 A 10 10 0 0 1 102.54 120.93 L 120.93 102.54 A 10 10 0 0 1 135.07 102.54 Z"
          />
        </g>
        <g transform="translate(278 5)">
          <path
            fill="currentColor"
            d="M 104.58 75.50 A 60 71 0 1 0 104.58 170.50 L 88.23 155.78 A 38 49 0 1 1 88.23 90.22 Z"
          />
          <path
            fill="currentColor"
            fillRule="evenodd"
            d="M 214.96 170.68 A 50 50 0 1 1 222.99 152.00 H 146.78 A 29 29 0 0 0 197.76 158.63 Z M 146.78 132.00 A 29 29 0 0 1 201.22 132.00 Z"
          />
          <path
            fill="currentColor"
            d="M 246 92 H 268 V 111 C 276 98 287 92 301 92 C 322 92 334 106 334 133 V 192 H 312 V 134 C 312 119 306 112 294 112 C 281 112 271 120 268 134 V 192 H 246 Z"
          />
          <path
            fill="currentColor"
            d="M 374 56 H 396 V 92 H 414 V 112 H 396 V 160 C 396 168 400 172 408 172 H 414 V 192 H 402 C 382 192 374 182 374 162 V 112 H 354 V 92 H 374 Z"
          />
          <path
            fill="currentColor"
            d="M 434 92 H 456 V 111 C 464 98 474 92 487 92 C 493 92 497 93 499.9 95 V 116 C 497 114 492 112 486 112 C 472 112 460 121 456 135 V 192 H 434 Z"
          />
          <rect x="515" y="54" width="24" height="24" rx="6" fill="currentColor" />
          <rect x="516" y="92" width="22" height="100" fill="currentColor" />
          <path
            fill="currentColor"
            d="M 632 115 C 626 99 613 92 595 92 C 573 92 560 103 560 119 C 560 134 571 142 593 146 L 603 148 C 614 151 617 154 617 160 C 617 167 610 172 597 172 C 584 172 576 167 573 158 L 556 164 C 561 182 576 192 597 192 C 621 192 636 180 636 161 C 636 144 625 136 602 132 L 592 130 C 581 127 578 124 578 119 C 578 113 585 109 596 109 C 607 109 613 114 616 121 Z"
          />
        </g>
      </svg>
      <span className="sr-only">Centris</span>
    </span>
  );
}
