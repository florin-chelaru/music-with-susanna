import React from 'react'
// material
import { Popover, PopoverProps } from '@mui/material'
import { SxProps } from '@mui/system'
import { Theme } from '@mui/material/styles'

// ----------------------------------------------------------------------

export interface MenuPopoverProps extends PopoverProps {
  children: JSX.Element | JSX.Element[]
  sx?: SxProps<Theme>
}

export default function MenuPopover({ children, sx, ...other }: MenuPopoverProps) {
  return (
    <Popover
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      PaperProps={{
        sx: {
          p: 1,
          width: 200,
          overflow: 'inherit',
          ...sx
        }
      }}
      {...other}>
      {children}
    </Popover>
  )
}
