import React from 'react'
import { Card, CardMedia, CardProps, Typography, useMediaQuery, useTheme } from '@mui/material'
import { GREY } from '../theme/palette'

interface PhotoCardProps extends CardProps {
  image: string
  alt: string
  caption?: string
}

export default function PhotoCard({ image, alt, caption, sx, ...props }: PhotoCardProps) {
  const theme = useTheme()
  return (
    <Card
      elevation={1}
      sx={{
        borderRadius: 0,
        p: 1,
        border: '1px solid rgba(0, 0, 0, 0.2);',
        backgroundColor: theme.palette.mode === 'dark' ? GREY[500_24] : 'white',
        ...sx
      }}
      {...props}>
      <CardMedia component="img" image={image} alt={alt} />
      {caption && <Typography variant="caption">{caption}</Typography>}
    </Card>
  )
}
