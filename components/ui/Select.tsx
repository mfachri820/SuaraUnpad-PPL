"use client";

import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode, type RefCallback } from "react";
import { createPortal } from "react-dom";
import { FiCheck, FiChevronDown } from "react-icons/fi";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps {
  id?: string;
  name?: string;
  value: string;
  onValueChange: (value: string) => void;
  options: readonly SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  invalid?: boolean;
  onBlur?: () => void;
  inputRef?: RefCallback<HTMLButtonElement>;
  icon?: ReactNode;
  "aria-label"?: string;
  "aria-required"?: boolean;
  "aria-describedby"?: string;
}

export default function Select({
  id, name, value, onValueChange, options, placeholder = "Pilih salah satu",
  disabled = false, required = false, invalid = false, onBlur, inputRef, icon,
  ...aria
}: SelectProps) {
  const generatedId = useId();
  const triggerId = id ?? `select-${generatedId}`;
  const menuId = `${triggerId}-options`;
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  const searchRef = useRef({ text: "", time: 0 });
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [validationFailed, setValidationFailed] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0, maxHeight: 280 });
  const selected = options.find(option => option.value === value);

  const getPosition = useCallback(() => {
    const rect = triggerRef.current!.getBoundingClientRect();
    const below = window.innerHeight - rect.bottom - 14;
    const above = rect.top - 14;
    const desiredHeight = Math.min(280, Math.max(1, options.length) * 40 + 10);
    const placeAbove = below < desiredHeight && above > below;
    const maxHeight = Math.max(50, Math.min(desiredHeight, placeAbove ? above : below));
    const width = Math.min(rect.width, window.innerWidth - 16);
    const preferredTop = placeAbove ? rect.top - maxHeight - 6 : rect.bottom + 6;
    return {
      top: Math.max(8, Math.min(preferredTop, window.innerHeight - maxHeight - 8)),
      left: Math.max(8, Math.min(rect.left, window.innerWidth - width - 8)),
      width,
      maxHeight
    };
  }, [options.length]);

  const openMenu = (index?: number) => {
    if (disabled) return;
    const selectedIndex = options.findIndex(option => option.value === value && !option.disabled);
    setActiveIndex(index ?? (selectedIndex >= 0 ? selectedIndex : options.findIndex(option => !option.disabled)));
    setPosition(getPosition());
    setOpen(true);
    searchRef.current = { text: "", time: 0 };
  };

  const choose = (index: number) => {
    const option = options[index];
    if (!option || option.disabled) return;
    onValueChange(option.value);
    setValidationFailed(false);
    setOpen(false);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const enabled = options.map((option, index) => option.disabled ? -1 : index).filter(index => index >= 0);
    if (event.key === "Escape" && open) {
      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
    } else if (event.key === "Tab") {
      setOpen(false);
    } else if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
      event.preventDefault();
      const direction = event.key === "ArrowUp" ? -1 : 1;
      const current = enabled.indexOf(activeIndex);
      const next = event.key === "Home" ? enabled[0]
        : event.key === "End" ? enabled.at(-1)
          : enabled[(current + direction + enabled.length) % enabled.length];
      if (open) setActiveIndex(next ?? -1);
      else openMenu(event.key === "Home" || event.key === "End" ? next : undefined);
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (open) choose(activeIndex);
      else openMenu();
    } else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault();
      const now = Date.now();
      const text = (now - searchRef.current.time < 700 ? searchRef.current.text : "") + event.key.toLocaleLowerCase();
      const start = text.length > 1 ? Math.max(0, activeIndex) : activeIndex + 1;
      const match = Array.from({ length: options.length }, (_, offset) => (start + offset) % options.length)
        .find(index => !options[index].disabled && options[index].label.toLocaleLowerCase().startsWith(text));
      if (!open) openMenu(match);
      else if (match !== undefined) setActiveIndex(match);
      searchRef.current = { text, time: now };
    }
  };

  useEffect(() => {
    if (!open) return;
    const reposition = () => {
      if (triggerRef.current) setPosition(getPosition());
    };
    const dismiss = (event: PointerEvent) => {
      if (!triggerRef.current?.contains(event.target as Node) && !menuRef.current?.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    document.addEventListener("pointerdown", dismiss);
    return () => {
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
      document.removeEventListener("pointerdown", dismiss);
    };
  }, [open, getPosition]);

  useEffect(() => {
    if (open) document.getElementById(`${menuId}-${activeIndex}`)?.scrollIntoView({ block: "nearest" });
  }, [open, activeIndex, menuId]);

  return (
    <div className="w-full min-w-0">
      {/* Retain form values and native required validation without showing the browser menu. */}
      <select
        name={name}
        value={value}
        onChange={event => onValueChange(event.target.value)}
        required={required}
        disabled={disabled}
        tabIndex={-1}
        aria-hidden="true"
        className="sr-only pointer-events-none"
        onInvalid={event => {
          event.preventDefault();
          setValidationFailed(true);
          triggerRef.current?.focus();
        }}
      >
        {!options.some(option => option.value === "") && <option value="" disabled>{placeholder}</option>}
        {options.map(option => <option key={option.value} value={option.value} disabled={option.disabled}>{option.label}</option>)}
      </select>
      <button
        {...aria}
        ref={node => {
          triggerRef.current = node;
          inputRef?.(node);
        }}
        id={triggerId}
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={open ? menuId : undefined}
        aria-activedescendant={open && activeIndex >= 0 ? `${menuId}-${activeIndex}` : undefined}
        aria-required={required || aria["aria-required"] || undefined}
        aria-invalid={invalid || validationFailed || undefined}
        disabled={disabled}
        className="select-trigger"
        onClick={() => open ? setOpen(false) : openMenu()}
        onKeyDown={handleKeyDown}
        onBlur={() => { setOpen(false); onBlur?.(); }}
      >
        {icon && <span className="shrink-0 text-slate-400" aria-hidden="true">{icon}</span>}
        <span className={`min-w-0 flex-1 truncate text-left ${selected ? "text-slate-800" : "text-slate-400"}`}>{selected?.label ?? placeholder}</span>
        <FiChevronDown aria-hidden="true" className={`shrink-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && createPortal(
        <ul ref={menuRef} id={menuId} role="listbox" aria-labelledby={triggerId} className="select-menu" style={position}>
          {options.length === 0 && <li className="px-3 py-2.5 text-sm text-slate-400">Tidak ada pilihan tersedia</li>}
          {options.map((option, index) => (
            <li
              key={option.value}
              id={`${menuId}-${index}`}
              role="option"
              aria-selected={option.value === value}
              aria-disabled={option.disabled || undefined}
              data-active={activeIndex === index}
              className="select-option"
              title={option.label}
              onPointerMove={() => { if (!option.disabled) setActiveIndex(index); }}
              onPointerDown={event => event.preventDefault()}
              onClick={() => choose(index)}
            >
              <span className="truncate">{option.label}</span>
              {option.value === value && <FiCheck className="shrink-0 text-slate-600" aria-hidden="true" />}
            </li>
          ))}
        </ul>, document.body
      )}
    </div>
  );
}
