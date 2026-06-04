import React from "react";

export default function Container({ children, className = "" }) {
  return (
    <div className={`w-[94vw] sm:w-[90vw] lg:w-[80vw] mx-auto ${className}`}>
      {children}
    </div>
  );
}
