"use client";
import { useId } from 'react';
import { IconType } from "react-icons";
import Select, { type SelectProps } from "./Select";

interface AuthSelectProps extends Pick<SelectProps, 'value' | 'onValueChange' | 'onBlur' | 'inputRef' | 'name' | 'invalid'> {
  label: string;
  options: readonly string[];
  placeholder?: string;
  icon?: IconType;
}

export default function AuthSelect({ label, options, placeholder = "Pilih salah satu", icon: Icon, ...field }: AuthSelectProps) {
  const id = useId();
  return (
    <div className="mb-4 w-full text-left">
      <label htmlFor={id} className="block text-zinc-700 font-bold text-sm mb-2">{label}</label>
      <Select
        {...field}
        id={id}
        aria-required
        options={options.map(option => ({ value: option, label: option }))}
        placeholder={placeholder}
        icon={Icon ? <Icon size={18} /> : undefined}
      />
    </div>
  );
}
