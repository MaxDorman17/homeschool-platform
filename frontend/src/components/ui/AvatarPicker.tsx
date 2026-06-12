'use client'

import React from 'react'

export interface AvatarPickerProps {
  value?: string
  onChange: (avatar: string) => void
  avatars?: string[]
}

const DEFAULT_AVATARS = [
  '🧑‍🏫', '👨‍🎓', '👩‍🎓', '👦', '👧', '🧒',
  '👨‍💻', '👩‍💻', '🎨', '🧪', '🔭', '📚',
  '🎵', '🌍', '💻', '🤖', '🐶', '🐱',
  '🦊', '🐼', '🦄', '🌟', '🚀', '🌈',
]

export function AvatarPicker({
  value,
  onChange,
  avatars = DEFAULT_AVATARS,
}: AvatarPickerProps) {
  return (
    <div className="space-y-3">
      <label className="text-sm font-medium">Choose Avatar</label>
      {value && (
        <div className="flex items-center gap-3 mb-2">
          <span className="text-sm text-muted-foreground">Selected:</span>
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-2xl ring-2 ring-primary">
            {value}
          </span>
        </div>
      )}
      <div className="grid grid-cols-8 gap-2 sm:grid-cols-10">
        {avatars.map((avatar) => (
          <button
            key={avatar}
            type="button"
            onClick={() => onChange(avatar)}
            className={`
              inline-flex h-10 w-10 items-center justify-center rounded-lg text-xl
              transition-all duration-200 hover:scale-110 hover:bg-primary/10
              focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2
              ${
                value === avatar
                  ? 'scale-110 bg-primary/20 ring-2 ring-primary shadow-md'
                  : 'bg-muted/50 hover:bg-muted border border-transparent'
              }
            `}
            title={avatar}
          >
            {avatar}
          </button>
        ))}
      </div>
    </div>
  )
}
