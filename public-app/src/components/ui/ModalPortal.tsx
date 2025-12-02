"use client";

import { ReactNode, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

let modalOpenCount = 0;
let previousBodyOverflow: string | null = null;

const ensureModalRoot = () => {
  let root = document.getElementById("modal-root");
  if (!root) {
    root = document.createElement("div");
    root.setAttribute("id", "modal-root");
    document.body.appendChild(root);
  }
  return root;
};

const lockBodyScroll = () => {
  if (typeof document === "undefined") {
    return;
  }
  if (modalOpenCount === 0) {
    previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
  }
  modalOpenCount += 1;
};

const unlockBodyScroll = () => {
  if (typeof document === "undefined") {
    return;
  }
  modalOpenCount = Math.max(0, modalOpenCount - 1);
  if (modalOpenCount === 0 && previousBodyOverflow !== null) {
    document.body.style.overflow = previousBodyOverflow;
    previousBodyOverflow = null;
  }
};

interface ModalPortalProps {
  children: ReactNode;
}

export const ModalPortal = ({ children }: ModalPortalProps) => {
  const [mounted, setMounted] = useState(false);
  const modalRootRef = useRef<Element | null>(null);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }
    modalRootRef.current = ensureModalRoot();
    setMounted(true);
    lockBodyScroll();
    return () => {
      unlockBodyScroll();
    };
  }, []);

  if (!mounted || !modalRootRef.current) {
    return null;
  }

  return createPortal(children, modalRootRef.current);
};


