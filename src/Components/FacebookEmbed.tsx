import React from 'react'

export interface FacebookEmbedProps {
  post: string
}

export default function FacebookEmbed({ post }: FacebookEmbedProps) {
  return <div className="fb-post" data-href={post} data-width="418" data-lazy="true" />
}
