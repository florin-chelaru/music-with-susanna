import { Button, Dialog, DialogActions, DialogProps, DialogTitle } from '@mui/material'

export interface DialogAction {
  label: string
  onClick?: () => any
  autoFocus?: boolean
}

export interface MultiActionDialogProps extends DialogProps {
  title?: string
  children?: JSX.Element | JSX.Element[]
  actions?: []
}

export default function MultiActionDialog({
  title,
  actions,
  children,
  ...props
}: MultiActionDialogProps) {
  actions = actions ?? []
  return (
    <Dialog aria-labelledby="yes-no-dialog-title" {...props}>
      {title && <DialogTitle id="yes-no-dialog-title">{title}</DialogTitle>}
      {children}
      <DialogActions>
        {(actions ?? []).map((action: DialogAction) => {
          return (
            <Button onClick={() => action.onClick?.()} autoFocus={!!action.autoFocus}>
              {action.label}
            </Button>
          )
        })}
      </DialogActions>
    </Dialog>
  )
}
