import { IconButtonProps, styled } from '@mui/material'
import IconButton from '@mui/material/IconButton'
import React from 'react'

export interface ExpandMoreButtonProps extends IconButtonProps {
  expand: boolean
}

const ExpandMoreButton = styled((props: ExpandMoreButtonProps) => {
  const { expand, ...other } = props
  return <IconButton {...other} />
})(({ theme, expand }) => ({
  transform: !expand ? 'rotate(0deg)' : 'rotate(180deg)',
  marginLeft: 'auto',
  transition: theme.transitions.create('transform', {
    duration: theme.transitions.duration.shortest
  })
}))

export default ExpandMoreButton
