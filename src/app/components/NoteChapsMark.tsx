import React from 'react'

interface NoteChapsMarkProps {
  size?: number
  className?: string
}

export function NoteChapsMark({ size = 20, className }: NoteChapsMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <rect x="4" y="4" width="56" height="56" rx="14" fill="#1F2330" />
      <rect x="8" y="8" width="48" height="48" rx="11" stroke="#4A9EFF" strokeOpacity="0.45" />
      <path d="M19 44V20H26L39 38V20H45V44H38L25 26V44H19Z" fill="#4A9EFF" />
      <path d="M43 46L49 40" stroke="#9ED2FF" strokeWidth="4" strokeLinecap="round" />
    </svg>
  )
}
