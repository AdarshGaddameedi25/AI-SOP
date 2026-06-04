import React, { JSX } from 'react'

interface HighlightTextProps {
  text: string
  query: string
}

export default function HighlightText({ text, query }: HighlightTextProps): JSX.Element {
  if (!query || !text) {
    return <>{text}</>
  }

  const stopWords = new Set(['what', 'where', 'how', 'when', 'who', 'the', 'a', 'an', 'and', 'or', 'for', 'to', 'of', 'in', 'is', 'are', 'we', 'do', 'if', 'it'])
  const words = query
    .toLowerCase()
    .split(/\W+/)
    .filter((w) => w.length > 2 && !stopWords.has(w))

  if (words.length === 0) {
    return <>{text}</>
  }

  const regex = new RegExp(`(${words.join('|')})`, 'gi')
  const parts = text.split(regex)

  return (
    <>
      {parts.map((part, i) => {
        const isMatch = words.some((w) => part.toLowerCase() === w)
        if (isMatch) {
          return (
            <mark
              key={i}
              style={{
                backgroundColor: 'var(--accent-subtle)',
                color: 'var(--accent)',
                fontWeight: 600,
                padding: '0 2px',
                borderRadius: '2px',
              }}
            >
              {part}
            </mark>
          )
        }
        return <span key={i}>{part}</span>
      })}
    </>
  )
}
