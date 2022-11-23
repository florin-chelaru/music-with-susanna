import React, { useMemo } from 'react'
import { Link } from '@mui/material'

export interface TextWithLinksProps {
  text?: string
}

const URL_REGEX =
  /(https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b[-a-zA-Z0-9()@:%_+.~#?&/=]*)/

export default function TextWithLinks({ text = '' }: TextWithLinksProps) {
  const renderText = useMemo(
    () => (text: string, regex: RegExp) => {
      const parts = text.split(regex)
      return parts.map((p, i) =>
        p.startsWith('http') ? (
          <Link href={p} color="inherit" rel="noreferrer" target="_blank" key={i}>
            {p}
          </Link>
        ) : (
          p
        )
      )
    },
    []
  )

  return <>{renderText(text, URL_REGEX)}</>
}
