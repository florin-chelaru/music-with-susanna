import { Button, Dialog, DialogActions, DialogProps, DialogTitle } from '@mui/material'

export interface DialogAction {
  label: string
  onClick?: () => any
  autoFocus?: boolean
}

export interface MultiActionDialogProps extends DialogProps {
  title?: string
  children?: JSX.Element | JSX.Element[]
  actions?: DialogAction[]
}

export default function MultiActionDialog({
  title,
  actions,
  children,
  ...props
}: MultiActionDialogProps) {
  actions = actions ?? []
  return (
    <Dialog aria-labelledby="multi-action-dialog-title" {...props}>
      {title && <DialogTitle id="multi-action-dialog-title">{title}</DialogTitle>}
      {children}
      <DialogActions>
        {(actions ?? []).map((action: DialogAction, i) => {
          return (
            <Button
              key={`action-${i}`}
              onClick={() => action.onClick?.()}
              autoFocus={!!action.autoFocus}>
              {action.label}
            </Button>
          )
        })}
      </DialogActions>
    </Dialog>
  )
}
