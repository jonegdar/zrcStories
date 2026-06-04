import React from "react";
import Navbar from "../common/Navbar";

export default function PageLayout({ children, mainClassName = "" }) {
  return (
    <>
      <Navbar />
      <main className={`min-h-screen overflow-x-hidden ${mainClassName}`}>{children}</main>
    </>
  );
}
