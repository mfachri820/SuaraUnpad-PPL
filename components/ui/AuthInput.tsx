"use client";
import React from 'react';
import { IconType } from "react-icons";
import type { UseFormRegisterReturn } from "react-hook-form";

interface AuthInputProps {
  label: string;
  placeholder: string;
  type?: string;
  register: UseFormRegisterReturn;
  icon?: IconType;
}

export default function AuthInput({ label, placeholder, type = "text", register, icon: Icon }: AuthInputProps) {
  return (
    <div className="mb-4 w-full text-left">
      <label className="block text-zinc-700 font-bold text-sm mb-2">{label}</label>
      <div className="relative">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#E8A34D]">
            <Icon size={18} />
          </div>
        )}
        <input 
          type={type} 
          placeholder={placeholder}
          {...register}
          className={`w-full ${Icon ? 'pl-10' : 'pl-4'} pr-4 py-3 bg-white border border-[#E8A34D]/30 rounded-xl focus:outline-none focus:border-[#E8A34D] transition-all text-sm text-black placeholder:text-zinc-400`}
        />
      </div>
    </div>
  );
}