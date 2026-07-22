import * as React from 'react'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

export interface FieldControlProps {
  id: string
  'aria-describedby': string | undefined
  'aria-invalid': boolean | undefined
}

interface FieldProps extends Omit<React.ComponentProps<'div'>, 'children'> {
  label: React.ReactNode
  /** Helper text shown under the control. Announced via aria-describedby. */
  description?: React.ReactNode
  /** Validation message. Announced immediately and marks the control invalid. */
  error?: React.ReactNode
  required?: boolean
  /** Supply when the control cannot receive a cloned id (e.g. Radix Select). */
  htmlFor?: string
  /**
   * Either a single control element (which receives id + aria wiring
   * automatically) or a render function, for controls whose root does not
   * accept an id — Radix Select being the usual case.
   */
  children: React.ReactNode | ((props: FieldControlProps) => React.ReactNode)
}

/**
 * Label + control + description + error, correctly associated.
 *
 * The 15 error messages this replaces were rendered as bare
 * `<p className="text-sm text-red-500">` with no relationship to their input:
 * no `aria-invalid`, no `aria-describedby`, no live region. A screen reader
 * user never learned a field had failed. This wires all three.
 */
function Field({
  label,
  description,
  error,
  required,
  htmlFor,
  children,
  className,
  ...props
}: FieldProps) {
  const generatedId = React.useId()
  const id = htmlFor ?? generatedId
  const descriptionId = description ? `${id}-description` : undefined
  const errorId = error ? `${id}-error` : undefined

  const describedBy =
    [descriptionId, errorId].filter(Boolean).join(' ') || undefined

  const controlProps: FieldControlProps = {
    id,
    'aria-describedby': describedBy,
    'aria-invalid': error ? true : undefined,
  }

  let control: React.ReactNode
  if (typeof children === 'function') {
    control = children(controlProps)
  } else if (React.isValidElement(children) && !htmlFor) {
    control = React.cloneElement(
      children as React.ReactElement<Record<string, unknown>>,
      controlProps as unknown as Record<string, unknown>
    )
  } else {
    control = children
  }

  return (
    <div data-slot="field" className={cn('space-y-2', className)} {...props}>
      <Label htmlFor={id} className="text-body text-foreground">
        {label}
        {required && (
          <span className="text-muted-foreground font-normal" aria-hidden>
            *
          </span>
        )}
        {required && <span className="sr-only">(required)</span>}
      </Label>

      {control}

      {description && !error && (
        <p id={descriptionId} className="text-caption text-muted-foreground">
          {description}
        </p>
      )}

      {error && (
        <p
          id={errorId}
          role="alert"
          className="text-caption text-danger-foreground flex items-center gap-1.5"
        >
          {error}
        </p>
      )}
    </div>
  )
}

export { Field }
